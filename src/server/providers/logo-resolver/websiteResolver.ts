import type { LogoHit, LogoQuery, LogoResolver } from "./LogoResolver";

/**
 * Website resolver — scrapes a tenant's own site for a brand image when
 * Brandfetch doesn't recognize the domain. Order of preference:
 *
 *   1. <meta property="og:image">         — usually a marketing-grade asset
 *   2. <meta name="twitter:image">        — same intent as og:image
 *   3. <link rel="apple-touch-icon">      — 180px iOS bookmark icon
 *   4. <link rel="icon" sizes="...">      — best raster favicon
 *   5. /favicon.ico                       — universal fallback
 *
 * Each candidate is fetched, validated as a real image, and the largest
 * (by byte size) is returned. We deliberately keep the implementation
 * dependency-free — Next.js's fetch + a few regexes are enough.
 */

const HTML_TIMEOUT_MS = 5000;
const IMAGE_TIMEOUT_MS = 5000;
const MIN_IMAGE_BYTES = 512; // smaller than this is almost always a tracker pixel
const UA =
  "Mozilla/5.0 (compatible; MetroBot/1.0; +https://metro.studio/bot)";

const SUPPORTED_MIMES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
  "image/x-icon",
  "image/vnd.microsoft.icon",
  "image/gif",
]);

function withTimeout(ms: number): { signal: AbortSignal; cancel: () => void } {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return { signal: ctrl.signal, cancel: () => clearTimeout(t) };
}

function ensureHttps(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
}

function resolveUrl(base: string, ref: string): string | null {
  try {
    return new URL(ref, base).toString();
  } catch {
    return null;
  }
}

function pickMime(headerValue: string | null): string {
  const raw = (headerValue ?? "").split(";")[0]?.trim().toLowerCase() ?? "";
  if (raw === "image/vnd.microsoft.icon") return "image/x-icon";
  return raw;
}

function extFor(mime: string): string {
  if (mime === "image/svg+xml") return "svg";
  if (mime === "image/x-icon") return "ico";
  return mime.split("/")[1] ?? "png";
}

async function fetchHtml(url: string): Promise<string | null> {
  const { signal, cancel } = withTimeout(HTML_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html" },
      redirect: "follow",
      signal,
    });
    if (!res.ok) return null;
    const ctype = res.headers.get("content-type") ?? "";
    if (!ctype.includes("text/html")) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    cancel();
  }
}

async function fetchImage(
  url: string,
): Promise<{ body: Buffer; mime: string } | null> {
  const { signal, cancel } = withTimeout(IMAGE_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "image/*" },
      redirect: "follow",
      signal,
    });
    if (!res.ok) return null;
    const mime = pickMime(res.headers.get("content-type"));
    if (!SUPPORTED_MIMES.has(mime)) return null;
    const body = Buffer.from(await res.arrayBuffer());
    if (body.byteLength < MIN_IMAGE_BYTES) return null;
    return { body, mime };
  } catch {
    return null;
  } finally {
    cancel();
  }
}

/** Extract candidate logo URLs from an HTML document, in priority order. */
function extractCandidates(html: string, baseUrl: string): string[] {
  const heads = html.slice(0, Math.min(html.length, 200_000)); // <head> is small; cap work
  const urls: string[] = [];
  const push = (u: string | undefined | null) => {
    if (!u) return;
    const abs = resolveUrl(baseUrl, u);
    if (abs && !urls.includes(abs)) urls.push(abs);
  };

  const metaRe =
    /<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]*>/gi;
  for (const m of heads.matchAll(metaRe)) {
    const content = /content=["']([^"']+)["']/i.exec(m[0])?.[1];
    push(content);
  }

  // Sort apple-touch-icon and icon links by `sizes` (largest first), so we
  // grab the highest-res version available.
  const linkRe = /<link[^>]+rel=["']([^"']+)["'][^>]*>/gi;
  type LinkCandidate = { href: string; rel: string; size: number };
  const links: LinkCandidate[] = [];
  for (const m of heads.matchAll(linkRe)) {
    const rel = (m[1] ?? "").toLowerCase();
    if (
      !/apple-touch-icon|^icon$|shortcut icon|mask-icon|fluid-icon/.test(rel)
    ) {
      continue;
    }
    const href = /href=["']([^"']+)["']/i.exec(m[0])?.[1];
    if (!href) continue;
    const sizesAttr = /sizes=["']([^"']+)["']/i.exec(m[0])?.[1];
    const size = sizesAttr ? parseInt(sizesAttr.split(/\D+/)[0] ?? "0", 10) : 0;
    links.push({ href, rel, size });
  }
  links
    .sort((a, b) => {
      // apple-touch first (usually 180px branded), then by declared size desc
      const aApple = a.rel.includes("apple-touch") ? 1 : 0;
      const bApple = b.rel.includes("apple-touch") ? 1 : 0;
      if (aApple !== bApple) return bApple - aApple;
      return (b.size || 0) - (a.size || 0);
    })
    .forEach((l) => push(l.href));

  push(resolveUrl(baseUrl, "/favicon.ico"));
  return urls;
}

function stripScheme(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export class WebsiteResolver implements LogoResolver {
  // The strongest hit attribution; downgraded to FAVICON in tenant.service
  // if the picked candidate turns out to be a small favicon.
  readonly source = "WEBSITE_OG" as const;

  async resolve(query: LogoQuery): Promise<LogoHit | null> {
    if (!query.website?.trim()) return null;
    const siteUrl = ensureHttps(query.website.trim());
    const html = await fetchHtml(siteUrl);
    if (!html) return null;

    const candidates = extractCandidates(html, siteUrl);
    if (!candidates.length) return null;

    // Walk in priority order, but actually return the *largest* successful
    // hit among the first few — many sites set both og:image (small) and a
    // hi-res apple-touch-icon, and the bigger one is the better logo.
    type Hit = { body: Buffer; mime: string; url: string };
    const hits: Hit[] = [];
    for (const url of candidates.slice(0, 6)) {
      const got = await fetchImage(url);
      if (got) hits.push({ ...got, url });
      if (hits.length >= 3) break;
    }
    if (!hits.length) return null;
    hits.sort((a, b) => b.body.byteLength - a.body.byteLength);
    const best = hits[0]!;

    const domain = stripScheme(siteUrl);
    const isOg = best.url.toLowerCase().includes("og") || hits.length === 1;
    const source = isOg ? "WEBSITE_OG" : "FAVICON";
    return {
      source,
      body: best.body,
      mime: best.mime,
      filename: `${domain.replace(/[^a-z0-9.-]/gi, "_")}.${extFor(best.mime)}`,
      note: `Scraped ${best.url}`,
    };
  }
}

/**
 * Last-resort resolver — Google's free s2/favicons service. It always
 * returns *something* (even a generic globe for unknown domains), so we
 * size-check and reject the universal placeholder. Useful for tiny local
 * tenants whose own sites are down or block bots.
 */
export class GoogleFaviconResolver implements LogoResolver {
  readonly source = "GOOGLE_FAVICON" as const;

  async resolve(query: LogoQuery): Promise<LogoHit | null> {
    if (!query.website?.trim()) return null;
    const domain = stripScheme(ensureHttps(query.website));
    const url = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=256`;
    const got = await fetchImage(url);
    if (!got) return null;
    // Google's "unknown domain" placeholder is the same globe icon every
    // time and is small. Anything ≥ 2KB is a real per-domain favicon.
    if (got.body.byteLength < 2048) return null;
    return {
      source: "GOOGLE_FAVICON",
      body: got.body,
      mime: got.mime,
      filename: `${domain.replace(/[^a-z0-9.-]/gi, "_")}-favicon.${extFor(got.mime)}`,
      note: `Google s2/favicons for ${domain}`,
    };
  }
}
