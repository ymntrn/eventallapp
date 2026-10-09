# Verified venue database (Ankara + İstanbul)

150 venues: 50 in Ankara, 100 in İstanbul. Every coordinate comes from OpenStreetMap
(looked up 2026-10-09), and every row links to its OSM object so it can be checked.

This is the **source database**. The app still reads `src/data/venues.json`; it is not
wired in yet (see "Using it in the app").

## Files

| File | What it is |
|---|---|
| `eventall_venues.sqlite` | SQLite database: tables `venues` and `venue_types` |
| `eventall_venues.json` | Same data as a JSON array |
| `eventall_venues.csv` | Same data as CSV (UTF-8 with BOM, opens cleanly in Excel) |
| `eventall_venues.geojson` | Same data as GeoJSON points (drop it on geojson.io to see every pin) |
| `venues_osm_source.tsv` | The looked-up OSM rows the files are built from |
| `build_venues.py` | Rebuilds all four files from the TSV and runs the checks: `python3 build_venues.py` |

## Columns

| Column | Meaning |
|---|---|
| `id` | Slug, `ank-…` or `ist-…` |
| `name` | Venue name |
| `type` | `concert_hall`, `opera_house`, `theatre`, `performance_hall`, `live_music_bar`, `nightclub`, `open_air`, `arena`, `stadium`, `congress_center`, `cultural_center`, `expo_center`, `festival_area`, `arts_center` |
| `type_label_tr` | Turkish label for the type |
| `city`, `district`, `neighborhood` | Location (`city` is `Ankara` or `İstanbul`) |
| `lat`, `lng` | WGS84, 7 decimals |
| `precision` | `point` (OSM point on the venue), `building_centroid` (centre of the mapped building) or `complex_centroid` (centre of a larger complex the venue is inside) |
| `precision_note` | What the point represents |
| `osm_id`, `osm_url`, `osm_name` | The OSM object the coordinate came from |
| `source`, `verified_on` | Provenance |

The 8 `complex_centroid` venues are worth placing by hand if a pin needs to sit on the
exact hall: Zorlu PSM, Maximum Uniq, Trump Sahne, Beykoz Kundura, CSO Ada Ankara,
Ankapark, Mogan Parkı, Gençlik Parkı.

## Checks run by `build_venues.py`

- Exactly 50 Ankara and 100 İstanbul rows
- No duplicate ids or OSM objects
- Every point inside its city's bounding box
- Pairs closer than 30 m are reported (currently only Kadıköy Sahne / Bade76, 16 m, same street)

A sample of 24 random venues was reverse-geocoded: 21 resolved to the venue itself and
3 to the same building or site.

## Using it in the app

The app's `Venue` type uses a different type list (`concert_hall`, `live_music`,
`electronic`, `open_air`, `festival_ground`, `theater`, `opera`, `classical`, `arena`,
`performance_space`) and `scripts/validate-data.ts` only accepts coordinates inside the
Ankara box, so plugging this in needs a type mapping, an İstanbul-aware validator, and
updated `venueId`s in `src/data/events.json`.

## License

Data © OpenStreetMap contributors, available under the Open Database License (ODbL).
The app must show "© OpenStreetMap contributors" wherever this data is used.
