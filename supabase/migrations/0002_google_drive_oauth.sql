create table if not exists public.lawyer_google_drive_tokens (
  lawyer_id uuid primary key references public.lawyers(id) on delete cascade,
  token_ciphertext text not null,
  token_iv text not null,
  token_auth_tag text not null,
  connected_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.lawyer_google_drive_tokens enable row level security;
-- Intentionally no policies: only the server-side Supabase service role can access OAuth secrets.
revoke all on public.lawyer_google_drive_tokens from anon, authenticated;
grant all on public.lawyer_google_drive_tokens to service_role;
