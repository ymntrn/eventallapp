# Eventall

Eventall is a map-first mobile web app for live events in Ankara: concerts, theater and festivals appear as pins on a map. It is an **aggregator**, like Skyscanner for live events. It does **not** sell tickets. "Bilet al" opens the official ticketing platform (Biletix, Passo, Biletinial, Bubilet, Mobilet…) in a new tab.

> **Status: MVP prototype.** All venues and events are **placeholder/sample data**. Venue coordinates are rough estimates (`verified: false`) and must be checked before any public release.

Stack: Vite + React + TypeScript, MapLibre GL JS with OpenStreetMap raster tiles (no API key), plain CSS, JSON data files, PWA via `vite-plugin-pwa`.

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
  App.tsx                 app state: filters, selection, geolocation
  components/             MapView, VenueSheet, FilterBar, SearchBox, Legend
  data/venues.json        venue database (placeholder)
  data/events.json        events (sample)
  i18n/tr.ts              every UI string (Turkish)
  lib/data.ts             loadData(), event↔venue join, filtering, grouping
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

- **Errors (fail the build):** unknown `venueId` on an event, duplicate venue ids or names, non-slug ids, invalid `type`/`category`/`ticketPlatform`, coordinates outside the Ankara box, malformed `startsAt`, non-https `ticketUrl`, duplicate event ids.
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
      "ticketUrl": "https://…official event page…",
      "ticketPlatform": "Biletinial",
      "imageUrl": "https://… (optional)",
      "priceFrom": 300
    }
  ]
}
```

- `category`: `rock`, `pop`, `electronic`, `jazz_classical`, `theater`, `comedy`, `other`
- `ticketPlatform`: `Biletix`, `Passo`, `Biletinial`, `Bubilet`, `Mobilet`, `Other`
- `startsAt`: ISO 8601 **with offset** (Turkey is always `+03:00`)
- `priceFrom`: lowest price in TRY (optional)
- Past events are hidden automatically. No cleanup is needed.

The current file is **sample data** made by `npm run seed:events`. Titles start with `[Örnek]` and ticket links point only to platform homepages. Re-run it before a test session so the dates stay current. Delete the script once real data exists.

## Deploying

The output is a static site in `dist/`. No environment variables or secrets are needed.

**Vercel:** import the repo at vercel.com/new. `vercel.json` already sets the Vite framework, `npm run build` and `dist`. Or run `npx vercel` from the repo.

**Netlify:** "Add new site → Import from Git". `netlify.toml` sets the build command, the publish directory and Node 22. Or run `npx netlify deploy --build --prod`.

Both configs serve `sw.js` with `no-cache` so testers receive updates. To install on a phone, open the deployed HTTPS URL. On Android use Chrome → "Ana ekrana ekle". On iOS use Safari → Share → "Ana Ekrana Ekle". Geolocation ("Yakınımda") also requires HTTPS, or localhost.

## Behaviour and decisions

- **Time zone.** All date logic uses Europe/Istanbul. Turkey has been on permanent UTC+3 since 2016, so a fixed offset is used (see `src/lib/dates.ts`).
- **Upcoming.** Events count as upcoming until 1 hour after they start, so late arrivals still see a show that has just begun.
- **"Bu akşam".** Runs from now until 06:00 the next morning. Between 00:00 and 05:59 it means the night already in progress.
- **"Bu hafta sonu".** Runs from Saturday 00:00 to Monday 06:00. On Saturday or Sunday (and on Monday before 06:00) it covers the rest of the current weekend; otherwise the next weekend. Friday evening is *not* included.
- **"Önümüzdeki 7 gün"** is the default filter. "Tüm etkinlikler" shows every upcoming event.
- **Categories.** No category selected means all categories. Selections are combined with OR, and then with AND against the date filter.
- **Pin colour.** Uses the most frequent category among the venue's events that match the current filters. A tie goes to the earliest event's category. The number on a pin is that venue's matching event count.
- **Clustering.** Uses MapLibre GeoJSON clustering (radius 44 px, up to zoom 15). Cluster counts are drawn as HTML buttons, so they need no font/glyph server and stay keyboard-focusable. Selecting a venue zooms to at least 16, so it is never hidden in a cluster. Venues closer than ~30 m may overlap at high zoom. The validator lists them.
- **"Tüm mekanları göster".** Adds venues with no matching events as small grey, unclustered pins.
- **"Yakınımda".** Uses one low-accuracy position fix (cached for up to 60 s). If you are outside the Ankara box, or permission is denied, a Turkish message appears and the map stays on Ankara.
- **Search.** Covers venue names and the titles of all upcoming events, regardless of filters. It ignores Turkish accents (e.g. "genclik" finds "Gençlik").
- **Tiles.** Uses `tile.openstreetmap.org`. This is fine for a prototype with a few testers. The OSM tile usage policy does not allow heavy production traffic, so switch to a tile provider before launch (see TODO). The service worker caches viewed tiles for 7 days and never prefetches them.
- **MapLibre 6** is used instead of 5 because npm audit reports a critical advisory for ≤ 6.4. Its web worker is served via `setWorkerUrl`.
- **Sample banner.** A dismissible "Örnek veri" banner warns testers that the data is not real.

## TODO

- [ ] **Verified venue database.** Import the real list, check every coordinate, set `verified: true`, and remove the sample banner.
- [ ] **Real event data feeds.** Use official partner feeds/APIs or manual curation. Do not scrape ticketing sites. Move `loadData()` to `fetch()` from an API or a JSON file on a CDN.
- [ ] **Partnerships** with ticketing platforms (deep links to event pages, affiliate tracking, permission to show prices and images).
- [ ] **English UI.** Add `src/i18n/en.ts` with the same shape as `tr.ts`, plus a language switch and locale-aware formatting.
- [ ] Production tile provider (self-hosted or commercial vector tiles) instead of `tile.openstreetmap.org`.
- [ ] Event images (`imageUrl` exists but is not displayed yet), sharing a venue/event link (URL state), analytics on "Bilet al" clicks.
- [ ] Privacy notice / KVKK review before public launch.
