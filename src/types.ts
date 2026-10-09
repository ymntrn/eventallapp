export const VENUE_TYPES = [
  'concert_hall',
  'live_music',
  'electronic',
  'open_air',
  'festival_ground',
  'theater',
  'opera',
  'classical',
  'arena',
  'performance_space',
] as const;
export type VenueType = (typeof VENUE_TYPES)[number];

export const CATEGORIES = [
  'rock',
  'pop',
  'electronic',
  'jazz_classical',
  'theater',
  'comedy',
  'other',
] as const;
export type Category = (typeof CATEGORIES)[number];

export const TICKET_PLATFORMS = [
  'Biletix',
  'Passo',
  'Biletinial',
  'Bubilet',
  'Mobilet',
  'Other',
] as const;
export type TicketPlatform = (typeof TICKET_PLATFORMS)[number];

export interface Venue {
  /** Slug, Turkish characters transliterated (see src/lib/slug.ts). */
  id: string;
  name: string;
  type: VenueType;
  address?: string;
  lat: number;
  lng: number;
  /** True only if the coordinates were checked by a human. */
  verified: boolean;
}

export interface EventItem {
  id: string;
  venueId: string;
  title: string;
  category: Category;
  /** ISO 8601 with explicit offset, e.g. 2026-10-10T21:00:00+03:00 */
  startsAt: string;
  ticketUrl: string;
  ticketPlatform: TicketPlatform;
  imageUrl?: string;
  /** Lowest price in TRY. */
  priceFrom?: number;
}

/** Shape of src/data/venues.json */
export interface VenuesFile {
  _note?: string;
  venues: Venue[];
}

/** Shape of src/data/events.json */
export interface EventsFile {
  _note?: string;
  events: EventItem[];
}

export type DateFilter = 'tonight' | 'weekend' | 'next7' | 'all';

/** An event joined with its venue. */
export interface EventWithVenue extends EventItem {
  venue: Venue;
  /** Parsed startsAt, epoch milliseconds. */
  startsAtMs: number;
}

/** A venue together with its (filtered, time-sorted) events. */
export interface VenueWithEvents {
  venue: Venue;
  events: EventWithVenue[];
  dominantCategory: Category | null;
}
