import type { City } from '../types';

export const DEFAULT_ZOOM = 12;

export interface Bounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

/**
 * Rough province bounding boxes, used for data validation and "Yakınımda".
 * Same boxes as data/venues/build_venues.py.
 */
export const CITY_BOUNDS: Record<City, Bounds> = {
  Ankara: { minLat: 39.3, maxLat: 40.5, minLng: 31.8, maxLng: 33.6 },
  İstanbul: { minLat: 40.8, maxLat: 41.6, minLng: 28.0, maxLng: 29.9 },
};

/** Default map view per city, [lng, lat]. */
export const CITY_CENTER: Record<City, [number, number]> = {
  Ankara: [32.85, 39.93],
  İstanbul: [28.98, 41.04],
};

export function isInBounds(lat: number, lng: number, b: Bounds): boolean {
  return lat >= b.minLat && lat <= b.maxLat && lng >= b.minLng && lng <= b.maxLng;
}

export function isInCity(lat: number, lng: number, city: City): boolean {
  return isInBounds(lat, lng, CITY_BOUNDS[city]);
}

/** The supported city whose box contains the point, or null. */
export function cityAt(lat: number, lng: number): City | null {
  for (const city of Object.keys(CITY_BOUNDS) as City[]) if (isInCity(lat, lng, city)) return city;
  return null;
}

/** Great-circle distance in meters. */
export function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
