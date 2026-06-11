import { handle } from "@/server/api/respond";
import { requireWriter } from "@/server/auth/context";
import { importDiscoveredTenants } from "@/server/services/tenant.service";
import { tenantImportSchema } from "@/features/properties/schemas";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  return handle(async () => {
    const ctx = await requireWriter();
    const { id } = await params;
    const input = tenantImportSchema.parse(await req.json());
    return importDiscoveredTenants(ctx, id, input);
  });
}
