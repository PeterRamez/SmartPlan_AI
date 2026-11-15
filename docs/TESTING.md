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
- Apply migrations `0003_legal_aware_retrieval.sql`, `0004_expand_german_statutes.sql`, and `0005_advanced_legal_retrieval.sql`.
- Re-index stored BGB/GewO extracted text from the Documents page.
- Open `/rag-evaluation` as a lawyer/admin and run the built-in exact-provision suite.
- Verify that BGB queries never return GewO chunks, exact § 437 / § 439 metadata is present, and the source page/chunk identifiers match the indexed document.
- The evaluation suite checks exact provision retrieval only; it does not prove legal interpretation or answer correctness.


## Advanced RAG release benchmark
A starter, explicitly non-authoritative benchmark manifest is provided at `tests/fixtures/legal-rag-benchmark.json`. It contains multilingual question templates and expected statute/provision targets; it is not a legal answer key and must be reviewed by German-qualified counsel. Before release, add corpus-specific gold chunk IDs and expected supporting excerpts for each question. Report per-domain and per-language Recall@10, Precision@5, MRR, exact-provision recall, cross-statute contamination, citation validity, and lawyer-rated answer relevance. Keep the held-out test set separate from tuning.
