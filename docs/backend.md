# Backend (Supabase): setup

The app runs without a backend: by default it reads the bundled JSON in `src/data/`.
Everything below is optional and nothing has been provisioned yet. It sets up a Supabase
(Postgres + PostGIS) project that serves the same data, read-only, to the public.

## What is in the repo

| Path | What it is |
| --- | --- |
| `supabase/migrations/20261009120000_init_schema.sql` | Tables `venues` (PostGIS `geography(Point)`, city, type, OSM fields, verified), `performers`, `events`, `event_performers`, `offers`; view `venues_with_coords` (lat/lng as numbers); CHECK constraints mirroring `src/types.ts`, including the per-city boxes; row-level security with a public read policy on every table and no write policies |
| `scripts/supabase-seed.ts` (`npm run db:seed`) | Writes `supabase/seed.sql` from `src/data/*.json`. Re-runnable (upserts by id, replaces each event's offers and performers). `-- --prune` also deletes events that are no longer in `events.json` |
| `src/lib/supabase-data.ts` | Read path used by `loadData()` when the env vars are set: Supabase REST API (PostgREST) with the anon key, paged, mapped to the same `AppData` shape |
| `src/lib/user-backend.ts` | `UserBackend` interface for accounts and user data. Today `localUserBackend` (localStorage demo) |

The migration and seed were tested on Postgres 16 + PostGIS 3 with PostgREST in front:
the app built with the env vars loaded venues, events, offers and performers from the database.
They have not been run on a real Supabase project.

## What you need to create

1. A Supabase project (supabase.com → New project). Pick region `eu-central-1`
   (Frankfurt), the closest to Turkey. Save the database password.
2. Nothing else for read-only data. Auth providers, storage and edge functions are not used.

## Environment variables

| Variable | Where | Value |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Vercel/Netlify build env, or `.env.local` for `npm run dev` | Project Settings → API → Project URL, e.g. `https://abcd.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | same | Project Settings → API → `anon` `public` key. Safe in the browser: RLS only allows reading |
| `SUPABASE_DB_URL` | your shell only, never in the app | Project Settings → Database → Connection string (URI), used by `psql` for the seed |

The `service_role` key is never needed by the app and must never be put in a `VITE_` variable.
Both `VITE_` variables are read at **build time**: after changing them, rebuild/redeploy. If
either is missing, the app uses the bundled JSON.

## Run the migration

With the Supabase CLI (`npm i -g supabase` or `brew install supabase/tap/supabase`):

```bash
supabase login
supabase init            # once; keeps the existing supabase/migrations folder
supabase link --project-ref <project-ref>
supabase db push         # applies supabase/migrations/*
```

Without the CLI: open the SQL editor in the dashboard, paste the migration file, run it.

PostGIS is enabled by the migration (`create extension postgis with schema extensions`).

## Seed

```bash
npm run db:seed                              # writes supabase/seed.sql from src/data/*.json
psql "$SUPABASE_DB_URL" -f supabase/seed.sql
```

Run it again whenever `src/data/*.json` changes (`npm run import:venues:db`, `npm run seed:events`,
`npm run events:import -- --apply`). Use `npm run db:seed -- --prune` to also delete events that
were removed from `events.json`. `supabase db reset` (local CLI stack) runs `supabase/seed.sql`
automatically.

## Check it

```bash
curl "$VITE_SUPABASE_URL/rest/v1/venues_with_coords?select=id,lat,lng&limit=2" \
  -H "apikey: $VITE_SUPABASE_ANON_KEY" -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY"
```

Then `npm run dev` with the two `VITE_` variables in `.env.local`. The map should look the
same as with the bundled JSON.

## Accounts later (not done)

Login stays the localStorage demo. To move to Supabase Auth:

1. Add tables `profiles`, `favorite_events`, `favorite_performers`, `attended_events` and
   `user_preferences`, keyed by `auth.uid()`, with RLS policies `using (user_id = auth.uid())`
   for select/insert/delete.
2. Implement `UserBackend` (`src/lib/user-backend.ts`) with `@supabase/supabase-js`:
   `signIn` → `auth.signInWithPassword` (pass the password from `LoginPage`, which currently
   calls `actions.signIn(name, email)` without it), toggles → insert/delete rows, `loadCached`
   keeps the local copy for the first render.
3. Call `setUserBackend(supabaseUserBackend, { onSyncError })` in `main.tsx`.
4. Before collecting real accounts: privacy notice and KVKK review (see README TODO).
