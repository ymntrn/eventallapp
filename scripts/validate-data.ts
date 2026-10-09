/**
 * Read-only check of src/data/venues.json and src/data/events.json.
 *
 *   npm run validate:data      (also runs automatically before `npm run build`)
 *
 * Errors exit with code 1; warnings are reported but do not fail.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  CATEGORIES,
  TICKET_PLATFORMS,
  VENUE_TYPES,
  PERFORMER_KINDS,
  type EventsFile,
  type PerformersFile,
  type VenuesFile,
} from '../src/types.ts';
import { ANKARA_BOUNDS, distanceMeters, isInAnkara } from '../src/lib/geo.ts';

const CLUSTER_DISTANCE_M = 30;
const ISO_WITH_OFFSET = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?([+-]\d{2}:\d{2}|Z)$/;
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const root = resolve(import.meta.dirname, '..');
const errors: string[] = [];
const warnings: string[] = [];

function readJson<T>(rel: string): T | null {
  try {
    return JSON.parse(readFileSync(resolve(root, rel), 'utf8')) as T;
  } catch (e) {
    errors.push(`${rel}: cannot read/parse (${(e as Error).message})`);
    return null;
  }
}

const venuesFile = readJson<VenuesFile>('src/data/venues.json');
const eventsFile = readJson<EventsFile>('src/data/events.json');
const performersFile = readJson<PerformersFile>('src/data/performers.json');
const performers = Array.isArray(performersFile?.performers) ? performersFile.performers : [];
if (performersFile && !Array.isArray(performersFile.performers)) errors.push('performers.json: missing "performers" array');
const venues = Array.isArray(venuesFile?.venues) ? venuesFile.venues : [];
const events = Array.isArray(eventsFile?.events) ? eventsFile.events : [];
if (venuesFile && !Array.isArray(venuesFile.venues)) errors.push('venues.json: missing "venues" array');
if (eventsFile && !Array.isArray(eventsFile.events)) errors.push('events.json: missing "events" array');

// --- Venues ---------------------------------------------------------------
const venueIds = new Set<string>();
const venueNames = new Map<string, string>();
for (const [i, v] of venues.entries()) {
  const where = `venue #${i} (${v.id ?? '?'})`;
  if (typeof v.id !== 'string' || !v.id) errors.push(`${where}: missing id`);
  else {
    if (venueIds.has(v.id)) errors.push(`${where}: duplicate id "${v.id}"`);
    venueIds.add(v.id);
    if (!SLUG.test(v.id)) errors.push(`${where}: id is not a lowercase ASCII slug`);
  }
  if (typeof v.name !== 'string' || !v.name.trim()) errors.push(`${where}: missing name`);
  else {
    const key = v.name.trim().toLocaleLowerCase('tr-TR');
    if (venueNames.has(key)) errors.push(`${where}: duplicate name "${v.name}" (also ${venueNames.get(key)})`);
    venueNames.set(key, v.id);
  }
  if (!(VENUE_TYPES as readonly string[]).includes(v.type))
    errors.push(`${where}: invalid type "${v.type}" (allowed: ${VENUE_TYPES.join(', ')})`);
  if (typeof v.lat !== 'number' || typeof v.lng !== 'number' || Number.isNaN(v.lat) || Number.isNaN(v.lng))
    errors.push(`${where}: lat/lng must be numbers`);
  else if (!isInAnkara(v.lat, v.lng))
    errors.push(
      `${where}: coordinates ${v.lat}, ${v.lng} outside Ankara box (lat ${ANKARA_BOUNDS.minLat}–${ANKARA_BOUNDS.maxLat}, lng ${ANKARA_BOUNDS.minLng}–${ANKARA_BOUNDS.maxLng})`,
    );
  if (typeof v.verified !== 'boolean') errors.push(`${where}: "verified" must be true or false`);
}

const close: string[] = [];
for (let i = 0; i < venues.length; i++) {
  for (let j = i + 1; j < venues.length; j++) {
    const a = venues[i];
    const b = venues[j];
    if (typeof a.lat !== 'number' || typeof b.lat !== 'number') continue;
    const d = distanceMeters(a.lat, a.lng, b.lat, b.lng);
    if (d < CLUSTER_DISTANCE_M) close.push(`${a.id} ↔ ${b.id} (${d.toFixed(1)} m) – will be clustered`);
  }
}

// --- Performers -----------------------------------------------------------
const performerIds = new Set<string>();
for (const [i, p] of performers.entries()) {
  const where = `performer #${i} (${p.id ?? '?'})`;
  if (typeof p.id !== 'string' || !SLUG.test(p.id)) errors.push(`${where}: id must be a lowercase ASCII slug`);
  else if (performerIds.has(p.id)) errors.push(`${where}: duplicate id "${p.id}"`);
  else performerIds.add(p.id);
  if (typeof p.name !== 'string' || !p.name.trim()) errors.push(`${where}: missing name`);
  if (!(PERFORMER_KINDS as readonly string[]).includes(p.kind))
    errors.push(`${where}: invalid kind "${p.kind}" (allowed: ${PERFORMER_KINDS.join(', ')})`);
}

// --- Events ---------------------------------------------------------------
const eventIds = new Set<string>();
const now = Date.now();
let pastCount = 0;
const usedVenues = new Set<string>();
for (const [i, e] of events.entries()) {
  const where = `event #${i} (${e.id ?? '?'})`;
  if (typeof e.id !== 'string' || !e.id) errors.push(`${where}: missing id`);
  else if (eventIds.has(e.id)) errors.push(`${where}: duplicate id "${e.id}"`);
  else eventIds.add(e.id);
  if (!venueIds.has(e.venueId)) errors.push(`${where}: venueId "${e.venueId}" does not exist in venues.json`);
  else usedVenues.add(e.venueId);
  if (typeof e.title !== 'string' || !e.title.trim()) errors.push(`${where}: missing title`);
  if (!(CATEGORIES as readonly string[]).includes(e.category))
    errors.push(`${where}: invalid category "${e.category}" (allowed: ${CATEGORIES.join(', ')})`);
  if (typeof e.startsAt !== 'string' || !ISO_WITH_OFFSET.test(e.startsAt) || Number.isNaN(Date.parse(e.startsAt)))
    errors.push(`${where}: startsAt "${e.startsAt}" is not ISO 8601 with offset (e.g. 2026-10-10T21:00:00+03:00)`);
  else if (Date.parse(e.startsAt) < now) pastCount++;
  if (!Array.isArray(e.offers) || e.offers.length === 0) errors.push(`${where}: needs at least one offer`);
  else {
    const seen = new Set<string>();
    for (const [k, o] of e.offers.entries()) {
      const ow = `${where} offer #${k}`;
      if (!(TICKET_PLATFORMS as readonly string[]).includes(o.platform))
        errors.push(`${ow}: invalid platform "${o.platform}" (allowed: ${TICKET_PLATFORMS.join(', ')})`);
      if (o.platform !== 'Other' && seen.has(o.platform)) warnings.push(`${ow}: ${o.platform} listed twice`);
      seen.add(o.platform);
      try {
        if (new URL(o.url).protocol !== 'https:') errors.push(`${ow}: url must use https`);
      } catch {
        errors.push(`${ow}: url "${o.url}" is not a valid URL`);
      }
      if (o.price !== undefined && (typeof o.price !== 'number' || o.price < 0))
        errors.push(`${ow}: price must be a non-negative number`);
      if (o.available !== undefined && typeof o.available !== 'boolean')
        errors.push(`${ow}: available must be true or false`);
    }
  }
  for (const pid of e.performerIds ?? [])
    if (!performerIds.has(pid)) errors.push(`${where}: performerId "${pid}" does not exist in performers.json`);
}
if (pastCount > 0) warnings.push(`${pastCount} event(s) are in the past and will not be shown`);

// --- Report ---------------------------------------------------------------
const unverified = venues.filter((v) => v.verified !== true).length;
if (unverified > 0) warnings.push(`${unverified} of ${venues.length} venues have verified: false`);

console.log('Eventall data validation');
console.log('========================');
console.log(`Venues: ${venues.length}  |  Events: ${events.length}  |  Performers: ${performers.length}  |  Venues with events: ${usedVenues.size}`);
console.log(`Unverified venues: ${unverified}`);
console.log('');
console.log(`Venues closer than ${CLUSTER_DISTANCE_M} m: ${close.length}`);
for (const c of close) console.log(`  • ${c}`);
console.log('');
console.log(`Warnings: ${warnings.length}`);
for (const w of warnings) console.log(`  ⚠ ${w}`);
console.log(`Errors: ${errors.length}`);
for (const e of errors) console.log(`  ✖ ${e}`);
console.log('');
if (errors.length > 0) {
  console.log('FAILED');
  process.exit(1);
}
console.log('OK');
