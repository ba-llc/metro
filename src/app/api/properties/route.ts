import { handle } from "@/server/api/respond";
import { requireOrg, requireWriter } from "@/server/auth/context";
import {
  createProperty,
  listProperties,
} from "@/server/services/property.service";
import {
  propertyCreateSchema,
  propertyListFilterSchema,
} from "@/features/properties/schemas";

export async function GET(req: Request) {
  return handle(async () => {
    const ctx = await requireOrg();
    const url = new URL(req.url);
    const filter = propertyListFilterSchema.parse({
      q: url.searchParams.get("q") ?? undefined,
      propertyType: url.searchParams.get("propertyType") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
    });
    return listProperties(ctx, filter);
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const ctx = await requireWriter();
    const input = propertyCreateSchema.parse(await req.json());
    return createProperty(ctx, input);
  });
}
