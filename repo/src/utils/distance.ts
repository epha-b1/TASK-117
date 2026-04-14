import coords from '../data/zip-coords.json';

const EARTH_RADIUS_MILES = 3958.8;

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_MILES * c;
}

const ZIP_MAP: Record<string, { lat: number; lng: number }> = coords as Record<
  string,
  { lat: number; lng: number }
>;

export function zipToCoords(zip: string): { lat: number; lng: number } | null {
  const z = (zip || '').trim();
  return ZIP_MAP[z] ?? null;
}

export function zipInRange(zip: string, range: string): boolean {
  const z = (zip || '').trim();
  if (!z) return false;
  if (range.includes('-')) {
    const [lo, hi] = range.split('-');
    return z >= lo.trim() && z <= hi.trim();
  }
  return z === range.trim();
}
