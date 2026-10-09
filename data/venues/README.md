# Verified venue database (Ankara + İstanbul)

150 venues: 50 in Ankara, 100 in İstanbul. Every coordinate comes from OpenStreetMap
(looked up 2026-10-09), and every row links to its OSM object so it can be checked.

This is the **source database**. The app reads `src/data/venues.json`, which is generated
from `eventall_venues.json` by `npm run import:venues:db` (see "Using it in the app").

## Files

| File | What it is |
|---|---|
| `eventall_venues.sqlite` | SQLite database: tables `venues` and `venue_types` |
| `eventall_venues.json` | Same data as a JSON array |
| `eventall_venues.csv` | Same data as CSV (UTF-8 with BOM, opens cleanly in Excel) |
| `eventall_venues.geojson` | Same data as GeoJSON points (drop it on geojson.io to see every pin) |
| `venues_osm_source.tsv` | The looked-up OSM rows the files are built from |
| `build_venues.py` | Rebuilds all four files from the TSV and runs the checks: `python3 build_venues.py` |

Venues we could not place yet are listed in [`MISSING.md`](MISSING.md).

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
Ankapark, Mogan Parkı, Gençlik Parkı. See "Approximate pins" below.

## Checks run by `build_venues.py`

- Exactly 50 Ankara and 100 İstanbul rows
- No duplicate ids or OSM objects
- Every point inside its city's bounding box
- Pairs closer than 30 m are reported (currently only Kadıköy Sahne / Bade76, 16 m, same street)

A sample of 24 random venues was reverse-geocoded: 21 resolved to the venue itself and
3 to the same building or site.

## Using it in the app

```bash
python3 data/venues/build_venues.py   # after editing venues_osm_source.tsv
npm run import:venues:db              # → src/data/venues.json (ids kept, types mapped)
npm run validate:data
```

The type mapping (14 database types → app `VenueType`) is in `src/lib/venue-db.ts` and
the main README. Every venue is imported with `verified: false`; a venue already marked
`verified: true` keeps the flag on re-import as long as its coordinates did not change.

## Pin review

```bash
npm run venues:review                                  # every unverified venue, approximate pins first
npm run venues:review -- --city Ankara                 # one city
npm run venues:review -- --geojson /tmp/review.geojson # also as GeoJSON for geojson.io
npm run venues:review -- --verify ank-akun-sahnesi ank-sinasi-sahnesi
```

Each venue is printed with a `pin` link (openstreetmap.org with a marker at our
coordinate), a Google Maps link to the same point and the OSM object. If the marker sits
on the venue, `--verify` its id. If it does not, fix the TSV row, rebuild and re-import.

## Approximate pins (complex_centroid)

Status 2026-10-09: **not refined.** Nominatim, Overpass and openstreetmap.org were not
reachable from the environment that did this work, so no lookups were made and no
coordinate was changed. Coordinates are never estimated by hand.

To refine one, find the hall/stage/entrance as its own OSM object near the current point,
for example on https://overpass-turbo.eu:

```
[out:json][timeout:25];
(
  nwr(around:400, 41.0672, 29.0166)["amenity"~"theatre|arts_centre|events_venue|concert_hall"];
  nwr(around:400, 41.0672, 29.0166)["name"~"PSM|Performance|Sahne", i];
);
out center tags;
```

(Replace the coordinates with the venue's `lat, lng`.) Only use an object that clearly is
the venue. Then in `venues_osm_source.tsv` set its OSM id (`N123`/`W123`/`R123`), lat/lon
and OSM name, remove the venue from `COMPLEX` in `build_venues.py` so its precision becomes
`point` or `building_centroid`, and rebuild.

## License

Data © OpenStreetMap contributors, available under the Open Database License (ODbL).
The app must show "© OpenStreetMap contributors" wherever this data is used.
