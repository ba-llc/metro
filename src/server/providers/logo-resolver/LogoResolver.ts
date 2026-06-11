/**
 * Logo resolver provider chain.
 *
 * Each resolver is a single strategy that, given a tenant context, returns
 * either a hit (with the binary image bytes ready to store as an Asset) or
 * null. The orchestrator walks resolvers in order and stops at the first
 * hit. Resolvers never touch the database — they are pure lookups so they
 * remain easy to swap, test, and reorder.
 *
 * Cardinal rule: providers like Google Places are *not* logo sources. The
 * resolver chain is the *only* path that produces a stored logo Asset.
 */

import type { TenantLogoSource } from "@prisma/client";

export type LogoQuery = {
  /** Tenant display name. */
  name: string;
  /** Tenant website URL if known — typically the strongest signal. */
  website?: string | null;
};

export type LogoHit = {
  source: TenantLogoSource;
  body: Buffer;
  mime: string;
  filename: string;
  /** Optional human-readable note for activity log / debugging. */
  note?: string;
};

export interface LogoResolver {
  readonly source: TenantLogoSource;
  /** Returns a logo hit, or null if this resolver has nothing to offer. */
  resolve(query: LogoQuery): Promise<LogoHit | null>;
}
