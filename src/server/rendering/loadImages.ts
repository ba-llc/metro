import { db } from "@/server/db";
import type { OrgContext } from "@/server/auth/context";
import { getStorage } from "@/server/providers/storage";
import type { RenderContext, RenderImages } from "./types";

/** Hydrates every image asset referenced by the context into data URIs. */
export async function loadRenderImages(
  ctx: OrgContext,
  context: RenderContext,
): Promise<RenderImages> {
  const assetIds = new Set<string>();
  for (const id of Object.values(context.imageAssets)) {
    if (id) assetIds.add(id);
  }
  for (const t of context.tenants) {
    if (t.logoAssetId) assetIds.add(t.logoAssetId);
  }

  const assets = await db.asset.findMany({
    where: { id: { in: [...assetIds] }, organizationId: ctx.organizationId },
  });

  const storage = getStorage();
  const images: RenderImages = {};
  await Promise.all(
    assets.map(async (asset) => {
      const body = await storage.get(asset.storageKey);
      images[asset.id] = `data:${asset.mime};base64,${body.toString("base64")}`;
    }),
  );
  return images;
}
