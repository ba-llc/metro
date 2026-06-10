import { handle } from "@/server/api/respond";
import { requireOrg, requireWriter } from "@/server/auth/context";
import {
  createOccupancy,
  listOccupancies,
} from "@/server/services/tenant.service";
import { occupancyCreateSchema } from "@/features/properties/schemas";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  return handle(async () => {
    const ctx = await requireOrg();
    const { id } = await params;
    return listOccupancies(ctx, id);
  });
}

export async function POST(req: Request, { params }: Params) {
  return handle(async () => {
    const ctx = await requireWriter();
    const { id } = await params;
    const input = occupancyCreateSchema.parse(await req.json());
    return createOccupancy(ctx, id, input);
  });
}
