import { handle } from "@/server/api/respond";
import { requireOrg, requireWriter } from "@/server/auth/context";
import { createMapAsset, listMaps } from "@/server/services/map.service";
import { mapCreateSchema } from "@/features/maps/schemas";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  return handle(async () => {
    const ctx = await requireOrg();
    const { id } = await params;
    return listMaps(ctx, id);
  });
}

export async function POST(req: Request, { params }: Params) {
  return handle(async () => {
    const ctx = await requireWriter();
    const { id } = await params;
    const input = mapCreateSchema.parse(await req.json());
    return createMapAsset(ctx, id, input);
  });
}
