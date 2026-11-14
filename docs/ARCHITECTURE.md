# Architecture

```text
Browser -> Next.js App Router -> authenticated route handlers
                               -> Supabase Auth/Postgres (RLS, pgvector)
                               -> AI provider adapter (Cloudflare/Ollama)
                               -> embedding adapter (Ollama/custom)
Google Drive -> discovery -> ingestion_jobs/files -> bounded batch processor
             -> extraction -> legal parser/chunker -> embeddings -> document_chunks
Chat -> language detect -> query embedding + Postgres FTS -> hybrid ranking
     -> retrieved source IDs -> grounded generation -> citation allow-list validation
```

## Tenant model
Every lawyer-owned table carries `lawyer_id`. RLS compares it to `profiles.lawyer_id` for the authenticated user. Service-role ingestion is server-only and must derive tenant ownership from the initiating authenticated user/job, never from an arbitrary browser-supplied tenant ID.

## Legal grounding
Only retrieved chunks are passed as evidence. The model is instructed to abstain when evidence is insufficient. Citation IDs are validated against retrieved chunk IDs before persistence/rendering. Similarity is a retrieval signal, not a legal correctness probability.

## Known limitations
- Initial MVP supports one service-account Drive connection configured at deployment level. A multi-lawyer production rollout should move credentials and folder connections into encrypted tenant-scoped records.
- OCR is an explicit integration boundary; scanned files are not treated as successfully ingested.
- In-process rate limiting is not distributed and must be replaced for multi-instance production.
- Google Drive sync is manual/batch-triggered; schedule a protected external trigger for ongoing synchronization.
- Lawyer review workflow, jurisdiction/version validation, and legal-source licensing remain operational requirements.
