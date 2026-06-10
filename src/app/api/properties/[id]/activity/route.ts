import { handle } from "@/server/api/respond";
import { requireOrg } from "@/server/auth/context";
import { listActivity } from "@/server/services/activity.service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  return handle(async () => {
    const ctx = await requireOrg();
    const { id } = await params;
    return listActivity(ctx, id);
  });
}
