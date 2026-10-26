-- Minimal stand-in for what a Supabase project provides before our migrations
-- run: the anon/authenticated/service_role roles, the auth schema with
-- auth.users and auth.uid(), and the extensions schema. Used only by
-- scripts/test-db.sh on a throwaway local database. Never run this on Supabase.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end;
$$;

create schema if not exists extensions;
create schema auth;
grant usage on schema auth to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;
grant usage on schema extensions to anon, authenticated, service_role;

create table auth.users (
  id                  uuid primary key,
  email               text,
  raw_user_meta_data  jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now()
);

-- Supabase cascades sessions/identities from auth.users; one table is enough to check that.
create table auth.sessions (
  id       uuid primary key,
  user_id  uuid not null references auth.users (id) on delete cascade
);

-- Same contract as Supabase: the "sub" claim of the request JWT, or null.
create function auth.uid() returns uuid language sql stable as $$
  select nullif(coalesce(current_setting('request.jwt.claim.sub', true),
                         current_setting('request.jwt.claims', true)::jsonb ->> 'sub'), '')::uuid
$$;
grant execute on function auth.uid() to anon, authenticated, service_role;

-- Supabase's default privileges: anon/authenticated get everything on new
-- public tables and functions, and RLS + explicit revokes narrow it. Reproduce
-- that so the tests catch a missing revoke.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
