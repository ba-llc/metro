import { z } from "zod";
import { handle } from "@/server/api/respond";
import { registerUserWithOrganization } from "@/server/services/organization.service";

const registerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  organizationName: z.string().min(1, "Brokerage name is required"),
});

export async function POST(req: Request) {
  return handle(async () => {
    const input = registerSchema.parse(await req.json());
    return registerUserWithOrganization(input);
  });
}
