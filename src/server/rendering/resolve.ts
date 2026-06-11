import { db } from "@/server/db";
import { ApiError } from "@/server/api/respond";
import type { OrgContext } from "@/server/auth/context";
import type { RenderContext } from "./types";

type DemographicMetricsShape = {
  population?: number;
  households?: number;
  avgHouseholdIncome?: number;
  daytimePopulation?: number;
  medianHousingValue?: number;
  medianAge?: number;
};

/**
 * Data Resolver: assembles everything a template can reference from the
 * Property Record. The result is the document's dataSnapshot.
 */
export async function resolveRenderContext(
  ctx: OrgContext,
  propertyId: string,
): Promise<RenderContext> {
  const property = await db.property.findFirst({
    where: {
      id: propertyId,
      organizationId: ctx.organizationId,
      deletedAt: null,
    },
    include: {
      address: true,
      spaces: { orderBy: { suiteNumber: "asc" } },
      occupancies: {
        include: { tenant: true },
        orderBy: [{ isAnchor: "desc" }, { createdAt: "asc" }],
      },
      contacts: {
        include: { contact: true },
        orderBy: { sortOrder: "asc" },
      },
      photos: { orderBy: { sortOrder: "asc" }, take: 1 },
      trafficCounts: { orderBy: { count: "desc" } },
      demographics: { orderBy: { createdAt: "desc" } },
      sitePlans: {
        where: { latestExportAssetId: { not: null } },
        orderBy: { updatedAt: "desc" },
        take: 1,
      },
      mapAssets: {
        where: { status: "READY" },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!property) throw new ApiError("NOT_FOUND", "Property not found");

  const latestMapByKind = (kind: string) =>
    property.mapAssets.find((m) => m.kind === kind)?.imageAssetId ?? null;

  // Latest dataset per radius geography, most recent first.
  const seenGeo = new Set<string>();
  const demographics = property.demographics
    .filter((d) => {
      const key = JSON.stringify(d.geographyParams);
      if (seenGeo.has(key)) return false;
      seenGeo.add(key);
      return true;
    })
    .map((d) => {
      const params = d.geographyParams as { radiusMiles?: number };
      const metrics = d.metrics as DemographicMetricsShape;
      return {
        label: params.radiusMiles
          ? `${params.radiusMiles} Mile`
          : d.geographyType,
        metrics: { ...metrics },
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));

  return {
    property: {
      id: property.id,
      name: property.name,
      propertyType: property.propertyType,
      description: property.description,
      totalGla: property.totalGla,
      yearBuilt: property.yearBuilt,
      parkingRatio: property.parkingRatio,
    },
    address: property.address
      ? {
          street: property.address.street,
          city: property.address.city,
          state: property.address.state,
          zip: property.address.zip,
        }
      : null,
    spaces: property.spaces.map((s) => ({
      suiteNumber: s.suiteNumber,
      squareFootage: s.squareFootage,
      spaceType: s.spaceType,
      status: s.status,
      askingRate: s.askingRate ? s.askingRate.toString() : null,
      rateType: s.rateType,
    })),
    tenants: property.occupancies.map((o) => ({
      name: o.tenant.name,
      suiteNumber: o.suiteNumber,
      squareFootage: o.squareFootage,
      isAnchor: o.isAnchor,
      logoAssetId: o.tenant.logoAssetId,
    })),
    contacts: property.contacts.map((pc) => ({
      name: pc.contact.name,
      title: pc.contact.title,
      email: pc.contact.email,
      phone: pc.contact.phone,
      license: pc.contact.license,
    })),
    trafficCounts: property.trafficCounts.map((t) => ({
      roadName: t.roadName,
      count: t.count,
      year: t.year,
    })),
    demographics,
    imageAssets: {
      hero: property.photos[0]?.assetId ?? null,
      aerial: latestMapByKind("SATELLITE_AERIAL"),
      tradeArea: latestMapByKind("TRADE_AREA"),
      radius: latestMapByKind("RADIUS"),
      retail: latestMapByKind("RETAIL"),
      sitePlan: property.sitePlans[0]?.latestExportAssetId ?? null,
    },
    generatedContent: {},
  };
}
