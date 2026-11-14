import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { errorResponse } from "@/lib/http";
export const runtime = "nodejs";
export async function GET() {
  try {
    const { profile } = await requireStaff();
    const admin = createAdminClient();
    const { data, error } = await admin.from("lawyer_google_drive_tokens").select("lawyer_id,connected_at")
      .eq("lawyer_id", profile.lawyer_id).maybeSingle();
    if (error) throw error;
    return NextResponse.json({ connected: Boolean(data), connectedAt: data?.connected_at ?? null });
  } catch (e) { return errorResponse(e); }
}
