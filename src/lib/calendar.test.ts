import { describe, expect, it } from 'vitest';
import type { EventItem, Venue } from '../types';
import { joinEventsToVenues } from './data';
import { calendarEntries, groupByMonth } from './calendar';

const venue = (id: string): Venue => ({ id, name: id, type: 'theater', city: 'Ankara', lat: 39.93, lng: 32.85, verified: false });
const ev = (id: string, venueId: string, startsAt: string, performerIds?: string[]): EventItem => ({
  id,
  venueId,
  title: id,
  category: 'rock',
  startsAt,
  offers: [{ platform: 'Biletix', url: 'https://www.biletix.com/' }],
  ...(performerIds ? { performerIds } : {}),
});

const now = Date.parse('2026-10-14T12:00:00+03:00');
const events = joinEventsToVenues(
  [
    ev('old-saved', 'v1', '2026-10-10T20:00:00+03:00'),
    ev('saved', 'v1', '2026-10-20T20:00:00+03:00'),
    ev('band', 'v2', '2026-10-31T23:30:00+03:00', ['band']),
    ev('venue', 'v3', '2026-11-02T20:00:00+03:00'),
    ev('saved-band-venue', 'v3', '2026-12-05T20:00:00+03:00', ['band']),
    ev('other', 'v2', '2026-11-03T20:00:00+03:00'),
  ],
  [venue('v1'), venue('v2'), venue('v3')],
);
const src = { savedEvents: ['old-saved', 'saved', 'saved-band-venue'], followedPerformers: ['band'], followedVenues: ['v3'] };

describe('calendarEntries', () => {
  it('has upcoming saved events and events of followed artists and venues, deduplicated, by time', () => {
    const entries = calendarEntries(events, src, now);
    expect(entries.map((e) => [e.event.id, e.reasons])).toEqual([
      ['saved', ['saved']],
      ['band', ['performer']],
      ['venue', ['venue']],
      ['saved-band-venue', ['saved', 'performer', 'venue']],
    ]);
  });

  it('is empty with nothing saved or followed', () => {
    expect(calendarEntries(events, { savedEvents: [], followedPerformers: [], followedVenues: [] }, now)).toEqual([]);
  });
});

describe('groupByMonth', () => {
  it('groups by Istanbul month with Turkish labels', () => {
    const months = groupByMonth(calendarEntries(events, src, now));
    expect(months.map((m) => [m.key, m.label, m.entries.map((e) => e.event.id)])).toEqual([
      ['2026-10', 'Ekim 2026', ['saved', 'band']],
      ['2026-11', 'Kasım 2026', ['venue']],
      ['2026-12', 'Aralık 2026', ['saved-band-venue']],
    ]);
  });

  it('puts a late-night show on the last day of the month by Istanbul time, not UTC', () => {
    // 31 Oct 23:30 Istanbul is 20:30 UTC: October either way; 1 Nov 01:00 Istanbul is still 31 Oct in UTC.
    const late = joinEventsToVenues([ev('late', 'v1', '2026-11-01T01:00:00+03:00')], [venue('v1')]);
    const months = groupByMonth(calendarEntries(late, { savedEvents: ['late'], followedPerformers: [], followedVenues: [] }, now));
    expect(months[0].key).toBe('2026-11');
  });
});
