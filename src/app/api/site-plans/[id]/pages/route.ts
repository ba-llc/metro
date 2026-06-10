import { z } from "zod";
import { handle } from "@/server/api/respond";
import { requireWriter } from "@/server/auth/context";
import { registerPage } from "@/server/services/sitePlan.service";

type Params = { params: Promise<{ id: string }> };

const pageSchema = z.object({
  pageNumber: z.number().int().min(1),
  assetId: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

export async function POST(req: Request, { params }: Params) {
  return handle(async () => {
    const ctx = await requireWriter();
    const { id } = await params;
    const input = pageSchema.parse(await req.json());
    return registerPage(ctx, id, input);
  });
}
