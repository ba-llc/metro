import { handle } from "@/server/api/respond";
import { requireWriter } from "@/server/auth/context";
import { savePageAnnotations } from "@/server/services/sitePlan.service";
import { pageAnnotationsSchema } from "@/types/annotations";

type Params = { params: Promise<{ pageId: string }> };

export async function PUT(req: Request, { params }: Params) {
  return handle(async () => {
    const ctx = await requireWriter();
    const { pageId } = await params;
    const input = pageAnnotationsSchema.parse(await req.json());
    return savePageAnnotations(ctx, pageId, input);
  });
}
