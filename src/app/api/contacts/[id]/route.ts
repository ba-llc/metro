import { handle } from "@/server/api/respond";
import { requireWriter } from "@/server/auth/context";
import { deleteContact, updateContact } from "@/server/services/contact.service";
import { contactUpdateSchema } from "@/features/properties/schemas";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  return handle(async () => {
    const ctx = await requireWriter();
    const { id } = await params;
    const input = contactUpdateSchema.parse(await req.json());
    return updateContact(ctx, id, input);
  });
}

export async function DELETE(_req: Request, { params }: Params) {
  return handle(async () => {
    const ctx = await requireWriter();
    const { id } = await params;
    await deleteContact(ctx, id);
    return { deleted: true };
  });
}
