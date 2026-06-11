import { handle } from "@/server/api/respond";
import { requireOrg, requireWriter } from "@/server/auth/context";
import { getTenant, updateTenant } from "@/server/services/tenant.service";
import { tenantUpdateSchema } from "@/features/properties/schemas";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  return handle(async () => {
    const ctx = await requireOrg();
    const { id } = await params;
    return getTenant(ctx, id);
  });
}

export async function PATCH(req: Request, { params }: Params) {
  return handle(async () => {
    const ctx = await requireWriter();
    const { id } = await params;
    const input = tenantUpdateSchema.parse(await req.json());
    return updateTenant(ctx, id, input);
  });
}
