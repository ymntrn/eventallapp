# Stage 1: accounts, follows, Discover, Tonight, calendar, analytics

This page explains how to switch Stage 1 on: which migrations to apply, how to set up
Supabase Auth, and how to check the result. **Nothing here has been applied to the live
project** (`zlubkusxrdvutvuukhgj`). The full report is in [`stage1-report.md`](stage1-report.md).

## 1. Migrations

Five new files in `supabase/migrations/`, applied **in this order**, after the existing
`20261009120000_init_schema.sql` (which is already live):

| File | Creates |
| --- | --- |
| `20261014120000_stage1_profiles.sql` | `profiles` (display name, city; private) and the `on_auth_user_created` trigger that creates the row at sign-up |
| `20261014120100_stage1_follows_saved.sql` | `followed_performers`, `followed_venues`, `saved_events`, `attended_events` |
| `20261014120200_stage1_notifications.sql` | `notifications` (data model only, nothing writes to it yet) |
| `20261014120300_stage1_analytics.sql` | `analytics_events` |
| `20261014120400_stage1_account_functions.sql` | `delete_my_account(confirmation)` and `export_my_data()` |

Every new table has RLS on. Signed-in users can read and write only their own rows.
Anonymous users can only insert analytics rows. Events, venues, performers and offers stay
public and read-only.

### Recommended: try on a second project first

1. Create a free Supabase project (e.g. `eventall-staging`), apply `init_schema.sql`, seed it
   (`docs/backend.md`), then apply the five Stage 1 files.
2. Point a local build at it (`.env.local`, see section 4) and run through
   [How to test](stage1-report.md#how-to-test).
3. Only then apply the same five files to the live project.

### Applying

With the Supabase CLI (already linked as in `docs/backend.md`):

```bash
supabase db push        # applies every migration not yet recorded in the project
```

`db push` only works if the project's migration history knows that `20261009120000` is
already applied. That migration was pasted into the SQL editor, so the history may be
empty. Check with `supabase migration list`. If the remote column is empty for
`20261009120000`, first run `supabase migration repair --status applied 20261009120000`,
or else `db push` will try to create the existing tables again and fail.

Without the CLI: open the SQL editor and paste each of the five files, **one at a time, in
the order above**, and run it. Each file is self-contained.

Do **not** run anything from `supabase/tests/` on Supabase. `supabase_stub.sql` fakes the
`auth` schema for local tests only.

### Check after applying (SQL editor)

```sql
-- every public table has RLS on (expect 0 rows)
select relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;

-- the account functions exist and anon cannot run them (expect false, false)
select has_function_privilege('anon', 'public.delete_my_account(text)', 'execute'),
       has_function_privilege('anon', 'public.export_my_data()', 'execute');
```

With the anon key, `curl "$VITE_SUPABASE_URL/rest/v1/profiles?select=*" -H "apikey: $KEY" -H "Authorization: Bearer $KEY"`
must return an error (`42501`), not `[]`.

### Rolling back

```sql
drop function if exists public.export_my_data(), public.delete_my_account(text);
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
drop table if exists public.analytics_events, public.notifications, public.attended_events,
  public.saved_events, public.followed_venues, public.followed_performers, public.profiles;
```

This deletes all account data except the `auth.users` rows themselves.

## 2. Supabase Auth settings (dashboard)

Authentication → Sign In / Providers → **Email**:

| Setting | Value | Why |
| --- | --- | --- |
| Enable Email provider | on | e-mail + password accounts |
| Confirm email | **on** (recommended) | the app handles both. With it on, sign-up shows "E-postanı kontrol et" and the user signs in after clicking the link |
| Minimum password length | 8 | the app asks for 8 (`MIN_PASSWORD` in `src/pages/LoginPage.tsx`). Supabase's default is 6 |
| Secure email change | leave default | e-mail change is not offered in the app yet |

Authentication → **URL Configuration**:

| Setting | Value |
| --- | --- |
| Site URL | `https://ymntrn.github.io/eventallapp/` |
| Redirect URLs | `https://ymntrn.github.io/eventallapp/`, `http://localhost:5173/`, `http://localhost:4173/` (plus the Vercel/Netlify URL if you deploy there) |

### Why this works with the hash router

The app routes with `#/…`. Supabase's older *implicit* flow returns tokens in the URL
fragment (`#access_token=…`), which would clash with those routes. The app uses the
**PKCE** flow instead (`flowType: 'pkce'` in `src/lib/supabase-client.ts`):

1. Sign-up sends `emailRedirectTo = location.origin + location.pathname`, e.g.
   `https://ymntrn.github.io/eventallapp/`. It never includes the `#/…` part.
2. The confirmation e-mail links to Supabase, which confirms the address and redirects to
   `https://ymntrn.github.io/eventallapp/?code=…`. The code is in the **query string**, so the
   hash router is not affected.
3. On load, supabase-js exchanges the code for a session. `initAuth()` then removes
   `?code=…` from the address bar and shows "E-postan doğrulandı".

What to know:
- The exchange needs the PKCE verifier that was saved **in the browser where the user signed
  up**. If the link is opened in another browser or app (e.g. the Gmail in-app browser), the
  address is still confirmed but no session is created. The app then says "Doğrulama
  bağlantısı bu tarayıcıda tamamlanamadı…", and the user signs in normally.
- If a redirect URL is not in the allow-list, Supabase falls back to the Site URL. With the
  Site URL above, the worst case is landing on the Pages app.
- The default e-mail templates (`{{ .ConfirmationURL }}`) work with PKCE. No template change
  is needed.

This was checked in the code and in a browser against a mocked Auth API. It has **not**
been tried against the real project, because that needs the dashboard settings above.

### E-mail sending

Supabase's built-in e-mail service is meant for testing. It sends only a few auth e-mails per
hour and only to team members' addresses unless you configure custom SMTP. Before real
users sign up, set Authentication → Emails → **SMTP Settings** to a provider of your choice.
That is a separate (possibly paid) service. It was not added here; it is listed under "Needs
human action" in the report.

## 3. Account deletion and export

- **Hesabımı sil** (Settings → Hesap verilerim) asks the user to type `SİL` (any case, and
  `SIL` without the dotted İ also works). It calls `delete_my_account('SİL')`, which checks
  the word again, deletes the caller's analytics, notifications, attended and saved events,
  follows and profile, then deletes the `auth.users` row (sessions and identities cascade).
  The app then removes the local session. Covered by `supabase/tests/stage1.test.sql` and
  `src/lib/account.test.ts`.
- **Verilerimi indir (JSON)** calls `export_my_data()` and downloads
  `eventall-verilerim-YYYY-MM-DD.json`. It contains the account (id, e-mail, sign-up date),
  profile, followed artists and venues, saved and attended events, notifications and
  activity (the user's analytics rows).

Both functions are `security definer` and act only on `auth.uid()`. Anonymous callers are
refused.

## 4. Environment variables

| Variable | Where | Value |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | `.env.local` / hosting build env | as before (`docs/backend.md`) |
| `VITE_SUPABASE_ANON_KEY` | same | as before. Still safe in the browser: RLS limits every user to their own rows |
| `VITE_ANALYTICS_ENABLED` | same, optional | leave unset for on. Set `false` (or `0`, `off`) to stop sending analytics |

Without the two `VITE_SUPABASE_*` variables the app runs read-only on the bundled JSON.
Accounts are then unavailable, and the login page and Settings say so.

## 5. Analytics: what is stored, how to turn it off

One row per action in `public.analytics_events`: `event_name` (one of
`event_detail_opened`, `event_saved`, `follow_added`, `buy_link_tapped`,
`discover_opened`), `event_id` (or null), `user_id` (filled in by the database from the
session, null when signed out) and `created_at` (set by the database). The client can only
write the first two columns. There is no IP address, user agent, device id or free text.
Supabase's own API gateway logs still see request IPs, as for every request. That log is not
in this table.

To turn it off:
- **New builds:** `VITE_ANALYTICS_ENABLED=false`, rebuild, deploy.
- **Immediately, for every deployed build:** run
  `revoke insert on public.analytics_events from anon, authenticated;` in the SQL editor.
  Clients get a permission error, which the app ignores. Undo with
  `grant insert (event_name, event_id) on public.analytics_events to anon, authenticated;`.

Example queries:

```sql
-- buy-link taps per day
select date_trunc('day', created_at at time zone 'Europe/Istanbul') as day, count(*)
from analytics_events where event_name = 'buy_link_tapped' group by 1 order by 1;

-- event detail opens → buy taps, per event
select event_id,
       count(*) filter (where event_name = 'event_detail_opened') as opens,
       count(*) filter (where event_name = 'buy_link_tapped')     as taps
from analytics_events where event_id is not null group by 1 order by taps desc;
```

## 6. Tests

```bash
npm test          # unit tests, incl. Discover scoring, Tonight window, deletion/export logic
npm run test:db   # migrations + RLS + delete/export on a throwaway local Postgres
```

`npm run test:db` needs Postgres 15+ with PostGIS on the machine. It either starts a temporary
cluster itself (`initdb`, not as root) or uses `TEST_DATABASE_URL` (a superuser connection to a
**local** server; it creates and drops its own database and refuses Supabase hosts). It loads
`supabase/tests/supabase_stub.sql` (roles, `auth.users`, `auth.uid()` and Supabase's default
grants), then every migration, then `supabase/tests/stage1.test.sql`.
