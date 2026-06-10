import type { MapKind } from "@prisma/client";
import {
  getMapProvider,
  type Place,
  type StaticMapMarker,
  type StaticMapPath,
} from "@/server/providers/maps";
import { circlePoints, milesToMeters, offsetCenter, zoomForRadiusMiles } from "@/lib/geo";
import type { MapParams } from "@/features/maps/schemas";

const RING_COLORS = ["0x1d4ed8ff", "0x059669ff", "0xdc2626ff"];
const MARKER_COLORS = ["blue", "green", "red", "orange", "purple"];

export type MapRenderParams = MapParams & {
  center: { lat: number; lng: number };
};

export type MapRenderResult = {
  body: Buffer;
  width: number;
  height: number;
  resolvedPlaces: Place[];
};

/** Renders a static map PNG from a declarative spec (preview or final output). */
export async function renderMapPng(
  kind: MapKind,
  params: MapRenderParams,
  options?: { preview?: boolean },
): Promise<MapRenderResult> {
  const provider = getMapProvider();
  const preview = options?.preview ?? false;

  const viewCenter = offsetCenter(
    params.center,
    params.centerOffsetNorthMiles ?? 0,
    params.centerOffsetEastMiles ?? 0,
  );

  const markers: StaticMapMarker[] = [];
  const paths: StaticMapPath[] = [];
  let mapType: "roadmap" | "satellite" | "hybrid" | "terrain" = "roadmap";
  let zoom = params.zoom ?? 12;
  let resolvedPlaces: Place[] = [];

  if (params.showPropertyMarker !== false) {
    markers.push({
      position: params.center,
      color: params.propertyMarkerColor ?? "red",
      label: params.propertyMarkerLabel,
      size: preview ? "small" : "mid",
    });
  }

  switch (kind) {
    case "SATELLITE_AERIAL":
      mapType = params.mapType ?? "satellite";
      zoom = params.zoom ?? 18;
      break;

    case "TRADE_AREA":
      mapType = params.mapType ?? "hybrid";
      zoom = params.zoom ?? 12;
      break;

    case "RADIUS": {
      mapType = params.mapType ?? "roadmap";
      const radii = params.radiusMiles?.length ? params.radiusMiles : [1, 3, 5];
      zoom =
        params.autoZoom === false
          ? (params.zoom ?? zoomForRadiusMiles(Math.max(...radii)))
          : zoomForRadiusMiles(Math.max(...radii));
      radii.forEach((radius, i) => {
        paths.push({
          points: circlePoints(params.center, radius),
          strokeColor: RING_COLORS[i % RING_COLORS.length],
          strokeWeight: preview ? 2 : 3,
        });
      });
      break;
    }

    case "RETAIL": {
      mapType = params.mapType ?? "roadmap";
      const radii = params.radiusMiles?.length ? params.radiusMiles : [3];
      const radiusMeters = milesToMeters(Math.max(...radii));
      zoom =
        params.autoZoom === false
          ? (params.zoom ?? zoomForRadiusMiles(Math.max(...radii)))
          : zoomForRadiusMiles(Math.max(...radii));
      const categories = params.categories?.length
        ? params.categories
        : ["grocery_or_supermarket", "restaurant", "gym"];
      const maxMarkers = preview
        ? Math.min(params.maxPlaceMarkers ?? 25, 12)
        : (params.maxPlaceMarkers ?? 25);

      const searches = await Promise.all([
        ...categories.map((type) =>
          provider.searchPlaces({
            center: params.center,
            radiusMeters,
            type,
            maxResults: preview ? 5 : 10,
          }),
        ),
        ...(params.competitorKeywords ?? []).map((keyword) =>
          provider.searchPlaces({
            center: params.center,
            radiusMeters,
            keyword,
            maxResults: preview ? 5 : 10,
          }),
        ),
      ]);

      const seen = new Set<string>();
      const poiMarkers: StaticMapMarker[] = [];
      searches.forEach((places, i) => {
        for (const place of places) {
          const key = `${place.position.lat},${place.position.lng}`;
          if (seen.has(key)) continue;
          seen.add(key);
          resolvedPlaces.push(place);
          poiMarkers.push({
            position: place.position,
            color: MARKER_COLORS[i % MARKER_COLORS.length],
            size: "small",
          });
        }
      });
      resolvedPlaces = resolvedPlaces.slice(0, maxMarkers);
      markers.push(...poiMarkers.slice(0, maxMarkers));
      if (markers.length > 41) markers.length = 41;
      break;
    }
  }

  if (params.mapType) mapType = params.mapType;

  const width = params.width ?? 640;
  const height = params.height ?? 480;
  const scale: 1 | 2 = preview ? 1 : (params.scale ?? 2);

  const url = provider.staticMapUrl({
    center: viewCenter,
    zoom,
    width,
    height,
    scale,
    mapType,
    markers,
    paths,
  });

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Static map fetch failed: ${res.status} ${await res.text()}`);
  }
  const body = Buffer.from(await res.arrayBuffer());

  return {
    body,
    width: width * scale,
    height: height * scale,
    resolvedPlaces,
  };
}
