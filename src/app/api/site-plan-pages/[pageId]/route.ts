import { handle } from "@/server/api/respond";
import { requireWriter } from "@/server/auth/context";
import { deleteSitePlanPage } from "@/server/services/sitePlan.service";

type Params = { params: Promise<{ pageId: string }> };

export async function DELETE(_req: Request, { params }: Params) {
  return handle(async () => {
    const ctx = await requireWriter();
    const { pageId } = await params;
    return deleteSitePlanPage(ctx, pageId);
  });
}
