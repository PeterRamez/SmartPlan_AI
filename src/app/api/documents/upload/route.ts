import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { requireStaff } from "@/lib/auth";
import { errorResponse } from "@/lib/http";
import { extractDocument } from "@/lib/documents/extract";
import { chunkLegalText } from "@/lib/documents/chunk";
import { embedTexts } from "@/lib/ai/embeddings";
import { inferLawCode } from "@/lib/rag/legal-query";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let staffContext: Awaited<ReturnType<typeof requireStaff>> | null = null;
  let createdDocumentId: string | null = null;
  let phase = "authentication";
  try {
    staffContext = await requireStaff();
    const { supabase, profile } = staffContext;
    phase = "reading-upload";
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "File is required" }, { status: 400 });

    const maxMb = Number(process.env.MAX_UPLOAD_MB ?? 20);
    if (file.size > maxMb * 1024 * 1024) return NextResponse.json({ error: `Maximum file size is ${maxMb} MB` }, { status: 413 });
    const extension = file.name.toLowerCase().split(".").pop();
    const allowed = ["pdf", "docx", "txt"];
    const allowedMimes = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"];
    if (!allowed.includes(extension ?? "") && !allowedMimes.includes(file.type)) {
      return NextResponse.json({ error: `Unsupported file type: ${extension ?? file.type}. Only PDF, DOCX and TXT are supported.` }, { status: 415 });
    }

    phase = "creating-document-record";
    const buffer = Buffer.from(await file.arrayBuffer());
    const checksum = createHash("sha256").update(buffer).digest("hex");
    const { data: document, error: insertError } = await supabase.from("legal_documents").insert({
      lawyer_id: profile.lawyer_id, title: file.name, filename: file.name, mime_type: file.type,
      source_type: "upload", checksum, law_code: inferLawCode(file.name), status: "processing",
    }).select("id").single();
    if (insertError) throw insertError;
    createdDocumentId = document.id;

    phase = "extracting-document-text";
    const extracted = await extractDocument(buffer, file.type, file.name);
    if (extracted.needsOcr) {
      const { error } = await supabase.from("legal_documents").update({ status: "needs_ocr", extracted_text: extracted.text, error_message: "OCR required" })
        .eq("id", document.id).eq("lawyer_id", profile.lawyer_id);
      if (error) throw error;
      return NextResponse.json({ documentId: document.id, status: "needs_ocr" });
    }

    phase = "chunking-document";
    const lawCode = inferLawCode(file.name, extracted.text);
    const chunks = chunkLegalText(extracted.text, 2200, file.name);
    // BGE-M3 receives chunks in batches (up to 32 texts per request), instead of one network call per chunk.
    phase = "generating-embeddings";
    const vectors = await embedTexts(chunks.map((chunk) => chunk.content));
    const rows = chunks.map((chunk, index) => ({
      lawyer_id: profile.lawyer_id, document_id: document.id, chunk_index: chunk.chunkIndex,
      content: chunk.content, article_number: chunk.articleNumber ?? null,
      paragraph_number: chunk.paragraphNumber ?? null, page_number: chunk.pageNumber ?? null,
      law_code: chunk.lawCode ?? lawCode, law_name: chunk.lawCode ?? lawCode,
      metadata: chunk.metadata, embedding: vectors[index],
    }));
    phase = "saving-document-chunks";
    if (rows.length) {
      // Keep each PostgREST transaction small. A single large insert makes
      // PostgreSQL maintain the vector, full-text and tenant indexes for too
      // many rows in one statement and can exceed Supabase statement_timeout.
      const batchSize = 25;
      for (let offset = 0; offset < rows.length; offset += batchSize) {
        const batch = rows.slice(offset, offset + batchSize);
        const { error } = await supabase.from("document_chunks").insert(batch);
        if (error) {
          console.error("[documents/upload] chunk batch failed", {
            documentId: document.id,
            batchStart: offset,
            batchSize: batch.length,
            totalChunks: rows.length,
            code: error.code,
            message: error.message,
          });
          throw error;
        }
      }
    }
    phase = "finalizing-document";
    const { error: updateError } = await supabase.from("legal_documents").update({
      status: "processed", extracted_text: extracted.text, law_code: lawCode,
      metadata: { pages: extracted.pages, chunkCount: chunks.length, lawCode }, error_message: null,
    }).eq("id", document.id).eq("lawyer_id", profile.lawyer_id);
    if (updateError) throw updateError;
    return NextResponse.json({ documentId: document.id, status: "processed", chunks: chunks.length });
  } catch (error) {
    // Supabase/PostgREST errors are plain objects, not necessarily Error instances.
    // Preserve their message/code so production failures are diagnosable.
    const value = typeof error === "object" && error !== null
      ? error as Record<string, unknown>
      : null;
    const message = error instanceof Error
      ? error.message
      : typeof value?.message === "string"
        ? value.message
        : typeof error === "string" ? error : "Unexpected error";
    const code = typeof value?.code === "string" ? value.code : undefined;
    const details = typeof value?.details === "string" ? value.details : undefined;
    const hint = typeof value?.hint === "string" ? value.hint : undefined;
    const requestId = req.headers.get("x-vercel-id") ?? undefined;

    console.error("[documents/upload] failed", {
      phase, requestId, documentId: createdDocumentId ?? undefined,
      message, code, details, hint,
      stack: error instanceof Error ? error.stack : undefined,
    });

    if (staffContext && createdDocumentId) {
      try {
        await staffContext.supabase.from("legal_documents").update({
          status: "failed", error_message: message.slice(0, 1000),
        }).eq("id", createdDocumentId).eq("lawyer_id", staffContext.profile.lawyer_id);
      } catch (statusError) {
        console.error("[documents/upload] failed to mark document as failed", statusError);
      }
    }

    const publicMessage = [message, code ? `Code: ${code}` : ""].filter(Boolean).join(" · ");
    return NextResponse.json({ error: publicMessage, phase }, { status: 500 });
  }
}
