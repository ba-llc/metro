import { mapSizePresets } from "./constants";
import type { MapCreateInput, MapParams } from "./schemas";

const serverOnlyKeys = new Set(["center", "resolvedPlaces"]);

/** Strip persisted server fields before editing in the UI. */
export function paramsFromStored(
  raw: MapParams & { center?: unknown; resolvedPlaces?: unknown },
): MapParams {
  const entries = Object.entries(raw).filter(
    ([key]) => !serverOnlyKeys.has(key),
  );
  return Object.fromEntries(entries) as MapParams;
}

export function sizePresetFromParams(params: MapParams): string {
  const match = mapSizePresets.find(
    (p) => p.width === params.width && p.height === params.height,
  );
  return match?.id ?? "standard";
}

export function mapAssetToInput(map: {
  kind: string;
  params: MapParams & { center?: unknown; resolvedPlaces?: unknown };
}): MapCreateInput {
  return {
    kind: map.kind as MapCreateInput["kind"],
    params: paramsFromStored(map.params),
  };
}

export function radiiTextFromParams(params: MapParams): string {
  return params.radiusMiles?.join(", ") ?? "3";
}

export function competitorsTextFromParams(params: MapParams): string {
  return params.competitorKeywords?.join(", ") ?? "";
}
