import { describe, expect, it } from 'vitest';
import { loadFromSupabase, supabaseConfig, toIstanbulIso, type EventRow, type VenueRow } from './supabase-data';

const venueRow: VenueRow = {
  id: 'ank-akun-sahnesi',
  name: 'Akün Sahnesi',
  type: 'theater',
  city: 'Ankara',
  district: 'Çankaya',
  address: null,
  lat: 39.91,
  lng: 32.85,
  precision: 'point',
  osm_id: 'node/1',
  osm_url: 'https://www.openstreetmap.org/node/1',
  verified: false,
};

const eventRow: EventRow = {
  id: 'e1',
  venue_id: 'ank-akun-sahnesi',
  title: 'Kiracı',
  category: 'theater',
  starts_at: '2026-10-17T17:30:00+00:00',
  image_url: null,
  description: null,
  event_performers: [
    { performer_id: 'b', position: 1 },
    { performer_id: 'a', position: 0 },
  ],
  offers: [
    { platform: 'Biletinial', url: 'https://biletinial.com/', price: '150.00', label: null, available: true },
    { platform: 'Passo', url: 'https://www.passo.com.tr/', price: null, label: 'Öğrenci', available: false },
  ],
};

describe('supabaseConfig', () => {
  it('needs both env vars', () => {
    expect(supabaseConfig({})).toBeNull();
    expect(supabaseConfig({ VITE_SUPABASE_URL: 'https://x.supabase.co' })).toBeNull();
    expect(supabaseConfig({ VITE_SUPABASE_URL: 'https://x.supabase.co/', VITE_SUPABASE_ANON_KEY: 'k' })).toEqual({
      url: 'https://x.supabase.co',
      anonKey: 'k',
    });
  });
});

describe('toIstanbulIso', () => {
  it('turns UTC timestamps into +03:00 wall time', () => {
    expect(toIstanbulIso('2026-10-17T17:30:00+00:00')).toBe('2026-10-17T20:30:00+03:00');
    expect(toIstanbulIso('2026-10-17T22:00:00Z')).toBe('2026-10-18T01:00:00+03:00');
  });
});

describe('loadFromSupabase', () => {
  it('maps rows to the bundled JSON shapes and pages with Range headers', async () => {
    const calls: { url: string; range: string; key: string }[] = [];
    const fakeFetch = (async (url: string, init: RequestInit) => {
      const h = init.headers as Record<string, string>;
      calls.push({ url, range: h.Range, key: h.apikey });
      const body = url.includes('/venues_with_coords')
        ? [venueRow]
        : url.includes('/performers')
          ? [{ id: 'a', name: 'A', kind: 'band', genre: null }]
          : [eventRow];
      return new Response(JSON.stringify(body), { status: 200 });
    }) as typeof fetch;

    const now = Date.parse('2026-10-09T12:00:00Z');
    const data = await loadFromSupabase({ url: 'https://x.supabase.co', anonKey: 'anon' }, now, fakeFetch);

    expect(data.venues.venues).toEqual([
      {
        id: 'ank-akun-sahnesi',
        name: 'Akün Sahnesi',
        type: 'theater',
        city: 'Ankara',
        district: 'Çankaya',
        lat: 39.91,
        lng: 32.85,
        precision: 'point',
        osmId: 'node/1',
        osmUrl: 'https://www.openstreetmap.org/node/1',
        verified: false,
      },
    ]);
    expect(data.performers.performers).toEqual([{ id: 'a', name: 'A', kind: 'band' }]);
    expect(data.events.events).toEqual([
      {
        id: 'e1',
        venueId: 'ank-akun-sahnesi',
        title: 'Kiracı',
        category: 'theater',
        startsAt: '2026-10-17T20:30:00+03:00',
        offers: [
          { platform: 'Biletinial', url: 'https://biletinial.com/', price: 150 },
          { platform: 'Passo', url: 'https://www.passo.com.tr/', label: 'Öğrenci', available: false },
        ],
        performerIds: ['a', 'b'],
      },
    ]);
    expect(calls.every((c) => c.key === 'anon' && c.range === '0-999')).toBe(true);
    expect(calls.find((c) => c.url.includes('/events'))!.url).toContain('starts_at=gte.2026-10-09T06%3A00%3A00.000Z');
  });

  it('fails loudly on HTTP errors', async () => {
    const fakeFetch = (async () => new Response('nope', { status: 401 })) as unknown as typeof fetch;
    await expect(loadFromSupabase({ url: 'https://x', anonKey: 'k' }, 0, fakeFetch)).rejects.toThrow(/HTTP 401/);
  });
});
