/**
 * Discover tab: three lists built with simple, explainable scoring (no ML).
 *
 * 1. "Sana özel": upcoming events by followed artists or at followed venues
 *    first, then events in the categories of the user's saved events. All
 *    cities (a followed artist playing in the other city is still relevant).
 *    At most FOR_YOU_LIMIT.
 * 2. "Bu hafta sonu": this weekend's events in the selected city, by time.
 * 3. "Yeni keşifler": upcoming events in the selected city by artists and at
 *    venues the user does not follow, not saved and not already in
 *    "Sana özel"; one per venue for variety, soonest first. At most
 *    NEW_DISCOVERIES_LIMIT.
 *
 * With "Bu akşam" on, Discover shows one list instead: tonight's events in
 * the selected city, ranked with the same score, then by time.
 */
import type { Category, City, EventWithVenue } from '../types';
import { filterEvents } from './data';

export const SCORE = { performer: 100, venue: 50, category: 10 } as const;
export const FOR_YOU_LIMIT = 50;
export const NEW_DISCOVERIES_LIMIT = 10;

export type Reason = keyof typeof SCORE;

export interface DiscoverContext {
  city: City;
  followedPerformers: readonly string[];
  followedVenues: readonly string[];
  savedEvents: readonly string[];
}

export interface ScoredEvent {
  event: EventWithVenue;
  score: number;
  /** Why it scored, strongest first. */
  reasons: Reason[];
}

/** Categories of the user's saved events (looked up in `events`). */
export function savedCategories(events: readonly EventWithVenue[], savedIds: readonly string[]): Set<Category> {
  const saved = new Set(savedIds);
  return new Set(events.filter((e) => saved.has(e.id)).map((e) => e.category));
}

/**
 * Followed artist: +100 (once, however many are on the bill). Followed venue: +50.
 * Category of a saved event: +10. So every followed match outranks every category match.
 */
export function scoreEvent(e: EventWithVenue, ctx: DiscoverContext, categories: ReadonlySet<Category>): ScoredEvent {
  const reasons: Reason[] = [];
  if (e.performerIds?.some((id) => ctx.followedPerformers.includes(id))) reasons.push('performer');
  if (ctx.followedVenues.includes(e.venueId)) reasons.push('venue');
  if (categories.has(e.category)) reasons.push('category');
  return { event: e, score: reasons.reduce((sum, r) => sum + SCORE[r], 0), reasons };
}

const byScoreThenTime = (a: ScoredEvent, b: ScoredEvent) =>
  b.score - a.score || a.event.startsAtMs - b.event.startsAtMs || a.event.id.localeCompare(b.event.id);

export function forYou(events: readonly EventWithVenue[], ctx: DiscoverContext, now: number): ScoredEvent[] {
  const categories = savedCategories(events, ctx.savedEvents);
  return filterEvents([...events], { date: 'all', categories: [] }, now)
    .map((e) => scoreEvent(e, ctx, categories))
    .filter((s) => s.score > 0)
    .sort(byScoreThenTime)
    .slice(0, FOR_YOU_LIMIT);
}

export function thisWeekend(events: readonly EventWithVenue[], city: City, now: number): EventWithVenue[] {
  return filterEvents([...events], { date: 'weekend', categories: [], city }, now);
}

export function newDiscoveries(
  events: readonly EventWithVenue[],
  ctx: DiscoverContext,
  now: number,
  exclude: ReadonlySet<string> = new Set(),
): EventWithVenue[] {
  const saved = new Set(ctx.savedEvents);
  const seenVenues = new Set<string>();
  const out: EventWithVenue[] = [];
  // filterEvents keeps the time order, so the first event per venue is its soonest.
  for (const e of filterEvents([...events], { date: 'all', categories: [], city: ctx.city }, now)) {
    if (out.length === NEW_DISCOVERIES_LIMIT) break;
    if (exclude.has(e.id) || saved.has(e.id) || seenVenues.has(e.venueId)) continue;
    if (ctx.followedVenues.includes(e.venueId)) continue;
    if (e.performerIds?.some((id) => ctx.followedPerformers.includes(id))) continue;
    seenVenues.add(e.venueId);
    out.push(e);
  }
  return out;
}

export function tonightList(
  events: readonly EventWithVenue[],
  ctx: DiscoverContext,
  now: number,
  tonightFrom: string | null,
): ScoredEvent[] {
  const categories = savedCategories(events, ctx.savedEvents);
  return filterEvents([...events], { date: 'tonight', categories: [], city: ctx.city, tonightFrom }, now)
    .map((e) => scoreEvent(e, ctx, categories))
    .sort(byScoreThenTime);
}

export interface DiscoverSections {
  forYou: ScoredEvent[];
  weekend: EventWithVenue[];
  discoveries: EventWithVenue[];
}

export function buildDiscover(events: readonly EventWithVenue[], ctx: DiscoverContext, now: number): DiscoverSections {
  const mine = forYou(events, ctx, now);
  return {
    forYou: mine,
    weekend: thisWeekend(events, ctx.city, now),
    discoveries: newDiscoveries(events, ctx, now, new Set(mine.map((s) => s.event.id))),
  };
}
