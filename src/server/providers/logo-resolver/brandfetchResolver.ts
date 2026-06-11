import type { LogoHit, LogoQuery, LogoResolver } from "./LogoResolver";

/**
 * Brandfetch resolver — uses Brandfetch's free Logo Link CDN (a client_id is
 * sufficient) optionally falling back to the Brand Search API to discover a
 * domain when only a tenant name is known.
 *
 * Docs:
 *   - Logo Link: https://docs.brandfetch.com/reference/logo-link
 *   - Brand Search: https://docs.brandfetch.com/reference/get-brand-search
 *
 * Env:
 *   BRANDFETCH_CLIENT_ID  — required for Logo Link CDN (free)
 *   BRANDFETCH_API_KEY    — optional, enables Brand Search by name
 */

const CDN = "https://cdn.brandfetch.io";
const SEARCH = "https://api.brandfetch.io/v2/search";

const SUPPORTED_MIMES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
]);

function clientId(): string | null {
  return process.env.BRANDFETCH_CLIENT_ID?.trim() || null;
}

function apiKey(): string | null {
  return process.env.BRANDFETCH_API_KEY?.trim() || null;
}

function stripScheme(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return (
      url.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] ?? url
    );
  }
}

async function fetchLogoBytes(
  domain: string,
  cid: string,
): Promise<{ body: Buffer; mime: string } | null> {
  // Logo Link CDN. We request a fixed size that suits flyer/site-plan use.
  const url = `${CDN}/${encodeURIComponent(domain)}/w/512/h/512?c=${encodeURIComponent(cid)}`;
  const res = await fetch(url);
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`Brandfetch CDN returned ${res.status} for ${domain}`);
  }
  const mime = (res.headers.get("content-type") ?? "image/png").split(";")[0] ?? "image/png";
  if (!SUPPORTED_MIMES.has(mime)) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  // Brandfetch returns a tiny placeholder when a brand isn't found. Guard.
  if (buf.byteLength < 256) return null;
  return { body: buf, mime };
}

async function searchByName(query: string): Promise<string | null> {
  const key = apiKey();
  if (!key) return null;
  const res = await fetch(
    `${SEARCH}/${encodeURIComponent(query)}?limit=1`,
    { headers: { Authorization: `Bearer ${key}` } },
  );
  if (!res.ok) return null;
  const arr = (await res.json()) as { domain?: string; name?: string }[];
  return arr?.[0]?.domain ?? null;
}

export class BrandfetchResolver implements LogoResolver {
  readonly source = "BRANDFETCH" as const;

  async resolve(query: LogoQuery): Promise<LogoHit | null> {
    const cid = clientId();
    if (!cid) return null;

    let domain = query.website ? stripScheme(query.website) : null;
    if (!domain) {
      domain = await searchByName(query.name);
    }
    if (!domain) return null;

    const hit = await fetchLogoBytes(domain, cid);
    if (!hit) return null;

    const ext =
      hit.mime === "image/svg+xml" ? "svg" : (hit.mime.split("/")[1] ?? "png");
    return {
      source: "BRANDFETCH",
      body: hit.body,
      mime: hit.mime,
      filename: `${domain.replace(/[^a-z0-9.-]/gi, "_")}.${ext}`,
      note: `Brandfetch CDN for ${domain}`,
    };
  }
}
