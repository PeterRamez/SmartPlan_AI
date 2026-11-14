import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { errorResponse } from "@/lib/http";
import { downloadDriveFile } from "@/lib/drive";
import { extractDocument } from "@/lib/documents/extract";
import { chunkLegalText } from "@/lib/documents/chunk";
import { embedText } from "@/lib/ai/embeddings";
const schema=z.object({batchSize:z.number().int().min(1).max(5).default(3)});
export const runtime="nodejs";
export async function POST(req:Request){try{
 const {supabase,profile}=await requireStaff();const body=schema.parse(await req.json().catch(()=>({batchSize:3})));
 const {data:items,error}=await supabase.from("ingestion_files").select("id,job_id,document_id,external_file_id,filename,attempts").eq("lawyer_id",profile.lawyer_id).eq("status","queued").order("created_at").limit(body.batchSize);
 if(error)throw error;let processed=0,failed=0;
 for(const item of items??[]){
  await supabase.from("ingestion_files").update({status:"processing",attempts:item.attempts+1}).eq("id",item.id);
  try{
   if(!item.document_id||!item.external_file_id)throw new Error("Missing document or Drive file ID");
   const buffer=await downloadDriveFile(item.external_file_id,profile.lawyer_id);
   const mime=item.filename.toLowerCase().endsWith(".pdf")?"application/pdf":item.filename.toLowerCase().endsWith(".docx")?"application/vnd.openxmlformats-officedocument.wordprocessingml.document":"text/plain";
   const extracted=await extractDocument(buffer,mime,item.filename);
   if(extracted.needsOcr){await supabase.from("legal_documents").update({status:"needs_ocr",extracted_text:extracted.text,error_message:"Scanned or near-empty PDF requires OCR."}).eq("id",item.document_id);await supabase.from("ingestion_files").update({status:"needs_ocr"}).eq("id",item.id);continue;}
   if(!extracted.text)throw new Error("No extractable text found");
   const chunks=chunkLegalText(extracted.text,2200,item.filename);
   for(const c of chunks){
    const vector=await embedText(c.content);
    const {error:insertError}=await supabase.from("document_chunks").upsert({lawyer_id:profile.lawyer_id,document_id:item.document_id,chunk_index:c.chunkIndex,content:c.content,article_number:c.articleNumber??null,paragraph_number:c.paragraphNumber??null,page_number:c.pageNumber??null,law_code:c.lawCode??null,law_name:c.lawCode??null,metadata:c.metadata,embedding:vector},{onConflict:"document_id,chunk_index"});
    if(insertError)throw insertError;
   }
   const {error:staleError}=await supabase.from("document_chunks").delete().eq("lawyer_id",profile.lawyer_id).eq("document_id",item.document_id).gte("chunk_index",chunks.length);
   if(staleError)throw staleError;
   await supabase.from("legal_documents").update({status:"processed",extracted_text:extracted.text,law_code:chunks.find(c=>c.lawCode)?.lawCode??null,error_message:null,metadata:{pages:extracted.pages,chunkCount:chunks.length,lawCode:chunks.find(c=>c.lawCode)?.lawCode??null}}).eq("id",item.document_id);
   await supabase.from("ingestion_files").update({status:"completed",error_message:null}).eq("id",item.id);processed++;
  }catch(e){failed++;const msg=e instanceof Error?e.message:"Unknown processing error";await supabase.from("ingestion_files").update({status:item.attempts+1>=3?"failed":"queued",error_message:msg}).eq("id",item.id);if(item.document_id)await supabase.from("legal_documents").update({status:item.attempts+1>=3?"failed":"pending",error_message:msg}).eq("id",item.document_id);}
 }
 const {count:remaining}=await supabase.from("ingestion_files").select("id",{count:"exact",head:true}).eq("lawyer_id",profile.lawyer_id).eq("status","queued");
 return NextResponse.json({processed,failed,remaining:remaining??0});
 }catch(e){return errorResponse(e);}}
