import type { MapParams } from "./schemas";

export function formatMapParamsSummary(
  kind: string,
  params: MapParams & { center?: unknown; resolvedPlaces?: unknown },
): string {
  const parts: string[] = [];
  if (params.mapType) parts.push(params.mapType);
  if (params.autoZoom === false && params.zoom != null) {
    parts.push(`zoom ${params.zoom}`);
  } else if (params.zoom != null && kind !== "RADIUS" && kind !== "RETAIL") {
    parts.push(`zoom ${params.zoom}`);
  }
  if (params.radiusMiles?.length) {
    parts.push(`${params.radiusMiles.join("/")} mi`);
  }
  if (params.width && params.height) {
    parts.push(`${params.width}×${params.height}${params.scale === 2 ? "@2x" : ""}`);
  }
  if (
    params.centerOffsetNorthMiles ||
    params.centerOffsetEastMiles
  ) {
    parts.push("panned");
  }
  return parts.length ? parts.join(" · ") : "Default settings";
}
