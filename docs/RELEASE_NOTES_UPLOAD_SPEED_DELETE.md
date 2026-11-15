# Upload, Reindex, and Document Deletion Improvements

## What changed

- Cloudflare BGE-M3 and Ollama embeddings now use batched requests (up to 32 passages per request, with up to 3 batches in parallel).
- Custom embedding endpoints use bounded parallel requests rather than one request at a time.
- Upload now writes extracted passages in one database insert after embedding generation, instead of issuing one insert per passage.
- Bulk upload runs up to 3 file uploads concurrently and refreshes the document lists when processing finishes.
- Reindex uses the same batched embedding path and upserts all refreshed chunks in one database request per document.
- Reindex runs up to 3 documents concurrently from the Admin interface.
- Upload failures mark the document as failed with an error message rather than leaving it stuck in `processing`.
- Admin can delete a document from both Documents and Knowledge Base. Deleting the parent `legal_documents` row cascades to its `document_chunks` rows through the existing foreign key, removing their stored embeddings from retrieval.

## Database migration

No new migration is required for these changes. The existing `document_chunks.document_id` foreign key in `0001_initial.sql` already uses `ON DELETE CASCADE`; the existing staff-only delete policy on `legal_documents` is used by the protected DELETE endpoint.

## Notes

The current upload endpoint still performs extraction and indexing within the upload request. Batched embeddings and concurrent uploads reduce wall-clock time, but this is not a durable background queue. Very large or scanned documents can still take longer; scanned PDFs may require OCR.

## Verification status

- TypeScript/TSX syntax transpilation: passed for all modified source files.
- Full `tsc --noEmit`, lint, tests, and Next.js production build: not verified because dependency installation timed out and `node_modules` is unavailable in this environment.
- Supabase cascade deletion and Cloudflare/Ollama batch API behavior: implementation reviewed against the existing schema/provider response shape, but not live-tested against the user's configured services.
