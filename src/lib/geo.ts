export type LatLngLiteral = { lat: number; lng: number };

const EARTH_RADIUS_MI = 3958.8;

/**
 * Geodesic circle approximated as a polygon — used to draw radius rings on
 * static map imagery.
 */
export function circlePoints(
  center: LatLngLiteral,
  radiusMiles: number,
  segments = 64,
): LatLngLiteral[] {
  const points: LatLngLiteral[] = [];
  const d = radiusMiles / EARTH_RADIUS_MI;
  const latRad = (center.lat * Math.PI) / 180;
  const lngRad = (center.lng * Math.PI) / 180;

  for (let i = 0; i <= segments; i++) {
    const bearing = (2 * Math.PI * i) / segments;
    const lat = Math.asin(
      Math.sin(latRad) * Math.cos(d) +
        Math.cos(latRad) * Math.sin(d) * Math.cos(bearing),
    );
    const lng =
      lngRad +
      Math.atan2(
        Math.sin(bearing) * Math.sin(d) * Math.cos(latRad),
        Math.cos(d) - Math.sin(latRad) * Math.sin(lat),
      );
    points.push({ lat: (lat * 180) / Math.PI, lng: (lng * 180) / Math.PI });
  }
  return points;
}

/** Zoom level that comfortably fits the given radius (rough heuristic). */
export function zoomForRadiusMiles(radiusMiles: number): number {
  if (radiusMiles <= 1) return 14;
  if (radiusMiles <= 3) return 12;
  if (radiusMiles <= 5) return 11;
  if (radiusMiles <= 10) return 10;
  return 9;
}

export function milesToMeters(miles: number): number {
  return Math.round(miles * 1609.34);
}

/** Offset a map center by miles along cardinal axes (for framing adjustments). */
export function offsetCenter(
  center: LatLngLiteral,
  deltaMilesNorth: number,
  deltaMilesEast: number,
): LatLngLiteral {
  if (deltaMilesNorth === 0 && deltaMilesEast === 0) return center;
  const latOffset =
    (deltaMilesNorth / EARTH_RADIUS_MI) * (180 / Math.PI);
  const lngScale = Math.cos((center.lat * Math.PI) / 180);
  const lngOffset =
    lngScale === 0
      ? 0
      : (deltaMilesEast / EARTH_RADIUS_MI / lngScale) * (180 / Math.PI);
  return { lat: center.lat + latOffset, lng: center.lng + lngOffset };
}
