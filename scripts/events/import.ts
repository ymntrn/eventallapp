/**
 * Imports events from ticketing platforms.
 *
 *   npm run events:import -- --city Ankara                      all adapters, writes data/events/imported.json
 *   npm run events:import -- --source biletinial --fixture f.json
 *   npm run events:import -- --city Ankara --apply              also replace src/data/events.json
 *
 * Today the only adapter (biletinial) reads a saved fixture; nothing is fetched
 * live. See docs/ticketing-sources.md before adding a live source.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { CITIES, type City, type EventsFile, type VenuesFile } from '../../src/types.ts';
import { biletinial } from './adapters/biletinial.ts';
import { runPipeline } from './pipeline.ts';
import type { SourceAdapter } from './types.ts';
import type { AliasFile } from './venue-matcher.ts';

const ADAPTERS: SourceAdapter[] = [biletinial as SourceAdapter];

const root = resolve(import.meta.dirname, '../..');
const args = process.argv.slice(2);
const arg = (name: string) => {
  const i = args.indexOf(name);
  return i === -1 ? undefined : args[i + 1];
};

const city = (arg('--city') ?? 'Ankara') as City;
if (!CITIES.includes(city)) {
  console.error(`--city must be one of: ${CITIES.join(', ')}`);
  process.exit(1);
}
const sourceId = arg('--source');
const adapters = sourceId ? ADAPTERS.filter((a) => a.id === sourceId) : ADAPTERS;
if (adapters.length === 0) {
  console.error(`Unknown --source "${sourceId}". Available: ${ADAPTERS.map((a) => a.id).join(', ')}`);
  process.exit(1);
}
const fixture = arg('--fixture');
if (fixture && adapters.length !== 1) {
  console.error('--fixture needs --source');
  process.exit(1);
}

const venues = (JSON.parse(readFileSync(resolve(root, 'src/data/venues.json'), 'utf8')) as VenuesFile).venues;
const aliases = JSON.parse(readFileSync(resolve(root, 'data/venues/aliases.json'), 'utf8')) as AliasFile;

const result = await runPipeline({
  adapters,
  city,
  venues,
  aliases,
  fixtures: fixture ? { [adapters[0].id]: resolve(process.cwd(), fixture) } : undefined,
});

for (const s of result.stats)
  console.log(`${s.source}: ${s.fetched} fetched, ${s.normalized} usable, ${s.matched} matched to a venue`);
const offers = result.events.reduce((n, e) => n + e.offers.length, 0);
console.log(`→ ${result.events.length} events with ${offers} offers (${city})`);
if (result.unmatched.length > 0) {
  console.log(`\nUnmatched venue names (add them to data/venues/aliases.json, or to MISSING.md if the venue is new):`);
  for (const [name, n] of result.unmatched) console.log(`  ${n}× ${name}`);
}

const file: EventsFile = {
  _note: `Imported by scripts/events/import.ts on ${new Date().toISOString().slice(0, 10)} (${city}; sources: ${adapters.map((a) => a.id).join(', ')}).`,
  events: result.events,
};
const out = resolve(root, arg('--out') ?? 'data/events/imported.json');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(file, null, 2) + '\n');
console.log(`\nWrote ${out}`);
if (args.includes('--apply')) {
  writeFileSync(resolve(root, 'src/data/events.json'), JSON.stringify(file, null, 2) + '\n');
  console.log('Replaced src/data/events.json. Run npm run validate:data.');
}
