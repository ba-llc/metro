import { handle } from "@/server/api/respond";
import { requireWriter } from "@/server/auth/context";
import { deleteMapAsset, regenerateMapAsset } from "@/server/services/map.service";
import { mapCreateSchema } from "@/features/maps/schemas";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  return handle(async () => {
    const ctx = await requireWriter();
    const { id } = await params;
    const input = mapCreateSchema.parse(await req.json());
    return regenerateMapAsset(ctx, id, input);
  });
}

export async function DELETE(_req: Request, { params }: Params) {
  return handle(async () => {
    const ctx = await requireWriter();
    const { id } = await params;
    await deleteMapAsset(ctx, id);
    return { deleted: true };
  });
}
