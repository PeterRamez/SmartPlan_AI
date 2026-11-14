import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { errorResponse } from "@/lib/http";
import { listDriveFiles } from "@/lib/drive";
const schema=z.object({folderId:z.string().min(5).optional()});
const supported=new Set(["application/pdf","application/vnd.openxmlformats-officedocument.wordprocessingml.document","text/plain"]);
export const runtime="nodejs";
export async function POST(req:Request){try{
 const {supabase,user,profile}=await requireStaff();const body=schema.parse(await req.json());
 const folderId=body.folderId??process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;if(!folderId)throw new Error("Provide a folder ID or configure GOOGLE_DRIVE_ROOT_FOLDER_ID");
 const files=await listDriveFiles(folderId,profile.lawyer_id);
 const {data:job,error}=await supabase.from("ingestion_jobs").insert({lawyer_id:profile.lawyer_id,source:"google_drive",status:"queued",total_files:files.length,created_by:user.id}).select("id").single();if(error)throw error;
 for(const f of files){
  const status=supported.has(f.mimeType)?"queued":"unsupported";
  const {data:doc}=await supabase.from("legal_documents").upsert({lawyer_id:profile.lawyer_id,title:f.name,filename:f.name,mime_type:f.mimeType,source_type:"google_drive",source_file_id:f.id,source_modified_at:f.modifiedTime??null,checksum:f.md5Checksum??null,status:status==="queued"?"pending":"unsupported"},{onConflict:"lawyer_id,source_type,source_file_id"}).select("id").single();
  await supabase.from("ingestion_files").upsert({job_id:job.id,lawyer_id:profile.lawyer_id,document_id:doc?.id??null,external_file_id:f.id,filename:f.name,status},{onConflict:"job_id,external_file_id"});
 }
 return NextResponse.json({jobId:job.id,discovered:files.length});
 }catch(e){return errorResponse(e);}}
