import type { MapAsset } from "@prisma/client";
import { db } from "@/server/db";
import { ApiError } from "@/server/api/respond";
import type { OrgContext } from "@/server/auth/context";
import { logActivity } from "@/server/services/activity.service";
import { tryAutoFetchDemographics } from "@/server/services/demographics.service";
import { requireProperty } from "@/server/services/property.service";
import { createAsset } from "@/server/services/asset.service";
import { getMapProvider } from "@/server/providers/maps";
import { enqueueJob } from "@/server/jobs/runner";
import type { MapCreateInput, MapParams } from "@/features/maps/schemas";
import { renderMapPng, type MapRenderParams } from "@/server/services/map-render";

export async function listMaps(ctx: OrgContext, propertyId: string) {
  await requireProperty(ctx, propertyId);
  return db.mapAsset.findMany({
    where: { propertyId },
    orderBy: { createdAt: "desc" },
  });
}

export async function geocodeProperty(ctx: OrgContext, propertyId: string) {
  const property = await db.property.findFirst({
    where: {
      id: propertyId,
      organizationId: ctx.organizationId,
      deletedAt: null,
    },
    include: { address: true },
  });
  if (!property) throw new ApiError("NOT_FOUND", "Property not found");
  if (!property.address) {
    throw new ApiError("VALIDATION", "Property has no address to geocode");
  }

  const { street, city, state, zip } = property.address;
  const address = [street, city, state, zip].filter(Boolean).join(", ");

  let location;
  try {
    location = await getMapProvider().geocode(address);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    throw new ApiError("INTERNAL", message);
  }

  if (!location) {
    throw new ApiError(
      "VALIDATION",
      "Address could not be geocoded. Verify the street, city, state, and zip are correct.",
    );
  }

  const updated = await db.property.update({
    where: { id: propertyId },
    data: { latitude: location.lat, longitude: location.lng },
  });

  await tryAutoFetchDemographics(ctx, propertyId);

  return updated;
}

function renderParamsForProperty(
  property: { latitude: number | null; longitude: number | null },
  input: MapCreateInput,
): MapRenderParams {
  if (property.latitude == null || property.longitude == null) {
    throw new ApiError(
      "VALIDATION",
      "Geocode the property address before generating maps",
    );
  }
  return {
    ...input.params,
    center: { lat: property.latitude, lng: property.longitude },
  };
}

export async function createMapAsset(
  ctx: OrgContext,
  propertyId: string,
  input: MapCreateInput,
): Promise<MapAsset> {
  const property = await requireProperty(ctx, propertyId);
  const params = renderParamsForProperty(property, input);

  const mapAsset = await db.mapAsset.create({
    data: {
      propertyId,
      kind: input.kind,
      params,
      provider: getMapProvider().name,
      status: "QUEUED",
    },
  });

  await enqueueJob(ctx, "map.generate", { mapAssetId: mapAsset.id });
  await logActivity(ctx, {
    propertyId,
    entityType: "mapAsset",
    entityId: mapAsset.id,
    action: "queued",
    detail: { kind: input.kind },
  });

  return mapAsset;
}

export async function regenerateMapAsset(
  ctx: OrgContext,
  mapAssetId: string,
  input: MapCreateInput,
): Promise<MapAsset> {
  const mapAsset = await db.mapAsset.findFirst({
    where: { id: mapAssetId, property: { organizationId: ctx.organizationId } },
    include: { property: true },
  });
  if (!mapAsset) throw new ApiError("NOT_FOUND", "Map not found");

  const params = renderParamsForProperty(mapAsset.property, input);

  const updated = await db.mapAsset.update({
    where: { id: mapAssetId },
    data: {
      kind: input.kind,
      params,
      status: "QUEUED",
      error: null,
    },
  });

  await enqueueJob(ctx, "map.generate", { mapAssetId });
  await logActivity(ctx, {
    propertyId: mapAsset.propertyId,
    entityType: "mapAsset",
    entityId: mapAssetId,
    action: "regenerated",
    detail: { kind: input.kind },
  });

  return updated;
}

/** Server-side preview — returns PNG bytes without persisting a MapAsset. */
export async function previewMapPng(
  ctx: OrgContext,
  propertyId: string,
  input: MapCreateInput,
): Promise<Buffer> {
  const property = await requireProperty(ctx, propertyId);
  const params = renderParamsForProperty(property, input);
  const { body } = await renderMapPng(input.kind, params, { preview: true });
  return body;
}

export async function deleteMapAsset(ctx: OrgContext, mapAssetId: string) {
  const mapAsset = await db.mapAsset.findFirst({
    where: { id: mapAssetId, property: { organizationId: ctx.organizationId } },
  });
  if (!mapAsset) throw new ApiError("NOT_FOUND", "Map not found");
  await db.mapAsset.delete({ where: { id: mapAssetId } });
}

type StoredMapParams = MapRenderParams & {
  resolvedPlaces?: unknown;
};

/** Executed by the job runner: builds and stores the map image. */
export async function generateMapImage(
  ctx: OrgContext,
  mapAssetId: string,
): Promise<void> {
  const mapAsset = await db.mapAsset.findFirst({
    where: { id: mapAssetId, property: { organizationId: ctx.organizationId } },
  });
  if (!mapAsset) throw new Error("Map asset not found");

  await db.mapAsset.update({
    where: { id: mapAssetId },
    data: { status: "RENDERING", error: null },
  });

  try {
    const params = mapAsset.params as StoredMapParams;
    const { body, width, height, resolvedPlaces } = await renderMapPng(
      mapAsset.kind,
      params,
    );

    const asset = await createAsset(ctx, {
      body,
      filename: `${mapAsset.kind.toLowerCase()}.png`,
      mime: "image/png",
      folder: `properties/${mapAsset.propertyId}/maps`,
      width,
      height,
    });

    await db.mapAsset.update({
      where: { id: mapAssetId },
      data: {
        status: "READY",
        imageAssetId: asset.id,
        params: { ...params, resolvedPlaces },
      },
    });
  } catch (e) {
    await db.mapAsset.update({
      where: { id: mapAssetId },
      data: { status: "FAILED", error: e instanceof Error ? e.message : String(e) },
    });
    throw e;
  }
}
