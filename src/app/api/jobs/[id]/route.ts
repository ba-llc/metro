import { ApiError, handle } from "@/server/api/respond";
import { requireOrg } from "@/server/auth/context";
import { getJob } from "@/server/jobs/runner";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  return handle(async () => {
    const ctx = await requireOrg();
    const { id } = await params;
    const job = await getJob(ctx, id);
    if (!job) throw new ApiError("NOT_FOUND", "Job not found");
    return job;
  });
}
