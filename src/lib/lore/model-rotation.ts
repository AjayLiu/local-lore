import { Redis } from "@upstash/redis";

const ROUND_ROBIN_KEY = "lore:model:rr";

let redis: Redis | null = null;
let localCounter = 0;

function isRedisConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL?.trim() &&
      process.env.UPSTASH_REDIS_REST_TOKEN?.trim(),
  );
}

function getRedis(): Redis {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) {
    throw new Error("Redis is not configured");
  }
  if (!redis) {
    redis = new Redis({ url, token });
  }
  return redis;
}

/** Next index in [0, poolSize), shared across workers when Redis is available. */
export async function nextRoundRobinIndex(poolSize: number): Promise<number> {
  if (poolSize <= 1) {
    return 0;
  }

  if (isRedisConfigured()) {
    const n = await getRedis().incr(ROUND_ROBIN_KEY);
    return (n - 1) % poolSize;
  }

  const index = localCounter % poolSize;
  localCounter += 1;
  return index;
}
