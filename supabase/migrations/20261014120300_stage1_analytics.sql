-- Stage 1: product analytics, one table. No IP address, user agent, device
-- identifier or free text is stored: only which of five actions happened, on
-- which event (if any), by which signed-in user (if any), and when.
--
-- Clients may only insert event_name and event_id. user_id is always the
-- caller (auth.uid(), null when signed out) and created_at is always now(),
-- so neither can be forged. Signed-in users can read their own rows (data
-- export). No one but the service role can update or delete; a user's rows
-- are deleted with their account.
--
-- Turning analytics off: build the app with VITE_ANALYTICS_ENABLED=false
-- (stops sending), and/or run
--   revoke insert on public.analytics_events from anon, authenticated;
-- (stops accepting, for every deployed build). See docs/stage1.md.

create table public.analytics_events (
  id          bigint generated always as identity primary key,
  user_id     uuid default auth.uid() references auth.users (id) on delete cascade,
  event_name  text not null check (event_name in (
                'event_detail_opened', 'event_saved', 'follow_added', 'buy_link_tapped', 'discover_opened')),
  event_id    text check (length(event_id) between 1 and 200),
  created_at  timestamptz not null default now()
);
create index analytics_events_name_time_idx on public.analytics_events (event_name, created_at);
create index analytics_events_user_idx on public.analytics_events (user_id) where user_id is not null;

alter table public.analytics_events enable row level security;

create policy "Insert own or anonymous" on public.analytics_events
  for insert to anon, authenticated
  with check (user_id is not distinct from (select auth.uid()));
create policy "Own rows: read" on public.analytics_events
  for select to authenticated using (user_id = (select auth.uid()));

revoke all on public.analytics_events from anon, authenticated;
grant insert (event_name, event_id) on public.analytics_events to anon, authenticated;
grant select on public.analytics_events to authenticated;
