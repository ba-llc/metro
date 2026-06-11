import type { MapKind } from "@prisma/client";
import sharp from "sharp";
import {
  getMapProvider,
  type LatLng,
  type Place,
  type StaticMapMarker,
  type StaticMapPath,
} from "@/server/providers/maps";
import { circlePoints, milesToMeters, offsetCenter, zoomForRadiusMiles } from "@/lib/geo";
import type { MapParams } from "@/features/maps/schemas";

const RING_COLORS: readonly [string, ...string[]] = [
  "0x1d4ed8ff",
  "0x059669ff",
  "0xdc2626ff",
];
const MARKER_COLORS = ["blue", "green", "red", "orange", "purple"];
const MARKER_COLOR_CSS: Record<string, string> = {
  red: "#dc2626",
  blue: "#1d4ed8",
  green: "#059669",
  orange: "#ea580c",
  purple: "#9333ea",
};
const PLACE_NAME_MAX_LENGTH = 22;
const STATIC_MAP_TILE_SIZE = 256;
const RADIUS_LABEL_BEARING_DEGREES = 45;

export type MapRenderParams = MapParams & {
  center: { lat: number; lng: number };
};

export type MapRenderResult = {
  body: Buffer;
  width: number;
  height: number;
  resolvedPlaces: Place[];
};

type RadiusRingLabel = {
  position: LatLng;
  text: string;
  color: string;
};

type PlaceLabel = {
  position: LatLng;
  text: string;
  color: string;
};

function formatRadiusLabel(radiusMiles: number): string {
  const value = Number.isInteger(radiusMiles)
    ? String(radiusMiles)
    : radiusMiles.toLocaleString("en-US", {
        maximumFractionDigits: 1,
      });
  return `${value} mi`;
}

function ringLabelPoint(points: LatLng[]): LatLng | null {
  if (points.length === 0) return null;
  const closedRingSegments = Math.max(points.length - 1, 1);
  const index = Math.round(
    (closedRingSegments * RADIUS_LABEL_BEARING_DEGREES) / 360,
  );
  return points[index] ?? points[0] ?? null;
}

function staticMapPixel(
  point: LatLng,
  center: LatLng,
  zoom: number,
  width: number,
  height: number,
  scale: number,
): { x: number; y: number } {
  const worldSize = STATIC_MAP_TILE_SIZE * 2 ** zoom;

  function project({ lat, lng }: LatLng) {
    const sinLat = Math.min(
      Math.max(Math.sin((lat * Math.PI) / 180), -0.9999),
      0.9999,
    );
    return {
      x: ((lng + 180) / 360) * worldSize,
      y:
        (0.5 -
          Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) *
        worldSize,
    };
  }

  const projectedPoint = project(point);
  const projectedCenter = project(center);
  return {
    x: (projectedPoint.x - projectedCenter.x + width / 2) * scale,
    y: (projectedPoint.y - projectedCenter.y + height / 2) * scale,
  };
}

function ringColorToCss(color: string): string {
  const match = /^0x([0-9a-fA-F]{6})(?:[0-9a-fA-F]{2})?$/.exec(color);
  return match ? `#${match[1]}` : color;
}

function markerColorToCss(color: string): string {
  return MARKER_COLOR_CSS[color] ?? color;
}

function truncatePlaceName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length <= PLACE_NAME_MAX_LENGTH) return trimmed;
  return `${trimmed.slice(0, PLACE_NAME_MAX_LENGTH)}…`;
}

function escapeSvgText(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function textBaselineY(y: number, paddingY: number, fontSize: number) {
  return y + paddingY + fontSize * 0.82;
}

const DIGIT_SEGMENTS: Record<string, string[]> = {
  "0": ["a", "b", "c", "d", "e", "f"],
  "1": ["b", "c"],
  "2": ["a", "b", "g", "e", "d"],
  "3": ["a", "b", "g", "c", "d"],
  "4": ["f", "g", "b", "c"],
  "5": ["a", "f", "g", "c", "d"],
  "6": ["a", "f", "g", "e", "c", "d"],
  "7": ["a", "b", "c"],
  "8": ["a", "b", "c", "d", "e", "f", "g"],
  "9": ["a", "b", "c", "d", "f", "g"],
};

const SEGMENT_PATHS: Record<string, string> = {
  a: "M1.2 0.8 H4.8",
  b: "M5.2 1.2 V4.4",
  c: "M5.2 5.6 V8.8",
  d: "M1.2 9.2 H4.8",
  e: "M0.8 5.6 V8.8",
  f: "M0.8 1.2 V4.4",
  g: "M1.2 5 H4.8",
};

function vectorGlyphAdvance(char: string) {
  if (char === " ") return 3;
  if (char === ".") return 2.4;
  if (char === "i") return 2.4;
  if (char === "m") return 8.2;
  return 6.4;
}

function vectorTextWidth(text: string, fontSize: number) {
  const units = [...text].reduce(
    (sum, char) => sum + vectorGlyphAdvance(char),
    0,
  );
  return (units * fontSize) / 10;
}

function vectorTextSvg(text: string, x: number, y: number, fontSize: number) {
  const scale = fontSize / 10;
  let cursor = 0;
  const glyphs = [...text].flatMap((char) => {
    const advance = vectorGlyphAdvance(char);
    const tx = x + cursor * scale;
    cursor += advance;

    if (char === " ") return [];
    if (char === ".") {
      return [
        `<circle cx="${(tx + 1.1 * scale).toFixed(1)}" cy="${(y + 8.9 * scale).toFixed(1)}" r="${(0.65 * scale).toFixed(1)}" fill="#0f172a" />`,
      ];
    }
    if (char === "i") {
      return [
        `<circle cx="${(tx + 1.1 * scale).toFixed(1)}" cy="${(y + 2 * scale).toFixed(1)}" r="${(0.55 * scale).toFixed(1)}" fill="#0f172a" />`,
        `<path d="M1.1 4 V9" transform="translate(${tx.toFixed(1)} ${y.toFixed(1)}) scale(${scale.toFixed(3)})" fill="none" stroke="#0f172a" stroke-width="1.35" stroke-linecap="round" />`,
      ];
    }
    if (char === "m") {
      return [
        `<path d="M0.8 9 V4.4 C0.8 3.6 1.4 3.2 2.1 3.2 C2.8 3.2 3.3 3.7 3.3 4.6 V9 M3.3 4.7 C3.4 3.7 4 3.2 4.8 3.2 C5.7 3.2 6.2 3.8 6.2 4.8 V9" transform="translate(${tx.toFixed(1)} ${y.toFixed(1)}) scale(${scale.toFixed(3)})" fill="none" stroke="#0f172a" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" />`,
      ];
    }

    const segments = DIGIT_SEGMENTS[char];
    if (!segments) return [];
    return [
      `<path d="${segments.map((segment) => SEGMENT_PATHS[segment]).join(" ")}" transform="translate(${tx.toFixed(1)} ${y.toFixed(1)}) scale(${scale.toFixed(3)})" fill="none" stroke="#0f172a" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round" />`,
    ];
  });

  return glyphs.join("\n");
}

async function addRadiusLabels(
  body: Buffer,
  labels: RadiusRingLabel[],
  center: LatLng,
  zoom: number,
  width: number,
  height: number,
  scale: 1 | 2,
): Promise<Buffer> {
  if (labels.length === 0) return body;

  const outputWidth = width * scale;
  const outputHeight = height * scale;
  const fontSize = 13 * scale;
  const paddingX = 6 * scale;
  const paddingY = 4 * scale;
  const margin = 8 * scale;
  const gap = 6 * scale;
  const borderRadius = 5 * scale;

  const elements = labels.map((label) => {
    const anchor = staticMapPixel(label.position, center, zoom, width, height, scale);
    const text = label.text;
    const boxWidth = vectorTextWidth(text, fontSize) + paddingX * 2;
    const boxHeight = fontSize + paddingY * 2;
    const placeRight = anchor.x + gap + boxWidth <= outputWidth - margin;
    const x = Math.min(
      Math.max(placeRight ? anchor.x + gap : anchor.x - gap - boxWidth, margin),
      outputWidth - boxWidth - margin,
    );
    const y = Math.min(
      Math.max(anchor.y - boxHeight / 2, margin),
      outputHeight - boxHeight - margin,
    );
    const lineEndX = placeRight ? x : x + boxWidth;
    const lineY = y + boxHeight / 2;
    const color = ringColorToCss(label.color);
    const vectorY = y + (boxHeight - fontSize) / 2;

    return `
      <line x1="${anchor.x.toFixed(1)}" y1="${anchor.y.toFixed(1)}" x2="${lineEndX.toFixed(1)}" y2="${lineY.toFixed(1)}" stroke="white" stroke-width="${4 * scale}" stroke-linecap="round" opacity="0.9" />
      <line x1="${anchor.x.toFixed(1)}" y1="${anchor.y.toFixed(1)}" x2="${lineEndX.toFixed(1)}" y2="${lineY.toFixed(1)}" stroke="${color}" stroke-width="${1.5 * scale}" stroke-linecap="round" opacity="0.9" />
      <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${boxWidth.toFixed(1)}" height="${boxHeight.toFixed(1)}" rx="${borderRadius}" fill="white" fill-opacity="0.92" stroke="${color}" stroke-width="${1.5 * scale}" />
      ${vectorTextSvg(text, x + paddingX, vectorY, fontSize)}
    `;
  });

  const overlay = Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${outputWidth}" height="${outputHeight}" viewBox="0 0 ${outputWidth} ${outputHeight}">
      ${elements.join("\n")}
    </svg>
  `);

  return sharp(body).composite([{ input: overlay }]).png().toBuffer();
}

async function addPlaceLabels(
  body: Buffer,
  labels: PlaceLabel[],
  center: LatLng,
  zoom: number,
  width: number,
  height: number,
  scale: 1 | 2,
): Promise<Buffer> {
  if (labels.length === 0) return body;

  const outputWidth = width * scale;
  const outputHeight = height * scale;
  const fontSize = 11 * scale;
  const paddingX = 6 * scale;
  const paddingY = 3 * scale;
  const margin = 8 * scale;
  const gap = 6 * scale;
  const borderRadius = 5 * scale;

  const elements = labels.map((label) => {
    const anchor = staticMapPixel(label.position, center, zoom, width, height, scale);
    const text = escapeSvgText(label.text);
    const boxWidth = text.length * fontSize * 0.58 + paddingX * 2;
    const boxHeight = fontSize + paddingY * 2;
    const placeRight = anchor.x + gap + boxWidth <= outputWidth - margin;
    const x = Math.min(
      Math.max(placeRight ? anchor.x + gap : anchor.x - gap - boxWidth, margin),
      outputWidth - boxWidth - margin,
    );
    const y = Math.min(
      Math.max(anchor.y - boxHeight / 2, margin),
      outputHeight - boxHeight - margin,
    );
    const lineEndX = placeRight ? x : x + boxWidth;
    const lineY = y + boxHeight / 2;
    const color = markerColorToCss(label.color);
    const textY = textBaselineY(y, paddingY, fontSize);

    return `
      <line x1="${anchor.x.toFixed(1)}" y1="${anchor.y.toFixed(1)}" x2="${lineEndX.toFixed(1)}" y2="${lineY.toFixed(1)}" stroke="white" stroke-width="${4 * scale}" stroke-linecap="round" opacity="0.9" />
      <line x1="${anchor.x.toFixed(1)}" y1="${anchor.y.toFixed(1)}" x2="${lineEndX.toFixed(1)}" y2="${lineY.toFixed(1)}" stroke="${color}" stroke-width="${1.5 * scale}" stroke-linecap="round" opacity="0.9" />
      <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${boxWidth.toFixed(1)}" height="${boxHeight.toFixed(1)}" rx="${borderRadius}" fill="white" fill-opacity="0.92" stroke="${color}" stroke-width="${1.5 * scale}" />
      <text x="${(x + paddingX).toFixed(1)}" y="${textY.toFixed(1)}" fill="#0f172a" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="600">${text}</text>
    `;
  });

  const overlay = Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${outputWidth}" height="${outputHeight}" viewBox="0 0 ${outputWidth} ${outputHeight}">
      ${elements.join("\n")}
    </svg>
  `);

  return sharp(body).composite([{ input: overlay }]).png().toBuffer();
}

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
  const radiusRingLabels: RadiusRingLabel[] = [];
  const placeLabels: PlaceLabel[] = [];
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
        const ringColor = RING_COLORS[i % RING_COLORS.length] ?? RING_COLORS[0];
        const points = circlePoints(params.center, radius);
        paths.push({
          points,
          strokeColor: ringColor,
          strokeWeight: preview ? 2 : 3,
        });
        const labelPoint = ringLabelPoint(points);
        if (labelPoint) {
          radiusRingLabels.push({
            position: labelPoint,
            text: formatRadiusLabel(radius),
            color: ringColor,
          });
        }
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
      const poiEntries: Array<{
        marker: StaticMapMarker;
        place: Place;
        color: string;
      }> = [];
      searches.forEach((places, i) => {
        const color = MARKER_COLORS[i % MARKER_COLORS.length] ?? "blue";
        for (const place of places) {
          const key = `${place.position.lat},${place.position.lng}`;
          if (seen.has(key)) continue;
          seen.add(key);
          poiEntries.push({
            place,
            color,
            marker: {
              position: place.position,
              color,
              size: "small",
            },
          });
        }
      });
      const limitedEntries = poiEntries.slice(0, maxMarkers);
      resolvedPlaces = limitedEntries.map((entry) => entry.place);
      markers.push(...limitedEntries.map((entry) => entry.marker));
      if (params.showPlaceLabels !== false) {
        for (const entry of limitedEntries) {
          placeLabels.push({
            position: entry.place.position,
            text: truncatePlaceName(entry.place.name),
            color: entry.color,
          });
        }
      }
      if (markers.length > 41) markers.length = 41;
      break;
    }
  }

  if (params.mapType) mapType = params.mapType;
  if (mapType === "satellite" || mapType === "hybrid") {
    mapType =
      params.showStreetLabels ?? params.mapType === "hybrid"
        ? "hybrid"
        : "satellite";
  }

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
  let body: Buffer = Buffer.from(await res.arrayBuffer());
  body = await addRadiusLabels(
    body,
    radiusRingLabels,
    viewCenter,
    zoom,
    width,
    height,
    scale,
  );
  body = await addPlaceLabels(
    body,
    placeLabels,
    viewCenter,
    zoom,
    width,
    height,
    scale,
  );

  return {
    body,
    width: width * scale,
    height: height * scale,
    resolvedPlaces,
  };
}
