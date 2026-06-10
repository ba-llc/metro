import type { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { ApiError } from "@/server/api/respond";
import type { OrgContext } from "@/server/auth/context";
import { logActivity } from "@/server/services/activity.service";
import type {
  PropertyCreateInput,
  PropertyUpdateInput,
} from "@/features/properties/schemas";
import { z } from "zod";
import { propertyListFilterSchema } from "@/features/properties/schemas";

type ListFilter = z.infer<typeof propertyListFilterSchema>;

export async function listProperties(ctx: OrgContext, filter: ListFilter) {
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
      _count: { select: { spaces: true, sitePlans: true, documents: true } },
    },
    orderBy: { updatedAt: "desc" },
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
  const { address, ...data } = input;
  const property = await db.property.create({
    data: {
      ...data,
      organizationId: ctx.organizationId,
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
  await requireProperty(ctx, propertyId);
  const { address, ...data } = input;
  const property = await db.property.update({
    where: { id: propertyId },
    data: {
      ...data,
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
