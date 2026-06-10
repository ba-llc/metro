import { db } from "@/server/db";
import { ApiError } from "@/server/api/respond";
import type { OrgContext } from "@/server/auth/context";
import { logActivity } from "@/server/services/activity.service";
import { requireProperty } from "@/server/services/property.service";
import { createAsset } from "@/server/services/asset.service";
import { resolveRenderContext } from "@/server/rendering/resolve";
import { renderDocumentHtml, renderEmailHtml } from "@/server/rendering/renderHtml";
import type { RenderContext, RenderImages } from "@/server/rendering/types";
import type { TemplatePage, TemplateTheme } from "@/features/marketing/schemas";
import { getPdfRenderer } from "@/server/providers/pdf/chromiumPdfRenderer";
import { getStorage } from "@/server/providers/storage";
import { enqueueJob } from "@/server/jobs/runner";

export async function listDocuments(ctx: OrgContext, propertyId: string) {
  await requireProperty(ctx, propertyId);
  return db.generatedDocument.findMany({
    where: { propertyId },
    include: { template: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getDocument(ctx: OrgContext, documentId: string) {
  const doc = await db.generatedDocument.findFirst({
    where: {
      id: documentId,
      property: { organizationId: ctx.organizationId },
    },
    include: { template: { select: { name: true } } },
  });
  if (!doc) throw new ApiError("NOT_FOUND", "Document not found");
  return doc;
}

export async function createDocument(
  ctx: OrgContext,
  propertyId: string,
  input: { templateId: string },
) {
  await requireProperty(ctx, propertyId);
  const template = await db.template.findFirst({
    where: {
      id: input.templateId,
      OR: [{ isSystem: true }, { organizationId: ctx.organizationId }],
    },
  });
  if (!template) throw new ApiError("NOT_FOUND", "Template not found");

  const doc = await db.generatedDocument.create({
    data: {
      propertyId,
      templateId: template.id,
      channel: template.channel,
      status: "QUEUED",
    },
  });

  await enqueueJob(ctx, "document.render", { documentId: doc.id });
  await logActivity(ctx, {
    propertyId,
    entityType: "document",
    entityId: doc.id,
    action: "queued",
    detail: { template: template.name },
  });

  return doc;
}

export async function deleteDocument(ctx: OrgContext, documentId: string) {
  const doc = await getDocument(ctx, documentId);
  await db.generatedDocument.delete({ where: { id: doc.id } });
}

/** Hydrates every image asset referenced by the context into data URIs. */
async function loadImages(
  ctx: OrgContext,
  context: RenderContext,
): Promise<RenderImages> {
  const assetIds = new Set<string>();
  for (const id of Object.values(context.imageAssets)) {
    if (id) assetIds.add(id);
  }
  for (const t of context.tenants) {
    if (t.logoAssetId) assetIds.add(t.logoAssetId);
  }

  const assets = await db.asset.findMany({
    where: { id: { in: [...assetIds] }, organizationId: ctx.organizationId },
  });

  const storage = getStorage();
  const images: RenderImages = {};
  await Promise.all(
    assets.map(async (asset) => {
      const body = await storage.get(asset.storageKey);
      images[asset.id] = `data:${asset.mime};base64,${body.toString("base64")}`;
    }),
  );
  return images;
}

/** Executed by the job runner: resolves data, renders, stores the output. */
export async function renderDocument(
  ctx: OrgContext,
  documentId: string,
): Promise<void> {
  const doc = await db.generatedDocument.findFirst({
    where: { id: documentId, property: { organizationId: ctx.organizationId } },
    include: { template: true },
  });
  if (!doc) throw new Error("Document not found");

  await db.generatedDocument.update({
    where: { id: documentId },
    data: { status: "RENDERING", error: null },
  });

  try {
    const context = await resolveRenderContext(ctx, doc.propertyId);
    const images = await loadImages(ctx, context);
    const theme = doc.template.theme as Partial<TemplateTheme>;
    const pages = doc.template.pages as TemplatePage[];

    let body: Buffer;
    let mime: string;
    let filename: string;

    if (doc.channel === "EMAIL") {
      const html = renderEmailHtml({ theme, context, images });
      body = Buffer.from(html, "utf-8");
      mime = "text/html";
      filename = `${context.property.name} - Email Flyer.html`;
    } else {
      const html = await renderDocumentHtml({ theme, pages, context, images });
      body = await getPdfRenderer().render(html, {
        pageSize: "letter-landscape",
      });
      mime = "application/pdf";
      filename = `${context.property.name} - ${doc.template.name}.pdf`;
    }

    const asset = await createAsset(ctx, {
      body,
      filename,
      mime,
      folder: `properties/${doc.propertyId}/documents`,
    });

    await db.generatedDocument.update({
      where: { id: documentId },
      data: {
        status: "READY",
        outputAssetId: asset.id,
        dataSnapshot: context,
      },
    });
  } catch (e) {
    await db.generatedDocument.update({
      where: { id: documentId },
      data: { status: "FAILED", error: e instanceof Error ? e.message : String(e) },
    });
    throw e;
  }
}
