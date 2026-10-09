/**
 * Event import pipeline: fetch → normalize → match venue → merge → write.
 *
 * A source adapter only knows its platform: how to get raw listings and how
 * to turn one into a NormalizedListing. Matching venues, merging the same
 * event across platforms and writing events.json are shared (see pipeline.ts).
 */
import type { Category, City, TicketPlatform } from '../../src/types.ts';

/** One platform's listing for one performance, in our vocabulary. */
export interface NormalizedListing {
  platform: TicketPlatform;
  /** The platform's own id for the listing, for logs and de-duplication. */
  sourceId: string;
  title: string;
  /** Venue name exactly as the platform writes it. Matched in venue-matcher.ts. */
  venueName: string;
  city: City;
  /** ISO 8601 with +03:00 offset. */
  startsAt: string;
  /** Official https page on the platform. */
  url: string;
  category: Category;
  /** Lowest price at this platform, TRY. */
  price?: number;
  label?: string;
  /** false = sold out. */
  available?: boolean;
}

export interface SourceAdapter<Raw = unknown> {
  /** Short id used on the command line, e.g. "biletinial". */
  id: string;
  platform: Exclude<TicketPlatform, 'Other'>;
  /**
   * Returns raw listings. Adapters for platforms that have not permitted
   * automated access must read a fixture file and never fetch live.
   */
  fetch(opts: { city: City; fixturePath?: string }): Promise<Raw[]>;
  /** Returns null for listings to skip (e.g. other city, unparseable date). */
  normalize(raw: Raw): NormalizedListing | null;
}
