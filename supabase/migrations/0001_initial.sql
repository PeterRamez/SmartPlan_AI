create extension if not exists vector;
create extension if not exists pgcrypto;

create table if not exists public.lawyers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  lawyer_id uuid references public.lawyers(id) on delete set null,
  full_name text,
  role text not null default 'client' check (role in ('admin','lawyer','client')),
  preferred_language text not null default 'en',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.legal_documents (
  id uuid primary key default gen_random_uuid(),
  lawyer_id uuid not null references public.lawyers(id) on delete cascade,
  title text not null,
  filename text not null,
  mime_type text,
  source_type text not null default 'upload' check (source_type in ('upload','google_drive')),
  source_file_id text,
  source_modified_at timestamptz,
  checksum text,
  status text not null default 'pending' check (status in ('pending','processing','processed','failed','needs_ocr','unsupported')),
  category text,
  extracted_text text,
  metadata jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(lawyer_id, source_type, source_file_id)
);

create table if not exists public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  lawyer_id uuid not null references public.lawyers(id) on delete cascade,
  document_id uuid not null references public.legal_documents(id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  law_name text,
  section_name text,
  chapter_name text,
  article_number text,
  paragraph_number text,
  sentence_number text,
  page_number integer,
  effective_date date,
  document_version text,
  metadata jsonb not null default '{}'::jsonb,
  embedding vector(1024),
  search_vector tsvector generated always as (to_tsvector('simple', coalesce(content,''))) stored,
  created_at timestamptz not null default now(),
  unique(document_id, chunk_index)
);
create index if not exists document_chunks_embedding_idx
  on public.document_chunks using hnsw (embedding vector_cosine_ops);
create index if not exists document_chunks_search_idx
  on public.document_chunks using gin(search_vector);
create index if not exists document_chunks_tenant_idx on public.document_chunks(lawyer_id, document_id);

create table if not exists public.ingestion_jobs (
  id uuid primary key default gen_random_uuid(),
  lawyer_id uuid not null references public.lawyers(id) on delete cascade,
  source text not null check (source in ('google_drive','upload')),
  status text not null default 'queued' check (status in ('queued','running','completed','failed')),
  total_files integer not null default 0,
  processed_files integer not null default 0,
  failed_files integer not null default 0,
  cursor text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.ingestion_files (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.ingestion_jobs(id) on delete cascade,
  lawyer_id uuid not null references public.lawyers(id) on delete cascade,
  document_id uuid references public.legal_documents(id) on delete set null,
  external_file_id text,
  filename text not null,
  status text not null default 'queued' check (status in ('queued','processing','completed','failed','needs_ocr','unsupported')),
  attempts integer not null default 0,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(job_id, external_file_id)
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  lawyer_id uuid not null references public.lawyers(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New consultation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  lawyer_id uuid not null references public.lawyers(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  language text,
  citations jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create table if not exists public.consultations (
  id uuid primary key default gen_random_uuid(),
  lawyer_id uuid not null references public.lawyers(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  status text not null default 'open',
  notes text,
  created_at timestamptz not null default now()
);
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  lawyer_id uuid references public.lawyers(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  resource_type text,
  resource_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists conversations_owner_idx on public.conversations(lawyer_id,user_id,updated_at desc);
create index if not exists messages_conversation_idx on public.messages(conversation_id,created_at);
create index if not exists legal_documents_owner_idx on public.legal_documents(lawyer_id,status);

create or replace function public.current_lawyer_id()
returns uuid language sql stable security definer set search_path = public
as $$ select lawyer_id from public.profiles where id = auth.uid() $$;

create or replace function public.current_user_is_staff()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (
  select 1 from public.profiles
  where id = auth.uid() and role in ('admin', 'lawyer')
) $$;

alter table public.profiles enable row level security;
alter table public.lawyers enable row level security;
alter table public.legal_documents enable row level security;
alter table public.document_chunks enable row level security;
alter table public.ingestion_jobs enable row level security;
alter table public.ingestion_files enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.consultations enable row level security;
alter table public.audit_logs enable row level security;

create policy "profile self read" on public.profiles for select using (id = auth.uid());
create policy "profile self update" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
-- Prevent users from promoting themselves or changing their tenant assignment.
revoke update on public.profiles from authenticated;
grant update (full_name, preferred_language) on public.profiles to authenticated;
create policy "lawyer tenant read" on public.lawyers for select using (id = public.current_lawyer_id());
create policy "documents tenant read" on public.legal_documents for select using (lawyer_id = public.current_lawyer_id());
create policy "documents staff insert" on public.legal_documents for insert with check (lawyer_id = public.current_lawyer_id() and public.current_user_is_staff());
create policy "documents staff update" on public.legal_documents for update using (lawyer_id = public.current_lawyer_id() and public.current_user_is_staff()) with check (lawyer_id = public.current_lawyer_id() and public.current_user_is_staff());
create policy "documents staff delete" on public.legal_documents for delete using (lawyer_id = public.current_lawyer_id() and public.current_user_is_staff());
create policy "chunks tenant read" on public.document_chunks for select using (lawyer_id = public.current_lawyer_id());
create policy "chunks staff insert" on public.document_chunks for insert with check (lawyer_id = public.current_lawyer_id() and public.current_user_is_staff());
create policy "chunks staff update" on public.document_chunks for update using (lawyer_id = public.current_lawyer_id() and public.current_user_is_staff()) with check (lawyer_id = public.current_lawyer_id() and public.current_user_is_staff());
create policy "chunks staff delete" on public.document_chunks for delete using (lawyer_id = public.current_lawyer_id() and public.current_user_is_staff());
create policy "jobs staff access" on public.ingestion_jobs for all using (lawyer_id = public.current_lawyer_id() and public.current_user_is_staff()) with check (lawyer_id = public.current_lawyer_id() and public.current_user_is_staff());
create policy "ingestion files staff access" on public.ingestion_files for all using (lawyer_id = public.current_lawyer_id() and public.current_user_is_staff()) with check (lawyer_id = public.current_lawyer_id() and public.current_user_is_staff());
create policy "conversations owner access" on public.conversations for all using (lawyer_id = public.current_lawyer_id() and (user_id = auth.uid() or exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('admin','lawyer')))) with check (lawyer_id = public.current_lawyer_id() and user_id = auth.uid());
create policy "messages tenant access" on public.messages for all
  using (lawyer_id = public.current_lawyer_id() and exists(
    select 1 from public.conversations c where c.id=conversation_id
      and (c.user_id=auth.uid() or public.current_user_is_staff())
  ))
  with check (lawyer_id = public.current_lawyer_id() and exists(
    select 1 from public.conversations c where c.id=conversation_id
      and (c.user_id=auth.uid() or public.current_user_is_staff())
  ));
create policy "consultations tenant read" on public.consultations for select using (
  lawyer_id = public.current_lawyer_id() and (
    public.current_user_is_staff() or exists(
      select 1 from public.conversations c where c.id=conversation_id and c.user_id=auth.uid()
    )
  )
);
create policy "consultations staff write" on public.consultations for all
  using (lawyer_id = public.current_lawyer_id() and public.current_user_is_staff())
  with check (lawyer_id = public.current_lawyer_id() and public.current_user_is_staff());
create policy "audit tenant read" on public.audit_logs for select using (lawyer_id = public.current_lawyer_id());
create policy "audit tenant insert" on public.audit_logs for insert with check (lawyer_id = public.current_lawyer_id());

-- Vector retrieval function: caller must still apply tenant scope through RLS.
create or replace function public.match_document_chunks(
  query_embedding vector(1024), match_count int, filter_lawyer_id uuid
) returns table (
  id uuid, document_id uuid, content text, law_name text, article_number text,
  paragraph_number text, page_number int, similarity float
) language sql stable as $$
  select dc.id, dc.document_id, dc.content, dc.law_name, dc.article_number,
         dc.paragraph_number, dc.page_number,
         1 - (dc.embedding <=> query_embedding) as similarity
  from public.document_chunks dc
  where dc.lawyer_id = filter_lawyer_id and dc.embedding is not null
  order by dc.embedding <=> query_embedding
  limit greatest(1, least(match_count, 30));
$$;
