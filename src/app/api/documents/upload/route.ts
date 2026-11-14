import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";
import { errorResponse } from "@/lib/http";
import { extractDocument } from "@/lib/documents/extract";
import { chunkLegalText } from "@/lib/documents/chunk";
import { embedText } from "@/lib/ai/embeddings";
import { createHash } from "crypto";
import { inferLawCode } from "@/lib/rag/legal-query";
export const runtime="nodejs";
export async function POST(req:Request){try{
 const {supabase,profile}=await requireStaff();const form=await req.formData();const file=form.get("file");if(!(file instanceof File))return NextResponse.json({error:"File is required"},{status:400});
 const maxMb=Number(process.env.MAX_UPLOAD_MB??20);if(file.size>maxMb*1024*1024)return NextResponse.json({error:`Maximum file size is ${maxMb} MB`},{status:413});
 const ext=file.name.toLowerCase().split(".").pop();const allowedByExtension=["pdf","docx","txt"].includes(ext??"");const allowedByMime=["application/pdf","application/vnd.openxmlformats-officedocument.wordprocessingml.document","text/plain"].includes(file.type);if(!allowedByExtension&&!allowedByMime)return NextResponse.json({error:`Unsupported file type: ${ext??file.type}. Only PDF, DOCX and TXT are supported.`},{status:415});
 const buffer=Buffer.from(await file.arrayBuffer());const checksum=createHash("sha256").update(buffer).digest("hex");
 const {data:doc,error}=await supabase.from("legal_documents").insert({lawyer_id:profile.lawyer_id,title:file.name,filename:file.name,mime_type:file.type,source_type:"upload",checksum,law_code:inferLawCode(file.name),status:"processing"}).select("id").single();if(error)throw error;
 const extracted=await extractDocument(buffer,file.type,file.name);
 if(extracted.needsOcr){await supabase.from("legal_documents").update({status:"needs_ocr",extracted_text:extracted.text,error_message:"OCR required"}).eq("id",doc.id);return NextResponse.json({documentId:doc.id,status:"needs_ocr"});}
 const lawCode=inferLawCode(file.name,extracted.text);const chunks=chunkLegalText(extracted.text,2200,file.name);for(const c of chunks){const embedding=await embedText(c.content);const {error:e}=await supabase.from("document_chunks").insert({lawyer_id:profile.lawyer_id,document_id:doc.id,chunk_index:c.chunkIndex,content:c.content,article_number:c.articleNumber??null,paragraph_number:c.paragraphNumber??null,page_number:c.pageNumber??null,law_code:c.lawCode??lawCode,law_name:c.lawCode??lawCode,metadata:c.metadata,embedding});if(e)throw e;}
 await supabase.from("legal_documents").update({status:"processed",extracted_text:extracted.text,law_code:lawCode,metadata:{pages:extracted.pages,chunkCount:chunks.length,lawCode}}).eq("id",doc.id);
 return NextResponse.json({documentId:doc.id,status:"processed",chunks:chunks.length});
 }catch(e){return errorResponse(e);}}
