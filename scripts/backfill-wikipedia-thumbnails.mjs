#!/usr/bin/env node

import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";

const projectDir = process.cwd();
const { loadEnvConfig } = nextEnv;
loadEnvConfig(projectDir);

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Missing required env vars: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
  );
  process.exit(1);
}

const WIKIPEDIA_API_BASE = "https://en.wikipedia.org/w/api.php";
const WIKIPEDIA_USER_AGENT =
  process.env.WIKIPEDIA_USER_AGENT?.trim() ??
  "local-lore/thumbnail-backfill (https://example.com; contact: admin@example.com)";

const THUMBNAIL_WIDTH = Number(process.env.WIKI_THUMB_WIDTH ?? "400");
const PAGE_BATCH_SIZE = Number(process.env.WIKI_BACKFILL_BATCH_SIZE ?? "50");
const DB_FETCH_SIZE = Number(process.env.WIKI_BACKFILL_DB_FETCH_SIZE ?? "400");
const MAX_RETRIES = Number(process.env.WIKI_BACKFILL_MAX_RETRIES ?? "5");
const BASE_DELAY_MS = Number(process.env.WIKI_BACKFILL_BASE_DELAY_MS ?? "500");
const INTER_BATCH_DELAY_MS = Number(
  process.env.WIKI_BACKFILL_INTER_BATCH_DELAY_MS ?? "120",
);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function retryDelayMs(attempt) {
  const jitter = Math.floor(Math.random() * 200);
  return BASE_DELAY_MS * 2 ** attempt + jitter;
}

async function wikipediaFetch(params) {
  const searchParams = new URLSearchParams({
    format: "json",
    formatversion: "2",
    origin: "*",
    ...params,
  });
  const url = `${WIKIPEDIA_API_BASE}?${searchParams.toString()}`;

  let lastError = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    let response;
    try {
      response = await fetch(url, {
        headers: {
          "User-Agent": WIKIPEDIA_USER_AGENT,
        },
      });
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < MAX_RETRIES) {
        await sleep(retryDelayMs(attempt));
        continue;
      }
      throw lastError;
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      lastError = new Error(
        `Wikipedia API HTTP ${response.status}${body ? `: ${body.slice(0, 180)}` : ""}`,
      );
      if (response.status === 429 && attempt < MAX_RETRIES) {
        await sleep(retryDelayMs(attempt));
        continue;
      }
      throw lastError;
    }

    const data = await response.json();
    const errorInfo = data?.error;
    const isRetriableWikiError =
      errorInfo &&
      typeof errorInfo === "object" &&
      (errorInfo.code === "ratelimited" || errorInfo.code === "maxlag");

    if (isRetriableWikiError && attempt < MAX_RETRIES) {
      await sleep(retryDelayMs(attempt));
      continue;
    }

    if (errorInfo) {
      throw new Error(
        `Wikipedia API error (${errorInfo.code ?? "unknown"}): ${errorInfo.info ?? "Unknown error"}`,
      );
    }

    return data;
  }

  throw lastError ?? new Error("Wikipedia API request failed unexpectedly");
}

function chunkArray(values, size) {
  const chunks = [];
  for (let i = 0; i < values.length; i += size) {
    chunks.push(values.slice(i, i + size));
  }
  return chunks;
}

async function fetchMissingRows(supabase, afterPageId) {
  const query = supabase
    .from("lore_cards")
    .select("page_id")
    .is("image_url", null)
    .order("page_id", { ascending: true })
    .limit(DB_FETCH_SIZE);
  const { data, error } =
    afterPageId == null ? await query : await query.gt("page_id", afterPageId);

  if (error) {
    throw new Error(`Failed to fetch rows missing image_url: ${error.message}`);
  }

  return (data ?? []).map((row) => Number(row.page_id)).filter(Number.isFinite);
}

async function fetchThumbnailsByPageId(pageIds) {
  const byPageId = new Map();
  const batches = chunkArray(pageIds, PAGE_BATCH_SIZE);

  for (const batch of batches) {
    const data = await wikipediaFetch({
      action: "query",
      prop: "pageimages",
      piprop: "thumbnail",
      pithumbsize: String(THUMBNAIL_WIDTH),
      pilimit: "max",
      redirects: "no",
      uselang: "en",
      pageids: batch.join("|"),
    });

    const pages = Array.isArray(data?.query?.pages) ? data.query.pages : [];
    for (const page of pages) {
      if (page?.missing || page?.invalid) {
        continue;
      }
      const pageId = Number(page?.pageid);
      const source = page?.thumbnail?.source;
      if (Number.isFinite(pageId) && typeof source === "string" && source.length > 0) {
        byPageId.set(pageId, source);
      }
    }

    await sleep(INTER_BATCH_DELAY_MS);
  }

  return byPageId;
}

async function updateImages(supabase, thumbnailByPageId) {
  let updated = 0;
  for (const [pageId, imageUrl] of thumbnailByPageId.entries()) {
    const { error } = await supabase
      .from("lore_cards")
      .update({
        image_url: imageUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("page_id", pageId)
      .is("image_url", null);

    if (error) {
      throw new Error(`Failed updating page_id=${pageId}: ${error.message}`);
    }
    updated += 1;
  }
  return updated;
}

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let totalScanned = 0;
  let totalUpdated = 0;
  let pass = 0;
  let lastSeenPageId = null;

  while (true) {
    pass += 1;
    const pageIds = await fetchMissingRows(supabase, lastSeenPageId);
    if (pageIds.length === 0) {
      break;
    }
    lastSeenPageId = pageIds[pageIds.length - 1];

    totalScanned += pageIds.length;
    const thumbnails = await fetchThumbnailsByPageId(pageIds);
    const updated = await updateImages(supabase, thumbnails);
    totalUpdated += updated;

    console.log(
      `[pass ${pass}] scanned=${pageIds.length} resolved=${thumbnails.size} updated=${updated}`,
    );

    if (pageIds.length < DB_FETCH_SIZE) break;
  }

  const { count: remainingNullCount, error: remainingError } = await supabase
    .from("lore_cards")
    .select("*", { count: "exact", head: true })
    .is("image_url", null);

  if (remainingError) {
    throw new Error(`Failed to count remaining null images: ${remainingError.message}`);
  }

  console.log("Backfill complete");
  console.log(`Total scanned: ${totalScanned}`);
  console.log(`Total updated: ${totalUpdated}`);
  console.log(`Still missing image_url: ${remainingNullCount ?? 0}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
