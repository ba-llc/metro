import { z } from "zod";

export const propertyTypes = [
  "SHOPPING_CENTER",
  "RETAIL",
  "MIXED_USE",
  "OFFICE",
  "INDUSTRIAL",
  "LAND",
] as const;

export const propertyStatuses = ["ACTIVE", "DRAFT", "ARCHIVED"] as const;

export const spaceTypes = [
  "INLINE",
  "ENDCAP",
  "PAD",
  "ANCHOR",
  "OUTPARCEL",
  "OFFICE",
  "FLEX",
] as const;

export const spaceStatuses = [
  "AVAILABLE",
  "LEASED",
  "PENDING",
  "NOT_AVAILABLE",
] as const;

export const addressSchema = z.object({
  street: z.string().min(1, "Street is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(2, "State is required"),
  zip: z.string().min(3, "ZIP is required"),
  county: z.string().optional(),
});

export const propertyCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  propertyType: z.enum(propertyTypes),
  status: z.enum(propertyStatuses).default("ACTIVE"),
  description: z.string().optional(),
  totalGla: z.coerce.number().int().positive().optional(),
  yearBuilt: z.coerce.number().int().min(1800).max(2100).optional(),
  parkingRatio: z.coerce.number().positive().optional(),
  address: addressSchema,
});

export const propertyUpdateSchema = propertyCreateSchema.partial();

export const propertyListFilterSchema = z.object({
  q: z.string().optional(),
  propertyType: z.enum(propertyTypes).optional(),
  status: z.enum(propertyStatuses).optional(),
});

export const spaceCreateSchema = z.object({
  suiteNumber: z.string().min(1, "Suite number is required"),
  squareFootage: z.coerce.number().int().positive().optional(),
  spaceType: z.enum(spaceTypes).default("INLINE"),
  status: z.enum(spaceStatuses).default("AVAILABLE"),
  askingRate: z.coerce.number().positive().optional(),
  rateType: z.string().optional(),
  notes: z.string().optional(),
});

export const spaceUpdateSchema = spaceCreateSchema.partial();

export const tenantCreateSchema = z.object({
  name: z.string().min(1, "Tenant name is required"),
  category: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
  logoAssetId: z.string().optional(),
});

export const occupancyCreateSchema = z.object({
  tenantId: z.string().optional(),
  /** Provide to create the tenant inline */
  tenantName: z.string().optional(),
  suiteNumber: z.string().optional(),
  squareFootage: z.coerce.number().int().positive().optional(),
  isAnchor: z.boolean().default(false),
});

export const contactCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  title: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  license: z.string().optional(),
});

export const photoCreateSchema = z.object({
  assetId: z.string().min(1),
  category: z.string().optional(),
  caption: z.string().optional(),
});

export type PropertyCreateInput = z.infer<typeof propertyCreateSchema>;
export type PropertyUpdateInput = z.infer<typeof propertyUpdateSchema>;
export type SpaceCreateInput = z.infer<typeof spaceCreateSchema>;
export type SpaceUpdateInput = z.infer<typeof spaceUpdateSchema>;
export type TenantCreateInput = z.infer<typeof tenantCreateSchema>;
export type OccupancyCreateInput = z.infer<typeof occupancyCreateSchema>;
export type ContactCreateInput = z.infer<typeof contactCreateSchema>;
export type PhotoCreateInput = z.infer<typeof photoCreateSchema>;
