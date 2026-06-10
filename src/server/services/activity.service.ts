import type { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import type { OrgContext } from "@/server/auth/context";

export async function logActivity(
  ctx: OrgContext,
  input: {
    propertyId?: string;
    entityType: string;
    entityId: string;
    action: string;
    detail?: Record<string, unknown>;
  },
): Promise<void> {
  await db.activityLog.create({
    data: {
      organizationId: ctx.organizationId,
      propertyId: input.propertyId,
      actorId: ctx.userId,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      detail: (input.detail ?? {}) as Prisma.InputJsonValue,
    },
  });
}

export async function listActivity(ctx: OrgContext, propertyId: string) {
  return db.activityLog.findMany({
    where: { organizationId: ctx.organizationId, propertyId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}
