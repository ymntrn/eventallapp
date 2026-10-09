# Eventall

Eventall is a map-first mobile web app for live events in Ankara: concerts, theater and festivals appear as pins on a map. It is an **aggregator**, like Skyscanner for live events. It does **not** sell tickets. Each event page compares prices across ticket sellers (Biletix, Passo, Biletinial, Bubilet, Mobilet…), and "Siteye git" opens the chosen seller in a new tab.

> **Status: UI prototype.** All venues, events, performers, sellers and prices are **placeholder/sample data**. Venue coordinates are rough estimates (`verified: false`). Login is a **demo**: there is no backend, and nothing leaves the device.

Stack: Vite + React + TypeScript, MapLibre GL JS with OpenFreeMap vector tiles (no API key), plain CSS, JSON data files, PWA via `vite-plugin-pwa`. No other runtime dependencies.

## Screens

| Screen | Route | What it does |
| --- | --- | --- |
| Map (Keşfet) | `#/`, `#/venue/:id` | Minimal white (or dark) map with black count pins. Search, one filter button, venue sheet |
| Filter pop-up | (modal) | Date range, event types, "show venues without events". Saved as the user's preferences. Shown once on first visit |
| Event | `#/event/:id` | Date, venue, performers, **price comparison** (cheapest first, sold out last), favorite, "Gittim" |
| Performer | `#/performer/:id` | Musician/comedian/company, favorite, upcoming events |
| Profile | `#/profile[/events\|people\|attended]` | Stats, favorite events, favorite performers, attended events |
| Settings | `#/settings` | Theme (light / dark / system), default date range, event preferences, notifications, profile edit, sign out, delete local data |
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
| `npm test` | Vitest unit tests (date filters, event/venue join, slugs) |
| `npm run validate:data` | Read-only report on `src/data/*.json`. Also runs before every build |
| `npm run import:venues` | Builds `src/data/venues.json` from `data/venues_source.csv` |
| `npm run seed:events` | Regenerates the **sample** events with dates relative to today |

## Project layout

```
src/
  App.tsx                 routing, theme, data loading, filter pop-up, toasts
  pages/                  MapPage, EventPage, PerformerPage, ProfilePage, SettingsPage, LoginPage
  components/             MapView, VenueSheet (+ EventRow), SearchBox, FilterSheet, BottomNav,
                          FavoriteButton, PageHeader, Link, icons
  data/venues.json        venue database (placeholder)
  data/events.json        events with seller offers (sample)
  data/performers.json    musicians, comedians, companies (sample)
  i18n/tr.ts              every UI string (Turkish)
  lib/data.ts             loadData(), joins, filtering, grouping, minPrice/sortOffers
  lib/store.ts            local app state: demo user, favorites, attended, preferences, settings
  lib/router.ts           tiny hash router
  lib/theme.ts            light/dark/system theme
  lib/dates.ts            Europe/Istanbul date windows and formatting
  lib/slug.ts             Turkish-aware slug function
  lib/geo.ts              Ankara center and bounding box, distance
  types.ts                data types and allowed enum values
scripts/
  validate-data.ts        data checks (errors fail, warnings don't)
  import-venues-csv.ts    CSV → venues.json
  generate-sample-events.ts
data/venues_source.example.csv
```

## Replacing the venue database

The app reads venues only through `loadData()` in `src/lib/data.ts`, which imports `src/data/venues.json`. Swapping the database means replacing that one file, either by hand or from a CSV.

### Option A: drop in a CSV (recommended)

1. Create `data/venues_source.csv`. Start from `data/venues_source.example.csv` if you like. Use UTF-8 with a header row:

   ```csv
   name,type,lat,lng,address
   Gençlik Parkı,open_air,39.9383,32.8489,"Ulus, Altındağ"
   CSO Ada Ankara,classical,39.936,32.846,"Talatpaşa Bulvarı, Altındağ"
   ```

   - `name` (required). Must be unique.
   - `type` (required). One of the values listed below.
   - `lat`, `lng` (required). Decimal degrees (WGS84). Decimal commas such as `39,93` are accepted.
   - `address` (optional). Quote it if it contains commas.
2. Run `npm run import:venues`. This **overwrites** `src/data/venues.json`. Ids are generated from names (`Gençlik Parkı` → `genclik-parki`; duplicate names get `-2`, `-3`). Every venue starts with `verified: false`. Invalid rows are skipped and listed.
3. Set `"verified": true` by hand on each venue whose coordinates you have checked. Re-importing resets this flag, so do it after the final import.
4. Update `venueId`s in `src/data/events.json` if ids changed, then run `npm run validate:data`.

### Option B: edit the JSON directly

`src/data/venues.json`:

```json
{
  "_note": "optional free text",
  "venues": [
    {
      "id": "genclik-parki",
      "name": "Gençlik Parkı",
      "type": "open_air",
      "address": "Ulus, Altındağ",
      "lat": 39.9383,
      "lng": 32.8489,
      "verified": true
    }
  ]
}
```

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | Lowercase ASCII slug, unique. Turkish letters transliterated (ç→c, ğ→g, ı→i, ö→o, ş→s, ü→u) |
| `name` | string | Unique |
| `type` | enum | `concert_hall`, `live_music`, `electronic`, `open_air`, `festival_ground`, `theater`, `opera`, `classical`, `arena`, `performance_space` |
| `address` | string? | Optional |
| `lat`, `lng` | number | Must fall within the Ankara-province box (lat 39.5–40.3, lng 32.2–33.3) |
| `verified` | boolean | `true` only once a human has checked the coordinates |

### What validation checks

`npm run validate:data` prints a report and never modifies files.

- **Errors (fail the build):** unknown `venueId` or `performerId` on an event, duplicate venue/performer ids or venue names, non-slug ids, invalid `type`/`category`/`kind`/offer `platform`, events without offers, non-https offer `url`, negative prices, coordinates outside the Ankara box, malformed `startsAt`, duplicate event ids.
- **Report / warnings (do not fail):** venues closer than 30 m to each other ("will be clustered"), number of `verified: false` venues, events already in the past.

## Adding events

Edit `src/data/events.json`:

```json
{
  "_note": "optional",
  "events": [
    {
      "id": "cso-2026-10-17-beethoven",
      "venueId": "cso-ada-ankara",
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

The current file is **sample data** made by `npm run seed:events`. Titles start with `[Örnek]`, sellers and prices are invented, and links point only to platform homepages. Re-run it before a test session so the dates stay current. Delete the script once real data exists.

## Deploying

The output is a static site in `dist/`. No environment variables or secrets are needed.

**Vercel:** import the repo at vercel.com/new. `vercel.json` already sets the Vite framework, `npm run build` and `dist`. Or run `npx vercel` from the repo.

**Netlify:** "Add new site → Import from Git". `netlify.toml` sets the build command, the publish directory and Node 22. Or run `npx netlify deploy --build --prod`.

Both configs serve `sw.js` with `no-cache` so testers receive updates. To install on a phone, open the deployed HTTPS URL. On Android use Chrome → "Ana ekrana ekle". On iOS use Safari → Share → "Ana Ekrana Ekle". Geolocation ("Yakınımda") also requires HTTPS, or localhost.

## Behaviour and decisions

- **Map.** OpenFreeMap "Positron" (light) and "Dark" vector styles, no API key. The background is forced to white / app-dark so the map matches the UI. Pins are monochrome (black in light mode, white in dark mode) with the event count; the selected pin turns indigo. Category colours were removed from the map on purpose; the category shows on each event instead.
- **Filters.** The map shows only one filter button and a one-line summary ("Önümüzdeki 7 gün, 2 tür"). The pop-up sets date range, event types and whether venues without events appear (as small hollow dots). Choices are saved as preferences in `localStorage` and the pop-up opens once on first visit. When filters change, the map zooms to fit the matching venues, unless a venue is open.
- **Search.** Covers venues, performers and event titles (also matches performer names on events), ignores Turkish accents. Picking an event or performer opens its page; picking a venue opens its sheet. If that venue has no events in the current filter, the sheet offers "Tüm tarihleri göster" and the venue keeps a marker.
- **Price comparison.** Cheapest available offer first and highlighted ("En ucuz"); offers without a price next; sold-out offers last and greyed. The venue sheet shows the lowest price and number of sellers for each event.
- **Accounts (demo).** `src/lib/store.ts` keeps the demo user, favorites (events and performers), attended events, preferences and settings in `localStorage` under `eventall.state.v1`. The password field is validated but never stored. Favoriting or "Gittim" while signed out sends you to the login page and back. Replace the `actions` in `store.ts` with API calls when a backend exists.
- **Theme.** Light, dark or follow the system (default). Applied via `<html data-theme>`; all colours are CSS variables in `src/styles.css`.
- **Layout.** Phones: bottom tab bar (Keşfet, Profil, Ayarlar) and a bottom sheet. 768 px and up: left rail. 1024 px and up: venue details in a side panel.
- **Time zone.** All date logic uses Europe/Istanbul. Turkey has been on permanent UTC+3 since 2016, so a fixed offset is used (see `src/lib/dates.ts`).
- **Upcoming.** Events count as upcoming until 1 hour after they start.
- **"Bu akşam".** Runs from now until 06:00 the next morning. Between 00:00 and 05:59 it means the night already in progress.
- **"Bu hafta sonu".** Saturday 00:00 to Monday 06:00. Friday evening is *not* included.
- **Clustering.** MapLibre GeoJSON clustering (radius 44 px, up to zoom 15), drawn as HTML buttons so they need no glyph server and stay keyboard-focusable.
- **"Yakınımda".** One low-accuracy position fix. Outside the Ankara box, or with permission denied, a Turkish message appears and the map stays on Ankara.
- **Routing.** Hash routes (`#/event/…`), so any static host works without rewrite rules. The map stays mounted under other pages so it keeps its position.
- **MapLibre 6** is used because npm audit reports a critical advisory for ≤ 6.4. Its web worker is served via `setWorkerUrl`.

## TODO

- [ ] **Backend and real accounts.** Replace the demo login and `localStorage` state with an auth provider and a database (favorites, attended events, preferences). Add a privacy notice / KVKK review first.
- [ ] **Verified venue database.** Import the real list, check every coordinate, set `verified: true`, and remove the sample banner.
- [ ] **Real event data feeds.** Use official partner feeds/APIs or manual curation. Do not scrape ticketing sites. Move `loadData()` to `fetch()` from an API or a JSON file on a CDN.
- [ ] **Partnerships** with ticketing platforms (deep links to event pages, affiliate tracking, permission to show prices and images).
- [ ] **English UI.** Add `src/i18n/en.ts` with the same shape as `tr.ts`, plus a language switch and locale-aware formatting.
- [ ] **Tiles for launch.** OpenFreeMap is free and keyless but community-funded; for production, sponsor it or self-host the same styles (or use a commercial provider).
- [ ] Real seller logos (with permission), event images (`imageUrl` exists but is not displayed yet), analytics on "Siteye git" clicks.
- [ ] Notifications for favorite events and performers (the setting exists, nothing is sent yet).
