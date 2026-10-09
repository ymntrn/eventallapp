/**
 * Matches a platform's venue name to one of our venue ids.
 *
 * Order: alias (data/venues/aliases.json) → full normalized name → name
 * without a trailing city word or "(…)" part → the "(…)" part on its own.
 * Matching is always within the listing's city. A key that fits several
 * venues is ambiguous and never matches; add an alias instead.
 */
import type { City, Venue } from '../../src/types.ts';
import { normalizeName } from './normalize.ts';

/** Shape of data/venues/aliases.json: venue id → names platforms use. Keys starting with "_" are comments. */
export type AliasFile = Record<string, string[] | string>;

export type MatchResult =
  | { ok: true; venueId: string; via: 'alias' | 'name' }
  | { ok: false; reason: 'unmatched' | 'ambiguous'; candidates?: string[] };

const CITY_WORDS = /\s(ankara|istanbul)$/;

/** Every comparable key for one name, most specific first. */
function keysFor(name: string): string[] {
  const keys = new Set<string>();
  const full = normalizeName(name);
  keys.add(full);
  keys.add(full.replace(CITY_WORDS, ''));
  const paren = name.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
  if (paren) {
    const base = normalizeName(paren[1]);
    keys.add(base);
    keys.add(base.replace(CITY_WORDS, ''));
    keys.add(normalizeName(paren[2]));
  }
  keys.delete('');
  return [...keys];
}

export class VenueMatcher {
  private aliases = new Map<string, string>(); // `${city}|${key}` → id
  private names = new Map<string, Set<string>>(); // `${city}|${key}` → ids
  private unmatched = new Map<string, number>(); // `${city} · ${name}` → count

  constructor(venues: Venue[], aliases: AliasFile = {}) {
    const byId = new Map(venues.map((v) => [v.id, v]));
    for (const [id, names] of Object.entries(aliases)) {
      if (id.startsWith('_')) continue;
      if (!Array.isArray(names)) throw new Error(`aliases.json: "${id}" must be a list of names`);
      const venue = byId.get(id);
      if (!venue) throw new Error(`aliases.json: unknown venue id "${id}"`);
      for (const n of names) {
        const key = `${venue.city}|${normalizeName(n)}`;
        const prev = this.aliases.get(key);
        if (prev && prev !== id) throw new Error(`aliases.json: "${n}" is listed for both ${prev} and ${id}`);
        this.aliases.set(key, id);
      }
    }
    for (const v of venues) {
      for (const k of keysFor(v.name)) {
        const key = `${v.city}|${k}`;
        const set = this.names.get(key) ?? new Set();
        set.add(v.id);
        this.names.set(key, set);
      }
    }
  }

  match(name: string, city: City): MatchResult {
    const keys = keysFor(name);
    for (const k of keys) {
      const id = this.aliases.get(`${city}|${k}`);
      if (id) return { ok: true, venueId: id, via: 'alias' };
    }
    for (const k of keys) {
      const ids = this.names.get(`${city}|${k}`);
      if (!ids) continue;
      if (ids.size === 1) return { ok: true, venueId: [...ids][0], via: 'name' };
      this.note(name, city);
      return { ok: false, reason: 'ambiguous', candidates: [...ids].sort() };
    }
    this.note(name, city);
    return { ok: false, reason: 'unmatched' };
  }

  private note(name: string, city: City) {
    const key = `${city} · ${name}`;
    this.unmatched.set(key, (this.unmatched.get(key) ?? 0) + 1);
  }

  /** Venue names that did not match, with how many listings used them. Most frequent first. */
  report(): [string, number][] {
    return [...this.unmatched].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'tr'));
  }
}
