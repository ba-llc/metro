import { handle } from "@/server/api/respond";
import { requireOrg } from "@/server/auth/context";
import { searchPropertyPlaces } from "@/server/services/property.service";
import { propertyPlaceSearchSchema } from "@/features/properties/schemas";

export async function POST(req: Request) {
  return handle(async () => {
    await requireOrg();
    const input = propertyPlaceSearchSchema.parse(await req.json());
    return searchPropertyPlaces(input);
  });
}
