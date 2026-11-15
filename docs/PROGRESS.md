# Alex — Verification Progress

Last reviewed: 2026-11-13 (automation run 1)

## Current verification run

- Opened and extracted the supplied `/mnt/data/Alex.zip`; confirmed it contains the `alex/` project tree. No assumption was made about any earlier archive path.
- Reviewed the package scripts/dependencies, TypeScript configuration, Supabase migration, environment validation, Google Drive adapter, ingestion routes, document extraction, retrieval, answer generation, and citation validation.
- Retried `npm install --no-audit --no-fund` (including a bounded retry configuration). Installation could not complete because requests to `https://registry.npmjs.org` failed with DNS `EAI_AGAIN`. No `node_modules/` or `package-lock.json` was produced.
- Ran the globally available TypeScript compiler (`tsc` 5.8.3) as a diagnostic only. It exited non-zero because project dependencies and type declarations are absent (`next`, `react`, `zod`, `vitest`, Node types, etc.). This is not a valid project typecheck and does not establish whether source-level type errors remain.
- Ran `npm run lint`; it could not start because the Next.js CLI is unavailable (`next: not found`, exit 127).
- Ran `npm run build`; it could not start for the same reason (`next: not found`, exit 127).
- Vitest was not run because `vitest` is not installed.
- Fixed a confirmed citation parsing defect: source markers such as `[SOURCE 1]` were previously matched using an over-escaped regular expression, so generated citations were never mapped back to retrieved source IDs. Corrected both the answer citation extraction and citation validator.
- Fixed Google service-account private-key newline normalization: escaped `\\n` sequences are now converted to actual newlines before JWT authentication.
- Added `tests/citation-validation.test.ts` for valid, out-of-range, and absent source markers.
- Ran direct Node smoke checks for source-marker extraction/range rejection and Google private-key newline normalization; both passed. These checks do not replace Vitest or an end-to-end provider test.

## Files changed in this run

- `src/lib/rag/answer.ts` — corrected `[SOURCE n]` extraction regex.
- `src/lib/rag/citation-validation.ts` — corrected citation marker validation regex.
- `src/lib/drive.ts` — corrected escaped private-key newline handling.
- `tests/citation-validation.test.ts` — added citation validation unit tests.
- `docs/PROGRESS.md` — recorded this run and its verified limitations.

## Findings requiring later work

1. **Dependency/build gate:** restore npm registry/DNS access, install dependencies, create and commit a lockfile, then run TypeScript, lint, Vitest, and production build. None of these project-level gates has passed yet.
2. **Supabase:** the migration has been statically reviewed but has not been applied to a live/test Supabase project. Verify schema, grants, RLS, and tenant isolation using multiple real test accounts.
3. **Google Drive:** `drive/connect` currently reports credentials configured rather than performing a real Drive API access check. Verify actual folder access, pagination, nested folders, shared-drive permissions, and download behavior.
4. **Ingestion jobs:** processing updates per-file states, but job-level counters/status and crash recovery for files left in `processing` need review and integration tests. The current retry route retries failed files only.
5. **Cron security:** `INGESTION_SECRET` is present in configuration/docs but is not consumed by the processing route. The processing route currently requires an authenticated staff session; do not expose it as a secret-only cron endpoint until that is deliberately implemented and tested.
6. **Document extraction:** PDF/DOCX/TXT and scanned-PDF detection have not been exercised against actual fixtures. OCR is intentionally not implemented and must remain `needs_ocr` until a provider is configured.
7. **RAG:** verify Ollama BGE-M3 output dimension (1024), pgvector writes, semantic + keyword retrieval, and Arabic-question-to-German-source retrieval with a real test corpus. No live embedding or LLM provider was available in this run.
8. **Answers/citations:** citation parsing has a regression test added but Vitest has not run. Validate citations end-to-end against retrieved chunk IDs and test malformed/out-of-range model markers.
9. **Deployment:** no GitHub push or Vercel deployment has been performed.

## Required configuration / user-side prerequisites

- Restore access to the npm registry (or provide a pre-populated npm cache / install environment) so the project dependencies can be installed.
- Supabase project URL and anon key; apply migrations to a disposable test project before production. Keep the service-role key server-only.
- A reachable embedding service that returns 1024-dimensional BGE-M3 vectors. Local `localhost` Ollama is not reachable from Vercel; use a secured hosted endpoint or a separate worker.
- Ollama or Cloudflare Workers AI credentials for generation, depending on the selected provider.
- Google service-account email/private key and folder sharing for Drive integration.
- A secure ingestion secret only after the route is updated to validate it; it currently does not authenticate requests with this variable.

## Next action

Retry dependency installation when npm registry access is available. Then run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` in that order, fix all failures, and only then proceed to live Supabase and integration verification.


## Cloudflare GLM + BGE-M3 integration preparation (2026-11-14)

- Updated the project defaults and environment example to use Cloudflare Workers AI with `@cf/zai-org/glm-4.7-flash` for generation.
- Added a Cloudflare embedding provider using the documented REST request shape `{ "text": [input] }` for `@cf/baai/bge-m3`.
- Kept strict 1024-dimensional vector validation to match `vector(1024)` in the Supabase migration; ingestion must fail rather than silently store incompatible vectors.
- Updated setup documentation.
- Not yet verified against the user's live Cloudflare account, Vercel deployment, or Supabase database. Dependency installation, TypeScript, lint, tests, and production build remain unverified until dependencies can be installed.


## Cloudflare GLM response compatibility fix (2026-11-14)

- Updated `src/lib/ai/providers.ts` to parse both Workers AI `{ result: { response } }` and OpenAI-compatible `{ choices: [{ message: { content } }] }` response formats, including text content arrays.
- Disabled GLM-4.7 internal thinking for this user-facing answer path and set a bounded completion-token limit.
- Improved provider errors to expose HTTP status, non-JSON response details, and response object keys without logging credentials or prompts.
- This is a source-level fix based on Cloudflare's published GLM-4.7-Flash API documentation; it has not yet been verified against the user's live Cloudflare account or deployed Vercel function.


## Legal reasoning and retrieval improvements (2026-11-14)

### Implemented in source

- Reworked the legal answer system prompt to require explicit separation of established facts, disputed allegations, missing facts, and legal conditions before drafting.
- Added explicit safeguards against inferring Arglist/intent merely from the existence of a defect, and against treating delivery and Gefahrübergang as automatically identical.
- Required provision-by-provision legal subsumption and disclosure when referenced legal provisions are absent from the uploaded evidence.
- Replaced mixed-score sorting in hybrid retrieval with reciprocal-rank fusion, so semantic and full-text ranks are combined without pretending their numeric scores share a scale.
- Added exact retrieval for statutory provisions explicitly mentioned in the user's question.
- Added one-hop retrieval of statutory provisions cited inside initially retrieved chunks (bounded to 12 distinct provision numbers) to help retrieve cross-referenced rules such as §§ 439–441 referenced by § 437.
- Kept all exact and expanded queries scoped by `lawyer_id`.
- Improved citation-marker parsing and added a warning when the model emits out-of-range `[SOURCE n]` markers. Only citations mapped to retrieved source IDs are returned to the UI.
- Added unit tests for statutory reference extraction, citation bounds, and required legal-reasoning prompt constraints.

### Verification status

- These are source changes only. The ZIP was inspected and edited locally.
- Project dependencies are not installed in this environment. Vitest, TypeScript, lint, and production build have not yet been executed for this revision.
- No live Supabase retrieval, Cloudflare GLM request, Google Drive ingestion, GitHub push, or Vercel deployment was performed.
- Exact and cross-reference retrieval depends on `document_chunks.article_number` containing normalized provision numbers (for example `434`, not `§ 434`). Verify this against the ingested database before production use.
- Citation-ID validation confirms that source markers point to retrieved excerpts; it does not prove that a cited excerpt semantically supports the legal proposition. A true semantic/legal audit still requires separate evaluation and lawyer review.


### Local verification for this revision

- `npm install --ignore-scripts --no-audit --no-fund` did not complete before the 120-second timeout. No `node_modules/` or lockfile was created.
- A syntax transpilation check using the globally installed TypeScript compiler completed for all six changed TypeScript source/test files.
- `npm test` could not start (`vitest: not found`).
- `npm run lint` could not start (`next: not found`).
- `npm run build` could not start (`next: not found`).
- `tsc --noEmit` was attempted but cannot provide a valid project typecheck while dependencies/types are absent; it reported missing packages/types such as `next`, `react`, `zod`, `@supabase/supabase-js`, `vitest`, and Node types. No claim of a successful typecheck is made.
- Provision-reference extraction was manually exercised against examples with `§§ 434, 437`, `§ 444 Abs. 1`, duplicate references, letter suffixes, and Absatz numbers; the expected provision numbers were produced.


- Added an optional second-pass legal answer audit controlled by `LEGAL_ANSWER_REVIEW=true`. It checks the draft against the same question and retrieved excerpts for unsupported factual assumptions, missing legal conditions, unsupported claims, and missing-source disclosure. It uses the same configured model, adds one additional generation request per answer, and is not an independent legal opinion or guaranteed semantic proof. It defaults to `false` to avoid extra inference usage until the user opts in.

## Legal-aware retrieval and evaluation dashboard (2026-11-14)

### Implemented in source
- Added legal query parsing for common German statute codes and explicit provision references, including plural references such as `§§ 434, 437`.
- Added `law_code` metadata to legal documents and chunks; ingestion now derives the code from the source filename first (to avoid classifying a GewO document as BGB merely because it cites BGB).
- Added migration `0003_legal_aware_retrieval.sql` with metadata backfill, statute/provision indexes, and tenant-scoped law-filtered vector search.
- Retrieval now uses exact provision lookup, law-code filtering for vector/full-text/exact search, reciprocal-rank fusion, and same-statute cross-reference expansion.
- Added a staff-only RAG evaluation page and regression API for BGB §§ 437, 439, 442 and GewO § 34. Each run stores the expected provision, retrieved source metadata, and exact-match result.
- Added unit tests for legal query parsing, filename-first law-code inference, and chunk metadata.

### Important migration / data requirements
- Apply `supabase/migrations/0003_legal_aware_retrieval.sql` in Supabase before deploying this revision. The new law-filtered vector RPC is required for queries that explicitly name a statute.
- Existing document chunks are backfilled only when their source filename identifies a known statute. Documents with ambiguous filenames need manual metadata assignment or re-ingestion.
- Reprocess/re-ingest the BGB and GewO files after migration so each chunk receives correct `law_code` metadata. The evaluation page is only meaningful after this.
- `page_number` remains null where the current PDF extraction pipeline does not preserve per-chunk page offsets; the app does not fabricate page numbers.
- Exact-match evaluation measures whether the expected law code and paragraph appear in the retrieved top 8. It is a retrieval regression signal, not a legal correctness certification.

### Verification status
- Source edits and migration were reviewed locally.
- Full dependency installation, TypeScript, lint, Vitest, and production build still need to be run; no successful result is claimed yet.
- No live Supabase migration, Cloudflare request, Vercel deployment, or production re-indexing has been performed.

- Added a staff-triggered re-index endpoint and UI action. It rebuilds existing chunks from stored `extracted_text`, recalculates BGE-M3 embeddings, and writes statute metadata; no original Drive download is required for already extracted documents.
- Added chat conversation context (the previous eight messages in the same authorized conversation) and an optional structured case-analysis mode. Prior messages are context only, not legal authority.
- Added a pre-generation provision coverage gate: when a question explicitly names a statute and paragraph, the exact requested provision must appear among retrieved sources or the system responds that the source is missing.
- Updated source cards to show statute code, filename, page availability, and chunk ID.

- PDF extraction now preserves page markers, and the legal parser carries page numbers into chunks and citations when the PDF extractor exposes them. Text/DOCX inputs without page structure continue to report page as unavailable rather than inventing one.
- Added a safe re-index write sequence: compute replacement embeddings first, upsert current chunks, then delete only stale tail chunks.
- Exact provision retrieval can fall back to keyword/exact database matches if the embedding provider is unavailable; a provider failure is surfaced if no other retrieval path returns evidence.


## 2026-11-15 — question relevance and employment-law retrieval fixes

- Added German employment statute recognition: KSchG, TzBfG, ArbZG, ArbGG, BetrVG, AGG, BUrlG, and EFZG.
- Added cross-language legal keyword expansion for Arabic/English employment, defective-sale, and theft questions so keyword search can find German statutory text.
- Explicit statute queries now reject retrieved chunks whose `law_code` is different or unknown, rather than allowing unrelated statutes into the final ranking.
- Updated the answer instructions to answer the exact question first, ignore unrelated retrieved excerpts, and avoid padding with neighboring legal topics.
- Added a clear response when no excerpts from the explicitly requested statute are retrieved.
- Added migration `0004_expand_german_statutes.sql` to backfill employment-law statute codes for already uploaded documents/chunks. Apply it in Supabase, then reindex relevant documents if their chunk metadata remains empty.
- Added regression tests for KSchG detection and Arabic-to-German employment keyword expansion.

Verification status: source changes reviewed; `npm install --ignore-scripts --no-audit --no-fund` timed out in this environment, so TypeScript, Vitest, ESLint, and production build have not been run. Supabase migration and live Cloudflare/Supabase retrieval have not been executed or verified.
