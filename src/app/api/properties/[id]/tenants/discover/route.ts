import { handle } from "@/server/api/respond";
import { requireOrg } from "@/server/auth/context";
import { discoverNearbyTenants } from "@/server/services/tenant.service";
import { tenantDiscoverSchema } from "@/features/properties/schemas";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  return handle(async () => {
    const ctx = await requireOrg();
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const input = tenantDiscoverSchema.parse(body);
    return discoverNearbyTenants(ctx, id, input);
  });
}
