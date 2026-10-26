-- Stage 1 database tests: signup trigger, RLS on every new table, analytics
-- column grants, export_my_data() and delete_my_account().
-- Run with: npm run test:db  (scripts/test-db.sh: fresh local database,
-- supabase_stub.sql, then every migration, then this file). Any failed
-- assertion or unexpected error stops the run with a non-zero exit code.

\set ON_ERROR_STOP 1
\set QUIET 1
\o /dev/null

-- ---------------------------------------------------------------- helpers
-- Runs `sql` and asserts it fails with SQLSTATE `code` (42501 = insufficient privilege / RLS).
create function pg_temp.expect_error(sql text, code text, what text) returns void language plpgsql as $$
begin
  begin
    execute sql;
  exception
    when others then
      if sqlstate <> code then
        raise exception 'FAIL: % (expected error %, got % %)', what, code, sqlstate, sqlerrm;
      end if;
      return;
  end;
  raise exception 'FAIL: % (expected error %, got success)', what, code;
end;
$$;
grant execute on function pg_temp.expect_error(text, text, text) to anon, authenticated;

create function pg_temp.check(ok boolean, what text) returns void language plpgsql as $$
begin
  if ok is not true then
    raise exception 'FAIL: %', what;
  end if;
end;
$$;
grant execute on function pg_temp.check(boolean, text) to anon, authenticated;

-- ---------------------------------------------------------------- fixtures (superuser)
insert into public.venues (id, name, type, city, location, verified) values
  ('ank-test-salon', 'Test Salon', 'concert_hall', 'Ankara',
   extensions.st_setsrid(extensions.st_makepoint(32.85, 39.92), 4326)::extensions.geography, true),
  ('ist-test-sahne', 'Test Sahne', 'theater', 'İstanbul',
   extensions.st_setsrid(extensions.st_makepoint(29.0, 41.0), 4326)::extensions.geography, true);
insert into public.performers (id, name, kind) values ('test-grup', 'Test Grup', 'band'), ('test-dj', 'Test DJ', 'dj');
insert into public.events (id, venue_id, title, category, starts_at) values
  ('ev-1', 'ank-test-salon', 'Etkinlik 1', 'rock', now() + interval '1 day'),
  ('ev-2', 'ist-test-sahne', 'Etkinlik 2', 'theater', now() + interval '2 days');

-- Two users, A and B, created the way Supabase Auth does it (insert into auth.users).
insert into auth.users (id, email, raw_user_meta_data) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'ada@example.com', '{"display_name": "Ada", "city": "Ankara"}'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'bora@example.com', '{"display_name": "  ", "city": "İzmir"}');
insert into auth.sessions (id, user_id) values
  ('aaaaaaaa-1111-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001'),
  ('bbbbbbbb-1111-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002');

\echo '1. signup trigger creates a profile'
select pg_temp.check((select display_name = 'Ada' and city = 'Ankara' from public.profiles
                      where user_id = 'aaaaaaaa-0000-0000-0000-000000000001'), 'profile A from metadata');
select pg_temp.check((select display_name = 'bora' and city is null from public.profiles
                      where user_id = 'bbbbbbbb-0000-0000-0000-000000000002'), 'profile B: name from e-mail, unknown city → null');

-- ---------------------------------------------------------------- user B's data
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-000000000002', true);
insert into public.followed_performers (performer_id) values ('test-dj');
insert into public.followed_venues (venue_id) values ('ist-test-sahne');
insert into public.saved_events (event_id) values ('ev-2');
insert into public.attended_events (event_id) values ('ev-2');
insert into public.analytics_events (event_name, event_id) values ('event_saved', 'ev-2');
commit;

-- ---------------------------------------------------------------- user A
\echo '2. owner can write own rows; user_id defaults to the caller'
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
insert into public.followed_performers (performer_id) values ('test-grup');
insert into public.followed_venues (venue_id) values ('ank-test-salon');
insert into public.saved_events (event_id) values ('ev-1');
insert into public.attended_events (event_id) values ('ev-1');
insert into public.analytics_events (event_name, event_id) values ('follow_added', null), ('event_detail_opened', 'ev-1');
select pg_temp.check((select count(*) = 1 from public.followed_performers), 'A sees exactly own performer follow');
select pg_temp.check((select user_id = 'aaaaaaaa-0000-0000-0000-000000000001' from public.saved_events), 'user_id defaulted to A');
commit;

\echo '3. no one reads or writes another user''s rows'
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
select pg_temp.check((select count(*) = 1 from public.profiles), 'A sees only own profile');
select pg_temp.check((select count(*) = 1 from public.followed_venues), 'A sees only own venue follows');
select pg_temp.check((select count(*) = 1 from public.saved_events), 'A sees only own saved events');
select pg_temp.check((select count(*) = 1 from public.attended_events), 'A sees only own attended events');
select pg_temp.check((select count(*) = 2 from public.analytics_events), 'A sees only own analytics rows');
select pg_temp.expect_error(
  $q$insert into public.saved_events (user_id, event_id) values ('bbbbbbbb-0000-0000-0000-000000000002', 'ev-1')$q$,
  '42501', 'A inserts a row for B');
select pg_temp.expect_error(
  $q$insert into public.followed_performers (user_id, performer_id) values ('bbbbbbbb-0000-0000-0000-000000000002', 'test-grup')$q$,
  '42501', 'A inserts a follow for B');
-- RLS hides B's rows, so these touch nothing.
delete from public.saved_events where user_id = 'bbbbbbbb-0000-0000-0000-000000000002';
update public.profiles set display_name = 'hacked' where user_id = 'bbbbbbbb-0000-0000-0000-000000000002';
-- Own profile: name and city are editable, user_id is not.
update public.profiles set display_name = 'Ada L.', city = 'İstanbul';
select pg_temp.expect_error($q$update public.profiles set user_id = 'bbbbbbbb-0000-0000-0000-000000000002'$q$,
  '42501', 'A changes profile user_id');
select pg_temp.expect_error($q$insert into public.profiles (user_id, display_name) values (gen_random_uuid(), 'x')$q$,
  '42501', 'A inserts a profile');
select pg_temp.expect_error($q$update public.analytics_events set event_name = 'discover_opened'$q$,
  '42501', 'A updates analytics');
select pg_temp.expect_error($q$delete from public.analytics_events$q$, '42501', 'A deletes analytics');
commit;
select pg_temp.check((select count(*) = 1 from public.saved_events where user_id = 'bbbbbbbb-0000-0000-0000-000000000002'),
  'B''s saved event survived A''s delete');
select pg_temp.check((select display_name = 'bora' from public.profiles where user_id = 'bbbbbbbb-0000-0000-0000-000000000002'),
  'B''s profile survived A''s update');
select pg_temp.check((select display_name = 'Ada L.' and city = 'İstanbul' from public.profiles
                      where user_id = 'aaaaaaaa-0000-0000-0000-000000000001'), 'A updated own profile');

\echo '4. analytics: user_id and created_at cannot be forged'
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
select pg_temp.expect_error(
  $q$insert into public.analytics_events (user_id, event_name) values ('bbbbbbbb-0000-0000-0000-000000000002', 'discover_opened')$q$,
  '42501', 'A writes analytics as B');
select pg_temp.expect_error(
  $q$insert into public.analytics_events (event_name, created_at) values ('discover_opened', now() - interval '1 year')$q$,
  '42501', 'A backdates analytics');
select pg_temp.expect_error($q$insert into public.analytics_events (event_name) values ('page_view')$q$,
  '23514', 'unknown analytics event name');
commit;

\echo '5. signed-out (anon) users'
begin;
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
insert into public.analytics_events (event_name, event_id) values ('event_detail_opened', 'ev-1');
select pg_temp.check((select count(*) = 2 from public.events), 'anon still reads public events');
select pg_temp.check((select count(*) = 2 from public.venues_with_coords), 'anon still reads venues');
select pg_temp.expect_error('select * from public.analytics_events', '42501', 'anon reads analytics');
select pg_temp.expect_error('select * from public.profiles', '42501', 'anon reads profiles');
select pg_temp.expect_error('select * from public.followed_performers', '42501', 'anon reads follows');
select pg_temp.expect_error('select * from public.saved_events', '42501', 'anon reads saved events');
select pg_temp.expect_error('select * from public.notifications', '42501', 'anon reads notifications');
select pg_temp.expect_error($q$insert into public.saved_events (event_id) values ('ev-1')$q$, '42501', 'anon saves an event');
select pg_temp.expect_error($q$select public.export_my_data()$q$, '42501', 'anon exports');
select pg_temp.expect_error($q$select public.delete_my_account('SİL')$q$, '42501', 'anon deletes');
select pg_temp.expect_error($q$insert into public.events (id, venue_id, title, category, starts_at)
                              values ('x', 'ank-test-salon', 'x', 'rock', now())$q$, '42501', 'anon writes events');
commit;
select pg_temp.check((select count(*) = 1 from public.analytics_events where user_id is null), 'anonymous analytics row stored without user');

\echo '6. notifications: service role writes, owner reads and marks read'
insert into public.notifications (user_id, kind, event_id, title) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'new_event_followed_performer', 'ev-1', 'Test Grup Ankara''da'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'new_event_followed_venue', 'ev-2', 'Test Sahne''de yeni etkinlik');
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
select pg_temp.check((select count(*) = 1 from public.notifications), 'A sees only own notification');
update public.notifications set read_at = now();
select pg_temp.expect_error($q$update public.notifications set title = 'x'$q$, '42501', 'A edits notification text');
select pg_temp.expect_error($q$insert into public.notifications (user_id, kind, title)
                              values ('aaaaaaaa-0000-0000-0000-000000000001', 'saved_event_reminder', 'x')$q$,
  '42501', 'A creates a notification');
commit;
select pg_temp.check((select read_at is null from public.notifications where user_id = 'bbbbbbbb-0000-0000-0000-000000000002'),
  'B''s notification untouched');

\echo '7. export_my_data returns only the caller''s data'
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
create temp table export_a on commit drop as select public.export_my_data() as j;
select pg_temp.check((select j -> 'account' ->> 'email' = 'ada@example.com' from export_a), 'export: e-mail');
select pg_temp.check((select j -> 'profile' ->> 'display_name' = 'Ada L.' from export_a), 'export: profile');
select pg_temp.check((select j -> 'followed_performers' -> 0 ->> 'name' = 'Test Grup'
                      and jsonb_array_length(j -> 'followed_performers') = 1 from export_a), 'export: performer follows');
select pg_temp.check((select jsonb_array_length(j -> 'followed_venues') = 1 from export_a), 'export: venue follows');
select pg_temp.check((select j -> 'saved_events' -> 0 ->> 'event_id' = 'ev-1'
                      and jsonb_array_length(j -> 'saved_events') = 1 from export_a), 'export: saved events');
select pg_temp.check((select jsonb_array_length(j -> 'attended_events') = 1 from export_a), 'export: attended');
select pg_temp.check((select jsonb_array_length(j -> 'notifications') = 1 from export_a), 'export: notifications');
select pg_temp.check((select jsonb_array_length(j -> 'activity') = 2 from export_a), 'export: activity');
select pg_temp.check((select position('bora' in j::text) = 0 and position('ev-2' in j::text) = 0 from export_a),
  'export contains nothing of B');
commit;

\echo '8. delete_my_account'
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
select pg_temp.expect_error($q$select public.delete_my_account('sil')$q$, '22023', 'wrong confirmation word');
select pg_temp.expect_error($q$select public.delete_my_account(null)$q$, '22023', 'missing confirmation word');
commit;
select pg_temp.check((select count(*) = 1 from auth.users where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  'A still exists after wrong word');

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
select public.delete_my_account('SİL');
commit;

-- Every personal row of A is gone ...
select pg_temp.check((select count(*) = 0 from auth.users where id = 'aaaaaaaa-0000-0000-0000-000000000001'), 'A auth user deleted');
select pg_temp.check((select count(*) = 0 from auth.sessions where user_id = 'aaaaaaaa-0000-0000-0000-000000000001'), 'A sessions deleted');
select pg_temp.check((select count(*) = 0 from public.profiles where user_id = 'aaaaaaaa-0000-0000-0000-000000000001'), 'A profile deleted');
select pg_temp.check((select count(*) = 0 from public.followed_performers where user_id = 'aaaaaaaa-0000-0000-0000-000000000001'), 'A performer follows deleted');
select pg_temp.check((select count(*) = 0 from public.followed_venues where user_id = 'aaaaaaaa-0000-0000-0000-000000000001'), 'A venue follows deleted');
select pg_temp.check((select count(*) = 0 from public.saved_events where user_id = 'aaaaaaaa-0000-0000-0000-000000000001'), 'A saved events deleted');
select pg_temp.check((select count(*) = 0 from public.attended_events where user_id = 'aaaaaaaa-0000-0000-0000-000000000001'), 'A attended deleted');
select pg_temp.check((select count(*) = 0 from public.notifications where user_id = 'aaaaaaaa-0000-0000-0000-000000000001'), 'A notifications deleted');
select pg_temp.check((select count(*) = 0 from public.analytics_events where user_id = 'aaaaaaaa-0000-0000-0000-000000000001'), 'A analytics deleted');
-- ... while B and the public catalogue are untouched.
select pg_temp.check((select count(*) = 1 from auth.users where id = 'bbbbbbbb-0000-0000-0000-000000000002'), 'B still exists');
select pg_temp.check((select count(*) = 1 from public.saved_events where user_id = 'bbbbbbbb-0000-0000-0000-000000000002'), 'B saved event kept');
select pg_temp.check((select count(*) = 1 from public.followed_performers where user_id = 'bbbbbbbb-0000-0000-0000-000000000002'), 'B follows kept');
select pg_temp.check((select count(*) = 1 from public.analytics_events where user_id = 'bbbbbbbb-0000-0000-0000-000000000002'), 'B analytics kept');
select pg_temp.check((select count(*) = 1 from public.analytics_events where user_id is null), 'anonymous analytics kept');
select pg_temp.check((select count(*) = 2 from public.events), 'events kept');
select pg_temp.check((select count(*) = 2 from public.performers), 'performers kept');

\echo '9. every public table has RLS enabled'
select pg_temp.check(
  (select bool_and(c.relrowsecurity) from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r'),
  'RLS enabled on every table in public');

\echo 'All Stage 1 database tests passed.'
