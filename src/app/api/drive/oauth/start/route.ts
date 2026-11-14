import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireStaff } from "@/lib/auth";
import { createGoogleOAuthClient, googleOAuthConfigured } from "@/lib/drive-oauth";
import { errorResponse } from "@/lib/http";
export const runtime = "nodejs";
export async function GET() {
  try {
    await requireStaff();
    if (!googleOAuthConfigured()) throw new Error("Google OAuth settings are incomplete. Configure all four GOOGLE_* OAuth variables in Vercel and redeploy.");
    const state = randomBytes(32).toString("hex");
    const client = createGoogleOAuthClient();
    const url = client.generateAuthUrl({
      access_type: "offline", prompt: "consent", state,
      scope: ["https://www.googleapis.com/auth/drive.readonly"],
      include_granted_scopes: true
    });
    const jar = await cookies();
    jar.set("legalmind_google_oauth_state", state, {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax",
      path: "/api/drive/oauth", maxAge: 10 * 60
    });
    return NextResponse.redirect(url);
  } catch (e) { return errorResponse(e); }
}
