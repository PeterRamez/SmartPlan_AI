import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { errorResponse } from "@/lib/http";
import { detectLanguage } from "@/lib/language";
import { retrieveLegalContext } from "@/lib/rag/retrieve";
import { answerWithSources } from "@/lib/rag/answer";
import { rateLimit } from "@/lib/rate-limit";
const schema=z.object({question:z.string().min(1).max(6000),conversationId:z.string().uuid().nullable().optional(),analysisMode:z.boolean().optional()});

function casualReply(question: string, language: ReturnType<typeof detectLanguage>): string | null {
 const q=question.trim().toLowerCase().replace(/[!?.,،؛]+$/g, "");
 const patterns = [
  /^(hi|hello|hey|good morning|good afternoon|good evening|how are you|how's it going|thanks|thank you|thx|مرحبا|مرحباً|اهلا|أهلا|أهلًا|هاي|ازيك|إزيك|عامل ايه|عامل إيه|شكرا|شكراً|متشكر|صباح الخير|مساء الخير|guten tag|hallo|guten morgen|wie gehts|danke|bonjour|salut|merci|hola|buenos dias|gracias)$/i,
 ];
 if (!patterns.some((pattern) => pattern.test(q))) return null;
 if (language === "ar") return /شكرا|شكراً|متشكر/.test(q) ? "العفو، أنا هنا لمساعدتك. لو عندك أي سؤال قانوني اتفضل اسألني." : "أهلًا بيك! 😊 أنا Alex، مساعدك القانوني. اتفضل، إزاي أقدر أساعدك؟";
 if (language === "de") return /danke/i.test(q) ? "Gern geschehen! Wenn Sie eine rechtliche Frage haben, helfe ich Ihnen gerne." : "Hallo! Ich bin Alex, Ihr juristischer Assistent. Wie kann ich Ihnen helfen?";
 if (language === "fr") return /merci/i.test(q) ? "Avec plaisir ! Je suis là si vous avez une question juridique." : "Bonjour ! Je suis Alex, votre assistant juridique. Comment puis-je vous aider ?";
 if (language === "es") return /gracias/i.test(q) ? "¡De nada! Estoy aquí si tienes alguna pregunta legal." : "¡Hola! Soy Alex, tu asistente jurídico. ¿En qué puedo ayudarte?";
 return /thank|thx/i.test(q) ? "You're welcome! I'm here if you have a legal question." : "Hi! I'm Alex, your legal assistant. Feel free to ask me a legal question—how can I help?";
}
export const runtime="nodejs";
export async function POST(req:Request){try{
 const {supabase,user,profile}=await requireUser();if(!rateLimit(user.id,15))return NextResponse.json({error:"Rate limit exceeded. Try again shortly."},{status:429});
 const body=schema.parse(await req.json());let conversationId=body.conversationId;
 if(conversationId){const {data}=await supabase.from("conversations").select("id").eq("id",conversationId).eq("user_id",user.id).single();if(!data)return NextResponse.json({error:"Conversation not found"},{status:404});}
 else {const {data,error}=await supabase.from("conversations").insert({lawyer_id:profile.lawyer_id,user_id:user.id,title:body.question.slice(0,70)}).select("id").single();if(error)throw error;conversationId=data.id;}
 const language=detectLanguage(body.question);
 const {data:historyRows,error:historyError}=conversationId
  ? await supabase.from("messages").select("role,content").eq("conversation_id",conversationId).eq("lawyer_id",profile.lawyer_id).order("created_at",{ascending:false}).limit(8)
  : {data:[],error:null};
 if(historyError)throw historyError;
 const conversationHistory=((historyRows??[]) as Array<{role:string;content:string}>).reverse().filter((m)=>m.role==="user"||m.role==="assistant").map((m)=>({role:m.role as "user"|"assistant",content:m.content}));
 const {error:userErr}=await supabase.from("messages").insert({lawyer_id:profile.lawyer_id,conversation_id:conversationId,role:"user",content:body.question,language});
 if(userErr)throw userErr;
 const smallTalk = casualReply(body.question, language);
 const result = smallTalk
  ? { answer: smallTalk, citations: [] }
  : await answerWithSources(body.question,language,await retrieveLegalContext(supabase,profile.lawyer_id,body.question,Number(process.env.RAG_TOP_K??8)),conversationHistory,Boolean(body.analysisMode));
 const {error:assistantErr}=await supabase.from("messages").insert({lawyer_id:profile.lawyer_id,conversation_id:conversationId,role:"assistant",content:result.answer,language,citations:result.citations});
 if(assistantErr)throw assistantErr;
 await supabase.from("conversations").update({updated_at:new Date().toISOString()}).eq("id",conversationId);
 return NextResponse.json({conversationId,answer:result.answer,language,citations:result.citations});
 }catch(e){return errorResponse(e);}}
