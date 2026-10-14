-- Stage 1: KVKK self-service. Called from Settings with supabase.rpc():
--   delete_my_account('SİL')  deletes the caller's auth user and every personal row
--   export_my_data()          returns the caller's data as one JSON document
-- Both act only on auth.uid(); neither takes a user id.

-- ---------------------------------------------------------------- deletion
-- The confirmation word is checked here too, so a stray call cannot delete an
-- account. Personal rows are deleted explicitly (not only through the
-- on delete cascade foreign keys) so the function stays correct if a cascade
-- is ever dropped. Deleting the auth.users row also removes the user's
-- sessions, refresh tokens and identities (Supabase's own cascades).
create function public.delete_my_account(confirmation text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  if confirmation is distinct from 'SİL' then
    raise exception 'confirmation word does not match' using errcode = '22023';
  end if;

  delete from public.analytics_events    where user_id = uid;
  delete from public.notifications       where user_id = uid;
  delete from public.attended_events     where user_id = uid;
  delete from public.saved_events        where user_id = uid;
  delete from public.followed_venues     where user_id = uid;
  delete from public.followed_performers where user_id = uid;
  delete from public.profiles            where user_id = uid;
  delete from auth.users                 where id = uid;
end;
$$;

revoke execute on function public.delete_my_account(text) from public, anon;
grant execute on function public.delete_my_account(text) to authenticated;

-- ---------------------------------------------------------------- export
-- Security definer so it can read the caller's e-mail and sign-up date from
-- auth.users; every query is filtered by auth.uid().
create function public.export_my_data() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;

  return jsonb_build_object(
    'format', 'eventall-export-v1',
    'exported_at', now(),
    'account', (
      select jsonb_build_object('id', u.id, 'email', u.email, 'created_at', u.created_at)
      from auth.users u where u.id = uid),
    'profile', (
      select jsonb_build_object('display_name', p.display_name, 'city', p.city,
                                'created_at', p.created_at, 'updated_at', p.updated_at)
      from public.profiles p where p.user_id = uid),
    'followed_performers', coalesce((
      select jsonb_agg(jsonb_build_object('performer_id', f.performer_id, 'name', pf.name, 'followed_at', f.created_at)
                       order by f.created_at)
      from public.followed_performers f left join public.performers pf on pf.id = f.performer_id
      where f.user_id = uid), '[]'::jsonb),
    'followed_venues', coalesce((
      select jsonb_agg(jsonb_build_object('venue_id', f.venue_id, 'name', v.name, 'followed_at', f.created_at)
                       order by f.created_at)
      from public.followed_venues f left join public.venues v on v.id = f.venue_id
      where f.user_id = uid), '[]'::jsonb),
    'saved_events', coalesce((
      select jsonb_agg(jsonb_build_object('event_id', s.event_id, 'title', e.title, 'starts_at', e.starts_at,
                                          'saved_at', s.created_at)
                       order by s.created_at)
      from public.saved_events s left join public.events e on e.id = s.event_id
      where s.user_id = uid), '[]'::jsonb),
    'attended_events', coalesce((
      select jsonb_agg(jsonb_build_object('event_id', a.event_id, 'title', e.title, 'starts_at', e.starts_at,
                                          'marked_at', a.created_at)
                       order by a.created_at)
      from public.attended_events a left join public.events e on e.id = a.event_id
      where a.user_id = uid), '[]'::jsonb),
    'notifications', coalesce((
      select jsonb_agg(jsonb_build_object('kind', n.kind, 'event_id', n.event_id, 'title', n.title, 'body', n.body,
                                          'created_at', n.created_at, 'read_at', n.read_at)
                       order by n.created_at)
      from public.notifications n where n.user_id = uid), '[]'::jsonb),
    'activity', coalesce((
      select jsonb_agg(jsonb_build_object('event_name', a.event_name, 'event_id', a.event_id, 'created_at', a.created_at)
                       order by a.created_at)
      from public.analytics_events a where a.user_id = uid), '[]'::jsonb)
  );
end;
$$;

revoke execute on function public.export_my_data() from public, anon;
grant execute on function public.export_my_data() to authenticated;
