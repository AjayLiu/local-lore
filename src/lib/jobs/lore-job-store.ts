import { Redis } from "@upstash/redis";
import type { LoreItem } from "@/lib/lore/schema";
import {
  loreJobRecordSchema,
  type LoreJobRecord,
  type LoreJobStatus,
} from "./types";

const JOB_KEY_PREFIX = "lore:job:";
const JOB_TTL_SECONDS = 60 * 60;

let redis: Redis | null = null;

function getRedis(): Redis {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

  if (!url || !token) {
    throw new Error(
      "UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be configured",
    );
  }

  if (!redis) {
    redis = new Redis({ url, token });
  }

  return redis;
}

function jobKey(jobId: string): string {
  return `${JOB_KEY_PREFIX}${jobId}`;
}

export function isLoreJobStoreConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL?.trim() &&
      process.env.UPSTASH_REDIS_REST_TOKEN?.trim(),
  );
}

export async function createPendingLoreJob(input: {
  jobId: string;
  latitude: number;
  longitude: number;
  label: string;
}): Promise<LoreJobRecord> {
  const record: LoreJobRecord = {
    jobId: input.jobId,
    status: "pending",
    latitude: input.latitude,
    longitude: input.longitude,
    label: input.label,
    createdAt: new Date().toISOString(),
  };

  await getRedis().set(jobKey(input.jobId), record, { ex: JOB_TTL_SECONDS });
  return record;
}

export async function getLoreJob(jobId: string): Promise<LoreJobRecord | null> {
  const raw = await getRedis().get(jobKey(jobId));
  if (raw == null) {
    return null;
  }

  const parsed = loreJobRecordSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export async function updateLoreJobStatus(
  jobId: string,
  update: {
    status: LoreJobStatus;
    items?: LoreItem[];
    error?: string;
  },
): Promise<LoreJobRecord | null> {
  const existing = await getLoreJob(jobId);
  if (!existing) {
    return null;
  }

  const record: LoreJobRecord = {
    ...existing,
    status: update.status,
    items: update.items,
    error: update.error,
  };

  await getRedis().set(jobKey(jobId), record, { ex: JOB_TTL_SECONDS });
  return record;
}
