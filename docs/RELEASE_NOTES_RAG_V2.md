# Alex — Advanced Legal RAG V2

## Included in this build
- Expanded German legal vocabulary for cross-language employment, sale/defect, theft, fraud, rental, family, and inheritance questions.
- OR-based PostgreSQL full-text expansion so synonym expansion does not require every synonym to occur in a single chunk.
- Consistent vector RPC return columns (`law_code`, `metadata`) to preserve statute identity through semantic retrieval and reranking.
- Exact requested provisions retain a stronger ranking weight than cross-reference expansions.
- Cross-reference expansion is grouped by the originating statute and tenant, reducing cross-Act contamination.
- Ranking stop-word filtering and a starter multilingual retrieval benchmark.
- Updated architecture, testing, and migration documentation.

## Required deployment steps
1. Back up the Supabase project and inspect the SQL in `supabase/migrations/0005_advanced_legal_retrieval.sql`.
2. Apply migration `0005` after migrations `0001`–`0004` in the target Supabase project.
3. Re-index existing documents after confirming the stored document metadata and parser behavior. Do not delete source files or chunks before a backup.
4. Run unit tests and the retrieval benchmark against a dedicated test tenant with the actual German legal corpus.
5. Inspect top-10 retrieved chunks for the previous BGB sale-defect and employment-dismissal questions, especially whether KSchG/BGB sources appear and HGB/GewO noise disappears.
6. Have German-qualified counsel validate all gold targets, effective dates, and legal conclusions before any client-facing reliance.

## Verification status for this generated archive
- Benchmark JSON syntax: checked successfully.
- `legal-query.ts` standalone TypeScript compilation: checked successfully.
- Full `npm install`: did not complete in this environment (dependency installation timed out).
- Full Vitest suite, Next.js build, full TypeScript check, Supabase migration execution, and live retrieval evaluation: not run. They must not be treated as passing.

## Important limitation
This is an engineering improvement, not a guarantee of perfect legal retrieval or legal correctness. The benchmark contains starter prompts and statute targets, not authoritative answer keys or gold chunk IDs. A 9/10 score can only be claimed after a documented evaluation against the actual corpus and a held-out lawyer-reviewed test set.
