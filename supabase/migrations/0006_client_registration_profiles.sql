-- Automatically provision every new signup as a client in the MVP lawyer workspace.
-- The first configured admin profile determines the default lawyer tenant.
-- This migration also repairs existing Auth users that have no profile.

create or replace function public.provision_new_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  assigned_lawyer_id uuid;
begin
  select p.lawyer_id
    into assigned_lawyer_id
  from public.profiles p
  where p.role = 'admin'
    and p.lawyer_id is not null
  order by p.created_at asc
  limit 1;

  if assigned_lawyer_id is null then
    raise exception 'LEGALMIND_WORKSPACE_NOT_CONFIGURED: create/configure the admin profile and lawyer workspace before allowing registrations';
  end if;

  insert into public.profiles (
    id, lawyer_id, full_name, role, preferred_language
  )
  values (
    new.id,
    assigned_lawyer_id,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''),
    'client',
    'en'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_provision_profile on auth.users;
create trigger on_auth_user_created_provision_profile
after insert on auth.users
for each row execute procedure public.provision_new_auth_user_profile();

-- Backfill users created before the trigger was installed.
insert into public.profiles (id, lawyer_id, full_name, role, preferred_language)
select
  u.id,
  admin_workspace.lawyer_id,
  nullif(trim(coalesce(u.raw_user_meta_data ->> 'full_name', '')), ''),
  'client',
  'en'
from auth.users u
cross join lateral (
  select p.lawyer_id
  from public.profiles p
  where p.role = 'admin'
    and p.lawyer_id is not null
  order by p.created_at asc
  limit 1
) admin_workspace
left join public.profiles existing on existing.id = u.id
where existing.id is null
on conflict (id) do nothing;

comment on function public.provision_new_auth_user_profile() is
  'Creates a least-privilege client profile for each new Auth user in the configured MVP lawyer workspace.';
