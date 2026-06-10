import { handle } from "@/server/api/respond";
import { requireWriter } from "@/server/auth/context";
import { restoreSnapshot } from "@/server/services/sitePlan.service";

type Params = { params: Promise<{ id: string; snapshotId: string }> };

export async function POST(_req: Request, { params }: Params) {
  return handle(async () => {
    const ctx = await requireWriter();
    const { id, snapshotId } = await params;
    return restoreSnapshot(ctx, id, snapshotId);
  });
}
