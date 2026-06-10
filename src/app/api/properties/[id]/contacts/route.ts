import { z } from "zod";
import { handle } from "@/server/api/respond";
import { requireWriter } from "@/server/auth/context";
import { assignContact } from "@/server/services/contact.service";

type Params = { params: Promise<{ id: string }> };

const assignSchema = z.object({ contactId: z.string().min(1) });

export async function POST(req: Request, { params }: Params) {
  return handle(async () => {
    const ctx = await requireWriter();
    const { id } = await params;
    const { contactId } = assignSchema.parse(await req.json());
    return assignContact(ctx, id, contactId);
  });
}
