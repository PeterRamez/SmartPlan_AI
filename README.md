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
- Statute-aware hybrid vector + PostgreSQL full-text + exact paragraph retrieval, reciprocal-rank fusion, deterministic reranking, and controlled same-statute cross-reference expansion.
- Legal-code metadata, same-statute cross-reference expansion, page-aware PDF extraction, and strict requested-provision coverage checks.
- Conversation context and optional structured case-analysis mode.
- Staff RAG evaluation dashboard and stored regression runs; bulk re-indexing from extracted text.
- Multilingual legal-topic expansion for employment, sale/defect, criminal, fraud, rental, family, and inheritance questions.
- Persisted conversations/messages and source references.
- Synthetic fixtures explicitly labelled as test-only.

## Requirements
Node.js 20+, npm, a Supabase project with PostgreSQL and `vector` extension. For local AI, install Ollama and pull models supported by your hardware/provider.

## Quick start
1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in Supabase values.
3. Run migrations `0001` through `0005` in numeric order in Supabase SQL Editor. Create and configure the initial admin account and lawyer tenant as described in `docs/SETUP.md`, then run migration `0006_client_registration_profiles.sql`. Migration `0006` automatically creates a `client` profile for each new signup and backfills existing Auth users who do not yet have a profile.
4. In Supabase Auth, enable email/password sign-in and configure redirect URLs (`http://localhost:3000/auth/callback` and your deployed URL).
5. `npm run dev`
6. After the initial admin and lawyer tenant are configured and migration `0006` is applied, new public registrations are automatically provisioned as `client` accounts in the configured MVP lawyer workspace; no manual profile assignment is needed.

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


## Google Drive OAuth
See [Google OAuth setup](docs/GOOGLE_OAUTH_SETUP.md) for configuring personal Gmail access without service-account keys.


## Legal-aware RAG upgrade
Apply `supabase/migrations/0003_legal_aware_retrieval.sql` after the existing migrations. Then open **Documents** and use **Re-index knowledge base** to rebuild chunks from stored extracted text. This is important for existing BGB/GewO files: the migration backfills statute codes from filenames, while re-indexing applies the updated legal-aware chunk parser and embeddings. Staff can then open **RAG evaluation** and run the BGB/GewO provision regression suite.

Queries that explicitly name a statute (for example `§ 437 BGB`) are filtered to that statute. If the requested provision itself is not present in the retrieved excerpts, LegalMind AI now reports the missing source instead of inferring the requested provision from neighboring articles. Page numbers remain unavailable for chunks when the extraction pipeline has not retained page-level offsets.

## Alex consultation experience

The legal chat assistant is presented to end users as **Alex**. The chat UI now uses a concise, client-friendly layout, detects Arabic message direction for right-to-left display, and provides optional follow-up prompts for deeper explanations, conditions/exceptions, and practical next steps. Supporting references are hidden behind an expandable “References used” section; raw chunk/document identifiers are not shown. Citation anchors are converted to simple numbered references that match the displayed source list.

The answer-generation instructions were updated to prioritize a direct answer, conversational explanations, careful treatment of missing facts, and source-grounded legal claims. This is a presentation and prompting improvement; actual legal accuracy still depends on the quality and completeness of the indexed documents and must be tested against representative questions.

## Recent document-management improvements

Document upload and reindex now generate embeddings in batches (up to 32 passages per provider request) and persist passages in bulk. Bulk upload processes up to three files concurrently; the Admin reindex action processes up to three documents concurrently. Upload failures are marked as failed with an error message. Admin users can delete documents from both Documents and Knowledge Base; the existing `ON DELETE CASCADE` relationship removes the document's indexed passages and vectors from retrieval.

See `docs/RELEASE_NOTES_UPLOAD_SPEED_DELETE.md` for implementation details and verification limitations. The upload route currently processes a document in the request rather than using a durable background queue, so very large or scanned files may still take time.
