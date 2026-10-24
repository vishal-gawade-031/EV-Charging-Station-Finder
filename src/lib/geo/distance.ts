/**
 * Geospatial distance and coordinate utilities using the Haversine formula.
 */

// Mean radius of Earth in kilometers (WGS-84 standard approximation)
export const EARTH_RADIUS_KM = 6371.0088;

/**
 * Calculates straight-line distance in kilometers between two geographic coordinates
 * using the Haversine formula.
 *
 * @param lat1 Latitude of point 1 in degrees (-90 to 90)
 * @param lon1 Longitude of point 1 in degrees (-180 to 180)
 * @param lat2 Latitude of point 2 in degrees (-90 to 90)
 * @param lon2 Longitude of point 2 in degrees (-180 to 180)
 * @returns Distance in kilometers
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (
    !Number.isFinite(lat1) ||
    !Number.isFinite(lon1) ||
    !Number.isFinite(lat2) ||
    !Number.isFinite(lon2)
  ) {
    throw new Error("Invalid coordinate values provided to calculateDistanceKm");
  }

  // Exact match optimization
  if (lat1 === lat2 && lon1 === lon2) {
    return 0;
  }

  const toRad = (degree: number) => (degree * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const rLat1 = toRad(lat1);
  const rLat2 = toRad(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  // Clamp 'a' to avoid numerical domain errors in Math.asin / Math.atan2
  const clampedA = Math.min(1, Math.max(0, a));
  const c = 2 * Math.atan2(Math.sqrt(clampedA), Math.sqrt(1 - clampedA));

  return EARTH_RADIUS_KM * c;
}

/**
 * Formats a distance in kilometers into a human-friendly string.
 * - Distances under 1 km are formatted in meters (e.g., "350 m away")
 * - Distances 1 km and greater are formatted in kilometers with 1 decimal place (e.g., "1.8 km away")
 */
export function formatDistance(distanceKm: number | null | undefined): string {
  if (distanceKm === null || distanceKm === undefined || !Number.isFinite(distanceKm)) {
    return "Distance unknown";
  }

  if (distanceKm < 0.05) {
    return "At your location";
  }

  if (distanceKm < 1.0) {
    const meters = Math.round(distanceKm * 1000);
    return `${meters} m away`;
  }

  if (distanceKm < 10) {
    return `${distanceKm.toFixed(1)} km away`;
  }

  return `${Math.round(distanceKm)} km away`;
}

/**
 * Validates whether latitude and longitude are valid decimal coordinates.
 */
export function isValidCoordinate(latitude: unknown, longitude: unknown): boolean {
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return false;
  }
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return false;
  }
  return latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
}

/**
 * Validates search radius within reasonable bounds (1 km to 1000 km).
 */
export function isValidRadius(radiusKm: unknown): boolean {
  if (typeof radiusKm !== "number" || !Number.isFinite(radiusKm)) {
    return false;
  }
  return radiusKm >= 1 && radiusKm <= 1000;
}

export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

/**
 * Computes a rough geographic bounding box around a center coordinate for a given radius in kilometers.
 * Useful for fast index-based filtering before running exact Haversine calculation.
 */
export function getBoundingBox(lat: number, lng: number, radiusKm: number): BoundingBox {
  const latDelta = radiusKm / 111.0; // ~111 km per degree of latitude
  const latRad = (lat * Math.PI) / 180;
  const cosLat = Math.cos(latRad);
  const lngDelta = cosLat > 0.0001 ? radiusKm / (111.0 * cosLat) : radiusKm / 111.0;

  return {
    minLat: Math.max(-90, lat - latDelta),
    maxLat: Math.min(90, lat + latDelta),
    minLng: Math.max(-180, lng - lngDelta),
    maxLng: Math.min(180, lng + lngDelta),
  };
}

/**
 * Generates an external Google Maps directions URL for navigation.
 */
export function getDirectionsUrl(
  destLat: number,
  destLng: number,
  originLat?: number,
  originLng?: number
): string {
  const destStr = `${destLat.toFixed(6)},${destLng.toFixed(6)}`;
  if (
    originLat !== undefined &&
    originLng !== undefined &&
    isValidCoordinate(originLat, originLng)
  ) {
    const originStr = `${originLat.toFixed(6)},${originLng.toFixed(6)}`;
    return `https://www.google.com/maps/dir/?api=1&origin=${originStr}&destination=${destStr}&travelmode=driving`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${destStr}&travelmode=driving`;
}
