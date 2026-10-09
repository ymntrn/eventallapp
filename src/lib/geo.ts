/** Default map view. */
export const ANKARA_CENTER: [number, number] = [32.85, 39.93]; // [lng, lat]
export const DEFAULT_ZOOM = 12;

/** Rough Ankara-province bounding box, used for data validation and "Yakınımda". */
export const ANKARA_BOUNDS = {
  minLat: 39.5,
  maxLat: 40.3,
  minLng: 32.2,
  maxLng: 33.3,
} as const;

export function isInAnkara(lat: number, lng: number): boolean {
  return (
    lat >= ANKARA_BOUNDS.minLat &&
    lat <= ANKARA_BOUNDS.maxLat &&
    lng >= ANKARA_BOUNDS.minLng &&
    lng <= ANKARA_BOUNDS.maxLng
  );
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
