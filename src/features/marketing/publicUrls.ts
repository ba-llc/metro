import type { TemplateChannel } from "@prisma/client";

/** Public path segment for the live property microsite (WEBSITE channel). */
export const PROPERTY_WEBSITE_SEGMENT = "brochure";

/** URL path segment for PDF/downloadable channels under /properties/{slug}/. */
export const CHANNEL_SLUG: Record<
  Exclude<TemplateChannel, "WEBSITE">,
  string
> = {
  FLYER: "flyer",
  BROCHURE: "brochure-pdf",
  OM: "om",
  EMAIL: "email",
  SOCIAL: "social",
};

const SLUG_TO_CHANNEL = Object.fromEntries(
  Object.entries(CHANNEL_SLUG).map(([channel, slug]) => [slug, channel]),
) as Record<string, TemplateChannel>;

/** Legacy /p/.../site → WEBSITE */
SLUG_TO_CHANNEL.site = "WEBSITE";
/** Legacy /p/.../brochure was the PDF brochure channel */
SLUG_TO_CHANNEL.brochure = "BROCHURE";

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

/** Live property microsite — always latest WEBSITE render. */
export function propertySitePath(propertySlug: string): string {
  return `/properties/${propertySlug}/${PROPERTY_WEBSITE_SEGMENT}`;
}

export function channelSharePath(
  propertySlug: string,
  channel: TemplateChannel,
): string {
  if (channel === "WEBSITE") {
    return propertySitePath(propertySlug);
  }
  return `/properties/${propertySlug}/${CHANNEL_SLUG[channel]}`;
}

export function versionSharePath(
  propertySlug: string,
  channel: TemplateChannel,
  documentId: string,
): string {
  return `${channelSharePath(propertySlug, channel)}/v/${documentId}`;
}

export function publicDocumentContentPath(documentId: string): string {
  return `/api/public/documents/${documentId}/content`;
}

export function publicDocumentDownloadPath(documentId: string): string {
  return `/api/public/documents/${documentId}/content?download=1`;
}
