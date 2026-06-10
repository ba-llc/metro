import { db } from "@/server/db";
import { ApiError } from "@/server/api/respond";
import type { OrgContext } from "@/server/auth/context";
import { logActivity } from "@/server/services/activity.service";
import { requireProperty } from "@/server/services/property.service";
import type {
  SpaceCreateInput,
  SpaceUpdateInput,
} from "@/features/properties/schemas";

export async function listSpaces(ctx: OrgContext, propertyId: string) {
  await requireProperty(ctx, propertyId);
  return db.space.findMany({
    where: { propertyId, organizationId: ctx.organizationId },
    orderBy: { suiteNumber: "asc" },
  });
}

export async function requireSpace(ctx: OrgContext, spaceId: string) {
  const space = await db.space.findFirst({
    where: { id: spaceId, organizationId: ctx.organizationId },
  });
  if (!space) throw new ApiError("NOT_FOUND", "Space not found");
  return space;
}

export async function createSpace(
  ctx: OrgContext,
  propertyId: string,
  input: SpaceCreateInput,
) {
  await requireProperty(ctx, propertyId);
  const space = await db.space.create({
    data: { ...input, propertyId, organizationId: ctx.organizationId },
  });
  await logActivity(ctx, {
    propertyId,
    entityType: "space",
    entityId: space.id,
    action: "created",
    detail: { suiteNumber: space.suiteNumber },
  });
  return space;
}

export async function updateSpace(
  ctx: OrgContext,
  spaceId: string,
  input: SpaceUpdateInput,
) {
  const existing = await requireSpace(ctx, spaceId);
  const space = await db.space.update({ where: { id: spaceId }, data: input });
  await logActivity(ctx, {
    propertyId: existing.propertyId,
    entityType: "space",
    entityId: spaceId,
    action: "updated",
  });
  return space;
}

export async function deleteSpace(ctx: OrgContext, spaceId: string) {
  const existing = await requireSpace(ctx, spaceId);
  await db.space.delete({ where: { id: spaceId } });
  await logActivity(ctx, {
    propertyId: existing.propertyId,
    entityType: "space",
    entityId: spaceId,
    action: "deleted",
    detail: { suiteNumber: existing.suiteNumber },
  });
}
