import { describe, expect, it } from 'vitest';
import { mergeListings, sameTitle, type MatchedListing } from './merge.ts';

const l = (p: Partial<MatchedListing>): MatchedListing => ({
  platform: 'Biletix',
  sourceId: 'x',
  title: 'Duman',
  venueName: 'IF Performance Hall',
  venueId: 'ank-if-performance-hall-ankara',
  city: 'Ankara',
  startsAt: '2026-10-17T21:00:00+03:00',
  url: 'https://www.biletix.com/',
  category: 'rock',
  ...p,
});

describe('sameTitle', () => {
  it('ignores platform noise words, case and accents', () => {
    expect(sameTitle('Duman', 'DUMAN Ankara Konseri')).toBe(true);
    expect(sameTitle('Şebnem Ferah Akustik', 'Sebnem Ferah - Akustik Konser')).toBe(true);
  });

  it('keeps different shows apart', () => {
    expect(sameTitle('Hamlet', 'Kral Lear')).toBe(false);
    expect(sameTitle('Caz Gecesi: Lale Üçlüsü', 'Caz Gecesi: Deniz Trio')).toBe(false);
  });
});

describe('mergeListings', () => {
  it('merges the same event from several platforms into one event with one offer each', () => {
    const events = mergeListings([
      l({ platform: 'Biletix', title: 'Duman Ankara Konseri', price: 900, url: 'https://www.biletix.com/' }),
      l({ platform: 'Passo', title: 'Duman', price: 850, url: 'https://www.passo.com.tr/', startsAt: '2026-10-17T21:15:00+03:00' }),
      l({ platform: 'Bubilet', title: 'DUMAN', available: false, url: 'https://www.bubilet.com.tr/', category: 'other' }),
    ]);
    expect(events).toHaveLength(1);
    const [e] = events;
    expect(e.title).toBe('Duman');
    expect(e.startsAt).toBe('2026-10-17T21:00:00+03:00');
    expect(e.category).toBe('rock');
    expect(e.offers).toEqual([
      { platform: 'Biletix', url: 'https://www.biletix.com/', price: 900 },
      { platform: 'Bubilet', url: 'https://www.bubilet.com.tr/', available: false },
      { platform: 'Passo', url: 'https://www.passo.com.tr/', price: 850 },
    ]);
    expect(e.id).toBe('ank-if-performance-hall-ankara-2026-10-17-duman');
  });

  it('keeps the cheapest available listing when a platform lists an event twice', () => {
    const [e] = mergeListings([
      l({ price: 500, label: 'Genel giriş' }),
      l({ price: 300, label: 'Öğrenci' }),
      l({ price: 100, available: false }),
    ]);
    expect(e.offers).toEqual([{ platform: 'Biletix', url: 'https://www.biletix.com/', price: 300, label: 'Öğrenci' }]);
  });

  it('does not merge across venues, distant times or different titles', () => {
    const events = mergeListings([
      l({}),
      l({ venueId: 'ank-route-ankara' }),
      l({ startsAt: '2026-10-18T21:00:00+03:00' }),
      l({ title: 'Mor ve Ötesi' }),
    ]);
    expect(events).toHaveLength(4);
    expect(new Set(events.map((e) => e.id)).size).toBe(4);
  });
});
