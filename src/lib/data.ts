import type {
  Category,
  City,
  DateFilter,
  EventItem,
  EventWithVenue,
  EventsFile,
  Offer,
  Performer,
  PerformersFile,
  Venue,
  VenueWithEvents,
  VenuesFile,
} from '../types';
import { getDateRange, isInRange } from './dates';
import { loadFromSupabase, supabaseConfig } from './supabase-data';

export interface AppData {
  venues: Venue[];
  events: EventWithVenue[];
  performers: Performer[];
}

/**
 * Single entry point for data. Reads the bundled JSON files, or Supabase when
 * VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set at build time
 * (docs/backend.md). Same AppData shape either way.
 */
export async function loadData(): Promise<AppData> {
  const cfg = supabaseConfig(import.meta.env);
  const { venues: venuesFile, events: eventsFile, performers: performersFile } = cfg
    ? await loadFromSupabase(cfg, Date.now())
    : await loadBundled();
  return {
    venues: venuesFile.venues,
    performers: performersFile.performers,
    events: joinEventsToVenues(eventsFile.events, venuesFile.venues, performersFile.performers),
  };
}

async function loadBundled() {
  const [venuesModule, eventsModule, performersModule] = await Promise.all([
    import('../data/venues.json'),
    import('../data/events.json'),
    import('../data/performers.json'),
  ]);
  return {
    venues: venuesModule.default as VenuesFile,
    events: eventsModule.default as EventsFile,
    performers: performersModule.default as PerformersFile,
  };
}

/**
 * Attaches each event's venue. Events whose venueId is unknown or whose
 * startsAt cannot be parsed are dropped (the validation script reports them).
 * Result is sorted by start time.
 */
export function joinEventsToVenues(
  events: EventItem[],
  venues: Venue[],
  performers: Performer[] = [],
): EventWithVenue[] {
  const byId = new Map(venues.map((v) => [v.id, v]));
  const performerById = new Map(performers.map((p) => [p.id, p]));
  const joined: EventWithVenue[] = [];
  for (const e of events) {
    const venue = byId.get(e.venueId);
    const startsAtMs = Date.parse(e.startsAt);
    if (!venue || Number.isNaN(startsAtMs)) continue;
    const eventPerformers = (e.performerIds ?? [])
      .map((id) => performerById.get(id))
      .filter((p): p is Performer => p !== undefined);
    joined.push({ ...e, venue, performers: eventPerformers, startsAtMs, minPrice: minPrice(e.offers ?? []) });
  }
  return joined.sort((a, b) => a.startsAtMs - b.startsAtMs);
}

export interface EventFilters {
  date: DateFilter;
  /** Empty = all categories. */
  categories: Category[];
  /** Only events at venues in this city. Omit for every city. */
  city?: City;
}

export function filterEvents(
  events: EventWithVenue[],
  filters: EventFilters,
  now: number,
): EventWithVenue[] {
  const range = getDateRange(filters.date, now);
  const cats = new Set(filters.categories);
  return events.filter(
    (e) =>
      isInRange(e.startsAtMs, range) &&
      (cats.size === 0 || cats.has(e.category)) &&
      (filters.city === undefined || e.venue.city === filters.city),
  );
}

/** Most frequent category; ties go to the category of the earliest event. */
export function dominantCategory(events: EventWithVenue[]): Category | null {
  if (events.length === 0) return null;
  const counts = new Map<Category, number>();
  for (const e of events) counts.set(e.category, (counts.get(e.category) ?? 0) + 1);
  let best: Category | null = null;
  let bestCount = 0;
  // events are time-sorted, so iterating in order resolves ties by earliest event
  for (const e of events) {
    const c = counts.get(e.category)!;
    if (c > bestCount) {
      best = e.category;
      bestCount = c;
    }
  }
  return best;
}

/** Groups (already filtered) events by venue. Venues with no events are omitted. */
export function groupByVenue(events: EventWithVenue[]): VenueWithEvents[] {
  const groups = new Map<string, EventWithVenue[]>();
  for (const e of events) {
    const list = groups.get(e.venueId);
    if (list) list.push(e);
    else groups.set(e.venueId, [e]);
  }
  return [...groups.values()].map((list) => {
    const sorted = [...list].sort((a, b) => a.startsAtMs - b.startsAtMs);
    return { venue: sorted[0].venue, events: sorted, dominantCategory: dominantCategory(sorted) };
  });
}

/** Sample events (scripts/generate-sample-events.ts, fixtures) are titled "[Örnek] …". */
export function isSampleEvent(e: Pick<EventItem, 'title'>): boolean {
  return e.title.startsWith('[Örnek]');
}

export function isAvailable(o: Offer): boolean {
  return o.available !== false;
}

/** Lowest price among available offers that list a price. */
export function minPrice(offers: Offer[]): number | null {
  let best: number | null = null;
  for (const o of offers) {
    if (!isAvailable(o) || o.price === undefined) continue;
    if (best === null || o.price < best) best = o.price;
  }
  return best;
}

/**
 * Skyscanner-style ordering: available offers first, cheapest first, offers
 * without a price after priced ones, sold-out offers last.
 */
export function sortOffers(offers: Offer[]): Offer[] {
  const rank = (o: Offer) => (!isAvailable(o) ? 2 : o.price === undefined ? 1 : 0);
  return [...offers].sort(
    (a, b) => rank(a) - rank(b) || (a.price ?? Infinity) - (b.price ?? Infinity) || a.platform.localeCompare(b.platform),
  );
}
