import { db } from "@/server/db";
import type { OrgContext } from "@/server/auth/context";

/** Real org-wide counts that drive the dashboard hero and onboarding checklist. */
export async function getDashboardCounts(ctx: OrgContext) {
  const orgProperty = { organizationId: ctx.organizationId, deletedAt: null };
  const [properties, sitePlans, documents] = await Promise.all([
    db.property.count({ where: orgProperty }),
    db.sitePlan.count({ where: { organizationId: ctx.organizationId } }),
    db.generatedDocument.count({ where: { property: orgProperty } }),
  ]);
  return { properties, sitePlans, documents };
}
