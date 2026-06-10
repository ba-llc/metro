import { handle } from "@/server/api/respond";
import { requireOrg, requireWriter } from "@/server/auth/context";
import {
  deleteProperty,
  getPropertyDetail,
  updateProperty,
} from "@/server/services/property.service";
import { propertyUpdateSchema } from "@/features/properties/schemas";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  return handle(async () => {
    const ctx = await requireOrg();
    const { id } = await params;
    return getPropertyDetail(ctx, id);
  });
}

export async function PATCH(req: Request, { params }: Params) {
  return handle(async () => {
    const ctx = await requireWriter();
    const { id } = await params;
    const input = propertyUpdateSchema.parse(await req.json());
    return updateProperty(ctx, id, input);
  });
}

export async function DELETE(_req: Request, { params }: Params) {
  return handle(async () => {
    const ctx = await requireWriter();
    const { id } = await params;
    await deleteProperty(ctx, id);
    return { deleted: true };
  });
}
