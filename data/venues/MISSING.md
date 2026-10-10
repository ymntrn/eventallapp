# Missing venues

Searched in OpenStreetMap on 2026-10-10 (Overpass name search in each city, plus Nominatim
free-text search). Rows are never added with guessed coordinates.

## Resolved

| Venue | Result |
| --- | --- |
| Ankara Arena | Already in the database as "Ankara Spor Salonu": OSM gives `alt_name=Ankara Arena`, and its Wikidata item and Wikimedia Commons category are "Ankara Arena". Renamed to **Ankara Arena** (id `ank-ankara-arena`); "Ankara Spor Salonu" is now an alias |

## Still missing (not in OpenStreetMap)

**What I need from you:** for each venue, send a Google Maps pin (share link, or the
`lat, lng` you get by long-pressing the entrance on the map). With a pin the row is added
with `precision: point` and the source noted.

| Venue | City | What to send |
| --- | --- | --- |
| Küçük Tiyatro | Ankara | Google Maps pin on the Devlet Tiyatroları Küçük Tiyatro building entrance |
| İrfan Şahinbaş Atölye Sahnesi | Ankara | Google Maps pin on the stage entrance (say if it is the same building as `ank-devlet-tiyatrolari-atolye-sahnesi`) |
| Saklıkent | Ankara | Google Maps pin on the venue entrance, plus what kind of venue it is |
| Salon İKSV | İstanbul | Google Maps pin on the Salon İKSV entrance (Şişhane / Beyoğlu) |
| Lifepark | İstanbul | Google Maps pin on the event/stage area, not the park centre |
| Jolly Joker Vadistanbul | İstanbul | Google Maps pin on the venue entrance inside Vadistanbul |

Found while searching, not added: a building named **Jolly Joker** at Tema World, Küçükçekmece
(`way/1545832298`, 41.0509689, 28.7714340). It is a different site from Vadistanbul. Say if you
want it added.

When a pin arrives: add the row to `venues_osm_source.tsv` (with the OSM id if one exists),
run `python3 build_venues.py`, update the expected Ankara/İstanbul counts in that script,
then `npm run import:venues:db`.
