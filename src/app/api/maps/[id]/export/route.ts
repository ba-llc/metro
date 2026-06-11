import { z } from "zod";
import { handle } from "@/server/api/respond";
import { requireWriter } from "@/server/auth/context";
import { registerMapExport } from "@/server/services/map.service";

type Params = { params: Promise<{ id: string }> };

const exportSchema = z.object({
  assetId: z.string().min(1),
});

export async function POST(req: Request, { params }: Params) {
  return handle(async () => {
    const ctx = await requireWriter();
    const { id } = await params;
    const input = exportSchema.parse(await req.json());
    return registerMapExport(ctx, id, input.assetId);
  });
}
