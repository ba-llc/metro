import type { TemplateChannel } from "@prisma/client";
import { db } from "@/server/db";
import { ApiError } from "@/server/api/respond";
import type { OrgContext } from "@/server/auth/context";
import { logActivity } from "@/server/services/activity.service";
import { requireProperty } from "@/server/services/property.service";
import { createAsset } from "@/server/services/asset.service";
import { resolveRenderContext } from "@/server/rendering/resolve";
import { renderDocumentHtml, renderEmailHtml } from "@/server/rendering/renderHtml";
import { renderWebsiteHtml } from "@/server/rendering/renderWebsite";
import type { RenderContext, RenderImages } from "@/server/rendering/types";
import type { TemplatePage, TemplateTheme } from "@/features/marketing/schemas";
import {
  buildShareLinks,
  type PublicPropertyRef,
} from "@/server/services/publicShare.service";
import {
  channelSharePath,
  isLiveChannel,
  publicDocumentDownloadPath,
  versionSharePath,
} from "@/features/marketing/publicUrls";
import { getPdfRenderer } from "@/server/providers/pdf/chromiumPdfRenderer";
import { getStorage } from "@/server/providers/storage";
import { enqueueJob } from "@/server/jobs/runner";

export type DocumentShareMeta = {
  id: string;
  channel: TemplateChannel;
  versionNumber: number;
  status: string;
  outputAssetId: string | null;
  error: string | null;
  createdAt: Date;
  template: { name: string };
  shareUrl: string | null;
  downloadUrl: string | null;
  isLatest: boolean;
  isLiveChannel: boolean;
};

export type DocumentLibraryResponse = {
  property: { id: string; slug: string; name: string };
  organization: { slug: string; name: string };
  documents: DocumentShareMeta[];
  channels: {
    channel: TemplateChannel;
    label: string;
    canonicalShareUrl: string | null;
    latestDocumentId: string | null;
    isLive: boolean;
    versions: DocumentShareMeta[];
  }[];
};

const CHANNEL_LABELS: Record<TemplateChannel, string> = {
  FLYER: "Leasing Flyer",
  BROCHURE: "Brochure",
  OM: "Offering Memorandum",
  EMAIL: "Email Flyer",
  SOCIAL: "Social Graphic",
  WEBSITE: "Property Website",
};

async function nextVersionNumber(
  propertyId: string,
  channel: TemplateChannel,
): Promise<number> {
  const latest = await db.generatedDocument.findFirst({
    where: { propertyId, channel },
    orderBy: { versionNumber: "desc" },
    select: { versionNumber: true },
  });
  return (latest?.versionNumber ?? 0) + 1;
}

function enrichDocument(
  doc: {
    id: string;
    channel: TemplateChannel;
    versionNumber: number;
    status: string;
    outputAssetId: string | null;
    error: string | null;
    createdAt: Date;
    template: { name: string };
  },
  ref: PublicPropertyRef,
  latestByChannel: Map<TemplateChannel, string>,
): DocumentShareMeta {
  const ready = doc.status === "READY" && doc.outputAssetId;
  const isLatest = latestByChannel.get(doc.channel) === doc.id;
  const live = isLiveChannel(doc.channel);

  let shareUrl: string | null = null;
  if (ready) {
    if (live && isLatest) {
      shareUrl = channelSharePath(ref.orgSlug, ref.propertySlug, doc.channel);
    } else if (!live) {
      shareUrl = versionSharePath(
        ref.orgSlug,
        ref.propertySlug,
        doc.channel,
        doc.id,
      );
    } else if (live) {
      shareUrl = channelSharePath(ref.orgSlug, ref.propertySlug, doc.channel);
    }
  }

  return {
    ...doc,
    shareUrl,
    downloadUrl: ready ? publicDocumentDownloadPath(doc.id) : null,
    isLatest,
    isLiveChannel: live,
  };
}

export async function listDocuments(
  ctx: OrgContext,
  propertyId: string,
): Promise<DocumentLibraryResponse> {
  const property = await db.property.findFirst({
    where: {
      id: propertyId,
      organizationId: ctx.organizationId,
      deletedAt: null,
    },
    include: {
      organization: { select: { slug: true, name: true } },
    },
  });
  if (!property) throw new ApiError("NOT_FOUND", "Property not found");

  const docs = await db.generatedDocument.findMany({
    where: { propertyId },
    include: { template: { select: { name: true } } },
    orderBy: [{ channel: "asc" }, { versionNumber: "desc" }],
  });

  const ref: PublicPropertyRef = {
    propertyId: property.id,
    propertySlug: property.slug,
    propertyName: property.name,
    orgSlug: property.organization.slug,
    orgName: property.organization.name,
  };

  const latestByChannel = new Map<TemplateChannel, string>();
  for (const doc of docs) {
    if (
      doc.status === "READY" &&
      doc.outputAssetId &&
      !latestByChannel.has(doc.channel)
    ) {
      latestByChannel.set(doc.channel, doc.id);
    }
  }

  const enriched = docs.map((doc) =>
    enrichDocument(doc, ref, latestByChannel),
  );

  const channelOrder: TemplateChannel[] = [
    "WEBSITE",
    "FLYER",
    "BROCHURE",
    "OM",
    "EMAIL",
    "SOCIAL",
  ];

  const channelsWithDocs = new Set(enriched.map((d) => d.channel));

  const channels = channelOrder
    .filter((channel) => channelsWithDocs.has(channel))
    .map((channel) => {
      const versions = enriched.filter(
        (d) => d.channel === channel && d.status === "READY" && d.outputAssetId,
      );
      const latestId = latestByChannel.get(channel) ?? null;
      const live = isLiveChannel(channel);
      return {
        channel,
        label: CHANNEL_LABELS[channel],
        canonicalShareUrl: latestId
          ? channelSharePath(ref.orgSlug, ref.propertySlug, channel)
          : null,
        latestDocumentId: latestId,
        isLive: live,
        versions: live ? versions.slice(0, 1) : versions,
      };
    });

  return {
    property: {
      id: property.id,
      slug: property.slug,
      name: property.name,
    },
    organization: {
      slug: property.organization.slug,
      name: property.organization.name,
    },
    documents: enriched,
    channels,
  };
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

  const versionNumber = await nextVersionNumber(propertyId, template.channel);

  const doc = await db.generatedDocument.create({
    data: {
      propertyId,
      templateId: template.id,
      channel: template.channel,
      versionNumber,
      status: "QUEUED",
    },
  });

  await enqueueJob(ctx, "document.render", { documentId: doc.id });
  await logActivity(ctx, {
    propertyId,
    entityType: "document",
    entityId: doc.id,
    action: "queued",
    detail: { template: template.name, versionNumber },
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
    } else if (doc.channel === "WEBSITE") {
      const html = renderWebsiteHtml({ theme, pages, context, images });
      body = Buffer.from(html, "utf-8");
      mime = "text/html";
      filename = `${context.property.name} - Property Website.html`;
    } else {
      const html = await renderDocumentHtml({ theme, pages, context, images });
      body = await getPdfRenderer().render(html, {
        pageSize: "letter-landscape",
      });
      mime = "application/pdf";
      filename = `${context.property.name} - ${doc.template.name} v${doc.versionNumber}.pdf`;
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

export { buildShareLinks };
