import { db } from "@/server/db";
import { ApiError } from "@/server/api/respond";
import type { OrgContext } from "@/server/auth/context";
import { logActivity } from "@/server/services/activity.service";
import { requireProperty } from "@/server/services/property.service";
import { createAsset, getAsset } from "@/server/services/asset.service";
import type { PageAnnotations } from "@/types/annotations";

export async function createSitePlan(
  ctx: OrgContext,
  propertyId: string,
  input: { title: string; pdf: Buffer; filename: string },
) {
  await requireProperty(ctx, propertyId);

  // The original PDF is stored immutably and never modified.
  const original = await createAsset(ctx, {
    body: input.pdf,
    filename: input.filename,
    mime: "application/pdf",
    folder: `properties/${propertyId}/site-plans/originals`,
  });

  const sitePlan = await db.sitePlan.create({
    data: {
      organizationId: ctx.organizationId,
      propertyId,
      title: input.title,
      originalAssetId: original.id,
      status: "PROCESSING",
    },
  });

  await logActivity(ctx, {
    propertyId,
    entityType: "sitePlan",
    entityId: sitePlan.id,
    action: "created",
    detail: { title: input.title },
  });

  return sitePlan;
}

export async function requireSitePlan(ctx: OrgContext, sitePlanId: string) {
  const plan = await db.sitePlan.findFirst({
    where: { id: sitePlanId, organizationId: ctx.organizationId },
  });
  if (!plan) throw new ApiError("NOT_FOUND", "Site plan not found");
  return plan;
}

export async function getSitePlanDetail(ctx: OrgContext, sitePlanId: string) {
  const plan = await db.sitePlan.findFirst({
    where: { id: sitePlanId, organizationId: ctx.organizationId },
    include: {
      pages: {
        orderBy: { pageNumber: "asc" },
        include: {
          layers: {
            orderBy: { sortOrder: "asc" },
            include: { annotations: { orderBy: { zIndex: "asc" } } },
          },
        },
      },
      property: { select: { id: true, name: true } },
    },
  });
  if (!plan) throw new ApiError("NOT_FOUND", "Site plan not found");
  return plan;
}

export async function listSitePlans(ctx: OrgContext, propertyId: string) {
  await requireProperty(ctx, propertyId);
  return db.sitePlan.findMany({
    where: { propertyId, organizationId: ctx.organizationId },
    orderBy: { createdAt: "desc" },
    include: { pages: { select: { id: true }, take: 1 } },
  });
}

/** Registers a client-rasterized page (PNG) for a site plan. */
export async function registerPage(
  ctx: OrgContext,
  sitePlanId: string,
  input: { pageNumber: number; assetId: string; width: number; height: number },
) {
  const plan = await requireSitePlan(ctx, sitePlanId);
  await getAsset(ctx, input.assetId);

  const page = await db.sitePlanPage.upsert({
    where: {
      sitePlanId_pageNumber: { sitePlanId, pageNumber: input.pageNumber },
    },
    create: {
      sitePlanId,
      pageNumber: input.pageNumber,
      imageAssetId: input.assetId,
      width: input.width,
      height: input.height,
      layers: { create: { name: "Annotations", sortOrder: 0 } },
    },
    update: {
      imageAssetId: input.assetId,
      width: input.width,
      height: input.height,
    },
  });

  const pageCount = await db.sitePlanPage.count({ where: { sitePlanId } });
  await db.sitePlan.update({
    where: { id: plan.id },
    data: { pageCount, status: "READY" },
  });

  return page;
}

/** Batch-replaces layers + annotations for a page (editor save). */
export async function savePageAnnotations(
  ctx: OrgContext,
  pageId: string,
  input: PageAnnotations,
) {
  const page = await db.sitePlanPage.findFirst({
    where: { id: pageId, sitePlan: { organizationId: ctx.organizationId } },
    include: { sitePlan: true },
  });
  if (!page) throw new ApiError("NOT_FOUND", "Page not found");

  // Verify space bindings belong to this org before persisting.
  const spaceIds = [
    ...new Set(
      input.annotations.flatMap((a) => (a.spaceId ? [a.spaceId] : [])),
    ),
  ];
  if (spaceIds.length > 0) {
    const owned = await db.space.count({
      where: { id: { in: spaceIds }, organizationId: ctx.organizationId },
    });
    if (owned !== spaceIds.length) {
      throw new ApiError("VALIDATION", "Annotation references an unknown space");
    }
  }

  await db.$transaction(async (tx) => {
    await tx.annotationLayer.deleteMany({ where: { pageId } });
    for (const layer of input.layers) {
      await tx.annotationLayer.create({
        data: {
          id: layer.id,
          pageId,
          name: layer.name,
          sortOrder: layer.sortOrder,
          visible: layer.visible,
          locked: layer.locked,
          annotations: {
            create: input.annotations
              .filter((a) => a.layerId === layer.id)
              .map((a) => ({
                id: a.id,
                type: a.type,
                geometry: a.geometry,
                style: a.style,
                label: a.label ?? undefined,
                spaceId: a.spaceId ?? undefined,
                assetId: a.assetId ?? undefined,
                zIndex: a.zIndex,
              })),
          },
        },
      });
    }
  });

  return getSitePlanDetail(ctx, page.sitePlanId);
}

export async function createSnapshot(
  ctx: OrgContext,
  sitePlanId: string,
  name: string,
) {
  await requireSitePlan(ctx, sitePlanId);
  const detail = await getSitePlanDetail(ctx, sitePlanId);

  const state = detail.pages.map((page) => ({
    pageId: page.id,
    layers: page.layers.map((layer) => ({
      id: layer.id,
      name: layer.name,
      sortOrder: layer.sortOrder,
      visible: layer.visible,
      locked: layer.locked,
      annotations: layer.annotations,
    })),
  }));

  return db.annotationSnapshot.create({
    data: { sitePlanId, name, state, createdById: ctx.userId },
  });
}

export async function listSnapshots(ctx: OrgContext, sitePlanId: string) {
  await requireSitePlan(ctx, sitePlanId);
  return db.annotationSnapshot.findMany({
    where: { sitePlanId },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, createdAt: true },
  });
}

export async function restoreSnapshot(
  ctx: OrgContext,
  sitePlanId: string,
  snapshotId: string,
) {
  await requireSitePlan(ctx, sitePlanId);
  const snapshot = await db.annotationSnapshot.findFirst({
    where: { id: snapshotId, sitePlanId },
  });
  if (!snapshot) throw new ApiError("NOT_FOUND", "Snapshot not found");

  const state = snapshot.state as Array<{
    pageId: string;
    layers: Array<{
      id: string;
      name: string;
      sortOrder: number;
      visible: boolean;
      locked: boolean;
      annotations: Array<{
        id: string;
        type: string;
        geometry: unknown;
        style: unknown;
        label: unknown;
        spaceId: string | null;
        assetId: string | null;
        zIndex: number;
      }>;
    }>;
  }>;

  await db.$transaction(async (tx) => {
    for (const pageState of state) {
      await tx.annotationLayer.deleteMany({
        where: { pageId: pageState.pageId },
      });
      for (const layer of pageState.layers) {
        await tx.annotationLayer.create({
          data: {
            pageId: pageState.pageId,
            name: layer.name,
            sortOrder: layer.sortOrder,
            visible: layer.visible,
            locked: layer.locked,
            annotations: {
              create: layer.annotations.map((a) => ({
                type: a.type,
                geometry: a.geometry as object,
                style: (a.style ?? {}) as object,
                label: (a.label ?? undefined) as object | undefined,
                spaceId: a.spaceId ?? undefined,
                assetId: a.assetId ?? undefined,
                zIndex: a.zIndex,
              })),
            },
          },
        });
      }
    }
  });

  return getSitePlanDetail(ctx, sitePlanId);
}

export async function deleteSitePlan(ctx: OrgContext, sitePlanId: string) {
  const plan = await requireSitePlan(ctx, sitePlanId);
  await db.sitePlan.delete({ where: { id: plan.id } });
  await logActivity(ctx, {
    propertyId: plan.propertyId,
    entityType: "sitePlan",
    entityId: plan.id,
    action: "deleted",
    detail: { title: plan.title },
  });
}
