import { handle } from "@/server/api/respond";
import { requireOrg, requireWriter } from "@/server/auth/context";
import { createSpace, listSpaces } from "@/server/services/space.service";
import { spaceCreateSchema } from "@/features/properties/schemas";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  return handle(async () => {
    const ctx = await requireOrg();
    const { id } = await params;
    return listSpaces(ctx, id);
  });
}

export async function POST(req: Request, { params }: Params) {
  return handle(async () => {
    const ctx = await requireWriter();
    const { id } = await params;
    const input = spaceCreateSchema.parse(await req.json());
    return createSpace(ctx, id, input);
  });
}
