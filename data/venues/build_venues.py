import csv, json, sqlite3, re, unicodedata, math, os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = HERE
os.makedirs(OUT, exist_ok=True)

TYPE_LABEL_TR = {
    "concert_hall": "Konser Salonu", "opera_house": "Opera / Bale", "theatre": "Tiyatro Sahnesi",
    "performance_hall": "Performans Salonu", "live_music_bar": "Canlı Müzik Mekânı",
    "nightclub": "Kulüp", "open_air": "Açıkhava", "arena": "Kapalı Spor / Arena",
    "stadium": "Stadyum", "congress_center": "Kongre Merkezi", "cultural_center": "Kültür Merkezi",
    "expo_center": "Fuar Merkezi", "festival_area": "Festival / Etkinlik Alanı", "arts_center": "Sanat Merkezi",
}
# Venues whose OSM object is a larger complex or area, not the hall itself
COMPLEX = {
    "Zorlu PSM": "Point is the Zorlu Center complex centroid; PSM is inside the complex",
    "Maximum Uniq (Hall / Box / Açıkhava)": "Point is the UNIQ İstanbul complex centroid; Hall, Box and Açıkhava are inside it",
    "Trump Sahne": "Point is the Trump AVM building centroid; the stage is inside the mall",
    "Beykoz Kundura": "Point is the centroid of the former factory site",
    "Ankapark": "Point is the centroid of the park area",
    "Mogan Parkı": "Point is the centroid of the park area",
    "Gençlik Parkı": "Point is the centroid of the park area",
}
CITY_BBOX = {"Ankara": (39.3, 31.8, 40.5, 33.6), "İstanbul": (40.8, 28.0, 41.6, 29.9)}

def slug(s):
    s = s.replace("ı", "i").replace("İ", "i")
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")

rows = []
with open(os.path.join(HERE, "venues_osm_source.tsv"), encoding="utf-8") as f:
    for line in f:
        if not line.strip():
            continue
        city, name, vtype, osm, lat, lon, district, hood, osm_name = line.rstrip("\n").split("\t")
        if district.endswith("Mahallesi") or district in ("", "Üniversiteler"):
            hood = hood or district
            district = {"Ankara": "Çankaya"}.get(city, district)
        if district == "Üniversiteler Mahallesi":
            district = "Çankaya"
        if osm.startswith("USER"):
            # Pin supplied by the project owner (checked on Google Maps); not from OSM.
            # Column format: USER:<date the pin was given>
            pin_date = osm.split(":", 1)[1] if ":" in osm else ""
            rows.append({
                "id": f"{'ank' if city == 'Ankara' else 'ist'}-{slug(name)}",
                "name": name, "type": vtype, "type_label_tr": TYPE_LABEL_TR[vtype],
                "city": city, "district": district, "neighborhood": hood,
                "lat": round(float(lat), 7), "lng": round(float(lon), 7),
                "precision": "point", "precision_note": "Pin provided and checked by the project owner (Google Maps)",
                "osm_id": None, "osm_name": None, "osm_url": None,
                "source": "Project owner's pin (Google Maps)", "verified_on": pin_date,
            })
            continue
        osm_kind = {"N": "node", "W": "way", "R": "relation"}[osm[0]]
        if name in COMPLEX:
            precision, note = "complex_centroid", COMPLEX[name]
        elif osm_kind == "node":
            precision, note = "point", "OSM point placed on the venue"
        else:
            precision, note = "building_centroid", "Centroid of the venue's mapped building/footprint"
        rows.append({
            "id": f"{'ank' if city == 'Ankara' else 'ist'}-{slug(name)}",
            "name": name, "type": vtype, "type_label_tr": TYPE_LABEL_TR[vtype],
            "city": city, "district": district, "neighborhood": hood,
            "lat": round(float(lat), 7), "lng": round(float(lon), 7),
            "precision": precision, "precision_note": note,
            "osm_id": f"{osm_kind}/{osm[1:]}", "osm_name": osm_name,
            "osm_url": f"https://www.openstreetmap.org/{osm_kind}/{osm[1:]}",
            "source": "OpenStreetMap via Nominatim lookup (ODbL)", "verified_on": "2026-10-09",
        })

# ---- checks ----
from collections import Counter
cnt = Counter(r["city"] for r in rows)
EXPECTED = {"Ankara": 51, "İstanbul": 103}  # update when venues are added or removed
assert dict(cnt) == EXPECTED, cnt
ids = [r["id"] for r in rows]; assert len(ids) == len(set(ids)), "dup ids"
osms = [r["osm_id"] for r in rows if r["osm_id"]]; assert len(osms) == len(set(osms)), "dup osm"
for r in rows:
    a, b, c, d = CITY_BBOX[r["city"]]
    assert a <= r["lat"] <= c and b <= r["lng"] <= d, r["name"]
def dist(p, q):
    R = 6371000; la1, la2 = map(math.radians, (p["lat"], q["lat"]))
    dl = math.radians(q["lng"] - p["lng"]); dp = la2 - la1
    h = math.sin(dp/2)**2 + math.cos(la1)*math.cos(la2)*math.sin(dl/2)**2
    return 2*R*math.asin(math.sqrt(h))
close = [(p["name"], q["name"], round(dist(p, q))) for i, p in enumerate(rows) for q in rows[i+1:] if dist(p, q) < 30]
print("pairs closer than 30 m:", close)

# ---- outputs ----
fields = list(rows[0].keys())
with open(f"{OUT}/eventall_venues.csv", "w", newline="", encoding="utf-8-sig") as f:
    w = csv.DictWriter(f, fieldnames=fields); w.writeheader(); w.writerows(rows)
with open(f"{OUT}/eventall_venues.json", "w", encoding="utf-8") as f:
    json.dump(rows, f, ensure_ascii=False, indent=2)
geo = {"type": "FeatureCollection", "features": [
    {"type": "Feature", "geometry": {"type": "Point", "coordinates": [r["lng"], r["lat"]]},
     "properties": {k: v for k, v in r.items() if k not in ("lat", "lng")}} for r in rows]}
with open(f"{OUT}/eventall_venues.geojson", "w", encoding="utf-8") as f:
    json.dump(geo, f, ensure_ascii=False)

db = f"{OUT}/eventall_venues.sqlite"
if os.path.exists(db): os.remove(db)
con = sqlite3.connect(db)
con.executescript("""
CREATE TABLE venue_types (code TEXT PRIMARY KEY, label_tr TEXT NOT NULL);
CREATE TABLE venues (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, type TEXT NOT NULL REFERENCES venue_types(code),
  city TEXT NOT NULL CHECK (city IN ('Ankara','İstanbul')), district TEXT, neighborhood TEXT,
  lat REAL NOT NULL CHECK (lat BETWEEN -90 AND 90), lng REAL NOT NULL CHECK (lng BETWEEN -180 AND 180),
  precision TEXT NOT NULL CHECK (precision IN ('point','building_centroid','complex_centroid')),
  precision_note TEXT, osm_id TEXT UNIQUE, osm_name TEXT, osm_url TEXT, source TEXT, verified_on TEXT
);
CREATE INDEX idx_venues_city_type ON venues(city, type);
CREATE INDEX idx_venues_latlng ON venues(lat, lng);
""")
con.executemany("INSERT INTO venue_types VALUES (?,?)", TYPE_LABEL_TR.items())
con.executemany("INSERT INTO venues VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
    [(r["id"], r["name"], r["type"], r["city"], r["district"], r["neighborhood"], r["lat"], r["lng"],
      r["precision"], r["precision_note"], r["osm_id"], r["osm_name"], r["osm_url"], r["source"], r["verified_on"]) for r in rows])
con.commit()
for row in con.execute("SELECT city, type, COUNT(*) FROM venues GROUP BY city, type ORDER BY city, 3 DESC"):
    print(row)
print(Counter(r["precision"] for r in rows))
print(sorted(set(r["district"] for r in rows)))
