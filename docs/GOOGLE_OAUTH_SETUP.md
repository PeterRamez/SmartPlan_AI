# Google Drive OAuth setup (personal Gmail)

This version uses Google OAuth 2.0 Web application flow. It does not require a service-account JSON key.

## 1. Google Cloud
1. Enable **Google Drive API** in the same Google Cloud project.
2. Configure Google Auth Platform branding and choose **External** audience.
3. Add the Gmail account you will use under **Test users** while the app is in Testing.
4. Create an OAuth Client ID with application type **Web application**.
5. Add this exact Authorized redirect URI:
   `https://YOUR-VERCEL-DOMAIN/api/drive/oauth/callback`
   Replace `YOUR-VERCEL-DOMAIN` with the actual production deployment hostname.
6. Keep the Client ID and Client Secret private.

## 2. Vercel environment variables
Add these to the Vercel project (Production, and Preview only if needed):
- `GOOGLE_CLIENT_ID` = OAuth Client ID
- `GOOGLE_CLIENT_SECRET` = OAuth Client Secret
- `GOOGLE_REDIRECT_URI` = exact callback URL above
- `GOOGLE_TOKEN_ENCRYPTION_KEY` = a random 32-byte key, encoded as base64

Generate the encryption key locally with:
`openssl rand -base64 32`

Do not commit these values to GitHub or paste them into chat. Remove old `GOOGLE_SERVICE_ACCOUNT_EMAIL` and `GOOGLE_PRIVATE_KEY` variables if present; they are no longer used by Drive access.

## 3. Supabase migration
Run `supabase/migrations/0002_google_drive_oauth.sql` in the Supabase SQL Editor. The encrypted refresh token is stored per lawyer; RLS is enabled and no user-facing policies are granted. Server-side access uses the Supabase service role key.

## 4. Deploy and connect
1. Commit and push the project to GitHub, then redeploy on Vercel.
2. Sign in as an Admin or Lawyer.
3. Open Knowledge and click **Connect Google Drive**.
4. Sign in with the Gmail account and approve the read-only Drive permission.
5. Paste the ID of the folder that contains the legal documents, then click **Start sync**.
6. Click **Process next batch** repeatedly until remaining reaches zero.

## Important
- The OAuth scope is `drive.readonly` because the app must read existing files in the selected folder and nested folders.
- Google OAuth consent in Testing mode can issue refresh tokens that expire after 7 days for Drive scopes. For continuous production ingestion, review Google's publishing/verification requirements and move the consent app out of Testing as appropriate.
- This implementation encrypts refresh tokens with AES-256-GCM. Losing or changing `GOOGLE_TOKEN_ENCRYPTION_KEY` makes existing stored tokens unreadable; reconnect the Google account after rotating it.
- Google Workspace administrators can impose additional restrictions; this setup targets a personal Gmail account.
