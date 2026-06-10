import { db } from "@/server/db";
import type { OrgContext } from "@/server/auth/context";

export type JobType = "map.generate" | "document.render";

type JobPayloads = {
  "map.generate": { mapAssetId: string };
  "document.render": { documentId: string };
};

/**
 * MVP job runner: persists the job, then executes it asynchronously in-process
 * (fire-and-forget). The Job table + enqueueJob() signature are the contract —
 * promoting to a real queue (SQS / Inngest / pg-boss) only changes this file.
 */
export async function enqueueJob<T extends JobType>(
  ctx: OrgContext,
  type: T,
  payload: JobPayloads[T],
): Promise<string> {
  const job = await db.job.create({
    data: {
      organizationId: ctx.organizationId,
      type,
      payload,
      status: "PENDING",
    },
  });

  const execute = () => runJob(ctx, job.id, type, payload);

  // On Vercel, keep the serverless function alive until the job finishes.
  if (process.env.VERCEL === "1") {
    void import("next/server").then(({ after }) => {
      after(() => execute());
    });
  } else {
    setImmediate(() => void execute());
  }

  return job.id;
}

async function runJob<T extends JobType>(
  ctx: OrgContext,
  jobId: string,
  type: T,
  payload: JobPayloads[T],
): Promise<void> {
  await db.job.update({
    where: { id: jobId },
    data: { status: "RUNNING", attempts: { increment: 1 } },
  });

  try {
    switch (type) {
      case "map.generate": {
        const { generateMapImage } = await import(
          "@/server/services/map.service"
        );
        await generateMapImage(ctx, (payload as JobPayloads["map.generate"]).mapAssetId);
        break;
      }
      case "document.render": {
        const { renderDocument } = await import(
          "@/server/services/document.service"
        );
        await renderDocument(ctx, (payload as JobPayloads["document.render"]).documentId);
        break;
      }
    }
    await db.job.update({
      where: { id: jobId },
      data: { status: "COMPLETED" },
    });
  } catch (e) {
    console.error(`[jobs] ${type} failed`, e);
    await db.job.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        error: e instanceof Error ? e.message : String(e),
      },
    });
  }
}

export async function getJob(ctx: OrgContext, jobId: string) {
  return db.job.findFirst({
    where: { id: jobId, organizationId: ctx.organizationId },
  });
}
