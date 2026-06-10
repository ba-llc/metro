import { handle } from "@/server/api/respond";
import { requireOrg, requireWriter } from "@/server/auth/context";
import {
  createDocument,
  listDocuments,
} from "@/server/services/document.service";
import { documentCreateSchema } from "@/features/marketing/schemas";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  return handle(async () => {
    const ctx = await requireOrg();
    const { id } = await params;
    return listDocuments(ctx, id);
  });
}

export async function POST(req: Request, { params }: Params) {
  return handle(async () => {
    const ctx = await requireWriter();
    const { id } = await params;
    const input = documentCreateSchema.parse(await req.json());
    return createDocument(ctx, id, input);
  });
}
