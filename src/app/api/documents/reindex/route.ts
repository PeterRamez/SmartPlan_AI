import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { errorResponse } from "@/lib/http";
import { chunkLegalText } from "@/lib/documents/chunk";
import { embedTexts } from "@/lib/ai/embeddings";
import { inferLawCode } from "@/lib/rag/legal-query";

const schema = z.object({ documentId: z.string().uuid() });
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const { supabase, profile } = await requireStaff();
    const { documentId } = schema.parse(await request.json());
    const { data: document, error } = await supabase.from("legal_documents")
      .select("id,filename,title,extracted_text,status,metadata").eq("id", documentId)
      .eq("lawyer_id", profile.lawyer_id).single();
    if (error || !document) return NextResponse.json({ error: "Document not found" }, { status: 404 });
    if (!document.extracted_text) return NextResponse.json({ error: "No extracted text is stored for this document. Upload it again first." }, { status: 409 });

    const lawCode = inferLawCode(document.filename, document.extracted_text);
    const chunks = chunkLegalText(document.extracted_text, 2200, document.filename);
    const vectors = await embedTexts(chunks.map((chunk) => chunk.content));
    const rows = chunks.map((chunk, index) => ({
      lawyer_id: profile.lawyer_id, document_id: document.id,
      chunk_index: chunk.chunkIndex, content: chunk.content,
      law_code: chunk.lawCode ?? lawCode, law_name: chunk.lawCode ?? lawCode,
      article_number: chunk.articleNumber ?? null,
      paragraph_number: chunk.paragraphNumber ?? null, page_number: chunk.pageNumber ?? null,
      metadata: chunk.metadata, embedding: vectors[index],
    }));
    if (rows.length) {
      // Re-index in small transactions for the same reason as upload: each
      // row updates HNSW, GIN, tenant and uniqueness indexes.
      const batchSize = 25;
      for (let offset = 0; offset < rows.length; offset += batchSize) {
        const batch = rows.slice(offset, offset + batchSize);
        const { error: upsertError } = await supabase.from("document_chunks")
          .upsert(batch, { onConflict: "document_id,chunk_index" });
        if (upsertError) {
          console.error("[documents/reindex] chunk batch failed", {
            documentId: document.id,
            batchStart: offset,
            batchSize: batch.length,
            totalChunks: rows.length,
            code: upsertError.code,
            message: upsertError.message,
          });
          throw upsertError;
        }
      }
    }
    // Remove only stale tail chunks after the replacement chunks are safely written.
    const { error: staleError } = await supabase.from("document_chunks").delete()
      .eq("lawyer_id", profile.lawyer_id).eq("document_id", document.id).gte("chunk_index", rows.length);
    if (staleError) throw staleError;
    const { error: updateError } = await supabase.from("legal_documents").update({
      status: "processed", law_code: lawCode,
      metadata: { ...(document.metadata ?? {}), reindexedAt: new Date().toISOString(), chunkCount: rows.length, lawCode },
      error_message: null,
    }).eq("id", document.id).eq("lawyer_id", profile.lawyer_id);
    if (updateError) throw updateError;
    return NextResponse.json({ ok: true, documentId, chunks: rows.length, lawCode });
  } catch (error) { return errorResponse(error); }
}
