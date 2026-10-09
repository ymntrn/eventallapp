import type {
  Category,
  DateFilter,
  EventItem,
  EventWithVenue,
  EventsFile,
  Venue,
  VenueWithEvents,
  VenuesFile,
} from '../types';
import { getDateRange, isInRange } from './dates';

export interface AppData {
  venues: Venue[];
  events: EventWithVenue[];
}

/**
 * Single entry point for data. Today it reads the bundled JSON files; to switch
 * to an API later, replace the two imports with fetch() calls returning the
 * same VenuesFile / EventsFile shapes.
 */
export async function loadData(): Promise<AppData> {
  const [venuesModule, eventsModule] = await Promise.all([
    import('../data/venues.json'),
    import('../data/events.json'),
  ]);
  const venuesFile = venuesModule.default as VenuesFile;
  const eventsFile = eventsModule.default as EventsFile;
  return {
    venues: venuesFile.venues,
    events: joinEventsToVenues(eventsFile.events, venuesFile.venues),
  };
}

/**
 * Attaches each event's venue. Events whose venueId is unknown or whose
 * startsAt cannot be parsed are dropped (the validation script reports them).
 * Result is sorted by start time.
 */
export function joinEventsToVenues(events: EventItem[], venues: Venue[]): EventWithVenue[] {
  const byId = new Map(venues.map((v) => [v.id, v]));
  const joined: EventWithVenue[] = [];
  for (const e of events) {
    const venue = byId.get(e.venueId);
    const startsAtMs = Date.parse(e.startsAt);
    if (!venue || Number.isNaN(startsAtMs)) continue;
    joined.push({ ...e, venue, startsAtMs });
  }
  return joined.sort((a, b) => a.startsAtMs - b.startsAtMs);
}

export interface EventFilters {
  date: DateFilter;
  /** Empty = all categories. */
  categories: Category[];
}

export function filterEvents(
  events: EventWithVenue[],
  filters: EventFilters,
  now: number,
): EventWithVenue[] {
  const range = getDateRange(filters.date, now);
  const cats = new Set(filters.categories);
  return events.filter(
    (e) => isInRange(e.startsAtMs, range) && (cats.size === 0 || cats.has(e.category)),
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
