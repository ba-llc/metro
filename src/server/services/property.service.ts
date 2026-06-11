import type { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { ApiError } from "@/server/api/respond";
import type { OrgContext } from "@/server/auth/context";
import { slugify } from "@/lib/slugify";
import { logActivity } from "@/server/services/activity.service";
import type {
  PropertyCreateInput,
  PropertyPlaceSearchInput,
  PropertyUpdateInput,
} from "@/features/properties/schemas";
import { z } from "zod";
import { propertyListFilterSchema } from "@/features/properties/schemas";
import { getTenantDiscoveryProvider } from "@/server/providers/tenant-discovery";

type ListFilter = z.infer<typeof propertyListFilterSchema>;

async function uniquePropertySlug(
  organizationId: string,
  name: string,
  excludePropertyId?: string,
): Promise<string> {
  const base = slugify(name) || "property";
  let slug = base;
  for (let i = 2; ; i++) {
    const existing = await db.property.findFirst({
      where: {
        organizationId,
        slug,
        ...(excludePropertyId ? { NOT: { id: excludePropertyId } } : {}),
      },
      select: { id: true },
    });
    if (!existing) return slug;
    slug = `${base}-${i}`;
  }
}

function inputJsonObject(value: Prisma.JsonValue): Prisma.InputJsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  const out: Record<string, Prisma.InputJsonValue> = {};
  for (const [key, item] of Object.entries(value)) {
    if (item !== undefined) out[key] = item as Prisma.InputJsonValue;
  }
  return out;
}

function placeMetadata(input: {
  googlePlaceId?: string;
  formattedAddress?: string;
  website?: string;
  phoneNumber?: string;
  placeTypes?: string[];
}): Prisma.InputJsonObject | undefined {
  if (
    !input.googlePlaceId &&
    !input.formattedAddress &&
    !input.website &&
    !input.phoneNumber &&
    !input.placeTypes?.length
  ) {
    return undefined;
  }

  return {
    googlePlaceId: input.googlePlaceId,
    formattedAddress: input.formattedAddress,
    website: input.website,
    phoneNumber: input.phoneNumber,
    placeTypes: input.placeTypes ?? [],
  };
}

export async function searchPropertyPlaces(input: PropertyPlaceSearchInput) {
  const provider = getTenantDiscoveryProvider();
  return provider.searchText({
    query: input.query,
    maxResults: input.maxResults,
  });
}

export async function listProperties(
  ctx: OrgContext,
  filter: ListFilter,
  opts?: { take?: number },
) {
  const where: Prisma.PropertyWhereInput = {
    organizationId: ctx.organizationId,
    deletedAt: null,
    ...(filter.propertyType ? { propertyType: filter.propertyType } : {}),
    ...(filter.status ? { status: filter.status } : {}),
    ...(filter.q
      ? {
          OR: [
            { name: { contains: filter.q, mode: "insensitive" } },
            { address: { city: { contains: filter.q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  return db.property.findMany({
    where,
    include: {
      address: true,
      photos: { orderBy: { sortOrder: "asc" }, take: 1, select: { assetId: true } },
      _count: { select: { spaces: true, sitePlans: true, documents: true } },
    },
    orderBy: { updatedAt: "desc" },
    ...(opts?.take ? { take: opts.take } : {}),
  });
}

/** Asserts the property belongs to the caller's organization. */
export async function requireProperty(ctx: OrgContext, propertyId: string) {
  const property = await db.property.findFirst({
    where: {
      id: propertyId,
      organizationId: ctx.organizationId,
      deletedAt: null,
    },
  });
  if (!property) throw new ApiError("NOT_FOUND", "Property not found");
  return property;
}

export async function getPropertyDetail(ctx: OrgContext, propertyId: string) {
  const property = await db.property.findFirst({
    where: {
      id: propertyId,
      organizationId: ctx.organizationId,
      deletedAt: null,
    },
    include: {
      address: true,
      spaces: { orderBy: { suiteNumber: "asc" } },
      occupancies: { include: { tenant: true }, orderBy: { isAnchor: "desc" } },
      contacts: { include: { contact: true }, orderBy: { sortOrder: "asc" } },
      photos: { orderBy: { sortOrder: "asc" } },
      trafficCounts: true,
      demographics: { orderBy: { createdAt: "desc" } },
      sitePlans: { orderBy: { createdAt: "desc" } },
      _count: { select: { mapAssets: true, documents: true } },
    },
  });
  if (!property) throw new ApiError("NOT_FOUND", "Property not found");
  return property;
}

export async function createProperty(
  ctx: OrgContext,
  input: PropertyCreateInput,
) {
  const {
    address,
    googlePlaceId,
    formattedAddress,
    website,
    phoneNumber,
    placeTypes,
    ...data
  } = input;
  const metadata = placeMetadata({
    googlePlaceId,
    formattedAddress,
    website,
    phoneNumber,
    placeTypes,
  });
  const property = await db.property.create({
    data: {
      ...data,
      slug: await uniquePropertySlug(ctx.organizationId, data.name),
      organizationId: ctx.organizationId,
      ...(metadata ? { metadata } : {}),
      address: { create: address },
    },
    include: { address: true },
  });
  await logActivity(ctx, {
    propertyId: property.id,
    entityType: "property",
    entityId: property.id,
    action: "created",
    detail: { name: property.name },
  });
  return property;
}

export async function updateProperty(
  ctx: OrgContext,
  propertyId: string,
  input: PropertyUpdateInput,
) {
  const existing = await requireProperty(ctx, propertyId);
  const {
    address,
    googlePlaceId,
    formattedAddress,
    website,
    phoneNumber,
    placeTypes,
    ...data
  } = input;
  const incomingPlaceMetadata = placeMetadata({
    googlePlaceId,
    formattedAddress,
    website,
    phoneNumber,
    placeTypes,
  });
  const property = await db.property.update({
    where: { id: propertyId },
    data: {
      ...data,
      ...(data.name
        ? { slug: await uniquePropertySlug(ctx.organizationId, data.name, propertyId) }
        : {}),
      ...(incomingPlaceMetadata
        ? {
            metadata: {
              ...inputJsonObject(existing.metadata),
              ...incomingPlaceMetadata,
            },
          }
        : {}),
      ...(address
        ? { address: { upsert: { create: address, update: address } } }
        : {}),
    },
    include: { address: true },
  });
  await logActivity(ctx, {
    propertyId,
    entityType: "property",
    entityId: propertyId,
    action: "updated",
  });
  return property;
}

export async function deleteProperty(ctx: OrgContext, propertyId: string) {
  await requireProperty(ctx, propertyId);
  await db.property.update({
    where: { id: propertyId },
    data: { deletedAt: new Date() },
  });
  await logActivity(ctx, {
    propertyId,
    entityType: "property",
    entityId: propertyId,
    action: "deleted",
  });
}
