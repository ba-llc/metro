import type { PublicationStatus, TemplateChannel } from "@prisma/client";
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
import { loadRenderImages } from "@/server/rendering/loadImages";
import {
  metroCommercialTheme,
  type TemplatePage,
  type TemplateTheme,
} from "@/features/marketing/schemas";
import {
  buildShareLinks,
  type PublicPropertyRef,
} from "@/server/services/publicShare.service";
import {
  channelSharePath,
  isLiveChannel,
  propertySitePath,
  publicDocumentContentPath,
  publicDocumentDownloadPath,
  versionSharePath,
} from "@/features/marketing/publicUrls";
import { getPdfRenderer } from "@/server/providers/pdf/chromiumPdfRenderer";
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
  isPublishedWebsite: boolean;
  sitePlanAssetId: string | null;
};

export type PropertyPublicationMeta = {
  status: PublicationStatus | "NOT_PUBLISHED";
  publicUrl: string;
  publishedWebsiteDocumentId: string | null;
  publishedAt: Date | null;
  unpublishedAt: Date | null;
  sitePlanExportAssetId: string | null;
  sitePlanExportedAt: Date | null;
};

export type DocumentLibraryResponse = {
  property: { id: string; slug: string; name: string };
  organization: { slug: string; name: string };
  publication: PropertyPublicationMeta;
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

const legacyOrangeAccents = new Set([
  "#c44715",
  "#ea580c",
  "#e95420",
  "#f4511e",
  "#f97316",
  "#ff5a1f",
]);

function getSnapshotSitePlanAssetId(snapshot: unknown): string | null {
  if (!snapshot || typeof snapshot !== "object") return null;
  const imageAssets = (snapshot as { imageAssets?: unknown }).imageAssets;
  if (!imageAssets || typeof imageAssets !== "object") return null;
  const sitePlan = (imageAssets as { sitePlan?: unknown }).sitePlan;
  return typeof sitePlan === "string" ? sitePlan : null;
}

function renderTheme(theme: Partial<TemplateTheme>): TemplateTheme {
  const merged = {
    ...metroCommercialTheme,
    ...theme,
  };
  return legacyOrangeAccents.has(merged.accentColor.toLowerCase())
    ? { ...merged, accentColor: metroCommercialTheme.accentColor }
    : merged;
}

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
    dataSnapshot?: unknown;
    template: { name: string };
  },
  ref: PublicPropertyRef,
  latestByChannel: Map<TemplateChannel, string>,
  publishedWebsiteDocumentId: string | null,
): DocumentShareMeta {
  const ready = doc.status === "READY" && doc.outputAssetId;
  const isLatest = latestByChannel.get(doc.channel) === doc.id;
  const live = isLiveChannel(doc.channel);

  let shareUrl: string | null = null;
  if (ready) {
    if (live) {
      shareUrl = publicDocumentContentPath(doc.id);
    } else if (!live) {
      shareUrl = versionSharePath(
        ref.propertySlug,
        doc.channel,
        doc.id,
      );
    }
  }

  return {
    ...doc,
    shareUrl,
    downloadUrl: ready ? publicDocumentDownloadPath(doc.id) : null,
    isLatest,
    isLiveChannel: live,
    isPublishedWebsite: doc.channel === "WEBSITE" && doc.id === publishedWebsiteDocumentId,
    sitePlanAssetId:
      doc.channel === "WEBSITE" ? getSnapshotSitePlanAssetId(doc.dataSnapshot) : null,
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
      publication: true,
      sitePlans: {
        where: { latestExportAssetId: { not: null } },
        orderBy: { updatedAt: "desc" },
        take: 1,
        include: {
          latestExportAsset: { select: { id: true, createdAt: true } },
        },
      },
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
    enrichDocument(
      doc,
      ref,
      latestByChannel,
      property.publication?.status === "PUBLISHED"
        ? property.publication.publishedWebsiteDocumentId
        : null,
    ),
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
      const versions = enriched
        .filter((d) => d.channel === channel)
        .sort((a, b) => b.versionNumber - a.versionNumber);
      const latestId = latestByChannel.get(channel) ?? null;
      const live = isLiveChannel(channel);
      return {
        channel,
        label: CHANNEL_LABELS[channel],
        canonicalShareUrl:
          live && property.publication?.status === "PUBLISHED"
            ? propertySitePath(property.slug)
            : latestId && !live
              ? channelSharePath(ref.propertySlug, channel)
              : null,
        latestDocumentId: latestId,
        isLive: live,
        versions,
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
    publication: {
      status: property.publication?.status ?? "NOT_PUBLISHED",
      publicUrl: propertySitePath(property.slug),
      publishedWebsiteDocumentId:
        property.publication?.status === "PUBLISHED"
          ? property.publication.publishedWebsiteDocumentId
          : null,
      publishedAt: property.publication?.publishedAt ?? null,
      unpublishedAt: property.publication?.unpublishedAt ?? null,
      sitePlanExportAssetId: property.sitePlans[0]?.latestExportAssetId ?? null,
      sitePlanExportedAt: property.sitePlans[0]?.latestExportAsset?.createdAt ?? null,
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
  const publication = await db.propertyPublication.findFirst({
    where: {
      publishedWebsiteDocumentId: doc.id,
      status: "PUBLISHED",
    },
    select: { id: true },
  });
  if (publication) {
    throw new ApiError(
      "VALIDATION",
      "Unpublish this property website before deleting the published version.",
    );
  }
  await db.generatedDocument.delete({ where: { id: doc.id } });
}

export async function publishWebsiteDocument(
  ctx: OrgContext,
  documentId: string,
) {
  const doc = await db.generatedDocument.findFirst({
    where: {
      id: documentId,
      channel: "WEBSITE",
      status: "READY",
      outputAssetId: { not: null },
      property: { organizationId: ctx.organizationId, deletedAt: null },
    },
    select: {
      id: true,
      propertyId: true,
      versionNumber: true,
      property: { select: { slug: true } },
    },
  });
  if (!doc) {
    throw new ApiError(
      "VALIDATION",
      "Only a ready Property Website document can be published.",
    );
  }

  const publication = await db.propertyPublication.upsert({
    where: { propertyId: doc.propertyId },
    create: {
      propertyId: doc.propertyId,
      status: "PUBLISHED",
      publishedWebsiteDocumentId: doc.id,
      publishedAt: new Date(),
      unpublishedAt: null,
      lastPublishedById: ctx.userId,
    },
    update: {
      status: "PUBLISHED",
      publishedWebsiteDocumentId: doc.id,
      publishedAt: new Date(),
      unpublishedAt: null,
      lastPublishedById: ctx.userId,
    },
  });

  await logActivity(ctx, {
    propertyId: doc.propertyId,
    entityType: "property-publication",
    entityId: publication.id,
    action: "published",
    detail: { documentId: doc.id, versionNumber: doc.versionNumber },
  });

  return {
    status: publication.status,
    publicUrl: propertySitePath(doc.property.slug),
    publishedWebsiteDocumentId: publication.publishedWebsiteDocumentId,
    publishedAt: publication.publishedAt,
    unpublishedAt: publication.unpublishedAt,
  };
}

export async function unpublishPropertyWebsite(
  ctx: OrgContext,
  propertyId: string,
) {
  await requireProperty(ctx, propertyId);
  const publication = await db.propertyPublication.upsert({
    where: { propertyId },
    create: {
      propertyId,
      status: "UNPUBLISHED",
      publishedWebsiteDocumentId: null,
      unpublishedAt: new Date(),
    },
    update: {
      status: "UNPUBLISHED",
      publishedWebsiteDocumentId: null,
      unpublishedAt: new Date(),
    },
  });

  await logActivity(ctx, {
    propertyId,
    entityType: "property-publication",
    entityId: publication.id,
    action: "unpublished",
    detail: {},
  });

  return publication;
}

/** Re-queues a failed or stuck document for rendering. */
export async function retryDocument(ctx: OrgContext, documentId: string) {
  const doc = await getDocument(ctx, documentId);
  if (doc.status === "READY") {
    throw new ApiError(
      "VALIDATION",
      "This document already rendered. Generate a new version instead.",
    );
  }
  if (doc.status === "RENDERING") {
    throw new ApiError(
      "VALIDATION",
      "This document is already rendering.",
    );
  }

  await db.generatedDocument.update({
    where: { id: doc.id },
    data: { status: "QUEUED", error: null },
  });
  await enqueueJob(ctx, "document.render", { documentId: doc.id });
  await logActivity(ctx, {
    propertyId: doc.propertyId,
    entityType: "document",
    entityId: doc.id,
    action: "retried",
    detail: { channel: doc.channel, versionNumber: doc.versionNumber },
  });

  return doc;
}

/** Hydrates every image asset referenced by the context into data URIs. */
async function loadImages(
  ctx: OrgContext,
  context: RenderContext,
): Promise<RenderImages> {
  return loadRenderImages(ctx, context);
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
    const theme = renderTheme(doc.template.theme as Partial<TemplateTheme>);
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
