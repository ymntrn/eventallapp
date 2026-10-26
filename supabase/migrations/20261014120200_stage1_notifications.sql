-- Stage 1: notifications data model only. Nothing creates or sends
-- notifications yet; the app shows an in-app "Bildirimler" list that stays
-- empty. A later job (service role, bypasses RLS) will insert rows, e.g. "a
-- followed artist announced a new event", and push delivery comes after that.
--
-- RLS: users read their own rows, can mark them read and delete them. No
-- insert policy: only the service role creates notifications.

create table public.notifications (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  kind        text not null check (kind in ('new_event_followed_performer', 'new_event_followed_venue', 'saved_event_reminder')),
  event_id    text references public.events (id) on update cascade on delete cascade,
  title       text not null check (length(trim(title)) > 0),
  body        text,
  created_at  timestamptz not null default now(),
  read_at     timestamptz
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

create policy "Own notifications: read" on public.notifications
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Own notifications: mark read" on public.notifications
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "Own notifications: delete" on public.notifications
  for delete to authenticated using (user_id = (select auth.uid()));

revoke all on public.notifications from anon, authenticated;
grant select, delete on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;
