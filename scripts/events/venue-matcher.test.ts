import { describe, expect, it } from 'vitest';
import type { Venue } from '../../src/types.ts';
import { VenueMatcher } from './venue-matcher.ts';

const v = (id: string, name: string, city: Venue['city'] = 'Ankara'): Venue => ({
  id,
  name,
  type: 'theater',
  city,
  lat: city === 'Ankara' ? 39.9 : 41.0,
  lng: city === 'Ankara' ? 32.8 : 29.0,
  verified: false,
});

const venues = [
  v('ank-cso-ada-ankara', 'CSO Ada Ankara'),
  v('ank-bilkent-konser-salonu-bso', 'Bilkent Konser Salonu (BSO)'),
  v('ank-if-performance-hall-ankara', 'IF Performance Hall Ankara'),
  v('ank-sinasi-sahnesi', 'Şinasi Sahnesi'),
  v('ank-a-sahne', 'Opera Sahnesi (A)'),
  v('ank-b-sahne', 'Opera Sahnesi (B)'),
  v('ist-zorlu-psm', 'Zorlu PSM', 'İstanbul'),
];

describe('VenueMatcher', () => {
  const m = new VenueMatcher(venues, { _comment: 'ignored', 'ank-cso-ada-ankara': ['CSO Ada', 'Cumhurbaşkanlığı Senfoni Orkestrası'] });

  it('matches exact names ignoring case, accents and punctuation', () => {
    expect(m.match('SİNASİ SAHNESİ', 'Ankara')).toEqual({ ok: true, venueId: 'ank-sinasi-sahnesi', via: 'name' });
    expect(m.match('Bilkent Konser Salonu (BSO)', 'Ankara')).toMatchObject({ venueId: 'ank-bilkent-konser-salonu-bso' });
  });

  it('matches without the city suffix or the bracketed part', () => {
    expect(m.match('IF Performance Hall', 'Ankara')).toMatchObject({ ok: true, venueId: 'ank-if-performance-hall-ankara' });
    expect(m.match('Bilkent Konser Salonu', 'Ankara')).toMatchObject({ ok: true, venueId: 'ank-bilkent-konser-salonu-bso' });
    expect(m.match('BSO', 'Ankara')).toMatchObject({ ok: true, venueId: 'ank-bilkent-konser-salonu-bso' });
  });

  it('uses aliases', () => {
    expect(m.match('cso ada', 'Ankara')).toEqual({ ok: true, venueId: 'ank-cso-ada-ankara', via: 'alias' });
    expect(m.match('Cumhurbaşkanlığı Senfoni Orkestrası', 'Ankara')).toMatchObject({ venueId: 'ank-cso-ada-ankara' });
  });

  it('only matches inside the listing city', () => {
    expect(m.match('Zorlu PSM', 'Ankara')).toEqual({ ok: false, reason: 'unmatched' });
    expect(m.match('Zorlu PSM', 'İstanbul')).toMatchObject({ ok: true, venueId: 'ist-zorlu-psm' });
  });

  it('refuses ambiguous names and reports unmatched ones', () => {
    const matcher = new VenueMatcher(venues);
    expect(matcher.match('Opera Sahnesi', 'Ankara')).toEqual({
      ok: false,
      reason: 'ambiguous',
      candidates: ['ank-a-sahne', 'ank-b-sahne'],
    });
    matcher.match('Gizli Mekan', 'Ankara');
    matcher.match('Gizli Mekan', 'Ankara');
    expect(matcher.report()).toEqual([
      ['Ankara · Gizli Mekan', 2],
      ['Ankara · Opera Sahnesi', 1],
    ]);
  });

  it('rejects aliases for unknown venues or names claimed twice', () => {
    expect(() => new VenueMatcher(venues, { nope: ['x'] })).toThrow(/unknown venue id/);
    expect(
      () => new VenueMatcher(venues, { 'ank-sinasi-sahnesi': ['Sahne'], 'ank-cso-ada-ankara': ['sahne'] }),
    ).toThrow(/listed for both/);
  });
});
