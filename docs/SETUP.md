# Setup guide

## Supabase
1. Create a Supabase project.
2. Run `supabase/migrations/0001_initial.sql`.
3. Copy Project URL, anon key, and service-role key into `.env.local`.
4. Enable Email provider in Authentication.
5. Set site URL and redirect URLs.
6. Create a private Storage bucket named `legal-source-files`. Set appropriate storage policies before enabling uploads in production.

## First lawyer / admin account
Register through `/register`. Then use Supabase SQL Editor to create the first tenant and associate your profile:
```sql
insert into public.lawyers (name, slug) values ('Initial Law Office', 'initial-law-office')
returning id;
-- Use returned UUID in the next statement:
update public.profiles
set role = 'admin', lawyer_id = 'REPLACE_WITH_LAWYER_UUID'
where id = 'AUTH_USER_UUID';
```
After this first admin profile has a valid `lawyer_id`, run `supabase/migrations/0006_client_registration_profiles.sql`. This installs automatic client-profile provisioning and backfills Auth users who were already registered without a profile. Do not apply migration `0006` before the initial admin workspace is configured.
Never allow a client to submit their own `lawyer_id`. Server-side code resolves it from the authenticated profile.

## Google service account
- Enable Google Drive API in Google Cloud Console.
- Create a service account and a JSON key.
- Share the chosen folder with the service account email (Viewer).
- Set `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY` (escaped newlines), and optionally `GOOGLE_DRIVE_ROOT_FOLDER_ID`.
- In dashboard Settings/Knowledge Base, use the folder ID and start sync. Service-account access to shared drives may require additional Drive API flags and permissions.

## Ollama
Install Ollama, then:
```bash
ollama pull llama3.1:8b
ollama pull bge-m3
```
Check `http://localhost:11434/api/tags`. The BGE-M3 embedding dimension is configured as 1024 in the SQL schema. Verify your actual embedding model output dimension before ingestion. Do not mix vectors of different dimensions.

## OCR
Scanned PDFs are detected and marked `needs_ocr`. The OCR adapter boundary is in `src/lib/documents/ocr.ts`; connect a compliant OCR engine before marking these documents processed. No OCR success is simulated.
