import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";
import { errorResponse } from "@/lib/http";
export async function POST(){try{await requireStaff();if(!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL||!process.env.GOOGLE_PRIVATE_KEY)return NextResponse.json({connected:false,error:"Google service-account credentials are not configured"},{status:400});return NextResponse.json({connected:true,mode:"service_account",message:"Credentials are configured server-side. Share a Drive folder with the service-account email to grant access."});}catch(e){return errorResponse(e);}}
