import { LatLon } from "../types";

const EARTH_RADIUS_NM = 3440.065;
const NM_TO_STATUTE = 1.15078;

/** Haversine distance between two points in nautical miles. */
export function haversineNm(a: LatLon, b: LatLon): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLon * sinLon;
  return 2 * EARTH_RADIUS_NM * Math.asin(Math.sqrt(h));
}

/** Total route distance in statute miles. */
export function routeDistanceMiles(points: LatLon[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += haversineNm(points[i - 1], points[i]);
  }
  return total * NM_TO_STATUTE;
}
