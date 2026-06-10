import type { MapAsset, MapKind } from "@prisma/client";
import { db } from "@/server/db";
import { ApiError } from "@/server/api/respond";
import type { OrgContext } from "@/server/auth/context";
import { logActivity } from "@/server/services/activity.service";
import { requireProperty } from "@/server/services/property.service";
import { createAsset } from "@/server/services/asset.service";
import {
  getMapProvider,
  type Place,
  type StaticMapMarker,
  type StaticMapPath,
} from "@/server/providers/maps";
import { circlePoints, milesToMeters, zoomForRadiusMiles } from "@/lib/geo";
import { enqueueJob } from "@/server/jobs/runner";
import type { MapCreateInput } from "@/features/maps/schemas";

const RING_COLORS = ["0x1d4ed8ff", "0x059669ff", "0xdc2626ff"];
const MARKER_COLORS = ["blue", "green", "red", "orange", "purple"];

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

  return db.property.update({
    where: { id: propertyId },
    data: { latitude: location.lat, longitude: location.lng },
  });
}

export async function createMapAsset(
  ctx: OrgContext,
  propertyId: string,
  input: MapCreateInput,
): Promise<MapAsset> {
  const property = await requireProperty(ctx, propertyId);
  if (property.latitude == null || property.longitude == null) {
    throw new ApiError(
      "VALIDATION",
      "Geocode the property address before generating maps",
    );
  }

  const mapAsset = await db.mapAsset.create({
    data: {
      propertyId,
      kind: input.kind,
      params: {
        ...input.params,
        center: { lat: property.latitude, lng: property.longitude },
      },
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

export async function deleteMapAsset(ctx: OrgContext, mapAssetId: string) {
  const mapAsset = await db.mapAsset.findFirst({
    where: { id: mapAssetId, property: { organizationId: ctx.organizationId } },
  });
  if (!mapAsset) throw new ApiError("NOT_FOUND", "Map not found");
  await db.mapAsset.delete({ where: { id: mapAssetId } });
}

type MapParams = {
  center: { lat: number; lng: number };
  zoom?: number;
  radiusMiles?: number[];
  categories?: string[];
  competitorKeywords?: string[];
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
    const provider = getMapProvider();
    const params = mapAsset.params as MapParams;
    const { center } = params;

    const markers: StaticMapMarker[] = [
      { position: center, color: "red", size: "mid" },
    ];
    const paths: StaticMapPath[] = [];
    let mapType: "roadmap" | "satellite" | "hybrid" = "roadmap";
    let zoom = params.zoom ?? 12;
    let resolvedPlaces: Place[] = [];

    switch (mapAsset.kind as MapKind) {
      case "SATELLITE_AERIAL":
        mapType = "satellite";
        zoom = params.zoom ?? 18;
        break;

      case "TRADE_AREA":
        mapType = "hybrid";
        zoom = params.zoom ?? 12;
        break;

      case "RADIUS": {
        const radii = params.radiusMiles?.length ? params.radiusMiles : [1, 3, 5];
        zoom = params.zoom ?? zoomForRadiusMiles(Math.max(...radii));
        radii.forEach((radius, i) => {
          paths.push({
            points: circlePoints(center, radius),
            strokeColor: RING_COLORS[i % RING_COLORS.length],
            strokeWeight: 3,
          });
        });
        break;
      }

      case "RETAIL": {
        const radii = params.radiusMiles?.length ? params.radiusMiles : [3];
        const radiusMeters = milesToMeters(Math.max(...radii));
        zoom = params.zoom ?? zoomForRadiusMiles(Math.max(...radii));
        const categories = params.categories?.length
          ? params.categories
          : ["grocery_or_supermarket", "restaurant", "gym"];

        const searches = await Promise.all([
          ...categories.map((type) =>
            provider.searchPlaces({
              center,
              radiusMeters,
              type,
              maxResults: 10,
            }),
          ),
          ...(params.competitorKeywords ?? []).map((keyword) =>
            provider.searchPlaces({
              center,
              radiusMeters,
              keyword,
              maxResults: 10,
            }),
          ),
        ]);

        const seen = new Set<string>();
        searches.forEach((places, i) => {
          for (const place of places) {
            const key = `${place.position.lat},${place.position.lng}`;
            if (seen.has(key)) continue;
            seen.add(key);
            resolvedPlaces.push(place);
            markers.push({
              position: place.position,
              color: MARKER_COLORS[i % MARKER_COLORS.length],
              size: "small",
            });
          }
        });
        // Static Maps URL length limit — cap total markers.
        resolvedPlaces = resolvedPlaces.slice(0, 40);
        markers.splice(41);
        break;
      }
    }

    const url = provider.staticMapUrl({
      center,
      zoom,
      width: 640,
      height: 480,
      scale: 2,
      mapType,
      markers,
      paths,
    });

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Static map fetch failed: ${res.status} ${await res.text()}`);
    }
    const body = Buffer.from(await res.arrayBuffer());

    const asset = await createAsset(ctx, {
      body,
      filename: `${mapAsset.kind.toLowerCase()}.png`,
      mime: "image/png",
      folder: `properties/${mapAsset.propertyId}/maps`,
      width: 1280,
      height: 960,
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
