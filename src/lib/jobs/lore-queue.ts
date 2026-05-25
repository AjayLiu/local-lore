import { Redis } from "@upstash/redis";

const PENDING_QUEUE_KEY = "lore:pending-queue";

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

export async function addJobToPendingQueue(
  jobId: string,
  createdAt: string,
): Promise<void> {
  const score = Date.parse(createdAt);
  await getRedis().zadd(PENDING_QUEUE_KEY, {
    score: Number.isFinite(score) ? score : Date.now(),
    member: jobId,
  });
}

export async function removeJobFromPendingQueue(jobId: string): Promise<void> {
  await getRedis().zrem(PENDING_QUEUE_KEY, jobId);
}

/** 1-based position among pending lore jobs, or null if not queued. */
export async function getJobQueuePosition(jobId: string): Promise<number | null> {
  const rank = await getRedis().zrank(PENDING_QUEUE_KEY, jobId);
  if (rank == null) {
    return null;
  }
  return rank + 1;
}
