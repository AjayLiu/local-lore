import { randomUUID } from "node:crypto";
import {
  createPendingLoreJob,
  getLoreJob,
  isLoreJobStoreConfigured,
  updateLoreJobStatus,
} from "@/lib/jobs/lore-job-store";
import { enqueueLoreJob, isQStashConfigured } from "@/lib/qstash/client";
import { loreRequestSchema } from "@/lib/lore/schema";

function getQueueConfigError(): string | null {
  if (!isLoreJobStoreConfigured()) {
    return "UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be configured";
  }
  if (!isQStashConfigured()) {
    return "QSTASH_TOKEN must be configured";
  }
  if (
    !process.env.QSTASH_CURRENT_SIGNING_KEY?.trim() ||
    !process.env.QSTASH_NEXT_SIGNING_KEY?.trim()
  ) {
    return "QSTASH_CURRENT_SIGNING_KEY and QSTASH_NEXT_SIGNING_KEY must be configured";
  }
  return null;
}

export async function GET(req: Request) {
  const configError = getQueueConfigError();
  if (configError) {
    return Response.json({ error: configError }, { status: 500 });
  }

  const jobId = new URL(req.url).searchParams.get("jobId")?.trim();
  if (!jobId) {
    return Response.json({ error: "jobId query parameter is required" }, {
      status: 400,
    });
  }

  const job = await getLoreJob(jobId);
  if (!job) {
    return Response.json({ error: "Job not found" }, { status: 404 });
  }

  return Response.json({
    jobId: job.jobId,
    status: job.status,
    items: job.items,
    error: job.error,
  });
}

export async function POST(req: Request) {
  const configError = getQueueConfigError();
  if (configError) {
    return Response.json({ error: configError }, { status: 500 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = loreRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { latitude, longitude, label } = parsed.data;
  const jobId = randomUUID();

  try {
    await createPendingLoreJob({ jobId, latitude, longitude, label });
    await enqueueLoreJob(jobId);
  } catch (error) {
    console.error("Failed to enqueue lore job:", error);
    const message =
      error instanceof Error ? error.message : "Failed to enqueue lore job";
    await updateLoreJobStatus(jobId, { status: "failed", error: message }).catch(
      () => undefined,
    );
    return Response.json({ error: message }, { status: 500 });
  }

  return Response.json({ jobId, status: "pending" as const }, { status: 202 });
}
