# Missing venues

These venues are not in the database yet. OpenStreetMap could not be searched from the
environment that built it (2026-10-09), and rows are never added with guessed coordinates.

**What I need from you:** for each venue, send a Google Maps pin (share link, or the
`lat, lng` you get by long-pressing the entrance on the map). An OSM link is even better.
With a pin I can look up the matching OSM object, or add the row with `precision: point`
and the source noted.

| Venue | City | What to send |
| --- | --- | --- |
| Ankara Arena | Ankara | Google Maps pin on the main entrance of the arena (Ulus / Altındağ side) |
| Küçük Tiyatro | Ankara | Google Maps pin on the Devlet Tiyatroları Küçük Tiyatro building entrance |
| İrfan Şahinbaş Atölye Sahnesi | Ankara | Google Maps pin on the stage entrance (say if it is the same building as `ank-devlet-tiyatrolari-atolye-sahnesi`) |
| Saklıkent | Ankara | Google Maps pin on the venue entrance, plus what kind of venue it is (open-air stage, concert area…) |
| Salon İKSV | İstanbul | Google Maps pin on the Salon İKSV entrance (Şişhane / Beyoğlu) |
| Lifepark | İstanbul | Google Maps pin on the event/stage area, not the park centre |
| Jolly Joker Vadistanbul | İstanbul | Google Maps pin on the venue entrance inside Vadistanbul |

When a pin arrives: add the row to `venues_osm_source.tsv` (with the OSM id if one exists),
run `python3 build_venues.py`, update the expected Ankara/İstanbul counts in that script,
then `npm run import:venues:db`.
