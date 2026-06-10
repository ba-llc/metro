import { createHash, randomUUID } from "crypto";
import type { Asset } from "@prisma/client";
import { db } from "@/server/db";
import { getStorage } from "@/server/providers/storage";
import { ApiError } from "@/server/api/respond";
import type { OrgContext } from "@/server/auth/context";

function extensionFor(filename: string, mime: string): string {
  const fromName = filename.includes(".") ? filename.split(".").pop() : null;
  if (fromName) return fromName.toLowerCase();
  const map: Record<string, string> = {
    "application/pdf": "pdf",
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "text/html": "html",
  };
  return map[mime] ?? "bin";
}

export async function createAsset(
  ctx: OrgContext,
  input: {
    body: Buffer;
    filename: string;
    mime: string;
    /** storage folder under the org prefix, e.g. "properties/abc/photos" */
    folder: string;
    width?: number;
    height?: number;
  },
): Promise<Asset> {
  const ext = extensionFor(input.filename, input.mime);
  const storageKey = `${ctx.organizationId}/${input.folder}/${randomUUID()}.${ext}`;
  await getStorage().put(storageKey, input.body, input.mime);

  return db.asset.create({
    data: {
      organizationId: ctx.organizationId,
      storageKey,
      filename: input.filename,
      mime: input.mime,
      sizeBytes: input.body.byteLength,
      width: input.width,
      height: input.height,
      checksum: createHash("sha256").update(input.body).digest("hex"),
    },
  });
}

export async function getAsset(ctx: OrgContext, assetId: string): Promise<Asset> {
  const asset = await db.asset.findFirst({
    where: { id: assetId, organizationId: ctx.organizationId },
  });
  if (!asset) throw new ApiError("NOT_FOUND", "Asset not found");
  return asset;
}

export async function getAssetContent(
  ctx: OrgContext,
  assetId: string,
): Promise<{ asset: Asset; body: Buffer }> {
  const asset = await getAsset(ctx, assetId);
  const body = await getStorage().get(asset.storageKey);
  return { asset, body };
}
