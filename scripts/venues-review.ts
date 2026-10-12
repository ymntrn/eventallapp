/**
 * Lists venues that still need a human check, with links to verify each pin,
 * and flips the verified flag in src/data/venues.json.
 *
 *   npm run venues:review                          all unverified venues, approximate pins first
 *   npm run venues:review -- --city Ankara         one city
 *   npm run venues:review -- --geojson out.geojson also write them as GeoJSON (drop on geojson.io)
 *   npm run venues:review -- --verify <id> [<id>…] set verified: true
 *   npm run venues:review -- --unverify <id> […]   set verified: false
 *
 * How to check a pin: open the "pin" link. The marker must sit on the venue's
 * building or entrance. If it does, run --verify with its id. If it does not,
 * fix the row in data/venues/venues_osm_source.tsv instead (see data/venues/README.md).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CITIES, type City, type Venue, type VenuesFile } from '../src/types.ts';

const root = resolve(import.meta.dirname, '..');
const venuesPath = resolve(root, 'src/data/venues.json');
const file = JSON.parse(readFileSync(venuesPath, 'utf8')) as VenuesFile;
const args = process.argv.slice(2);

function flagValues(name: string): string[] {
  const i = args.indexOf(name);
  if (i === -1) return [];
  const out: string[] = [];
  for (const a of args.slice(i + 1)) {
    if (a.startsWith('--')) break;
    out.push(a);
  }
  return out;
}

const toVerify = flagValues('--verify');
const toUnverify = flagValues('--unverify');
if (toVerify.length > 0 || toUnverify.length > 0) {
  const byId = new Map(file.venues.map((v) => [v.id, v]));
  const unknown = [...toVerify, ...toUnverify].filter((id) => !byId.has(id));
  if (unknown.length > 0) {
    console.error(`Unknown venue id(s): ${unknown.join(', ')}. Nothing changed.`);
    process.exit(1);
  }
  for (const id of toVerify) byId.get(id)!.verified = true;
  for (const id of toUnverify) byId.get(id)!.verified = false;
  writeFileSync(venuesPath, JSON.stringify(file, null, 2) + '\n');
  if (toVerify.length) console.log(`verified: true  → ${toVerify.join(', ')}`);
  if (toUnverify.length) console.log(`verified: false → ${toUnverify.join(', ')}`);
  process.exit(0);
}

const cityArg = flagValues('--city')[0];
if (cityArg !== undefined && !(CITIES as readonly string[]).includes(cityArg)) {
  console.error(`--city must be one of: ${CITIES.join(', ')}`);
  process.exit(1);
}
const city = cityArg as City | undefined;

const PRECISION_ORDER = { complex_centroid: 0, building_centroid: 1, point: 2 } as const;
const todo = file.venues
  .filter((v) => !v.verified && (city === undefined || v.city === city))
  .sort(
    (a, b) =>
      PRECISION_ORDER[a.precision ?? 'complex_centroid'] - PRECISION_ORDER[b.precision ?? 'complex_centroid'] ||
      a.city.localeCompare(b.city, 'tr') ||
      a.name.localeCompare(b.name, 'tr'),
  );

const pinUrl = (v: Venue) => `https://www.openstreetmap.org/?mlat=${v.lat}&mlon=${v.lng}#map=19/${v.lat}/${v.lng}`;
const gmapsUrl = (v: Venue) => `https://www.google.com/maps/search/?api=1&query=${v.lat},${v.lng}`;

const total = file.venues.filter((v) => city === undefined || v.city === city).length;
console.log(`Unverified venues${city ? ` in ${city}` : ''}: ${todo.length} of ${total}\n`);
let lastPrecision: string | undefined;
for (const v of todo) {
  if (v.precision !== lastPrecision) {
    lastPrecision = v.precision;
    console.log(`── ${v.precision ?? 'no precision'} ${v.precision === 'complex_centroid' ? '(pin is the centre of a larger site: check these first)' : ''}`);
  }
  console.log(`${v.id}  ·  ${v.name}  ·  ${v.city}${v.district ? `/${v.district}` : ''}`);
  console.log(`   pin:    ${pinUrl(v)}`);
  console.log(`   google: ${gmapsUrl(v)}`);
  if (v.osmUrl) console.log(`   osm:    ${v.osmUrl}`);
}
console.log('\nMark checked pins with: npm run venues:review -- --verify <id> [<id>…]');

const geojsonOut = flagValues('--geojson')[0];
if (geojsonOut) {
  const fc = {
    type: 'FeatureCollection',
    features: todo.map((v) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [v.lng, v.lat] },
      properties: { id: v.id, name: v.name, city: v.city, precision: v.precision, osmUrl: v.osmUrl },
    })),
  };
  writeFileSync(resolve(process.cwd(), geojsonOut), JSON.stringify(fc));
  console.log(`Wrote ${todo.length} venues to ${geojsonOut} (open it on https://geojson.io)`);
}
