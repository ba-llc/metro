import { handle } from "@/server/api/respond";
import { requireWriter } from "@/server/auth/context";
import { analyzeSitePlanPage } from "@/server/services/sitePlan.service";

type Params = { params: Promise<{ pageId: string }> };

export async function POST(_req: Request, { params }: Params) {
  return handle(async () => {
    const ctx = await requireWriter();
    const { pageId } = await params;
    return analyzeSitePlanPage(ctx, pageId);
  });
}
