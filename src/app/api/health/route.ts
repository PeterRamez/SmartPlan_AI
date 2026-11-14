import { NextResponse } from "next/server";
export async function GET(){return NextResponse.json({ok:true,service:"legalmind-ai",time:new Date().toISOString()});}
