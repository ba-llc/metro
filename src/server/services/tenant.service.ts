import { db } from "@/server/db";
import { ApiError } from "@/server/api/respond";
import type { OrgContext } from "@/server/auth/context";
import { requireProperty } from "@/server/services/property.service";
import type {
  OccupancyCreateInput,
  TenantCreateInput,
} from "@/features/properties/schemas";

export async function listTenants(ctx: OrgContext) {
  return db.tenant.findMany({
    where: { organizationId: ctx.organizationId },
    orderBy: { name: "asc" },
  });
}

export async function createTenant(ctx: OrgContext, input: TenantCreateInput) {
  return db.tenant.create({
    data: {
      name: input.name,
      category: input.category,
      website: input.website || null,
      logoAssetId: input.logoAssetId,
      organizationId: ctx.organizationId,
    },
  });
}

export async function listOccupancies(ctx: OrgContext, propertyId: string) {
  await requireProperty(ctx, propertyId);
  return db.tenantOccupancy.findMany({
    where: { propertyId },
    include: { tenant: true },
    orderBy: [{ isAnchor: "desc" }, { createdAt: "asc" }],
  });
}

export async function createOccupancy(
  ctx: OrgContext,
  propertyId: string,
  input: OccupancyCreateInput,
) {
  await requireProperty(ctx, propertyId);

  let tenantId = input.tenantId;
  if (!tenantId) {
    if (!input.tenantName?.trim()) {
      throw new ApiError("VALIDATION", "Select a tenant or provide a name");
    }
    const tenant = await createTenant(ctx, { name: input.tenantName.trim() });
    tenantId = tenant.id;
  } else {
    const tenant = await db.tenant.findFirst({
      where: { id: tenantId, organizationId: ctx.organizationId },
    });
    if (!tenant) throw new ApiError("NOT_FOUND", "Tenant not found");
  }

  return db.tenantOccupancy.create({
    data: {
      propertyId,
      tenantId,
      suiteNumber: input.suiteNumber,
      squareFootage: input.squareFootage,
      isAnchor: input.isAnchor,
    },
    include: { tenant: true },
  });
}

export async function deleteOccupancy(ctx: OrgContext, occupancyId: string) {
  const occupancy = await db.tenantOccupancy.findFirst({
    where: {
      id: occupancyId,
      property: { organizationId: ctx.organizationId },
    },
  });
  if (!occupancy) throw new ApiError("NOT_FOUND", "Occupancy not found");
  await db.tenantOccupancy.delete({ where: { id: occupancyId } });
}
