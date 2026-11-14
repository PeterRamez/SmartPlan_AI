import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { google } from "googleapis";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

function oauthConfig() {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_REDIRECT_URI) {
    throw new Error("Google OAuth is not configured. Add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI in Vercel.");
  }
  return { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET, redirectUri: env.GOOGLE_REDIRECT_URI };
}
export function createGoogleOAuthClient() {
  const c = oauthConfig();
  return new google.auth.OAuth2(c.clientId, c.clientSecret, c.redirectUri);
}
function encryptionKey(): Buffer {
  const raw = env.GOOGLE_TOKEN_ENCRYPTION_KEY;
  if (!raw) throw new Error("GOOGLE_TOKEN_ENCRYPTION_KEY is not configured.");
  const key = /^[a-f0-9]{64}$/i.test(raw) ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("GOOGLE_TOKEN_ENCRYPTION_KEY must be a 32-byte base64 or 64-character hex key.");
  return key;
}
export function encryptRefreshToken(token: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return { token_ciphertext: ciphertext.toString("base64"), token_iv: iv.toString("base64"), token_auth_tag: cipher.getAuthTag().toString("base64") };
}
function decryptRefreshToken(row: { token_ciphertext: string; token_iv: string; token_auth_tag: string }) {
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(row.token_iv, "base64"));
  decipher.setAuthTag(Buffer.from(row.token_auth_tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(row.token_ciphertext, "base64")), decipher.final()]).toString("utf8");
}
export async function saveRefreshToken(lawyerId: string, refreshToken: string) {
  const admin = createAdminClient();
  const encrypted = encryptRefreshToken(refreshToken);
  const { error } = await admin.from("lawyer_google_drive_tokens").upsert({
    lawyer_id: lawyerId, ...encrypted, connected_at: new Date().toISOString()
  }, { onConflict: "lawyer_id" });
  if (error) throw error;
}
export async function getGoogleDriveClient(lawyerId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin.from("lawyer_google_drive_tokens")
    .select("token_ciphertext,token_iv,token_auth_tag").eq("lawyer_id", lawyerId).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Google Drive is not connected. Click Connect Google Drive first.");
  const oauth = createGoogleOAuthClient();
  oauth.setCredentials({ refresh_token: decryptRefreshToken(data) });
  return google.drive({ version: "v3", auth: oauth });
}
export function googleOAuthConfigured() {
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_REDIRECT_URI && env.GOOGLE_TOKEN_ENCRYPTION_KEY);
}
