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

const optionalNumberInput = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess(
    (value) => (value === "" || value == null ? undefined : value),
    schema.optional(),
  ) as z.ZodEffects<z.ZodOptional<T>, z.infer<T> | undefined, unknown>;

export const propertyCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  propertyType: z.enum(propertyTypes),
  status: z.enum(propertyStatuses).default("ACTIVE"),
  description: z.string().optional(),
  totalGla: optionalNumberInput(z.coerce.number().int().positive()),
  yearBuilt: optionalNumberInput(z.coerce.number().int().min(1800).max(2100)),
  parkingRatio: optionalNumberInput(z.coerce.number().positive()),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  googlePlaceId: z.string().optional(),
  formattedAddress: z.string().optional(),
  website: z.string().url().optional(),
  phoneNumber: z.string().optional(),
  placeTypes: z.array(z.string()).optional(),
  address: addressSchema,
});

export const propertyUpdateSchema = propertyCreateSchema.partial();

export const propertyPlaceSearchSchema = z.object({
  query: z.string().trim().min(3, "Type at least 3 characters"),
  maxResults: z.coerce.number().int().positive().max(10).default(5),
});

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

export const tenantUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  category: z.string().nullable().optional(),
  website: z.string().url().nullable().optional().or(z.literal("")),
});

export const tenantDiscoverSchema = z.object({
  radiusMeters: z.coerce.number().int().positive().max(50000).default(500),
  maxResults: z.coerce.number().int().positive().max(20).default(20),
  includedTypes: z.array(z.string()).optional(),
});

const discoveredPlaceSchema = z.object({
  placeId: z.string().min(1),
  name: z.string().min(1),
  formattedAddress: z.string().optional(),
  addressComponents: z
    .array(
      z.object({
        longText: z.string(),
        shortText: z.string(),
        types: z.array(z.string()),
      }),
    )
    .optional(),
  location: z.object({ lat: z.number(), lng: z.number() }).optional(),
  types: z.array(z.string()).default([]),
  primaryType: z.string().optional(),
  website: z.string().optional(),
  phoneNumber: z.string().optional(),
});

export const tenantImportSchema = z.object({
  places: z.array(discoveredPlaceSchema).min(1, "Select at least one tenant"),
  /** When true, also create a TenantOccupancy row linking each imported
   *  tenant to the property. Discovery surfaces nearby businesses that
   *  may or may not actually lease at the property, so this defaults off. */
  attachToProperty: z.boolean().default(false),
});

export const tenantManualLogoSchema = z.object({
  assetId: z.string().min(1),
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

export const contactUpdateSchema = contactCreateSchema.partial();

export const photoCreateSchema = z.object({
  assetId: z.string().min(1),
  category: z.string().optional(),
  caption: z.string().optional(),
});

export type PropertyCreateInput = z.infer<typeof propertyCreateSchema>;
export type PropertyUpdateInput = z.infer<typeof propertyUpdateSchema>;
export type PropertyPlaceSearchInput = z.infer<typeof propertyPlaceSearchSchema>;
export type SpaceCreateInput = z.infer<typeof spaceCreateSchema>;
export type SpaceUpdateInput = z.infer<typeof spaceUpdateSchema>;
export type TenantCreateInput = z.infer<typeof tenantCreateSchema>;
export type TenantUpdateInput = z.infer<typeof tenantUpdateSchema>;
export type TenantDiscoverInput = z.infer<typeof tenantDiscoverSchema>;
export type TenantImportInput = z.infer<typeof tenantImportSchema>;
export type TenantManualLogoInput = z.infer<typeof tenantManualLogoSchema>;
export type OccupancyCreateInput = z.infer<typeof occupancyCreateSchema>;
export type ContactCreateInput = z.infer<typeof contactCreateSchema>;
export type ContactUpdateInput = z.infer<typeof contactUpdateSchema>;
export type PhotoCreateInput = z.infer<typeof photoCreateSchema>;
