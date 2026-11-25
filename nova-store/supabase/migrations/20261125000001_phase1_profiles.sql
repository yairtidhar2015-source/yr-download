-- NOVA STORE · Phase 1 · User profiles
-- Passwords live only in Supabase Auth (auth.users); this table holds non-secret profile data.

create type public.platform_role as enum ('user', 'platform_admin');

create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  full_name     text check (char_length(full_name) between 1 and 80),
  avatar_url    text,
  locale        text not null default 'he' check (locale in ('he', 'en', 'ar', 'es')),
  platform_role public.platform_role not null default 'user',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Keep updated_at current.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Create a profile automatically for every new auth user.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, nullif(left(trim(new.raw_user_meta_data ->> 'full_name'), 80), ''));
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper used by later RLS policies.
create or replace function public.is_platform_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and platform_role = 'platform_admin');
$$;

-- Row Level Security
alter table public.profiles enable row level security;

create policy "profiles: read own" on public.profiles
  for select to authenticated using (id = (select auth.uid()) or public.is_platform_admin());

create policy "profiles: update own" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Users may edit only these columns; platform_role can never be self-assigned.
revoke update on public.profiles from authenticated, anon;
grant update (full_name, avatar_url, locale) on public.profiles to authenticated;
revoke all on public.profiles from anon;
