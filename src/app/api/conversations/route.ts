import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { errorResponse } from "@/lib/http";
export async function GET(){try{const {supabase,user}=await requireUser();const {data,error}=await supabase.from("conversations").select("id,title,created_at,updated_at").eq("user_id",user.id).order("updated_at",{ascending:false});if(error)throw error;return NextResponse.json({conversations:data});}catch(e){return errorResponse(e);}}
export async function POST(req:Request){try{const {supabase,user,profile}=await requireUser();const body=await req.json().catch(()=>({}));const {data,error}=await supabase.from("conversations").insert({lawyer_id:profile.lawyer_id,user_id:user.id,title:String(body.title??"New consultation").slice(0,100)}).select().single();if(error)throw error;return NextResponse.json({conversation:data});}catch(e){return errorResponse(e);}}
