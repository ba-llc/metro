import { z } from "zod";
import { handle } from "@/server/api/respond";
import { requireOrg, requireWriter } from "@/server/auth/context";
import { db } from "@/server/db";
import {
  deleteSitePlan,
  getSitePlanDetail,
  requireSitePlan,
} from "@/server/services/sitePlan.service";
import { getAsset } from "@/server/services/asset.service";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  title: z.string().min(1).optional(),
  latestExportAssetId: z.string().optional(),
});

export async function GET(_req: Request, { params }: Params) {
  return handle(async () => {
    const ctx = await requireOrg();
    const { id } = await params;
    return getSitePlanDetail(ctx, id);
  });
}

export async function PATCH(req: Request, { params }: Params) {
  return handle(async () => {
    const ctx = await requireWriter();
    const { id } = await params;
    const input = patchSchema.parse(await req.json());
    await requireSitePlan(ctx, id);
    if (input.latestExportAssetId) {
      await getAsset(ctx, input.latestExportAssetId);
    }
    return db.sitePlan.update({ where: { id }, data: input });
  });
}

export async function DELETE(_req: Request, { params }: Params) {
  return handle(async () => {
    const ctx = await requireWriter();
    const { id } = await params;
    await deleteSitePlan(ctx, id);
    return { deleted: true };
  });
}
