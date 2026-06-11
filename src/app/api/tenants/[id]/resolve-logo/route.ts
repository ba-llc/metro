import { handle } from "@/server/api/respond";
import { requireWriter } from "@/server/auth/context";
import { resolveLogoFor } from "@/server/services/tenant.service";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  return handle(async () => {
    const ctx = await requireWriter();
    const { id } = await params;
    return resolveLogoFor(ctx, id);
  });
}
