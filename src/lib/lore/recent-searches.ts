import { Redis } from "@upstash/redis";

const RECENT_SEARCHES_KEY = "lore:recent-searches";
const MAX_ENTRIES = 3;

export type RecentSearchEntry = {
  label: string;
  latitude: number;
  longitude: number;
  searchedAt: string;
};

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

export function isRecentSearchesConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL?.trim() &&
      process.env.UPSTASH_REDIS_REST_TOKEN?.trim(),
  );
}

function entryKey(entry: Pick<RecentSearchEntry, "label" | "latitude" | "longitude">): string {
  const lat = entry.latitude.toFixed(4);
  const lng = entry.longitude.toFixed(4);
  const label = entry.label.trim().toLowerCase();
  return `${lat}:${lng}:${label}`;
}

function parseEntries(raw: unknown): RecentSearchEntry[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const entries: RecentSearchEntry[] = [];
  for (const item of raw) {
    if (
      typeof item === "object" &&
      item !== null &&
      typeof (item as RecentSearchEntry).label === "string" &&
      typeof (item as RecentSearchEntry).latitude === "number" &&
      typeof (item as RecentSearchEntry).longitude === "number" &&
      typeof (item as RecentSearchEntry).searchedAt === "string"
    ) {
      entries.push(item as RecentSearchEntry);
    }
  }
  return entries;
}

export async function getRecentSearches(): Promise<RecentSearchEntry[]> {
  if (!isRecentSearchesConfigured()) {
    return [];
  }

  const raw = await getRedis().get<unknown>(RECENT_SEARCHES_KEY);
  return parseEntries(raw);
}

export async function recordRecentSearch(
  entry: Omit<RecentSearchEntry, "searchedAt"> & { searchedAt?: string },
): Promise<void> {
  if (!isRecentSearchesConfigured()) {
    return;
  }

  const newEntry: RecentSearchEntry = {
    label: entry.label,
    latitude: entry.latitude,
    longitude: entry.longitude,
    searchedAt: entry.searchedAt ?? new Date().toISOString(),
  };

  const existing = await getRecentSearches();
  const newKey = entryKey(newEntry);
  const deduped = existing.filter((item) => entryKey(item) !== newKey);
  const next = [newEntry, ...deduped].slice(0, MAX_ENTRIES);

  await getRedis().set(RECENT_SEARCHES_KEY, next);
}
