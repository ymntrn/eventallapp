/**
 * Personal calendar: upcoming saved events plus upcoming events by followed
 * artists and at followed venues, grouped by month (Istanbul time).
 */
import type { EventWithVenue } from '../types';
import { filterEvents } from './data';
import { TIMEZONE } from './dates';

export type CalendarReason = 'saved' | 'performer' | 'venue';

export interface CalendarEntry {
  event: EventWithVenue;
  /** Why it is in the calendar, in this order: saved, performer, venue. */
  reasons: CalendarReason[];
}

export interface CalendarMonth {
  /** "2026-10" */
  key: string;
  /** "Ekim 2026" */
  label: string;
  entries: CalendarEntry[];
}

export interface CalendarSources {
  savedEvents: readonly string[];
  followedPerformers: readonly string[];
  followedVenues: readonly string[];
}

export function calendarEntries(events: readonly EventWithVenue[], src: CalendarSources, now: number): CalendarEntry[] {
  const saved = new Set(src.savedEvents);
  const performers = new Set(src.followedPerformers);
  const venues = new Set(src.followedVenues);
  const out: CalendarEntry[] = [];
  // Upcoming only (same rule as the map's "Tüm tarihler"), already time-sorted.
  for (const event of filterEvents([...events], { date: 'all', categories: [] }, now)) {
    const reasons: CalendarReason[] = [];
    if (saved.has(event.id)) reasons.push('saved');
    if (event.performerIds?.some((id) => performers.has(id))) reasons.push('performer');
    if (venues.has(event.venueId)) reasons.push('venue');
    if (reasons.length > 0) out.push({ event, reasons });
  }
  return out;
}

const monthKeyFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE, year: 'numeric', month: '2-digit' });
const monthLabelFmt = new Intl.DateTimeFormat('tr-TR', { timeZone: TIMEZONE, year: 'numeric', month: 'long' });

/** Groups time-sorted entries by Istanbul calendar month, keeping the order. */
export function groupByMonth(entries: readonly CalendarEntry[]): CalendarMonth[] {
  const months: CalendarMonth[] = [];
  for (const entry of entries) {
    const key = monthKeyFmt.format(entry.event.startsAtMs).slice(0, 7);
    let month = months.at(-1);
    if (!month || month.key !== key) {
      month = { key, label: monthLabelFmt.format(entry.event.startsAtMs), entries: [] };
      months.push(month);
    }
    month.entries.push(entry);
  }
  return months;
}
