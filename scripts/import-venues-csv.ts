/**
 * Builds src/data/venues.json from data/venues_source.csv.
 *
 *   npm run import:venues
 *
 * Manual alternative to `npm run import:venues:db` (the OSM venue database).
 *
 * CSV header (first row): name,type,city,lat,lng,address   (address optional)
 * city is Ankara or İstanbul.
 * Ids are generated from names (Turkish characters transliterated). Every
 * imported venue gets verified: false — flip it to true per venue after checking.
 * Overwrites src/data/venues.json. Run `npm run validate:data` afterwards.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CITIES, VENUE_TYPES, type City, type Venue, type VenueType, type VenuesFile } from '../src/types.ts';
import { uniqueSlug } from '../src/lib/slug.ts';

const root = resolve(import.meta.dirname, '..');
const csvPath = resolve(root, 'data/venues_source.csv');
const outPath = resolve(root, 'src/data/venues.json');

/** Minimal RFC 4180 parser: commas, double-quoted fields, "" escapes, CRLF. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  const src = text.replace(/^﻿/, '');
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += ch;
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

if (!existsSync(csvPath)) {
  console.log(`No CSV found at data/venues_source.csv – nothing to import.`);
  console.log(`Expected header: name,type,city,lat,lng,address`);
  process.exit(0);
}

const rows = parseCsv(readFileSync(csvPath, 'utf8'));
const header = rows.shift()?.map((h) => h.trim().toLowerCase()) ?? [];
const col = (name: string) => header.indexOf(name);
for (const required of ['name', 'type', 'city', 'lat', 'lng']) {
  if (col(required) === -1) {
    console.error(`CSV header must contain "${required}". Found: ${header.join(',')}`);
    process.exit(1);
  }
}

const taken = new Set<string>();
const venues: Venue[] = [];
const problems: string[] = [];
rows.forEach((r, i) => {
  const line = i + 2;
  const name = r[col('name')]?.trim() ?? '';
  const type = r[col('type')]?.trim() as VenueType;
  const city = r[col('city')]?.trim() as City;
  // Accept decimal commas ("39,93") as well as dots.
  const lat = Number(r[col('lat')]?.trim().replace(',', '.'));
  const lng = Number(r[col('lng')]?.trim().replace(',', '.'));
  const address = col('address') >= 0 ? r[col('address')]?.trim() : '';
  if (!name) return problems.push(`line ${line}: empty name, skipped`);
  if (!VENUE_TYPES.includes(type))
    return problems.push(`line ${line} (${name}): invalid type "${type}", skipped`);
  if (!CITIES.includes(city))
    return problems.push(`line ${line} (${name}): invalid city "${city}" (allowed: ${CITIES.join(', ')}), skipped`);
  if (!Number.isFinite(lat) || !Number.isFinite(lng))
    return problems.push(`line ${line} (${name}): invalid lat/lng, skipped`);
  const venue: Venue = { id: uniqueSlug(name, taken), name, type, city, lat, lng, verified: false };
  if (address) venue.address = address;
  venues.push(venue);
});

const file: VenuesFile = {
  _note: `Imported from data/venues_source.csv on ${new Date().toISOString().slice(0, 10)}. Coordinates must be verified before public release; set verified: true per venue once checked.`,
  venues,
};
writeFileSync(outPath, JSON.stringify(file, null, 2) + '\n');
console.log(`Imported ${venues.length} venues → src/data/venues.json`);
for (const p of problems) console.log(`  ⚠ ${p}`);
console.log('Next: npm run validate:data (event venueIds may need updating to the new ids).');
