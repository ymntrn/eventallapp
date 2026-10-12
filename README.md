# Eventall

Eventall is a map-first mobile web app for live events in Ankara and İstanbul: concerts, theater and festivals appear as pins on a map. It is an **aggregator**, like Skyscanner for live events. It does **not** sell tickets. Each event page compares prices across ticket sellers (Biletix, Passo, Biletinial, Bubilet, Mobilet…), and "Siteye git" opens the chosen seller in a new tab.

> **Status: prototype with real venues, sample events.**
> - **Venues: real.** 154 venues (51 Ankara, 103 İstanbul): 149 from OpenStreetMap, each linked to its OSM object, and 5 from pins checked by the project owner (marked `verified: true`). All 149 OSM pins passed an automated check against OpenStreetMap (`data/venues/PIN_CHECK.md`); 7 are the centre of a larger site (`precision: complex_centroid`). See `npm run venues:review` and `data/venues/MISSING.md`.
> - **Events, performers, sellers and prices: sample data** (`[Örnek]` titles, links to platform homepages). The importer framework exists (`scripts/events/`), but no platform has been confirmed to allow automated access, so its one adapter runs on a fixture (`docs/ticketing-sources.md`).
> - **Login: demo.** localStorage only, nothing leaves the device. User data goes through a `UserBackend` interface so Supabase Auth can replace it.
> - **Backend: optional, not provisioned.** Supabase schema, seed and data-source switch are ready (`docs/backend.md`).

Stack: Vite + React + TypeScript, MapLibre GL JS with OpenFreeMap vector tiles (no API key), plain CSS, JSON data files, PWA via `vite-plugin-pwa`. No other runtime dependencies.

## Screens

| Screen | Route | What it does |
| --- | --- | --- |
| Map (Keşfet) | `#/`, `#/venue/:id` | Minimal white (or dark) map with black count pins. Search, one filter button, Ankara / İstanbul switch, venue sheet |
| Filter pop-up | (modal) | Date range, event types, "show venues without events". Saved as the user's preferences. Shown once on first visit |
| Event | `#/event/:id` | Date, venue, performers, **price comparison** (cheapest first, sold out last), favorite, "Gittim" |
| Performer | `#/performer/:id` | Musician/comedian/company, favorite, upcoming events |
| Profile | `#/profile[/events\|people\|attended]` | Stats, favorite events, favorite performers, attended events |
| Settings | `#/settings` | Theme (light / dark / system), default date range, city, event preferences, notifications, profile edit, sign out, delete local data, "Hakkında / Veri kaynakları" |
| Login | `#/login?next=…` | Demo sign-in / sign-up, plus "Demo hesabıyla devam et" |

## Run locally

Requires Node.js 20.11 or newer.

```bash
npm install
npm run dev            # http://localhost:5173 (add --host to open it from a phone on the same Wi-Fi)
```

Other commands:

| Command | What it does |
| --- | --- |
| `npm run build` | Validates data, type-checks, and builds to `dist/` |
| `npm run preview` | Serves the production build (PWA/service worker active) |
| `npm test` | Vitest unit tests (`src/**` and `scripts/**`: dates, data joins, store, venue import, Supabase mapping, event importer) |
| `npm run validate:data` | Read-only report on `src/data/*.json`. Also runs before every build |
| `npm run import:venues:db` | Builds `src/data/venues.json` from the OSM venue database `data/venues/eventall_venues.json` |
| `npm run venues:review` | Lists unverified venues with map links; `-- --verify <id>…` marks pins as checked |
| `npm run import:venues` | Alternative: builds `src/data/venues.json` from a hand-made `data/venues_source.csv` |
| `npm run seed:events` | Regenerates the **sample** events with dates relative to today |
| `npm run events:import` | Event importer (fetch → normalize → match venue → merge). Fixture-only today |
| `npm run db:seed` | Writes `supabase/seed.sql` from `src/data/*.json` |

## Data flow

```
OpenStreetMap ──(lookup, 2026-10-09)──▶ data/venues/venues_osm_source.tsv
      python3 data/venues/build_venues.py ──▶ data/venues/eventall_venues.{json,csv,sqlite,geojson}
      npm run import:venues:db            ──▶ src/data/venues.json   (types mapped, ids kept)

platform feeds (none permitted yet) / fixtures
      npm run events:import [-- --apply]  ──▶ src/data/events.json   (today: npm run seed:events, sample)

src/data/*.json ──▶ loadData() ──▶ app            (default, bundled)
src/data/*.json ──npm run db:seed──▶ Supabase ──▶ loadData() ──▶ app   (when VITE_SUPABASE_* are set)
```

`loadData()` in `src/lib/data.ts` is the single swap point for data; both paths produce the same `AppData`.

## Project layout

```
src/
  App.tsx                 routing, theme, data loading, filter pop-up, toasts
  pages/                  MapPage, EventPage, PerformerPage, ProfilePage, SettingsPage, LoginPage
  components/             MapView, VenueSheet (+ EventRow), SearchBox, FilterSheet, BottomNav,
                          FavoriteButton, PageHeader, Link, icons
  data/venues.json        venues, generated from data/venues/ (OSM)
  data/events.json        events with seller offers (sample)
  data/performers.json    musicians, comedians, companies (sample)
  i18n/tr.ts              every UI string (Turkish)
  lib/data.ts             loadData(), joins, filtering, grouping, minPrice/sortOffers
  lib/supabase-data.ts    Supabase read path (REST, anon key)
  lib/venue-db.ts         database → app venue type mapping
  lib/store.ts            app state: demo user, favorites, attended, preferences (incl. city), settings
  lib/user-backend.ts     UserBackend interface + localStorage implementation
  lib/router.ts           tiny hash router
  lib/theme.ts            light/dark/system theme
  lib/dates.ts            Europe/Istanbul date windows and formatting
  lib/slug.ts             Turkish-aware slug function
  lib/geo.ts              per-city bounding boxes and centres, distance
  types.ts                data types and allowed enum values
scripts/
  validate-data.ts        data checks (errors fail, warnings don't)
  import-venues-db.ts     OSM venue database → venues.json
  venues-review.ts        pin review list, --verify / --unverify
  import-venues-csv.ts    CSV → venues.json (manual alternative)
  generate-sample-events.ts
  supabase-seed.ts        JSON → supabase/seed.sql
  events/                 event importer: types, normalize, venue-matcher, merge, pipeline,
                          import (CLI), adapters/biletinial (fixture only), fixtures/
data/
  venues/                 OSM venue database, aliases.json, MISSING.md (see its README)
  venues_source.example.csv
supabase/migrations/      Postgres + PostGIS schema with RLS
docs/                     backend.md, ticketing-sources.md, demo-plan.md
```

## Venue database

The app reads venues only through `loadData()` in `src/lib/data.ts`, which imports `src/data/venues.json`. That file is **generated** from the OSM venue database in `data/venues/` (150 venues: 50 Ankara, 100 İstanbul, every coordinate from OpenStreetMap; see `data/venues/README.md`):

```bash
npm run import:venues:db   # data/venues/eventall_venues.json → src/data/venues.json
npm run validate:data
```

- Ids are kept from the database (`ank-…`, `ist-…`), so event `venueId`s stay stable.
- Every venue starts with `verified: false`. Set `"verified": true` in `src/data/venues.json` once you have checked a pin (`npm run venues:review` lists them). Re-importing keeps `verified: true` for every venue whose coordinates did not change.
- To fix or add a venue, edit `data/venues/venues_osm_source.tsv`, run `python3 data/venues/build_venues.py`, then `npm run import:venues:db`.

### Venue type mapping

The database has 14 venue types; the app has 13. Three app types (`stadium`, `congress_center`, `cultural_center`) were added because folding them into another type would lose real meaning (a stadium is not an arena, a belediye kültür merkezi is not a theatre). The mapping lives in `src/lib/venue-db.ts`.

| Database type | App `VenueType` | Turkish label in the app |
| --- | --- | --- |
| `concert_hall` | `concert_hall` | Konser salonu |
| `opera_house` | `opera` | Opera |
| `theatre` | `theater` | Tiyatro |
| `performance_hall` | `live_music` | Canlı müzik |
| `live_music_bar` | `live_music` | Canlı müzik |
| `nightclub` | `electronic` | Kulüp / elektronik |
| `open_air` | `open_air` | Açık hava |
| `arena` | `arena` | Arena |
| `stadium` | `stadium` *(new)* | Stadyum |
| `congress_center` | `congress_center` *(new)* | Kongre / fuar merkezi |
| `expo_center` | `congress_center` | Kongre / fuar merkezi |
| `cultural_center` | `cultural_center` *(new)* | Kültür merkezi |
| `festival_area` | `festival_ground` | Festival alanı |
| `arts_center` | `performance_space` | Sahne / sanat merkezi |

`classical` is no longer produced by the import but stays valid for hand-curated venues.

### `venues.json` fields

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | Lowercase ASCII slug, unique |
| `name` | string | Unique within a city |
| `type` | enum | `concert_hall`, `live_music`, `electronic`, `open_air`, `festival_ground`, `theater`, `opera`, `classical`, `arena`, `performance_space`, `stadium`, `congress_center`, `cultural_center` |
| `city` | enum | `Ankara` or `İstanbul` |
| `district` | string? | İlçe |
| `address` | string? | Mahalle, ilçe |
| `lat`, `lng` | number | Must fall inside the venue's city box (`CITY_BOUNDS` in `src/lib/geo.ts`) |
| `precision` | enum? | `point`, `building_centroid` or `complex_centroid` (pin is the centre of a larger site) |
| `osmId`, `osmUrl` | string? | The OpenStreetMap object the coordinate came from |
| `verified` | boolean | `true` only once a human has checked the coordinates |

### Manual CSV import (alternative)

`npm run import:venues` builds `src/data/venues.json` from `data/venues_source.csv` instead (header `name,type,city,lat,lng,address`, app types). It **overwrites** the file and generates ids from names, so prefer the database import above.

### What validation checks

`npm run validate:data` prints a report and never modifies files.

- **Errors (fail the build):** unknown `venueId` or `performerId` on an event, duplicate venue/performer ids, duplicate venue names within a city, non-slug ids, invalid `type`/`category`/`kind`/offer `platform`, unknown `city`, coordinates outside the venue's city box, invalid `precision`/`osmId`/`osmUrl`, events without offers, non-https offer `url`, negative prices, malformed `startsAt`, duplicate event ids.
- **Report / warnings (do not fail):** venues per city and how many have events, venues closer than 30 m to each other ("will be clustered"), number of `verified: false` venues, `complex_centroid` venues, events already in the past.

## Adding events

Edit `src/data/events.json`:

```json
{
  "_note": "optional",
  "events": [
    {
      "id": "cso-2026-10-17-beethoven",
      "venueId": "ank-cso-ada-ankara",
      "title": "Beethoven 9",
      "category": "jazz_classical",
      "startsAt": "2026-10-17T20:00:00+03:00",
      "performerIds": ["baskent-oda-orkestrasi"],
      "offers": [
        { "platform": "Biletinial", "url": "https://…official event page…", "price": 300, "label": "Genel giriş" },
        { "platform": "Biletix", "url": "https://…", "price": 320 },
        { "platform": "Passo", "url": "https://…", "price": 290, "label": "Öğrenci", "available": false }
      ]
    }
  ]
}
```

- `category`: `rock`, `pop`, `electronic`, `jazz_classical`, `theater`, `comedy`, `other`
- `offers`: one entry per seller, at least one. `platform` is one of `Biletix`, `Passo`, `Biletinial`, `Bubilet`, `Mobilet`, `Other`; `url` must be https; `price` (TRY), `label` and `available` are optional. The event page sorts them cheapest first, then unpriced, then sold out, and marks the cheapest available one.
- `performerIds`: optional, ids from `src/data/performers.json`
- `startsAt`: ISO 8601 **with offset** (Turkey is always `+03:00`)
- Past events are hidden automatically. No cleanup is needed.

`src/data/performers.json` holds `{ id, name, kind, genre? }` where `kind` is `band`, `musician`, `dj`, `comedian`, `company` or `ensemble`.

The current file is **sample data** made by `npm run seed:events`: 26 Ankara and 18 İstanbul events on real venue ids. Titles start with `[Örnek]`, sellers and prices are invented, and links point only to platform homepages. Re-run it before a test session so the dates stay current. The map's small "Etkinlikler ve fiyatlar örnek veridir" notice shows only while `[Örnek]` events are loaded. Delete the script once real data exists.

## Real events pipeline

`scripts/events/` turns platform listings into `events.json`:

1. **fetch**: a `SourceAdapter` (`scripts/events/types.ts`) returns raw listings. Adapters for platforms that have not permitted automated access read a saved fixture and never fetch live (`docs/ticketing-sources.md`).
2. **normalize**: the adapter maps each listing to a `NormalizedListing` (title, venue name, city, `+03:00` start, https URL, price, sold out, category) using `normalize.ts` (Turkish names, `1.250,50 TL` prices, `17.10.2026` dates, genre → category).
3. **match venue**: `VenueMatcher` matches the platform's venue name within the city: `data/venues/aliases.json` first, then the normalized name, the name without a trailing city or `(…)` part, and the `(…)` part alone. Ambiguous names never match. Unmatched names are reported, so you can add aliases.
4. **merge**: listings at the same venue, starting within 30 minutes, with similar titles become one event with one offer per platform (cheapest available listing per platform).
5. **write**: `data/events/imported.json`; with `--apply` also `src/data/events.json`.

```bash
npm run events:import -- --city Ankara                       # all adapters
npm run events:import -- --source biletinial --fixture my.json
```

The only adapter today is `biletinial`, which reads `scripts/events/fixtures/biletinial-ankara.sample.json` (invented data). Adding a platform = one file in `scripts/events/adapters/` plus a line in `import.ts`.

## Deploying

The output is a static site in `dist/`. No environment variables or secrets are needed. Optionally set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to read data from Supabase (`docs/backend.md`).

**Vercel:** import the repo at vercel.com/new. `vercel.json` already sets the Vite framework, `npm run build` and `dist`. Or run `npx vercel` from the repo.

**Netlify:** "Add new site → Import from Git". `netlify.toml` sets the build command, the publish directory and Node 22. Or run `npx netlify deploy --build --prod`.

Both configs serve `sw.js` with `no-cache` so testers receive updates. To install on a phone, open the deployed HTTPS URL. On Android use Chrome → "Ana ekrana ekle". On iOS use Safari → Share → "Ana Ekrana Ekle". Geolocation ("Yakınımda") also requires HTTPS, or localhost.

## Behaviour and decisions

- **Cities.** Ankara / İstanbul switch on the map (also in Settings), saved in preferences. Switching fits the map to that city's venues with matching events, or all its venues if none match. The map, counts and filter pop-up count only the chosen city; search covers both, and opening a venue in the other city switches to it.
- **Attribution.** "© OpenStreetMap contributors" is always visible: in the map's attribution control (compact only on maps ≤ 640 px wide), and on phones as a small permanent link bottom-left while the compact control is collapsed. Settings → "Hakkında / Veri kaynakları" credits OpenStreetMap (ODbL) for venues and OpenFreeMap for tiles.
- **Map.** OpenFreeMap "Positron" (light) and "Dark" vector styles, no API key. The background is forced to white / app-dark so the map matches the UI. Pins are monochrome (black in light mode, white in dark mode) with the event count; the selected pin turns indigo. Category colours were removed from the map on purpose; the category shows on each event instead.
- **Filters.** The map shows only one filter button and a one-line summary ("Önümüzdeki 7 gün, 2 tür"). The pop-up sets date range, event types and whether venues without events appear (as small hollow dots). Choices are saved as preferences in `localStorage` and the pop-up opens once on first visit. When filters change, the map zooms to fit the matching venues, unless a venue is open.
- **Search.** Covers venues, performers and event titles (also matches performer names on events), ignores Turkish accents. Picking an event or performer opens its page; picking a venue opens its sheet. If that venue has no events in the current filter, the sheet offers "Tüm tarihleri göster" and the venue keeps a marker.
- **Price comparison.** Cheapest available offer first and highlighted ("En ucuz"); offers without a price next; sold-out offers last and greyed. The venue sheet shows the lowest price and number of sellers for each event.
- **Accounts (demo).** `src/lib/store.ts` keeps the demo user, favorites (events and performers), attended events, preferences and settings, and hands every change to the active `UserBackend` (`src/lib/user-backend.ts`). Today that is `localUserBackend`: `localStorage` under `eventall.state.v1`. The password field is validated but never stored. Favoriting or "Gittim" while signed out sends you to the login page and back. For real accounts, implement `UserBackend` with Supabase Auth and call `setUserBackend()` (`docs/backend.md`).
- **Theme.** Light, dark or follow the system (default). Applied via `<html data-theme>`; all colours are CSS variables in `src/styles.css`.
- **Layout.** Phones: bottom tab bar (Keşfet, Profil, Ayarlar) and a bottom sheet. 768 px and up: left rail. 1024 px and up: venue details in a side panel.
- **Time zone.** All date logic uses Europe/Istanbul. Turkey has been on permanent UTC+3 since 2016, so a fixed offset is used (see `src/lib/dates.ts`).
- **Upcoming.** Events count as upcoming until 1 hour after they start.
- **"Bu akşam".** Runs from now until 06:00 the next morning. Between 00:00 and 05:59 it means the night already in progress.
- **"Bu hafta sonu".** Saturday 00:00 to Monday 06:00. Friday evening is *not* included.
- **Clustering.** MapLibre GeoJSON clustering (radius 44 px, up to zoom 15), drawn as HTML buttons so they need no glyph server and stay keyboard-focusable.
- **"Yakınımda".** One low-accuracy position fix. Inside the other city's box it switches city; outside both boxes, or with permission denied, a Turkish message appears and the map stays where it is.
- **Routing.** Hash routes (`#/event/…`), so any static host works without rewrite rules. The map stays mounted under other pages so it keeps its position.
- **MapLibre 6** is used because npm audit reports a critical advisory for ≤ 6.4. Its web worker is served via `setWorkerUrl`.

## TODO

Needs input from the owner:

- [ ] **Verify pins.** `npm run venues:review` → check each pin → `-- --verify <id>`. Start with the 8 `complex_centroid` venues; the OSM lookups to refine them could not be run from the build environment (`data/venues/README.md`).
- [ ] **Missing venues.** Send Google Maps pins for the 7 venues in `data/venues/MISSING.md`.
- [ ] **Platform access.** Fill in `docs/ticketing-sources.md` (robots.txt, terms, API/affiliate) for each platform and ask for feeds. Only then add a live adapter.
- [ ] **Supabase.** Create the project and set the env vars (`docs/backend.md`) when a backend is wanted.

Later:

- [ ] **Real accounts.** Supabase Auth behind `UserBackend`, user tables with owner-only RLS, privacy notice / KVKK review first.
- [ ] **Partnerships** with ticketing platforms (deep links to event pages, affiliate tracking, permission to show prices and images). See `docs/demo-plan.md`.
- [ ] **English UI.** Add `src/i18n/en.ts` with the same shape as `tr.ts`, plus a language switch and locale-aware formatting.
- [ ] **Tiles for launch.** OpenFreeMap is free and keyless but community-funded; for production, sponsor it or self-host the same styles (or use a commercial provider).
- [ ] Real seller logos (with permission), event images (`imageUrl` exists but is not displayed yet), analytics on "Siteye git" clicks.
- [ ] Notifications for favorite events and performers (the setting exists, nothing is sent yet).
