import { handle } from "@/server/api/respond";
import { requireOrg, requireWriter } from "@/server/auth/context";
import { createPhoto, listPhotos } from "@/server/services/photo.service";
import { photoCreateSchema } from "@/features/properties/schemas";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  return handle(async () => {
    const ctx = await requireOrg();
    const { id } = await params;
    return listPhotos(ctx, id);
  });
}

export async function POST(req: Request, { params }: Params) {
  return handle(async () => {
    const ctx = await requireWriter();
    const { id } = await params;
    const input = photoCreateSchema.parse(await req.json());
    return createPhoto(ctx, id, input);
  });
}
