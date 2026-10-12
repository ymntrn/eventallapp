import { describe, expect, it } from 'vitest';
import { VENUE_TYPES } from '../types';
import { DB_TYPE_MAP, dbRowToVenue, type DbVenueRow } from './venue-db';

const row: DbVenueRow = {
  id: 'ank-cso-ada-ankara',
  name: 'CSO Ada Ankara',
  type: 'concert_hall',
  city: 'Ankara',
  district: 'Altındağ',
  neighborhood: 'Hacı Bayram Mahallesi',
  lat: 39.9329551,
  lng: 32.8505724,
  precision: 'complex_centroid',
  osm_id: 'way/879793992',
  osm_url: 'https://www.openstreetmap.org/way/879793992',
};

describe('DB_TYPE_MAP', () => {
  it('maps all 14 database types to valid app types', () => {
    expect(Object.keys(DB_TYPE_MAP)).toHaveLength(14);
    for (const t of Object.values(DB_TYPE_MAP)) expect(VENUE_TYPES).toContain(t);
  });
});

describe('dbRowToVenue', () => {
  it('keeps the id and OSM fields and maps the type', () => {
    expect(dbRowToVenue({ ...row, type: 'theatre' })).toEqual({
      id: 'ank-cso-ada-ankara',
      name: 'CSO Ada Ankara',
      type: 'theater',
      city: 'Ankara',
      district: 'Altındağ',
      address: 'Hacı Bayram Mahallesi, Altındağ',
      lat: 39.9329551,
      lng: 32.8505724,
      precision: 'complex_centroid',
      osmId: 'way/879793992',
      osmUrl: 'https://www.openstreetmap.org/way/879793992',
      verified: false,
    });
  });

  it('passes the verified flag through', () => {
    expect(dbRowToVenue(row, true).verified).toBe(true);
  });

  it('rejects unknown types, cities and precisions', () => {
    expect(() => dbRowToVenue({ ...row, type: 'circus' })).toThrow(/unknown database type/);
    expect(() => dbRowToVenue({ ...row, city: 'İzmir' })).toThrow(/unknown city/);
    expect(() => dbRowToVenue({ ...row, precision: 'guess' })).toThrow(/unknown precision/);
  });
});
