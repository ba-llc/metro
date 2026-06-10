import { z } from "zod";
import { handle } from "@/server/api/respond";
import { requireOrg, requireWriter } from "@/server/auth/context";
import {
  createSnapshot,
  listSnapshots,
} from "@/server/services/sitePlan.service";

type Params = { params: Promise<{ id: string }> };

const snapshotSchema = z.object({ name: z.string().min(1) });

export async function GET(_req: Request, { params }: Params) {
  return handle(async () => {
    const ctx = await requireOrg();
    const { id } = await params;
    return listSnapshots(ctx, id);
  });
}

export async function POST(req: Request, { params }: Params) {
  return handle(async () => {
    const ctx = await requireWriter();
    const { id } = await params;
    const { name } = snapshotSchema.parse(await req.json());
    return createSnapshot(ctx, id, name);
  });
}
