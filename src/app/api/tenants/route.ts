import { handle } from "@/server/api/respond";
import { requireOrg, requireWriter } from "@/server/auth/context";
import { createTenant, listTenants } from "@/server/services/tenant.service";
import { tenantCreateSchema } from "@/features/properties/schemas";

export async function GET() {
  return handle(async () => {
    const ctx = await requireOrg();
    return listTenants(ctx);
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const ctx = await requireWriter();
    const input = tenantCreateSchema.parse(await req.json());
    return createTenant(ctx, input);
  });
}
