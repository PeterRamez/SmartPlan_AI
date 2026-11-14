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
