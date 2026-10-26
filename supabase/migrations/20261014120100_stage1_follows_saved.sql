-- Stage 1: follows (artists = performers, venues), saved events and "Gittim".
-- All four tables are private to their owner: no follower counts, no public lists.
-- user_id defaults to the caller, so the app never sends it; RLS still checks it.
-- Rows go away with the user (on delete cascade from auth.users) and with the
-- followed performer / venue / event.

create table public.followed_performers (
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  performer_id  text not null references public.performers (id) on update cascade on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (user_id, performer_id)
);
create index followed_performers_performer_idx on public.followed_performers (performer_id);

create table public.followed_venues (
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  venue_id    text not null references public.venues (id) on update cascade on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, venue_id)
);
create index followed_venues_venue_idx on public.followed_venues (venue_id);

create table public.saved_events (
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  event_id    text not null references public.events (id) on update cascade on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, event_id)
);
create index saved_events_event_idx on public.saved_events (event_id);

create table public.attended_events (
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  event_id    text not null references public.events (id) on update cascade on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, event_id)
);
create index attended_events_event_idx on public.attended_events (event_id);

-- ---------------------------------------------------------------- RLS: owner only
do $$
declare
  tbl text;
begin
  foreach tbl in array array['followed_performers', 'followed_venues', 'saved_events', 'attended_events'] loop
    execute format('alter table public.%I enable row level security', tbl);
    execute format(
      'create policy "Own rows: read" on public.%I for select to authenticated using (user_id = (select auth.uid()))', tbl);
    execute format(
      'create policy "Own rows: insert" on public.%I for insert to authenticated with check (user_id = (select auth.uid()))', tbl);
    execute format(
      'create policy "Own rows: delete" on public.%I for delete to authenticated using (user_id = (select auth.uid()))', tbl);
    execute format('revoke all on public.%I from anon, authenticated', tbl);
    execute format('grant select, insert, delete on public.%I to authenticated', tbl);
  end loop;
end;
$$;
