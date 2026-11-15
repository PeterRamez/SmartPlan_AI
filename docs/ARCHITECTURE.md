# Architecture

```text
Browser -> Next.js App Router -> authenticated route handlers
                               -> Supabase Auth/Postgres (RLS, pgvector)
                               -> AI provider adapter (Cloudflare/Ollama)
                               -> embedding adapter (Cloudflare BGE-M3/Ollama/custom)
Google Drive -> discovery -> ingestion_jobs/files -> bounded batch processor
             -> extraction -> legal parser/chunker -> embeddings -> document_chunks
Chat -> conversation context + language detect + legal query parser (law code / § number)
     -> statute-filtered vector search + OR-expanded German Postgres FTS + exact paragraph lookup
     -> reciprocal-rank fusion + deterministic legal reranking
     -> same-statute-only cross-reference expansion (lower ranking weight than exact requested provisions) -> retrieved source IDs
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


## Statute-aware indexing and retrieval
`legal_documents.law_code` and `document_chunks.law_code` identify the statute (for example BGB or GewO). The code is inferred from the source filename before scanning text, because a statute may cite other laws. When a query explicitly names a statute, vector, full-text, exact-provision, and cross-reference retrieval are all scoped to that statute and tenant. Migration `0003_legal_aware_retrieval.sql` adds this metadata, indexes, the filtered vector RPC, and evaluation history. Re-index stored extracted text after applying the migration so chunk metadata reflects the new parser.

## RAG evaluation and case analysis
Staff can open `/rag-evaluation` to run a small exact-provision regression suite and inspect retrieved document, statute, paragraph, page, and chunk identifiers. The chat can include the previous eight messages from the same conversation as case context, and its optional structured case-analysis mode separates issues, established/disputed facts, legal rules, application, options, and missing facts. Conversation history is context only; legal rules must still come from retrieved statutory excerpts.


## Retrieval V2 changes
- The vector RPCs return a consistent candidate shape including `law_code` and `metadata`; this prevents statute identity from being lost during semantic ranking. Apply migration `0005_advanced_legal_retrieval.sql` after `0001`-`0004`.
- Explicit statute references are enforced in SQL across vector, full-text, exact-provision, and cross-reference retrieval. Exact requested provisions receive a higher fusion weight than cross-reference candidates.
- Cross-reference expansion is grouped by the source chunk's statute and never mixes § numbers across Acts.
- German legal vocabulary expansions use web-search OR semantics; a long list of synonyms must not accidentally become an AND query that requires every synonym to occur in one chunk.
- Deterministic reranking discounts common stop words and combines reciprocal-rank evidence, exact provision evidence, statute match, and lexical overlap. It is a ranking heuristic, not a learned legal reranker.

## Release gate
Do not describe retrieval as 9/10 or production-grade until the benchmark has been run against the actual tenant corpus. Track Recall@10, Precision@5, MRR, statute contamination rate, requested-provision recall, citation validity, citation entailment (human audited), and answer relevance. Split benchmark questions into development and held-out sets; do not tune on the held-out set.
