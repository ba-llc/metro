import type { Prisma, Tenant } from "@prisma/client";
import { db } from "@/server/db";
import { ApiError } from "@/server/api/respond";
import type { OrgContext } from "@/server/auth/context";
import { requireProperty } from "@/server/services/property.service";
import { createAsset } from "@/server/services/asset.service";
import { getTenantDiscoveryProvider } from "@/server/providers/tenant-discovery";
import { resolveLogo } from "@/server/providers/logo-resolver";
import type {
  OccupancyCreateInput,
  TenantCreateInput,
  TenantDiscoverInput,
  TenantImportInput,
  TenantUpdateInput,
} from "@/features/properties/schemas";

/** Normalize an external name into a comparison key for library matching. */
function nameKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// ---------------------------------------------------------------------------
// Listing & search
// ---------------------------------------------------------------------------

export async function listTenants(ctx: OrgContext, opts: { q?: string } = {}) {
  const where: Prisma.TenantWhereInput = { organizationId: ctx.organizationId };
  if (opts.q?.trim()) {
    where.name = { contains: opts.q.trim(), mode: "insensitive" };
  }
  return db.tenant.findMany({
    where,
    orderBy: { name: "asc" },
  });
}

export async function getTenant(ctx: OrgContext, tenantId: string) {
  const tenant = await db.tenant.findFirst({
    where: { id: tenantId, organizationId: ctx.organizationId },
  });
  if (!tenant) throw new ApiError("NOT_FOUND", "Tenant not found");
  return tenant;
}

// ---------------------------------------------------------------------------
// Create / update
// ---------------------------------------------------------------------------

export async function createTenant(ctx: OrgContext, input: TenantCreateInput) {
  return db.tenant.create({
    data: {
      name: input.name,
      category: input.category,
      website: input.website || null,
      logoAssetId: input.logoAssetId,
      logoStatus: input.logoAssetId ? "PENDING" : "NONE",
      organizationId: ctx.organizationId,
    },
  });
}

export async function updateTenant(
  ctx: OrgContext,
  tenantId: string,
  input: TenantUpdateInput,
) {
  await getTenant(ctx, tenantId);
  return db.tenant.update({
    where: { id: tenantId },
    data: {
      name: input.name,
      category: input.category,
      website: input.website === "" ? null : input.website,
    },
  });
}

// ---------------------------------------------------------------------------
// Occupancy roster
// ---------------------------------------------------------------------------

export async function listOccupancies(ctx: OrgContext, propertyId: string) {
  await requireProperty(ctx, propertyId);
  return db.tenantOccupancy.findMany({
    where: { propertyId },
    include: { tenant: true },
    orderBy: [{ isAnchor: "desc" }, { createdAt: "asc" }],
  });
}

export async function createOccupancy(
  ctx: OrgContext,
  propertyId: string,
  input: OccupancyCreateInput,
) {
  await requireProperty(ctx, propertyId);

  let tenantId = input.tenantId;
  if (!tenantId) {
    if (!input.tenantName?.trim()) {
      throw new ApiError("VALIDATION", "Select a tenant or provide a name");
    }
    const tenant = await createTenant(ctx, { name: input.tenantName.trim() });
    tenantId = tenant.id;
  } else {
    const tenant = await db.tenant.findFirst({
      where: { id: tenantId, organizationId: ctx.organizationId },
    });
    if (!tenant) throw new ApiError("NOT_FOUND", "Tenant not found");
  }

  return db.tenantOccupancy.create({
    data: {
      propertyId,
      tenantId,
      suiteNumber: input.suiteNumber,
      squareFootage: input.squareFootage,
      isAnchor: input.isAnchor,
    },
    include: { tenant: true },
  });
}

export async function deleteOccupancy(ctx: OrgContext, occupancyId: string) {
  const occupancy = await db.tenantOccupancy.findFirst({
    where: {
      id: occupancyId,
      property: { organizationId: ctx.organizationId },
    },
  });
  if (!occupancy) throw new ApiError("NOT_FOUND", "Occupancy not found");
  await db.tenantOccupancy.delete({ where: { id: occupancyId } });
}

// ---------------------------------------------------------------------------
// Google Places discovery
// ---------------------------------------------------------------------------

/**
 * Discover nearby businesses for a property using the configured discovery
 * provider. This is a *read-only* operation against the provider — no DB
 * writes. We annotate results with existingTenantId so the UI can dedupe.
 */
export async function discoverNearbyTenants(
  ctx: OrgContext,
  propertyId: string,
  input: TenantDiscoverInput,
) {
  const property = await requireProperty(ctx, propertyId);
  if (property.latitude == null || property.longitude == null) {
    throw new ApiError(
      "VALIDATION",
      "Geocode the property before discovering nearby tenants.",
    );
  }

  const provider = getTenantDiscoveryProvider();
  let places;
  try {
    places = await provider.searchNearby({
      center: { lat: property.latitude, lng: property.longitude },
      radiusMeters: input.radiusMeters,
      maxResults: input.maxResults,
      includedTypes: input.includedTypes,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Tenant discovery provider failed";
    throw new ApiError("INTERNAL", message);
  }

  // Annotate with org-scoped dedup info so the UI can grey out re-imports.
  const placeIds = places.map((p) => p.placeId);
  const existing = placeIds.length
    ? await db.tenant.findMany({
        where: {
          organizationId: ctx.organizationId,
          googlePlaceId: { in: placeIds },
        },
        select: { id: true, googlePlaceId: true, logoAssetId: true },
      })
    : [];
  const existingByPlaceId = new Map(
    existing.map((t) => [t.googlePlaceId!, t]),
  );

  return places.map((p) => ({
    ...p,
    existingTenantId: existingByPlaceId.get(p.placeId)?.id ?? null,
    hasLogo: Boolean(existingByPlaceId.get(p.placeId)?.logoAssetId) || false,
  }));
}

/**
 * Import selected Places into the tenant library. Upserts by googlePlaceId
 * so re-imports refresh metadata without creating duplicates. Optionally
 * attaches each imported tenant to the property as a TenantOccupancy.
 */
export async function importDiscoveredTenants(
  ctx: OrgContext,
  propertyId: string,
  input: TenantImportInput,
) {
  await requireProperty(ctx, propertyId);

  const now = new Date();
  const imported: Tenant[] = [];

  for (const place of input.places) {
    const data = {
      organizationId: ctx.organizationId,
      name: place.name,
      category: place.primaryType ?? null,
      website: place.website ?? null,
      googlePlaceId: place.placeId,
      formattedAddress: place.formattedAddress ?? null,
      latitude: place.location?.lat ?? null,
      longitude: place.location?.lng ?? null,
      phoneNumber: place.phoneNumber ?? null,
      placeTypes: place.types as Prisma.InputJsonValue,
      discoveredAt: now,
    };

    const tenant = await db.tenant.upsert({
      where: { googlePlaceId: place.placeId },
      create: data,
      update: {
        // Refresh derived metadata, but never overwrite the user-curated
        // name/category/website if they've been edited.
        formattedAddress: data.formattedAddress,
        latitude: data.latitude,
        longitude: data.longitude,
        phoneNumber: data.phoneNumber,
        placeTypes: data.placeTypes,
        discoveredAt: now,
      },
    });

    if (input.attachToProperty) {
      const existing = await db.tenantOccupancy.findFirst({
        where: { propertyId, tenantId: tenant.id },
        select: { id: true },
      });
      if (!existing) {
        await db.tenantOccupancy.create({
          data: { propertyId, tenantId: tenant.id },
        });
      }
    }

    imported.push(tenant);
  }

  return imported;
}

// ---------------------------------------------------------------------------
// Logo resolution
// ---------------------------------------------------------------------------

/**
 * Search the org's existing tenant library for a name match that already
 * has an approved logo. This is the cheapest, highest-confidence resolver
 * step — once a tenant's logo is approved once, every future property in
 * the org reuses it automatically.
 */
async function libraryLogoLookup(
  ctx: OrgContext,
  tenantId: string,
  name: string,
): Promise<string | null> {
  const key = nameKey(name);
  if (!key) return null;
  const candidates = await db.tenant.findMany({
    where: {
      organizationId: ctx.organizationId,
      id: { not: tenantId },
      logoStatus: "APPROVED",
      logoAssetId: { not: null },
    },
    select: { id: true, name: true, logoAssetId: true },
    take: 50,
  });
  const match = candidates.find((t) => nameKey(t.name) === key);
  return match?.logoAssetId ?? null;
}

/**
 * Run the resolver chain for a tenant and store the result. The logo
 * lands in PENDING status — the user always explicitly approves before
 * the logo is considered "blessed" for marketing surfaces.
 */
export async function resolveLogoFor(ctx: OrgContext, tenantId: string) {
  const tenant = await getTenant(ctx, tenantId);

  // 1) Internal library — reuse an existing approved logo for the same name.
  const libraryHitAssetId = await libraryLogoLookup(ctx, tenant.id, tenant.name);
  if (libraryHitAssetId) {
    return db.tenant.update({
      where: { id: tenant.id },
      data: {
        logoAssetId: libraryHitAssetId,
        logoSource: "LIBRARY",
        logoStatus: "PENDING",
      },
    });
  }

  // 2) External resolver chain (Brandfetch, etc.)
  const hit = await resolveLogo({ name: tenant.name, website: tenant.website });
  if (!hit) {
    return tenant; // nothing changed — caller surfaces "no logo found"
  }

  const asset = await createAsset(ctx, {
    body: hit.body,
    filename: hit.filename,
    mime: hit.mime,
    folder: `tenants/${tenant.id}/logos`,
  });

  return db.tenant.update({
    where: { id: tenant.id },
    data: {
      logoAssetId: asset.id,
      logoSource: hit.source,
      logoStatus: "PENDING",
    },
  });
}

export async function approveLogo(ctx: OrgContext, tenantId: string) {
  const tenant = await getTenant(ctx, tenantId);
  if (!tenant.logoAssetId) {
    throw new ApiError("VALIDATION", "Tenant has no logo to approve");
  }
  return db.tenant.update({
    where: { id: tenant.id },
    data: { logoStatus: "APPROVED" },
  });
}

export async function rejectLogo(ctx: OrgContext, tenantId: string) {
  const tenant = await getTenant(ctx, tenantId);
  return db.tenant.update({
    where: { id: tenant.id },
    data: { logoAssetId: null, logoSource: null, logoStatus: "REJECTED" },
  });
}

export async function setManualLogo(
  ctx: OrgContext,
  tenantId: string,
  assetId: string,
) {
  await getTenant(ctx, tenantId);
  const asset = await db.asset.findFirst({
    where: { id: assetId, organizationId: ctx.organizationId },
  });
  if (!asset) throw new ApiError("NOT_FOUND", "Asset not found");
  return db.tenant.update({
    where: { id: tenantId },
    data: {
      logoAssetId: assetId,
      logoSource: "MANUAL",
      logoStatus: "PENDING",
    },
  });
}
