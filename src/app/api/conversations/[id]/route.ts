import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { errorResponse } from "@/lib/http";
const idSchema=z.string().uuid();
export async function DELETE(_req:Request,{params}:{params:Promise<{id:string}>}){try{const {id}=await params;idSchema.parse(id);const {supabase,user}=await requireUser();const {error}=await supabase.from("conversations").delete().eq("id",id).eq("user_id",user.id);if(error)throw error;return NextResponse.json({ok:true});}catch(e){return errorResponse(e);}}
export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}){try{const {id}=await params;idSchema.parse(id);const body=await req.json();const title=z.string().min(1).max(100).parse(body.title);const {supabase,user}=await requireUser();const {data,error}=await supabase.from("conversations").update({title}).eq("id",id).eq("user_id",user.id).select().single();if(error)throw error;return NextResponse.json({conversation:data});}catch(e){return errorResponse(e);}}
