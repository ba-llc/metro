import type { TemplateChannel } from "@prisma/client";

/** URL path segment for each marketing channel. */
export const CHANNEL_SLUG: Record<TemplateChannel, string> = {
  WEBSITE: "site",
  FLYER: "flyer",
  BROCHURE: "brochure",
  OM: "om",
  EMAIL: "email",
  SOCIAL: "social",
};

const SLUG_TO_CHANNEL = Object.fromEntries(
  Object.entries(CHANNEL_SLUG).map(([channel, slug]) => [slug, channel]),
) as Record<string, TemplateChannel>;

/** Channels whose canonical public URL always serves the latest render (no version history). */
export const LIVE_CHANNELS: ReadonlySet<TemplateChannel> = new Set(["WEBSITE"]);

/** Channels that produce downloadable PDF artifacts with version history. */
export const PDF_CHANNELS: ReadonlySet<TemplateChannel> = new Set([
  "FLYER",
  "BROCHURE",
  "OM",
]);

export function channelFromSlug(slug: string): TemplateChannel | null {
  return SLUG_TO_CHANNEL[slug] ?? null;
}

export function isLiveChannel(channel: TemplateChannel): boolean {
  return LIVE_CHANNELS.has(channel);
}

export function propertySitePath(orgSlug: string, propertySlug: string): string {
  return `/p/${orgSlug}/${propertySlug}`;
}

export function channelSharePath(
  orgSlug: string,
  propertySlug: string,
  channel: TemplateChannel,
): string {
  if (channel === "WEBSITE") {
    return propertySitePath(orgSlug, propertySlug);
  }
  return `${propertySitePath(orgSlug, propertySlug)}/${CHANNEL_SLUG[channel]}`;
}

export function versionSharePath(
  orgSlug: string,
  propertySlug: string,
  channel: TemplateChannel,
  documentId: string,
): string {
  return `${channelSharePath(orgSlug, propertySlug, channel)}/v/${documentId}`;
}

export function publicDocumentContentPath(documentId: string): string {
  return `/api/public/documents/${documentId}/content`;
}

export function publicDocumentDownloadPath(documentId: string): string {
  return `/api/public/documents/${documentId}/content?download=1`;
}
