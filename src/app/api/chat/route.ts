import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { errorResponse } from "@/lib/http";
import { detectLanguage } from "@/lib/language";
import { retrieveLegalContext } from "@/lib/rag/retrieve";
import { answerWithSources } from "@/lib/rag/answer";
import { rateLimit } from "@/lib/rate-limit";
const schema=z.object({question:z.string().min(3).max(6000),conversationId:z.string().uuid().nullable().optional()});
export const runtime="nodejs";
export async function POST(req:Request){try{
 const {supabase,user,profile}=await requireUser();if(!rateLimit(user.id,15))return NextResponse.json({error:"Rate limit exceeded. Try again shortly."},{status:429});
 const body=schema.parse(await req.json());let conversationId=body.conversationId;
 if(conversationId){const {data}=await supabase.from("conversations").select("id").eq("id",conversationId).eq("user_id",user.id).single();if(!data)return NextResponse.json({error:"Conversation not found"},{status:404});}
 else {const {data,error}=await supabase.from("conversations").insert({lawyer_id:profile.lawyer_id,user_id:user.id,title:body.question.slice(0,70)}).select("id").single();if(error)throw error;conversationId=data.id;}
 const language=detectLanguage(body.question);
 const {error:userErr}=await supabase.from("messages").insert({lawyer_id:profile.lawyer_id,conversation_id:conversationId,role:"user",content:body.question,language});
 if(userErr)throw userErr;
 const sources=await retrieveLegalContext(supabase,profile.lawyer_id,body.question,Number(process.env.RAG_TOP_K??8));
 const result=await answerWithSources(body.question,language,sources);
 const {error:assistantErr}=await supabase.from("messages").insert({lawyer_id:profile.lawyer_id,conversation_id:conversationId,role:"assistant",content:result.answer,language,citations:result.citations});
 if(assistantErr)throw assistantErr;
 await supabase.from("conversations").update({updated_at:new Date().toISOString()}).eq("id",conversationId);
 return NextResponse.json({conversationId,answer:result.answer,language,citations:result.citations});
 }catch(e){return errorResponse(e);}}
