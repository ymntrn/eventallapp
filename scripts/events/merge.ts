/**
 * Merges listings of the same performance from several platforms into one
 * EventItem with one offer per platform.
 *
 * Two listings are the same event when they are at the same venue, start
 * within 30 minutes of each other and have similar titles (see sameTitle).
 */
import type { Category, EventItem, Offer } from '../../src/types.ts';
import { uniqueSlug } from '../../src/lib/slug.ts';
import { normalizeName } from './normalize.ts';
import type { NormalizedListing } from './types.ts';

export interface MatchedListing extends NormalizedListing {
  venueId: string;
}

const SAME_EVENT_WINDOW_MS = 30 * 60_000;

/** Words platforms add around the real title; ignored when comparing. */
const NOISE = new Set([
  'konser', 'konseri', 'konserleri', 'canli', 'performans', 'gosteri', 'gosterisi',
  'ankara', 'istanbul', 'live', 'concert', 'tour', 'turne', 'turnesi', 've', 'ile', 'the',
]);

function titleTokens(title: string): Set<string> {
  return new Set(normalizeName(title).split(' ').filter((w) => w.length > 1 && !NOISE.has(w)));
}

/**
 * Titles match when one's significant words contain the other's, or when they
 * share at least half of their combined significant words (Jaccard ≥ 0.5).
 */
export function sameTitle(a: string, b: string): boolean {
  const ta = titleTokens(a);
  const tb = titleTokens(b);
  if (ta.size === 0 || tb.size === 0) return normalizeName(a) === normalizeName(b);
  let shared = 0;
  for (const w of ta) if (tb.has(w)) shared++;
  if (shared === Math.min(ta.size, tb.size)) return true;
  return shared / (ta.size + tb.size - shared) >= 0.5;
}

function sameEvent(a: MatchedListing, b: MatchedListing): boolean {
  return (
    a.venueId === b.venueId &&
    Math.abs(Date.parse(a.startsAt) - Date.parse(b.startsAt)) <= SAME_EVENT_WINDOW_MS &&
    sameTitle(a.title, b.title)
  );
}

/** Most frequent value; ties go to the one `tieBreak` sorts first. */
function mostCommon<T>(values: T[], tieBreak: (a: T, b: T) => number): T {
  const counts = new Map<T, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1] || tieBreak(a[0], b[0]))[0][0];
}

/** One offer per platform: the cheapest available listing, else the first. */
function offersFor(group: MatchedListing[]): Offer[] {
  const best = new Map<string, MatchedListing>();
  const rank = (l: MatchedListing) => (l.available === false ? Infinity : (l.price ?? Number.MAX_SAFE_INTEGER));
  for (const l of group) {
    const prev = best.get(l.platform);
    if (!prev || rank(l) < rank(prev)) best.set(l.platform, l);
  }
  return [...best.values()]
    .sort((a, b) => a.platform.localeCompare(b.platform))
    .map((l) => {
      const offer: Offer = { platform: l.platform, url: l.url };
      if (l.price !== undefined) offer.price = l.price;
      if (l.label) offer.label = l.label;
      if (l.available === false) offer.available = false;
      return offer;
    });
}

export function mergeListings(listings: MatchedListing[]): EventItem[] {
  const sorted = [...listings].sort(
    (a, b) => a.venueId.localeCompare(b.venueId) || Date.parse(a.startsAt) - Date.parse(b.startsAt),
  );
  const groups: MatchedListing[][] = [];
  for (const l of sorted) {
    const group = groups.find((g) => g.some((m) => sameEvent(m, l)));
    if (group) group.push(l);
    else groups.push([l]);
  }

  const taken = new Set<string>();
  const events = groups.map((group): EventItem => {
    // Platforms add suffixes ("… Ankara Konseri"), so prefer the shortest common title.
    const title = mostCommon(
      group.map((l) => l.title.trim()),
      (a, b) => a.length - b.length || a.localeCompare(b, 'tr'),
    );
    const startsAt = mostCommon(
      group.map((l) => l.startsAt),
      (a, b) => Date.parse(a) - Date.parse(b),
    );
    const known = group.map((l) => l.category).filter((c) => c !== 'other');
    const category: Category = known.length ? mostCommon(known, (a, b) => a.localeCompare(b)) : 'other';
    const venueId = group[0].venueId;
    return {
      id: uniqueSlug(`${venueId} ${startsAt.slice(0, 10)} ${title}`.slice(0, 90), taken),
      venueId,
      title,
      category,
      startsAt,
      offers: offersFor(group),
    };
  });
  return events.sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt) || a.id.localeCompare(b.id));
}
