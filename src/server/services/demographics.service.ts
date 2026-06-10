import type { GeographyType, Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { ApiError } from "@/server/api/respond";
import type { OrgContext } from "@/server/auth/context";
import { requireProperty } from "@/server/services/property.service";
import {
  getDemographicsProvider,
  type DemographicMetrics,
} from "@/server/providers/demographics/DemographicsProvider";

export async function listDemographics(ctx: OrgContext, propertyId: string) {
  await requireProperty(ctx, propertyId);
  return db.demographicDataset.findMany({
    where: { propertyId },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Fetches metrics from the configured provider and stores them as an
 * independent dataset. Until a live provider ships, callers can also supply
 * metrics directly (manual entry), keeping the full pipeline functional.
 */
export async function fetchDemographics(
  ctx: OrgContext,
  propertyId: string,
  input: {
    geographyType: GeographyType;
    geographyParams: Record<string, unknown>;
    metrics?: DemographicMetrics;
  },
) {
  const property = await requireProperty(ctx, propertyId);

  let metrics = input.metrics;
  if (!metrics) {
    if (property.latitude == null || property.longitude == null) {
      throw new ApiError("VALIDATION", "Geocode the property first");
    }
    const provider = getDemographicsProvider();
    metrics = await provider.fetchMetrics({
      center: { lat: property.latitude, lng: property.longitude },
      geographyType: input.geographyType,
      geographyParams: input.geographyParams,
    });
  }

  return db.demographicDataset.create({
    data: {
      propertyId,
      provider: input.metrics ? "manual" : getDemographicsProvider().name,
      geographyType: input.geographyType,
      geographyParams: input.geographyParams as Prisma.InputJsonValue,
      metrics: metrics as Prisma.InputJsonValue,
      asOfDate: new Date(),
    },
  });
}
