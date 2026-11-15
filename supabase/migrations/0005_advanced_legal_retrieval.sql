-- Advanced legal retrieval metadata returned consistently by both vector RPCs.
-- Apply after migrations 0001-0004. No user data is deleted.

create index if not exists document_chunks_tenant_law_provision_idx
  on public.document_chunks (lawyer_id, law_code, article_number, paragraph_number);
create index if not exists document_chunks_tenant_created_idx
  on public.document_chunks (lawyer_id, document_id, chunk_index);

-- The old RPC omitted law_code and metadata, causing semantic candidates to
-- lose statute identity before fusion/reranking. Drop/recreate because Postgres
-- does not permit changing a function's TABLE return type with CREATE OR REPLACE.
drop function if exists public.match_document_chunks(vector, int, uuid);
create function public.match_document_chunks(
  query_embedding vector(1024), match_count int, filter_lawyer_id uuid
) returns table (
  id uuid, document_id uuid, content text, law_name text, law_code text,
  article_number text, paragraph_number text, page_number int,
  metadata jsonb, similarity float
) language sql stable security invoker set search_path = public as $$
  select dc.id, dc.document_id, dc.content, dc.law_name, dc.law_code,
         dc.article_number, dc.paragraph_number, dc.page_number, dc.metadata,
         1 - (dc.embedding <=> query_embedding) as similarity
  from public.document_chunks dc
  where dc.lawyer_id = filter_lawyer_id and dc.embedding is not null
  order by dc.embedding <=> query_embedding
  limit greatest(1, least(match_count, 80));
$$;
revoke all on function public.match_document_chunks(vector, int, uuid) from public;
grant execute on function public.match_document_chunks(vector, int, uuid) to authenticated, service_role;

-- Keep statute-filtered vector retrieval tenant-scoped and return the same shape.
drop function if exists public.match_document_chunks_by_law(vector, int, uuid, text);
create function public.match_document_chunks_by_law(
  query_embedding vector(1024), match_count int, filter_lawyer_id uuid, filter_law_code text
) returns table (
  id uuid, document_id uuid, content text, law_name text, law_code text,
  article_number text, paragraph_number text, page_number int,
  metadata jsonb, similarity float
) language sql stable security invoker set search_path = public as $$
  select dc.id, dc.document_id, dc.content, dc.law_name, dc.law_code,
         dc.article_number, dc.paragraph_number, dc.page_number, dc.metadata,
         1 - (dc.embedding <=> query_embedding) as similarity
  from public.document_chunks dc
  where dc.lawyer_id = filter_lawyer_id
    and dc.law_code = filter_law_code
    and dc.embedding is not null
  order by dc.embedding <=> query_embedding
  limit greatest(1, least(match_count, 80));
$$;
revoke all on function public.match_document_chunks_by_law(vector, int, uuid, text) from public;
grant execute on function public.match_document_chunks_by_law(vector, int, uuid, text) to authenticated, service_role;

-- Persist enough detail to compare retrieval behavior between releases.
alter table public.rag_evaluation_runs
  add column if not exists expected_document_id uuid,
  add column if not exists retrieved_at timestamptz,
  add column if not exists metrics jsonb not null default '{}'::jsonb,
  add column if not exists notes text;
