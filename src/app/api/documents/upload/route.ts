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
  try {
    staffContext = await requireStaff();
    const { supabase, profile } = staffContext;
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

    const buffer = Buffer.from(await file.arrayBuffer());
    const checksum = createHash("sha256").update(buffer).digest("hex");
    const { data: document, error: insertError } = await supabase.from("legal_documents").insert({
      lawyer_id: profile.lawyer_id, title: file.name, filename: file.name, mime_type: file.type,
      source_type: "upload", checksum, law_code: inferLawCode(file.name), status: "processing",
    }).select("id").single();
    if (insertError) throw insertError;
    createdDocumentId = document.id;

    const extracted = await extractDocument(buffer, file.type, file.name);
    if (extracted.needsOcr) {
      const { error } = await supabase.from("legal_documents").update({ status: "needs_ocr", extracted_text: extracted.text, error_message: "OCR required" })
        .eq("id", document.id).eq("lawyer_id", profile.lawyer_id);
      if (error) throw error;
      return NextResponse.json({ documentId: document.id, status: "needs_ocr" });
    }

    const lawCode = inferLawCode(file.name, extracted.text);
    const chunks = chunkLegalText(extracted.text, 2200, file.name);
    // BGE-M3 receives chunks in batches (up to 32 texts per request), instead of one network call per chunk.
    const vectors = await embedTexts(chunks.map((chunk) => chunk.content));
    const rows = chunks.map((chunk, index) => ({
      lawyer_id: profile.lawyer_id, document_id: document.id, chunk_index: chunk.chunkIndex,
      content: chunk.content, article_number: chunk.articleNumber ?? null,
      paragraph_number: chunk.paragraphNumber ?? null, page_number: chunk.pageNumber ?? null,
      law_code: chunk.lawCode ?? lawCode, law_name: chunk.lawCode ?? lawCode,
      metadata: chunk.metadata, embedding: vectors[index],
    }));
    if (rows.length) {
      const { error } = await supabase.from("document_chunks").insert(rows);
      if (error) throw error;
    }
    const { error: updateError } = await supabase.from("legal_documents").update({
      status: "processed", extracted_text: extracted.text, law_code: lawCode,
      metadata: { pages: extracted.pages, chunkCount: chunks.length, lawCode }, error_message: null,
    }).eq("id", document.id).eq("lawyer_id", profile.lawyer_id);
    if (updateError) throw updateError;
    return NextResponse.json({ documentId: document.id, status: "processed", chunks: chunks.length });
  } catch (error) {
    if (staffContext && createdDocumentId) {
      const message = error instanceof Error ? error.message.slice(0, 1000) : "Document processing failed";
      await staffContext.supabase.from("legal_documents").update({ status: "failed", error_message: message })
        .eq("id", createdDocumentId).eq("lawyer_id", staffContext.profile.lawyer_id);
    }
    return errorResponse(error);
  }
}
