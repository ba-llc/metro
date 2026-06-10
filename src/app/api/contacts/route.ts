import { handle } from "@/server/api/respond";
import { requireOrg, requireWriter } from "@/server/auth/context";
import { createContact, listContacts } from "@/server/services/contact.service";
import { contactCreateSchema } from "@/features/properties/schemas";

export async function GET() {
  return handle(async () => {
    const ctx = await requireOrg();
    return listContacts(ctx);
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const ctx = await requireWriter();
    const input = contactCreateSchema.parse(await req.json());
    return createContact(ctx, input);
  });
}
