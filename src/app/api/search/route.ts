import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { retrieveLegalContext } from "@/lib/rag/retrieve";
import { errorResponse } from "@/lib/http";
export async function POST(req:Request){try{const {supabase,profile}=await requireUser();const {query}=z.object({query:z.string().min(2).max(2000)}).parse(await req.json());const sources=await retrieveLegalContext(supabase,profile.lawyer_id,query,8);return NextResponse.json({sources});}catch(e){return errorResponse(e);}}
