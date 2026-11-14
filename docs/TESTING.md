# Testing

Run `npm test` for unit tests. The fixture `tests/fixtures/synthetic-law.txt` is fictional and must never be used as a real legal source.

Integration checks:
- Auth: register/login/logout and verify protected routes.
- Tenant isolation: create two lawyer tenants and verify user A cannot read user B's documents, chunks, jobs, conversations, or messages.
- RAG: ingest a licensed German legal document into a non-production test tenant; ask the same question in Arabic and German; verify the retrieved source IDs and original excerpts.
- Citation integrity: inspect that all displayed citations are returned chunk IDs.
- Ingestion: sync a folder with PDF, DOCX, TXT, unsupported file, and scanned PDF; verify unsupported/needs_ocr statuses.
- Retry: temporarily stop embedding service, run batch, restart it, and retry/resume.

No live legal-accuracy claim is made by passing these tests. Have qualified counsel validate corpus coverage, effective dates, interpretation, and answer quality.


RAG regression dashboard:
- Apply migration `0003_legal_aware_retrieval.sql`.
- Re-index stored BGB/GewO extracted text from the Documents page.
- Open `/rag-evaluation` as a lawyer/admin and run the built-in exact-provision suite.
- Verify that BGB queries never return GewO chunks, exact § 437 / § 439 metadata is present, and the source page/chunk identifiers match the indexed document.
- The evaluation suite checks exact provision retrieval only; it does not prove legal interpretation or answer correctness.
