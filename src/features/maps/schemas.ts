import { z } from "zod";

export const mapKinds = [
  "SATELLITE_AERIAL",
  "TRADE_AREA",
  "RADIUS",
  "RETAIL",
] as const;

export const retailCategories = [
  { id: "shopping_mall", label: "Shopping Centers" },
  { id: "grocery_or_supermarket", label: "Grocery Stores" },
  { id: "gym", label: "Fitness Centers" },
  { id: "restaurant", label: "Restaurants" },
  { id: "department_store", label: "Retailers" },
] as const;

export const mapCreateSchema = z.object({
  kind: z.enum(mapKinds),
  params: z
    .object({
      zoom: z.coerce.number().int().min(8).max(20).optional(),
      radiusMiles: z.array(z.number().positive()).optional(),
      categories: z.array(z.string()).optional(),
      competitorKeywords: z.array(z.string()).optional(),
    })
    .default({}),
});

export type MapCreateInput = z.infer<typeof mapCreateSchema>;
