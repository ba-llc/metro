import { handle } from "@/server/api/respond";
import { requireWriter } from "@/server/auth/context";
import { unassignContact } from "@/server/services/contact.service";

type Params = { params: Promise<{ id: string; contactId: string }> };

export async function DELETE(_req: Request, { params }: Params) {
  return handle(async () => {
    const ctx = await requireWriter();
    const { id, contactId } = await params;
    await unassignContact(ctx, id, contactId);
    return { deleted: true };
  });
}
