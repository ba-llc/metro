import { handle } from "@/server/api/respond";
import { requireWriter } from "@/server/auth/context";
import { setManualLogo } from "@/server/services/tenant.service";
import { tenantManualLogoSchema } from "@/features/properties/schemas";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: Params) {
  return handle(async () => {
    const ctx = await requireWriter();
    const { id } = await params;
    const input = tenantManualLogoSchema.parse(await req.json());
    return setManualLogo(ctx, id, input.assetId);
  });
}
