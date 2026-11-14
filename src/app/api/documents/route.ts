import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";
import { errorResponse } from "@/lib/http";
export async function GET(){try{const {supabase,profile}=await requireStaff();const {data,error}=await supabase.from("legal_documents").select("id,title,filename,status,source_type,created_at,updated_at,error_message").eq("lawyer_id",profile.lawyer_id).order("created_at",{ascending:false});if(error)throw error;return NextResponse.json({documents:data});}catch(e){return errorResponse(e);}}
