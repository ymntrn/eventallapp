import { CITIES, VENUE_PRECISIONS, type City, type Venue, type VenueType } from '../types';

/**
 * The 14 venue types of the OSM venue database (data/venues/) mapped to the
 * app's VenueType. Documented in README ("Venue type mapping").
 */
export const DB_TYPE_MAP = {
  concert_hall: 'concert_hall',
  opera_house: 'opera',
  theatre: 'theater',
  performance_hall: 'live_music',
  live_music_bar: 'live_music',
  nightclub: 'electronic',
  open_air: 'open_air',
  arena: 'arena',
  stadium: 'stadium',
  congress_center: 'congress_center',
  expo_center: 'congress_center',
  cultural_center: 'cultural_center',
  festival_area: 'festival_ground',
  arts_center: 'performance_space',
} as const satisfies Record<string, VenueType>;
export type DbVenueType = keyof typeof DB_TYPE_MAP;

/** One row of data/venues/eventall_venues.json. */
export interface DbVenueRow {
  id: string;
  name: string;
  type: string;
  city: string;
  district?: string;
  neighborhood?: string;
  lat: number;
  lng: number;
  precision: string;
  osm_id?: string;
  osm_url?: string;
}

/**
 * Converts a database row to an app Venue. Throws on an unknown type, city or
 * precision so a bad database never reaches the app silently.
 */
export function dbRowToVenue(row: DbVenueRow, verified = false): Venue {
  const type = (DB_TYPE_MAP as Record<string, VenueType>)[row.type];
  if (!type) throw new Error(`${row.id}: unknown database type "${row.type}"`);
  if (!(CITIES as readonly string[]).includes(row.city)) throw new Error(`${row.id}: unknown city "${row.city}"`);
  if (!(VENUE_PRECISIONS as readonly string[]).includes(row.precision))
    throw new Error(`${row.id}: unknown precision "${row.precision}"`);
  const address = [row.neighborhood, row.district].filter(Boolean).join(', ');
  // Built in this key order so venues.json reads naturally.
  return {
    id: row.id,
    name: row.name,
    type,
    city: row.city as City,
    ...(row.district ? { district: row.district } : {}),
    ...(address ? { address } : {}),
    lat: row.lat,
    lng: row.lng,
    precision: row.precision as Venue['precision'],
    ...(row.osm_id ? { osmId: row.osm_id } : {}),
    ...(row.osm_url ? { osmUrl: row.osm_url } : {}),
    verified,
  };
}
