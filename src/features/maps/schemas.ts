import { z } from "zod";

export const mapKinds = [
  "SATELLITE_AERIAL",
  "TRADE_AREA",
  "RADIUS",
  "RETAIL",
] as const;

export const mapTypes = ["roadmap", "satellite", "hybrid", "terrain"] as const;

export const retailCategories = [
  { id: "shopping_mall", label: "Shopping Centers" },
  { id: "grocery_or_supermarket", label: "Grocery Stores" },
  { id: "gym", label: "Fitness Centers" },
  { id: "restaurant", label: "Restaurants" },
  { id: "department_store", label: "Retailers" },
] as const;

export const mapParamsSchema = z.object({
  /** When false, `zoom` is used directly; when true, zoom is derived from radius. */
  autoZoom: z.boolean().optional(),
  zoom: z.coerce.number().int().min(1).max(21).optional(),
  mapType: z.enum(mapTypes).optional(),
  width: z.coerce.number().int().min(200).max(640).optional(),
  height: z.coerce.number().int().min(200).max(640).optional(),
  scale: z.union([z.literal(1), z.literal(2)]).optional(),
  /** Shift the map center north (+) or south (−) in miles. */
  centerOffsetNorthMiles: z.coerce.number().min(-50).max(50).optional(),
  /** Shift the map center east (+) or west (−) in miles. */
  centerOffsetEastMiles: z.coerce.number().min(-50).max(50).optional(),
  radiusMiles: z.array(z.coerce.number().positive().max(100)).optional(),
  categories: z.array(z.string()).optional(),
  competitorKeywords: z.array(z.string()).optional(),
  showPropertyMarker: z.boolean().optional(),
  propertyMarkerColor: z.string().optional(),
  propertyMarkerLabel: z.string().max(1).optional(),
  /** Shift only the property marker north (+) or south (-) in miles. */
  propertyMarkerOffsetNorthMiles: z.coerce.number().min(-50).max(50).optional(),
  /** Shift only the property marker east (+) or west (-) in miles. */
  propertyMarkerOffsetEastMiles: z.coerce.number().min(-50).max(50).optional(),
  maxPlaceMarkers: z.coerce.number().int().min(0).max(40).optional(),
  /** When false, retail POI pins omit business name overlays. Defaults to true. */
  showPlaceLabels: z.boolean().optional(),
  /** Satellite-only convenience toggle; renders Google hybrid when enabled. */
  showStreetLabels: z.boolean().optional(),
});

export const mapCreateSchema = z.object({
  kind: z.enum(mapKinds),
  params: mapParamsSchema.default({}),
});

export type MapParams = z.infer<typeof mapParamsSchema>;
export type MapCreateInput = z.infer<typeof mapCreateSchema>;
