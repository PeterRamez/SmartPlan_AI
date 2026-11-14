import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { errorResponse } from "@/lib/http";
export async function DELETE(_req:Request,{params}:{params:Promise<{id:string}>}){try{const {id}=await params;z.string().uuid().parse(id);const {supabase,profile}=await requireStaff();const {error}=await supabase.from("legal_documents").delete().eq("id",id).eq("lawyer_id",profile.lawyer_id);if(error)throw error;return NextResponse.json({ok:true});}catch(e){return errorResponse(e);}}
