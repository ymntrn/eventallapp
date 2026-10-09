import { describe, expect, it } from 'vitest';
import type { EventItem, Venue } from '../types';
import { dominantCategory, filterEvents, groupByVenue, joinEventsToVenues } from './data';

const venue = (id: string): Venue => ({ id, name: id, type: 'theater', lat: 39.93, lng: 32.85, verified: false });
const event = (id: string, venueId: string, startsAt: string, category: EventItem['category'] = 'rock'): EventItem => ({
  id,
  venueId,
  title: id,
  category,
  startsAt,
  ticketUrl: 'https://www.biletix.com/',
  ticketPlatform: 'Biletix',
});

const venues = [venue('a'), venue('b'), venue('c')];

describe('joinEventsToVenues', () => {
  it('attaches the venue object and sorts by start time', () => {
    const joined = joinEventsToVenues(
      [event('2', 'b', '2026-10-10T21:00:00+03:00'), event('1', 'a', '2026-10-10T20:00:00+03:00')],
      venues,
    );
    expect(joined.map((e) => e.id)).toEqual(['1', '2']);
    expect(joined[0].venue).toBe(venues[0]);
    expect(joined[0].startsAtMs).toBe(Date.parse('2026-10-10T17:00:00Z'));
  });

  it('drops events with an unknown venueId or invalid date', () => {
    const joined = joinEventsToVenues(
      [event('ok', 'a', '2026-10-10T20:00:00+03:00'), event('x', 'nope', '2026-10-10T20:00:00+03:00'), event('y', 'a', 'yarın')],
      venues,
    );
    expect(joined.map((e) => e.id)).toEqual(['ok']);
  });
});

describe('filterEvents + groupByVenue', () => {
  const now = Date.parse('2026-10-09T12:00:00+03:00'); // Friday noon
  const all = joinEventsToVenues(
    [
      event('tonight-rock', 'a', '2026-10-09T21:00:00+03:00', 'rock'),
      event('tonight-theater', 'a', '2026-10-09T20:00:00+03:00', 'theater'),
      event('sat-pop', 'b', '2026-10-10T21:00:00+03:00', 'pop'),
      event('past', 'c', '2026-10-08T21:00:00+03:00', 'pop'),
    ],
    venues,
  );

  it('combines date and category filters', () => {
    expect(filterEvents(all, { date: 'tonight', categories: [] }, now).map((e) => e.id)).toEqual([
      'tonight-theater',
      'tonight-rock',
    ]);
    expect(filterEvents(all, { date: 'tonight', categories: ['rock'] }, now).map((e) => e.id)).toEqual(['tonight-rock']);
    expect(filterEvents(all, { date: 'weekend', categories: [] }, now).map((e) => e.id)).toEqual(['sat-pop']);
    expect(filterEvents(all, { date: 'all', categories: ['pop', 'rock'] }, now).map((e) => e.id)).toEqual([
      'tonight-rock',
      'sat-pop',
    ]);
  });

  it('groups only venues with matching events', () => {
    const groups = groupByVenue(filterEvents(all, { date: 'all', categories: [] }, now));
    expect(groups.map((g) => g.venue.id).sort()).toEqual(['a', 'b']);
    expect(groups.find((g) => g.venue.id === 'a')!.events.map((e) => e.id)).toEqual(['tonight-theater', 'tonight-rock']);
  });
});

describe('dominantCategory', () => {
  it('picks the most frequent category, ties go to the earliest event', () => {
    const joined = joinEventsToVenues(
      [
        event('1', 'a', '2026-10-10T20:00:00+03:00', 'theater'),
        event('2', 'a', '2026-10-11T20:00:00+03:00', 'rock'),
        event('3', 'a', '2026-10-12T20:00:00+03:00', 'rock'),
      ],
      venues,
    );
    expect(dominantCategory(joined)).toBe('rock');
    expect(dominantCategory(joined.slice(0, 2))).toBe('theater');
    expect(dominantCategory([])).toBeNull();
  });
});
