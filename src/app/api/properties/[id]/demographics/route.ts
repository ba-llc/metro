import { z } from "zod";
import { handle } from "@/server/api/respond";
import { requireOrg, requireWriter } from "@/server/auth/context";
import {
  fetchDemographics,
  listDemographics,
} from "@/server/services/demographics.service";

type Params = { params: Promise<{ id: string }> };

const fetchSchema = z.object({
  geographyType: z.enum(["RADIUS", "DRIVE_TIME", "POLYGON"]).default("RADIUS"),
  geographyParams: z.record(z.unknown()).default({}),
  metrics: z
    .object({
      population: z.coerce.number().optional(),
      households: z.coerce.number().optional(),
      avgHouseholdIncome: z.coerce.number().optional(),
      daytimePopulation: z.coerce.number().optional(),
      medianHousingValue: z.coerce.number().optional(),
      medianAge: z.coerce.number().optional(),
    })
    .optional(),
});

export async function GET(_req: Request, { params }: Params) {
  return handle(async () => {
    const ctx = await requireOrg();
    const { id } = await params;
    return listDemographics(ctx, id);
  });
}

export async function POST(req: Request, { params }: Params) {
  return handle(async () => {
    const ctx = await requireWriter();
    const { id } = await params;
    const input = fetchSchema.parse(await req.json());
    return fetchDemographics(ctx, id, input);
  });
}
