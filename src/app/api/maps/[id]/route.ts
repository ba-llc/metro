import { handle } from "@/server/api/respond";
import { requireWriter } from "@/server/auth/context";
import { deleteMapAsset } from "@/server/services/map.service";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, { params }: Params) {
  return handle(async () => {
    const ctx = await requireWriter();
    const { id } = await params;
    await deleteMapAsset(ctx, id);
    return { deleted: true };
  });
}
