import type { TemplateChannel } from "@prisma/client";
import { db } from "@/server/db";
import { ApiError } from "@/server/api/respond";
import { getStorage } from "@/server/providers/storage";
import {
  channelFromSlug,
  channelSharePath,
  isLiveChannel,
  propertySitePath,
  versionSharePath,
} from "@/features/marketing/publicUrls";

export type PublicPropertyRef = {
  propertyId: string;
  propertySlug: string;
  propertyName: string;
  orgSlug: string;
  orgName: string;
};

export async function resolvePublicPropertyBySlug(
  propertySlug: string,
): Promise<PublicPropertyRef> {
  const property = await db.property.findFirst({
    where: {
      slug: propertySlug,
      deletedAt: null,
      status: "ACTIVE",
    },
    include: {
      organization: { select: { slug: true, name: true } },
    },
  });
  if (!property) throw new ApiError("NOT_FOUND", "Property not found");

  return {
    propertyId: property.id,
    propertySlug: property.slug,
    propertyName: property.name,
    orgSlug: property.organization.slug,
    orgName: property.organization.name,
  };
}

export async function resolvePublicProperty(
  orgSlug: string,
  propertySlug: string,
): Promise<PublicPropertyRef> {
  const org = await db.organization.findUnique({
    where: { slug: orgSlug },
    select: { id: true, name: true, slug: true },
  });
  if (!org) throw new ApiError("NOT_FOUND", "Organization not found");

  const property = await db.property.findFirst({
    where: {
      organizationId: org.id,
      slug: propertySlug,
      deletedAt: null,
      status: "ACTIVE",
    },
    select: { id: true, name: true, slug: true },
  });
  if (!property) throw new ApiError("NOT_FOUND", "Property not found");

  return {
    propertyId: property.id,
    propertySlug: property.slug,
    propertyName: property.name,
    orgSlug: org.slug,
    orgName: org.name,
  };
}

export async function getLatestReadyDocument(
  propertyId: string,
  channel: TemplateChannel,
) {
  return db.generatedDocument.findFirst({
    where: { propertyId, channel, status: "READY", outputAssetId: { not: null } },
    orderBy: { createdAt: "desc" },
    include: {
      template: { select: { name: true } },
      outputAsset: { select: { id: true, mime: true, filename: true } },
    },
  });
}

export async function listDocumentVersions(
  propertyId: string,
  channel: TemplateChannel,
) {
  return db.generatedDocument.findMany({
    where: {
      propertyId,
      channel,
      status: "READY",
      outputAssetId: { not: null },
    },
    orderBy: { versionNumber: "desc" },
    include: {
      template: { select: { name: true } },
      outputAsset: { select: { id: true, mime: true, filename: true } },
    },
  });
}

export async function getPublicDocument(documentId: string) {
  const doc = await db.generatedDocument.findFirst({
    where: {
      id: documentId,
      status: "READY",
      outputAssetId: { not: null },
      property: { deletedAt: null, status: "ACTIVE" },
    },
    include: {
      property: {
        select: {
          slug: true,
          name: true,
          organization: { select: { slug: true, name: true } },
        },
      },
      template: { select: { name: true } },
      outputAsset: true,
    },
  });
  if (!doc?.outputAsset) throw new ApiError("NOT_FOUND", "Document not found");
  return doc;
}

export async function getPublicDocumentContent(documentId: string) {
  const doc = await getPublicDocument(documentId);
  const storage = getStorage();
  const body = await storage.get(doc.outputAsset!.storageKey);
  return {
    body,
    mime: doc.outputAsset!.mime,
    filename: doc.outputAsset!.filename,
    document: doc,
  };
}

export async function resolvePublicChannelDocument(input: {
  propertySlug: string;
  channelSlug: string;
  documentId?: string;
  /** @deprecated Legacy /p/{org}/{property} URLs — prefer propertySlug-only routes */
  orgSlug?: string;
}) {
  const ref = input.orgSlug
    ? await resolvePublicProperty(input.orgSlug, input.propertySlug)
    : await resolvePublicPropertyBySlug(input.propertySlug);
  const channel = channelFromSlug(input.channelSlug);
  if (!channel || channel === "WEBSITE") {
    throw new ApiError("NOT_FOUND", "Unknown document type");
  }

  if (input.documentId) {
    const doc = await getPublicDocument(input.documentId);
    if (
      doc.propertyId !== ref.propertyId ||
      doc.channel !== channel
    ) {
      throw new ApiError("NOT_FOUND", "Document not found");
    }
    return { ref, channel, doc };
  }

  const doc = await getLatestReadyDocument(ref.propertyId, channel);
  if (!doc) throw new ApiError("NOT_FOUND", "No published document yet");
  return { ref, channel, doc };
}

export function buildShareLinks(
  ref: PublicPropertyRef,
  channel: TemplateChannel,
  documentId: string,
) {
  const canonicalUrl = channelSharePath(ref.propertySlug, channel);
  const versionUrl = isLiveChannel(channel)
    ? canonicalUrl
    : versionSharePath(ref.propertySlug, channel, documentId);

  return {
    canonicalUrl,
    versionUrl,
    siteUrl: propertySitePath(ref.propertySlug),
    isLive: isLiveChannel(channel),
  };
}
