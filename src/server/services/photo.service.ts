import { db } from "@/server/db";
import { ApiError } from "@/server/api/respond";
import type { OrgContext } from "@/server/auth/context";
import { requireProperty } from "@/server/services/property.service";
import { getAsset } from "@/server/services/asset.service";
import type { PhotoCreateInput } from "@/features/properties/schemas";

export async function listPhotos(ctx: OrgContext, propertyId: string) {
  await requireProperty(ctx, propertyId);
  return db.photo.findMany({
    where: { propertyId },
    include: { asset: true },
    orderBy: { sortOrder: "asc" },
  });
}

export async function createPhoto(
  ctx: OrgContext,
  propertyId: string,
  input: PhotoCreateInput,
) {
  await requireProperty(ctx, propertyId);
  await getAsset(ctx, input.assetId);
  const count = await db.photo.count({ where: { propertyId } });
  return db.photo.create({
    data: { ...input, propertyId, sortOrder: count },
    include: { asset: true },
  });
}

export async function deletePhoto(ctx: OrgContext, photoId: string) {
  const photo = await db.photo.findFirst({
    where: { id: photoId, property: { organizationId: ctx.organizationId } },
  });
  if (!photo) throw new ApiError("NOT_FOUND", "Photo not found");
  await db.photo.delete({ where: { id: photoId } });
}
