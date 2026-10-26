-- Stage 1: accounts. One private profile row per Supabase Auth user.
-- Email + password live in auth.users (Supabase Auth); this table holds only
-- what the app shows: display name and city.
--
-- RLS: a user can read and update only their own row. There is no insert
-- policy (the signup trigger creates the row) and no delete policy (rows go
-- away with the auth user, see delete_my_account()).

create table public.profiles (
  user_id       uuid primary key references auth.users (id) on delete cascade,
  display_name  text not null check (length(trim(display_name)) between 1 and 60),
  city          text check (city in ('Ankara', 'İstanbul')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

alter table public.profiles enable row level security;

create policy "Own profile: read" on public.profiles
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Own profile: update" on public.profiles
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Supabase grants everything to anon/authenticated by default; narrow it.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (display_name, city) on public.profiles to authenticated;

-- ---------------------------------------------------------------- signup trigger
-- Creates the profile from the metadata passed to auth.signUp
-- ({ data: { display_name, city } }). Bad or missing values never block the
-- signup: the name falls back to the part of the e-mail before "@", an unknown
-- city becomes null.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  name text := left(trim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), 60);
  city text := new.raw_user_meta_data ->> 'city';
begin
  if name = '' then
    name := left(coalesce(nullif(split_part(coalesce(new.email, ''), '@', 1), ''), 'Kullanıcı'), 60);
  end if;
  if city is not null and city not in ('Ankara', 'İstanbul') then
    city := null;
  end if;
  insert into public.profiles (user_id, display_name, city) values (new.id, name, city);
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
