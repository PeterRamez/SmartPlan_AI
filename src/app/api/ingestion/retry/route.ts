import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { errorResponse } from "@/lib/http";
export async function POST(req:Request){try{const {supabase,profile}=await requireStaff();const {fileId}=z.object({fileId:z.string().uuid()}).parse(await req.json());const {error}=await supabase.from("ingestion_files").update({status:"queued",error_message:null}).eq("id",fileId).eq("lawyer_id",profile.lawyer_id).eq("status","failed");if(error)throw error;return NextResponse.json({ok:true});}catch(e){return errorResponse(e);}}
