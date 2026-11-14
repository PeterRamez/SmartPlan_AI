# LegalMind AI

A tenant-aware multilingual legal knowledge assistant built with Next.js, Supabase/Postgres + pgvector, Google Drive ingestion, and pluggable AI providers.

> **Important MVP boundary:** this repository contains working application code and integration adapters, but live services require your own Supabase, Google Cloud, and AI-provider credentials. No credentials or legal corpus are bundled. The application does not certify legal advice. Retrieval quality and legal completeness must be validated by a qualified lawyer before production use.

## Features
- Supabase Auth session integration and role-aware protected application shell.
- Lawyer-scoped data model and RLS policies.
- Arabic RTL and English/German/French/Spanish language selection/detection.
- PDF, DOCX, TXT extraction; German legal provision-aware parsing/chunking.
- Google Drive service-account folder discovery and incremental sync job creation.
- Resumable batch ingestion endpoint protected by `INGESTION_SECRET`.
- Embedding adapters for Ollama BGE-M3 and configurable custom endpoint.
- Cloudflare Workers AI and Ollama text-generation adapters.
- Hybrid vector + PostgreSQL full-text retrieval with citation mapping.
- Persisted conversations/messages and source references.
- Synthetic fixtures explicitly labelled as test-only.

## Requirements
Node.js 20+, npm, a Supabase project with PostgreSQL and `vector` extension. For local AI, install Ollama and pull models supported by your hardware/provider.

## Quick start
1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in Supabase values.
3. Run the SQL migration in `supabase/migrations/0001_initial.sql` in Supabase SQL Editor.
4. In Supabase Auth, enable email/password sign-in and configure redirect URLs (`http://localhost:3000/auth/callback` and your deployed URL).
5. `npm run dev`
6. Visit `/register`, create the first account, then assign its role and lawyer tenant in Supabase (see `docs/SETUP.md`).

## AI configuration
For Ollama:
```bash
ollama pull llama3.1:8b
ollama pull bge-m3
```
Set `AI_PROVIDER=ollama`, `EMBEDDING_PROVIDER=ollama`, and configure model names. Ollama must be reachable by the Next.js server. On Vercel, `localhost` refers to the Vercel runtime and cannot reach your laptop; use a secured reachable inference host or Cloudflare/custom endpoint.

For Cloudflare Workers AI, set `AI_PROVIDER=cloudflare`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, and `LLM_MODEL=@cf/zai-org/glm-4.7-flash`. For multilingual embeddings, set `EMBEDDING_PROVIDER=cloudflare` and `EMBEDDING_MODEL=@cf/baai/bge-m3`. Both calls use the Cloudflare account REST API. BGE-M3 vectors are validated as 1024 dimensions to match the included pgvector schema; do not change the model or dimensions after ingesting data without a deliberate re-embedding/database migration.

## Google Drive
Create a Google Cloud service account, enable Drive API, download its JSON key, set the email and private key environment variables, and share the target Drive folder with the service-account email as Viewer. Set `GOOGLE_DRIVE_ROOT_FOLDER_ID`. The key never reaches the browser. The initial implementation supports PDF/DOCX/TXT files and recursive folder listing.

## Deployment
See `docs/DEPLOYMENT.md`. Use Supabase Storage for durable source files in production; Vercel local disk is ephemeral. Batch processing is deliberately bounded and resumable rather than processing an entire Drive folder in one request.

## Tests
`npm test` runs unit tests for legal parsing, chunking, language detection, and citation validation. Fixtures are synthetic and are not real statutes. Integration tests require configured external services and should be run in a dedicated test project.

## Security checklist before production
- Configure Supabase RLS and test with multiple tenants.
- Set a high-entropy `INGESTION_SECRET`.
- Add a production rate limiter (e.g. Upstash Redis or a gateway); the in-process limiter is only a local/dev fallback.
- Configure Supabase Storage private bucket and signed URLs for source files.
- Add malware scanning and OCR service before accepting arbitrary scanned documents.
- Review legal prompt, retrieval thresholds, and corpus versioning with counsel.
- Configure backups, monitoring, audit retention, and incident response.
