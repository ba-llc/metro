import { handle } from "@/server/api/respond";
import { requireWriter } from "@/server/auth/context";
import { geocodeProperty } from "@/server/services/map.service";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  return handle(async () => {
    const ctx = await requireWriter();
    const { id } = await params;
    return geocodeProperty(ctx, id);
  });
}
