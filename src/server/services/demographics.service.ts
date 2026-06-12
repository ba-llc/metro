import type { GeographyType, Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { ApiError } from "@/server/api/respond";
import type { OrgContext } from "@/server/auth/context";
import { requireProperty } from "@/server/services/property.service";
import {
  getDemographicsProvider,
  type DemographicMetrics,
} from "@/server/providers/demographics/DemographicsProvider";

export const DEFAULT_DEMOGRAPHIC_RADII = [1, 3, 5, 10] as const;

export async function listDemographics(ctx: OrgContext, propertyId: string) {
  await requireProperty(ctx, propertyId);
  return db.demographicDataset.findMany({
    where: { propertyId },
    orderBy: { createdAt: "desc" },
  });
}

async function upsertProviderDataset(
  ctx: OrgContext,
  propertyId: string,
  input: {
    provider: string;
    geographyType: GeographyType;
    geographyParams: Record<string, unknown>;
    metrics: DemographicMetrics;
  },
) {
  const radiusMiles = input.geographyParams.radiusMiles;
  const existing = await db.demographicDataset.findMany({
    where: { propertyId, provider: input.provider, geographyType: input.geographyType },
  });

  for (const row of existing) {
    const params = row.geographyParams as { radiusMiles?: number };
    if (params.radiusMiles === radiusMiles) {
      await db.demographicDataset.delete({ where: { id: row.id } });
    }
  }

  return db.demographicDataset.create({
    data: {
      propertyId,
      provider: input.provider,
      geographyType: input.geographyType,
      geographyParams: input.geographyParams as Prisma.InputJsonValue,
      metrics: input.metrics as Prisma.InputJsonValue,
      asOfDate: new Date(),
    },
  });
}

/**
 * Fetches metrics from the configured provider and stores them as an
 * independent dataset. Callers can also supply metrics directly (manual entry).
 */
export async function fetchDemographics(
  ctx: OrgContext,
  propertyId: string,
  input: {
    geographyType: GeographyType;
    geographyParams: Record<string, unknown>;
    metrics?: DemographicMetrics;
    replaceExisting?: boolean;
  },
) {
  const property = await db.property.findFirst({
    where: {
      id: propertyId,
      organizationId: ctx.organizationId,
      deletedAt: null,
    },
    include: { address: true },
  });
  if (!property) throw new ApiError("NOT_FOUND", "Property not found");
  const zip = property.address?.zip?.replace(/\D/g, "").slice(0, 5);

  let metrics = input.metrics;
  let providerName = "manual";
  let geographyParams = { ...input.geographyParams };

  if (!metrics) {
    const provider = getDemographicsProvider();
    if (provider.name === "manual") {
      throw new ApiError(
        "VALIDATION",
        "No demographics provider configured. Set DEMOGRAPHICS_PROVIDER=census-acs or enter data manually.",
      );
    }
    if (property.latitude == null && !zip) {
      throw new ApiError(
        "VALIDATION",
        "Add a zip code or geocode the property before fetching demographics",
      );
    }

    const result = await provider.fetchMetrics({
      center:
        property.latitude != null && property.longitude != null
          ? { lat: property.latitude, lng: property.longitude }
          : undefined,
      zip,
      geographyType: input.geographyType,
      geographyParams: input.geographyParams,
    });

    metrics = result.metrics;
    providerName = provider.name;
    if (result.meta) {
      geographyParams = { ...geographyParams, ...result.meta };
    }
  }

  const payload = {
    provider: providerName,
    geographyType: input.geographyType,
    geographyParams,
    metrics,
  };

  if (input.replaceExisting && providerName !== "manual") {
    return upsertProviderDataset(ctx, propertyId, payload);
  }

  return db.demographicDataset.create({
    data: {
      propertyId,
      ...payload,
      geographyParams: geographyParams as Prisma.InputJsonValue,
      metrics: metrics as Prisma.InputJsonValue,
      asOfDate: new Date(),
    },
  });
}

/** Fetches standard 1/3/5/10-mile datasets from the configured provider. */
export async function autoFetchDemographics(ctx: OrgContext, propertyId: string) {
  const provider = getDemographicsProvider();
  if (provider.name === "manual") {
    throw new ApiError(
      "VALIDATION",
      "Auto-fetch requires DEMOGRAPHICS_PROVIDER=census-acs",
    );
  }

  const results = [];
  for (const radiusMiles of DEFAULT_DEMOGRAPHIC_RADII) {
    const dataset = await fetchDemographics(ctx, propertyId, {
      geographyType: "RADIUS",
      geographyParams: { radiusMiles },
      replaceExisting: true,
    });
    results.push(dataset);
  }
  return results;
}

/**
 * Best-effort demographics refresh after geocoding. Failures are logged but
 * do not block the geocode response.
 */
export async function tryAutoFetchDemographics(
  ctx: OrgContext,
  propertyId: string,
): Promise<void> {
  try {
    await autoFetchDemographics(ctx, propertyId);
  } catch (e) {
    console.warn("[demographics] auto-fetch skipped", e);
  }
}
