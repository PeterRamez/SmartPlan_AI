import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";
import { errorResponse } from "@/lib/http";
export async function GET(){try{const {supabase,profile}=await requireStaff();const {data,error}=await supabase.from("ingestion_jobs").select("id,status,total_files,processed_files,failed_files,created_at").eq("lawyer_id",profile.lawyer_id).order("created_at",{ascending:false}).limit(20);if(error)throw error;return NextResponse.json({jobs:data});}catch(e){return errorResponse(e);}}
