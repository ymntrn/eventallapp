/** fetch → normalize → match venue → merge. Pure apart from the adapters' fetch(). */
import type { City, EventItem, Venue } from '../../src/types.ts';
import { mergeListings, type MatchedListing } from './merge.ts';
import type { SourceAdapter } from './types.ts';
import { VenueMatcher, type AliasFile } from './venue-matcher.ts';

export interface PipelineResult {
  events: EventItem[];
  /** Listings per source: fetched, normalized, matched to a venue. */
  stats: { source: string; fetched: number; normalized: number; matched: number }[];
  /** "City · venue name" that did not match, with listing counts. */
  unmatched: [string, number][];
}

export async function runPipeline(opts: {
  adapters: SourceAdapter[];
  city: City;
  venues: Venue[];
  aliases?: AliasFile;
  /** adapter id → fixture file. */
  fixtures?: Record<string, string>;
}): Promise<PipelineResult> {
  const matcher = new VenueMatcher(opts.venues, opts.aliases);
  const matched: MatchedListing[] = [];
  const stats: PipelineResult['stats'] = [];
  for (const adapter of opts.adapters) {
    const raw = await adapter.fetch({ city: opts.city, fixturePath: opts.fixtures?.[adapter.id] });
    let normalized = 0;
    let ok = 0;
    for (const r of raw) {
      const listing = adapter.normalize(r);
      if (!listing || listing.city !== opts.city) continue;
      normalized++;
      const m = matcher.match(listing.venueName, listing.city);
      if (!m.ok) continue;
      ok++;
      matched.push({ ...listing, venueId: m.venueId });
    }
    stats.push({ source: adapter.id, fetched: raw.length, normalized, matched: ok });
  }
  return { events: mergeListings(matched), stats, unmatched: matcher.report() };
}
