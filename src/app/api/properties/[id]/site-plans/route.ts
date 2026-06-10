import { ApiError, handle } from "@/server/api/respond";
import { requireOrg, requireWriter } from "@/server/auth/context";
import {
  createSitePlan,
  listSitePlans,
} from "@/server/services/sitePlan.service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  return handle(async () => {
    const ctx = await requireOrg();
    const { id } = await params;
    return listSitePlans(ctx, id);
  });
}

export async function POST(req: Request, { params }: Params) {
  return handle(async () => {
    const ctx = await requireWriter();
    const { id } = await params;
    const form = await req.formData();
    const file = form.get("file");
    const title = form.get("title");

    if (!(file instanceof File) || file.type !== "application/pdf") {
      throw new ApiError("VALIDATION", "A PDF file is required");
    }
    if (typeof title !== "string" || !title.trim()) {
      throw new ApiError("VALIDATION", "A title is required");
    }

    return createSitePlan(ctx, id, {
      title: title.trim(),
      pdf: Buffer.from(await file.arrayBuffer()),
      filename: file.name,
    });
  });
}
