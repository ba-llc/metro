import type { MapCreateInput } from "./schemas";

export const mapTypeOptions = [
  { value: "satellite", label: "Satellite" },
  { value: "hybrid", label: "Hybrid (satellite + labels)" },
  { value: "roadmap", label: "Road map" },
  { value: "terrain", label: "Terrain" },
] as const;

export const mapSizePresets = [
  { id: "standard", label: "Standard 4:3", width: 640, height: 480 },
  { id: "wide", label: "Wide 16:9", width: 640, height: 360 },
  { id: "square", label: "Square", width: 640, height: 640 },
] as const;

export const radiusPresets = [1, 3, 5, 10] as const;

export const markerColorOptions = [
  "red",
  "blue",
  "green",
  "orange",
  "purple",
  "yellow",
  "black",
  "white",
] as const;

/** Sensible defaults when the user opens the generate modal. */
export function defaultMapParams(
  kind: MapCreateInput["kind"],
): MapCreateInput["params"] {
  switch (kind) {
    case "SATELLITE_AERIAL":
      return {
        autoZoom: false,
        zoom: 18,
        mapType: "satellite",
        width: 640,
        height: 480,
        scale: 2,
        showPropertyMarker: true,
        propertyMarkerColor: "red",
      };
    case "TRADE_AREA":
      return {
        autoZoom: false,
        zoom: 12,
        mapType: "hybrid",
        width: 640,
        height: 480,
        scale: 2,
        showPropertyMarker: true,
        propertyMarkerColor: "red",
      };
    case "RADIUS":
      return {
        autoZoom: true,
        mapType: "roadmap",
        radiusMiles: [1, 3, 5],
        width: 640,
        height: 480,
        scale: 2,
        showPropertyMarker: true,
        propertyMarkerColor: "red",
      };
    case "RETAIL":
      return {
        autoZoom: true,
        mapType: "roadmap",
        radiusMiles: [3],
        categories: ["grocery_or_supermarket", "restaurant", "gym"],
        competitorKeywords: [],
        maxPlaceMarkers: 25,
        width: 640,
        height: 480,
        scale: 2,
        showPropertyMarker: true,
        propertyMarkerColor: "red",
      };
  }
}
