-- Legal-aware metadata and retrieval. Safe to apply after 0001/0002.
alter table public.legal_documents add column if not exists law_code text;
alter table public.document_chunks add column if not exists law_code text;

-- Backfill statute codes from known source filenames and existing metadata.
update public.legal_documents
set law_code = coalesce(
  law_code,
  nullif(metadata->>'lawCode', ''),
  case
    when filename ~* '(^|[^A-Z])BGB([^A-Z]|$)' then 'BGB'
    when filename ~* '(^|[^A-Z])GewO([^A-Z]|$)' then 'GewO'
    when filename ~* '(^|[^A-Z])HGB([^A-Z]|$)' then 'HGB'
    when filename ~* '(^|[^A-Z])StGB([^A-Z]|$)' then 'StGB'
    when filename ~* '(^|[^A-Z])ZPO([^A-Z]|$)' then 'ZPO'
    when filename ~* '(^|[^A-Z])StPO([^A-Z]|$)' then 'StPO'
    when filename ~* '(^|[^A-Z])GG([^A-Z]|$)' then 'GG'
    when filename ~* '(^|[^A-Z])VwGO([^A-Z]|$)' then 'VwGO'
    when filename ~* '(^|[^A-Z])UStG([^A-Z]|$)' then 'UStG'
    else null
  end
)
where law_code is null;

update public.document_chunks dc
set law_code = coalesce(dc.law_code, d.law_code, nullif(dc.metadata->>'lawCode', '')),
    law_name = coalesce(dc.law_name, d.law_code, nullif(dc.metadata->>'lawName', ''))
from public.legal_documents d
where d.id = dc.document_id and (dc.law_code is null or dc.law_name is null);

create index if not exists document_chunks_law_provision_idx
  on public.document_chunks(lawyer_id, law_code, article_number);
create index if not exists legal_documents_law_code_idx
  on public.legal_documents(lawyer_id, law_code);

-- Statute-filtered vector search. Law-code and tenant filters are applied in SQL,
-- not merely in application memory, so cross-statute matches are not returned.
create or replace function public.match_document_chunks_by_law(
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
  limit greatest(1, least(match_count, 50));
$$;

revoke all on function public.match_document_chunks_by_law(vector, int, uuid, text) from public;
grant execute on function public.match_document_chunks_by_law(vector, int, uuid, text) to authenticated, service_role;

-- Retrieval evaluation history for reproducible regression tests.
create table if not exists public.rag_evaluation_runs (
  id uuid primary key default gen_random_uuid(),
  lawyer_id uuid not null references public.lawyers(id) on delete cascade,
  query text not null,
  expected_law_code text,
  expected_article_number text,
  retrieved jsonb not null default '[]'::jsonb,
  exact_match boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.rag_evaluation_runs enable row level security;
grant select, insert on public.rag_evaluation_runs to authenticated, service_role;
create policy "rag eval tenant read" on public.rag_evaluation_runs for select
  using (lawyer_id = public.current_lawyer_id() and public.current_user_is_staff());
create policy "rag eval tenant insert" on public.rag_evaluation_runs for insert
  with check (lawyer_id = public.current_lawyer_id() and public.current_user_is_staff());
create index if not exists rag_evaluation_runs_tenant_idx
  on public.rag_evaluation_runs(lawyer_id, created_at desc);
