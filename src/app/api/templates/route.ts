import { handle } from "@/server/api/respond";
import { requireOrg, requireAdmin } from "@/server/auth/context";
import {
  createTemplate,
  listTemplates,
} from "@/server/services/template.service";
import {
  templateChannels,
  templateCreateSchema,
} from "@/features/marketing/schemas";

export async function GET(req: Request) {
  return handle(async () => {
    const ctx = await requireOrg();
    const url = new URL(req.url);
    const channel = url.searchParams.get("channel");
    const valid = templateChannels.find((c) => c === channel);
    return listTemplates(ctx, valid);
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const ctx = await requireAdmin();
    const input = templateCreateSchema.parse(await req.json());
    return createTemplate(ctx, input);
  });
}
