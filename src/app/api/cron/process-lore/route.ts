import { runLoreForLocation } from "@/lib/lore/agent";
import { formatLoreApiError } from "@/lib/lore/errors";
import { upsertLoreCards } from "@/lib/lore/supabase-cache";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import {
  getLoreJob,
  updateLoreJobProgress,
  updateLoreJobStatus,
} from "@/lib/jobs/lore-job-store";
import { verifyQStashRequest } from "@/lib/qstash/verify-request";

export const maxDuration = 60;

export async function POST(req: Request) {
  const bodyText = await req.text();

  try {
    const isValid = await verifyQStashRequest(req, bodyText);
    if (!isValid) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
  } catch (error) {
    console.error("QStash verification setup failed:", error);
    const message =
      error instanceof Error ? error.message : "QStash verification failed";
    return Response.json({ error: message }, { status: 500 });
  }

  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return Response.json(
      { error: "GOOGLE_GENERATIVE_AI_API_KEY is not configured" },
      { status: 500 },
    );
  }

  let body: unknown;
  try {
    body = JSON.parse(bodyText);
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const jobId =
    typeof body === "object" &&
    body !== null &&
    "jobId" in body &&
    typeof (body as { jobId: unknown }).jobId === "string"
      ? (body as { jobId: string }).jobId
      : null;

  if (!jobId) {
    return Response.json({ error: "jobId is required" }, { status: 400 });
  }

  const job = await getLoreJob(jobId);
  if (!job) {
    return Response.json({ error: "Job not found" }, { status: 404 });
  }

  if (job.status === "complete") {
    return Response.json({ ok: true, status: "complete" });
  }

  if (job.status === "failed") {
    return Response.json({ ok: true, status: "failed" });
  }

  const processingStartedAt =
    job.processingStartedAt ?? new Date().toISOString();

  if (job.status === "pending") {
    await updateLoreJobStatus(jobId, { status: "processing" });
    await updateLoreJobProgress(jobId, {
      stage: "fetching_nearby",
      processingStartedAt,
    });
  }

  try {
    const items = await runLoreForLocation(
      {
        latitude: job.latitude,
        longitude: job.longitude,
        label: job.label,
      },
      async (progress) => {
        await updateLoreJobProgress(jobId, {
          ...progress,
          processingStartedAt,
        });
      },
    );

    await updateLoreJobStatus(jobId, { status: "complete", items });

    if (isSupabaseConfigured()) {
      try {
        await upsertLoreCards(items, {
          label: job.label,
          latitude: job.latitude,
          longitude: job.longitude,
        });
      } catch (cacheError) {
        console.error("Failed to persist lore cards to Supabase:", cacheError);
      }
    }

    return Response.json({ ok: true, status: "complete" });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "NO_NEARBY_ARTICLES"
    ) {
      await updateLoreJobStatus(jobId, {
        status: "failed",
        error: "No nearby Wikipedia articles found",
      });
      return Response.json({ error: "No nearby Wikipedia articles found" }, {
        status: 404,
      });
    }

    console.error("Lore pipeline failed:", error);
    const { message, status } = formatLoreApiError(error);
    await updateLoreJobStatus(jobId, { status: "failed", error: message });
    return Response.json({ error: message }, { status });
  }
}
