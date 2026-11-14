# Architecture

```text
Browser -> Next.js App Router -> authenticated route handlers
                               -> Supabase Auth/Postgres (RLS, pgvector)
                               -> AI provider adapter (Cloudflare/Ollama)
                               -> embedding adapter (Cloudflare BGE-M3/Ollama/custom)
Google Drive -> discovery -> ingestion_jobs/files -> bounded batch processor
             -> extraction -> legal parser/chunker -> embeddings -> document_chunks
Chat -> language detect -> query embedding + Postgres FTS -> reciprocal-rank fusion
     -> exact + one-hop statutory cross-reference expansion -> retrieved source IDs
     -> fact/issue/condition-grounded generation -> optional second-pass audit
     -> citation allow-list validation
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


## Legal reasoning safeguards

The answer prompt requires the model to distinguish established facts, disputed allegations, missing facts, and legal conditions. It prohibits inferring intent or Arglist from the mere existence of a defect and requires disclosure when a necessary statutory provision is absent from the retrieved evidence. Citation validation checks source-marker bounds and maps valid markers back to retrieved chunk IDs; it does not establish semantic entailment or legal correctness. Lawyer review remains necessary.
