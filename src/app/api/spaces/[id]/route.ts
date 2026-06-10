import { handle } from "@/server/api/respond";
import { requireWriter } from "@/server/auth/context";
import { deleteSpace, updateSpace } from "@/server/services/space.service";
import { spaceUpdateSchema } from "@/features/properties/schemas";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  return handle(async () => {
    const ctx = await requireWriter();
    const { id } = await params;
    const input = spaceUpdateSchema.parse(await req.json());
    return updateSpace(ctx, id, input);
  });
}

export async function DELETE(_req: Request, { params }: Params) {
  return handle(async () => {
    const ctx = await requireWriter();
    const { id } = await params;
    await deleteSpace(ctx, id);
    return { deleted: true };
  });
}
