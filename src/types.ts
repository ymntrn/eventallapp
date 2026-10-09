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

/** One seller's listing for an event (like one airline/agency on Skyscanner). */
export interface Offer {
  platform: TicketPlatform;
  /** Official page on the seller's site (https). */
  url: string;
  /** Lowest price at this seller, TRY. Omit if unknown. */
  price?: number;
  /** Ticket type shown to the user, e.g. "Genel giriş", "Öğrenci". */
  label?: string;
  /** false = sold out at this seller. Defaults to true. */
  available?: boolean;
}

export const PERFORMER_KINDS = ['band', 'musician', 'dj', 'comedian', 'company', 'ensemble'] as const;
export type PerformerKind = (typeof PERFORMER_KINDS)[number];

export interface Performer {
  /** Slug, unique. */
  id: string;
  name: string;
  kind: PerformerKind;
  /** Short genre or description, e.g. "Alternatif rock". */
  genre?: string;
}

export interface EventItem {
  id: string;
  venueId: string;
  title: string;
  category: Category;
  /** ISO 8601 with explicit offset, e.g. 2026-10-10T21:00:00+03:00 */
  startsAt: string;
  /** Every seller selling tickets for this event. At least one. */
  offers: Offer[];
  /** Performer ids (see performers.json). */
  performerIds?: string[];
  imageUrl?: string;
  description?: string;
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

/** Shape of src/data/performers.json */
export interface PerformersFile {
  _note?: string;
  performers: Performer[];
}

/** An event joined with its venue and performers. */
export interface EventWithVenue extends EventItem {
  venue: Venue;
  performers: Performer[];
  /** Parsed startsAt, epoch milliseconds. */
  startsAtMs: number;
  /** Lowest available price across all sellers, or null if unknown. */
  minPrice: number | null;
}

/** A venue together with its (filtered, time-sorted) events. */
export interface VenueWithEvents {
  venue: Venue;
  events: EventWithVenue[];
  dominantCategory: Category | null;
}
