import { describe, expect, it } from 'vitest';
import type { Category, EventItem, Venue } from '../types';
import { joinEventsToVenues } from './data';
import {
  buildDiscover,
  FOR_YOU_LIMIT,
  forYou,
  NEW_DISCOVERIES_LIMIT,
  newDiscoveries,
  scoreEvent,
  SCORE,
  tonightList,
  type DiscoverContext,
} from './discover';

const venue = (id: string, city: Venue['city'] = 'Ankara'): Venue => ({
  id,
  name: id,
  type: 'theater',
  city,
  lat: city === 'Ankara' ? 39.93 : 41.0,
  lng: city === 'Ankara' ? 32.85 : 29.0,
  verified: false,
});
const ev = (id: string, venueId: string, startsAt: string, category: Category = 'rock', performerIds?: string[]): EventItem => ({
  id,
  venueId,
  title: id,
  category,
  startsAt,
  offers: [{ platform: 'Biletix', url: 'https://www.biletix.com/' }],
  ...(performerIds ? { performerIds } : {}),
});

// Wednesday 2026-10-14 12:00 Istanbul. The weekend is Sat 17th 00:00 → Mon 19th 06:00.
const now = Date.parse('2026-10-14T12:00:00+03:00');
const venues = [venue('ank-a'), venue('ank-b'), venue('ank-c'), venue('ank-d'), venue('ist-a', 'İstanbul')];
const events = joinEventsToVenues(
  [
    ev('past', 'ank-a', '2026-10-13T20:00:00+03:00', 'rock', ['band']),
    ev('band-ank', 'ank-b', '2026-10-20T21:00:00+03:00', 'rock', ['band', 'other']),
    ev('band-ist', 'ist-a', '2026-10-16T21:00:00+03:00', 'rock', ['band']),
    ev('at-venue', 'ank-a', '2026-10-15T20:00:00+03:00', 'theater'),
    ev('band-at-venue', 'ank-a', '2026-10-25T20:00:00+03:00', 'pop', ['band']),
    ev('jazz-sat', 'ank-c', '2026-10-17T21:00:00+03:00', 'jazz_classical'),
    ev('jazz-sun', 'ank-c', '2026-10-18T19:00:00+03:00', 'jazz_classical'),
    ev('comedy-tonight', 'ank-d', '2026-10-14T21:30:00+03:00', 'comedy'),
    ev('jazz-tonight', 'ank-c', '2026-10-14T22:00:00+03:00', 'jazz_classical'),
    ev('saved-one', 'ank-d', '2026-10-21T20:00:00+03:00', 'jazz_classical'),
  ],
  venues,
);
const byId = (id: string) => events.find((e) => e.id === id)!;

const ctx: DiscoverContext = {
  city: 'Ankara',
  followedPerformers: ['band'],
  followedVenues: ['ank-a'],
  savedEvents: ['saved-one'],
};
const guest: DiscoverContext = { city: 'Ankara', followedPerformers: [], followedVenues: [], savedEvents: [] };

describe('scoreEvent', () => {
  const cats = new Set<Category>(['jazz_classical']);
  it('adds the score of every reason, followed matches first', () => {
    expect(scoreEvent(byId('band-at-venue'), ctx, cats)).toMatchObject({
      score: SCORE.performer + SCORE.venue,
      reasons: ['performer', 'venue'],
    });
    expect(scoreEvent(byId('band-ank'), ctx, cats)).toMatchObject({ score: SCORE.performer, reasons: ['performer'] });
    expect(scoreEvent(byId('at-venue'), ctx, cats)).toMatchObject({ score: SCORE.venue, reasons: ['venue'] });
    expect(scoreEvent(byId('jazz-sat'), ctx, cats)).toMatchObject({ score: SCORE.category, reasons: ['category'] });
    expect(scoreEvent(byId('comedy-tonight'), ctx, cats)).toMatchObject({ score: 0, reasons: [] });
  });

  it('counts a followed artist once, however many are on the bill', () => {
    const both = { ...ctx, followedPerformers: ['band', 'other'] };
    expect(scoreEvent(byId('band-ank'), both, new Set()).score).toBe(SCORE.performer);
  });

  it('ranks any single follow above any category match', () => {
    expect(SCORE.venue).toBeGreaterThan(SCORE.category);
  });
});

describe('Sana özel (forYou)', () => {
  it('lists followed artists and venues first, then saved-event categories; upcoming only, all cities', () => {
    expect(forYou(events, ctx, now).map((s) => s.event.id)).toEqual([
      'band-at-venue', // 150
      'band-ist', // 100, İstanbul, sooner
      'band-ank', // 100
      'at-venue', // 50
      'jazz-tonight', // 10, by time
      'jazz-sat',
      'jazz-sun',
      'saved-one',
    ]);
  });

  it('is empty for a user with no follows and no saved events', () => {
    expect(forYou(events, guest, now)).toEqual([]);
  });

  it(`is capped at ${FOR_YOU_LIMIT}`, () => {
    const many = joinEventsToVenues(
      Array.from({ length: 70 }, (_, i) =>
        ev(`e${i}`, 'ank-a', `2026-11-${String((i % 28) + 1).padStart(2, '0')}T20:00:00+03:00`),
      ),
      venues,
    );
    expect(forYou(many, ctx, now)).toHaveLength(FOR_YOU_LIMIT);
  });
});

describe('Yeni keşifler (newDiscoveries)', () => {
  it('skips followed artists and venues and saved events; one per venue; selected city; soonest first', () => {
    expect(newDiscoveries(events, ctx, now).map((e) => e.id)).toEqual(['comedy-tonight', 'jazz-tonight']);
  });

  it('skips events already shown in Sana özel (the venue then offers its next event)', () => {
    expect(newDiscoveries(events, ctx, now, new Set(['jazz-tonight'])).map((e) => e.id)).toEqual(['comedy-tonight', 'jazz-sat']);
  });

  it('for a guest is the soonest event at each venue in the city', () => {
    expect(newDiscoveries(events, guest, now).map((e) => e.id)).toEqual(['comedy-tonight', 'jazz-tonight', 'at-venue', 'band-ank']);
  });

  it(`returns at most ${NEW_DISCOVERIES_LIMIT}`, () => {
    const vs = Array.from({ length: 15 }, (_, i) => venue(`ank-v${i}`));
    const es = joinEventsToVenues(
      vs.map((v, i) => ev(`x${i}`, v.id, `2026-10-2${i % 9}T20:00:00+03:00`)),
      vs,
    );
    expect(newDiscoveries(es, guest, now)).toHaveLength(NEW_DISCOVERIES_LIMIT);
  });
});

describe('buildDiscover', () => {
  it('builds the three sections in order and keeps them from repeating each other', () => {
    const s = buildDiscover(events, ctx, now);
    expect(s.weekend.map((e) => e.id)).toEqual(['jazz-sat', 'jazz-sun']);
    // Every jazz event is already in Sana özel (saved-event category), so discoveries keep only comedy.
    expect(s.discoveries.map((e) => e.id)).toEqual(['comedy-tonight']);
    const mine = new Set(s.forYou.map((x) => x.event.id));
    expect(s.discoveries.some((e) => mine.has(e.id))).toBe(false);
  });

  it('weekend follows the selected city', () => {
    expect(buildDiscover(events, { ...guest, city: 'İstanbul' }, now).weekend).toEqual([]);
  });
});

describe('tonightList', () => {
  it('lists tonight in the city, personal matches first, then by time', () => {
    expect(tonightList(events, ctx, now, null).map((s) => s.event.id)).toEqual(['jazz-tonight', 'comedy-tonight']);
    expect(tonightList(events, guest, now, null).map((s) => s.event.id)).toEqual(['comedy-tonight', 'jazz-tonight']);
  });

  it('respects the start time', () => {
    expect(tonightList(events, guest, now, '22:00').map((s) => s.event.id)).toEqual(['jazz-tonight']);
  });
});
