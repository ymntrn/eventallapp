# Missing venues

## Added 2026-10-12 from the project owner's pins

These were not in OpenStreetMap. The project owner checked each pin on Google Maps; they are
stored with `precision: point`, `source: Project owner's pin`, and `verified: true` in the app.

| Venue | Pin | Note |
| --- | --- | --- |
| Küçük Tiyatro (Ankara) | 39.938333, 32.853333 | In the Devlet Tiyatroları headquarters building, Ulus |
| İrfan Şahinbaş Atölye Sahnesi (Ankara) | 39.9520278, 32.7668056 | Same venue as the former "Devlet Tiyatroları Atölye Sahnesi" (OSM node 667489374, about 50 m away). Renamed to its full name and moved to this pin; the old name is an alias |
| Fiba Salon İKSV (İstanbul) | 41.028333, 28.971944 | Şişhane, Beyoğlu |
| Life Park Konser ve Etkinlik Alanı (İstanbul) | 41.1680000, 28.9991111 | Bahçeköy, Sarıyer |
| Jolly Joker Vadistanbul (İstanbul) | 41.1070, 28.9880 | Inside Vadistanbul AVM |

Ankara Arena was resolved on 2026-10-10: it was already in the database as "Ankara Spor Salonu"
(OSM `alt_name`, Wikidata). Renamed to Ankara Arena.

## Still missing

| Venue | City | What to send |
| --- | --- | --- |
| Saklıkent | Ankara | A Google Maps pin on the venue entrance, plus what kind of venue it is |

Also found while searching, not added: a building named **Jolly Joker** at Tema World, Küçükçekmece
(`way/1545832298`, 41.0509689, 28.7714340). Say if you want it added.

## Adding a venue from a pin

1. Add a row to `venues_osm_source.tsv`: city, name, database type, `USER:<YYYY-MM-DD>`, lat,
   lng, district, neighbourhood, and an empty last column. If the venue exists in OSM, use its
   OSM id instead (`N123`/`W123`/`R123`).
2. Update `EXPECTED` in `build_venues.py`, then `python3 build_venues.py`.
3. `npm run import:venues:db`, then `npm run venues:review -- --verify <id>` for pins you checked.
4. `npm run validate:data`, and re-seed Supabase (`docs/backend.md`).
