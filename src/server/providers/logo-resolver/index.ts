import { GoogleFaviconResolver, WebsiteResolver } from "./websiteResolver";
import type { LogoHit, LogoQuery, LogoResolver } from "./LogoResolver";

/**
 * Ordered list of *external* resolvers. The service layer is responsible
 * for the internal-library lookup first (it requires DB access scoped to
 * the org). Resolvers here are pure — they only call external APIs.
 *
 * Order is intentional for local CRE tenant rosters:
 *   1. WebsiteResolver  — scrape the tenant's own site (og:image / icon)
 *   2. GoogleFavicon    — universal last resort for tiny local tenants
 *
 * Brandfetch remains available as a provider, but it is not part of the
 * default chain because website/favicon hits are usually enough for local
 * businesses and avoid an extra third-party dependency.
 */
let chain: LogoResolver[] | null = null;

export function getLogoResolverChain(): LogoResolver[] {
  if (!chain) {
    chain = [new WebsiteResolver(), new GoogleFaviconResolver()];
  }
  return chain;
}

/** Walk the chain and return the first hit, if any. */
export async function resolveLogo(query: LogoQuery): Promise<LogoHit | null> {
  for (const resolver of getLogoResolverChain()) {
    try {
      const hit = await resolver.resolve(query);
      if (hit) return hit;
    } catch (err) {
      // Don't let one provider's outage break the chain. Log and continue.
      console.warn(`[logo-resolver] ${resolver.source} failed:`, err);
    }
  }
  return null;
}

export * from "./LogoResolver";
