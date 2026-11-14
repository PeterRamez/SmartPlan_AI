import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireStaff } from "@/lib/auth";
import { createGoogleOAuthClient, saveRefreshToken } from "@/lib/drive-oauth";
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  const base = new URL("/knowledge", request.url);
  try {
    const { code, state, error } = Object.fromEntries(request.nextUrl.searchParams.entries());
    if (error) throw new Error(`Google authorization was not completed: ${error}`);
    const jar = await cookies();
    const expected = jar.get("legalmind_google_oauth_state")?.value;
    jar.delete("legalmind_google_oauth_state");
    if (!state || !expected || state !== expected) throw new Error("Google OAuth state validation failed. Please try connecting again.");
    if (!code) throw new Error("Google did not return an authorization code.");
    const { profile } = await requireStaff();
    const client = createGoogleOAuthClient();
    const { tokens } = await client.getToken(code);
    if (!tokens.refresh_token) {
      throw new Error("Google did not return a refresh token. Revoke LegalMind AI access from your Google Account permissions, then connect again.");
    }
    await saveRefreshToken(profile.lawyer_id, tokens.refresh_token);
    base.searchParams.set("drive", "connected");
    return NextResponse.redirect(base);
  } catch (e) {
    base.searchParams.set("drive", "error");
    base.searchParams.set("message", e instanceof Error ? e.message : "Google connection failed");
    return NextResponse.redirect(base);
  }
}
