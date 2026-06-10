import { handle } from "@/server/api/respond";
import { requireOrg, requireWriter } from "@/server/auth/context";
import {
  deleteDocument,
  getDocument,
} from "@/server/services/document.service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  return handle(async () => {
    const ctx = await requireOrg();
    const { id } = await params;
    return getDocument(ctx, id);
  });
}

export async function DELETE(_req: Request, { params }: Params) {
  return handle(async () => {
    const ctx = await requireWriter();
    const { id } = await params;
    await deleteDocument(ctx, id);
    return { deleted: true };
  });
}
