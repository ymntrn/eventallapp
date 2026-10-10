# Pin check, 2026-10-10

An automated check of all 150 venues against live OpenStreetMap data.

## Method

For each venue, the OSM object in `osm_id` was fetched from the Overpass API and checked:

1. The object still exists.
2. Its name (or `name:en`, `name:tr`, `alt_name`) still matches `osm_name`.
3. The pin is on the object: for a node, within 3 m of it; for a way or relation, inside its
   outline (point-in-polygon on the outer ring).

## Result

**150 of 150 pass.** Every object exists, every name matches, and every pin is on its
object.

## Changes made

- **CSO Ada Ankara:** the pin was the centre of the whole CSO Ada campus. OSM maps the concert
  hall building itself (`way/880861580`, "Cumhurbaşkanlığı Senfoni Orkestrası" /
  "Presidential Symphony Orchestra"). The pin moved to that building's centre
  (39.9334047, 32.8504597), about 51 m, and precision is now `building_centroid`.
- **Ankara Arena:** "Ankara Spor Salonu" is Ankara Arena (see `MISSING.md`). Renamed, id
  `ank-ankara-arena`.

## Still approximate (7)

No more specific object exists in OSM for these, so they keep the centre of the complex:

| Venue | Why |
| --- | --- |
| Zorlu PSM | No PSM hall mapped inside Zorlu Center |
| Maximum Uniq | Hall, Box and Açıkhava not mapped inside UNIQ İstanbul |
| Trump Sahne | Stage not mapped inside Trump AVM |
| Beykoz Kundura | Only the whole factory site is mapped |
| Ankapark, Mogan Parkı, Gençlik Parkı | Parks; no stage or event area mapped |

## What this check does not prove

It confirms each pin matches OpenStreetMap, not that OpenStreetMap is right. `verified` in
`src/data/venues.json` stays `false` because it means a person has looked at the pin. A quick
human pass is still worth doing for the 7 approximate venues and any venue with events:
`npm run venues:review`.
