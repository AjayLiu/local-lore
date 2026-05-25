import {
  DEFAULT_NEARBY_SEARCH_MAX_RESULTS,
  WIKIPEDIA_SEARCH_PAGE_SIZE,
} from "./constants";
import { wikipediaFetch } from "./client";

/** Raw hit from `list=search` with `nearcoord` (Elasticsearch). */
export type WikipediaSearchHit = {
  ns: number;
  title: string;
  pageid: number;
  size: number;
  wordcount: number;
  snippet: string;
  timestamp: string;
};

type WikipediaSearchResponse = {
  batchcomplete?: string;
  continue?: { sroffset: number; continue?: string };
  query?: {
    searchinfo?: { totalhits: number };
    search?: WikipediaSearchHit[];
  };
  error?: { code: string; info: string };
};

export type FetchNearbySearchHitsOptions = {
  latitude: number;
  longitude: number;
  /** Search radius in kilometers (Wikipedia `nearcoord` uses km). */
  radiusKm: number;
  /** Max hits to accumulate across all pages (safety cap). */
  maxResults?: number;
  /** Per-request `srlimit` (Wikipedia max is 500). */
  pageSize?: number;
};

export function buildNearcoordSrsearch(
  latitude: number,
  longitude: number,
  radiusKm: number,
): string {
  const lat = latitude.toFixed(6);
  const lon = longitude.toFixed(6);
  const radius = radiusKm % 1 === 0 ? String(radiusKm) : radiusKm.toFixed(3);
  return `nearcoord:${radius}km,${lat},${lon}`;
}

function assertNoApiError(data: WikipediaSearchResponse): void {
  if (data.error) {
    throw new Error(
      `Wikipedia API error (${data.error.code}): ${data.error.info}`,
    );
  }
}

async function fetchSearchPage(options: {
  latitude: number;
  longitude: number;
  radiusKm: number;
  sroffset: number;
  pageSize: number;
}): Promise<WikipediaSearchResponse> {
  const data = (await wikipediaFetch({
    action: "query",
    list: "search",
    srsearch: buildNearcoordSrsearch(
      options.latitude,
      options.longitude,
      options.radiusKm,
    ),
    srlimit: String(options.pageSize),
    sroffset: String(options.sroffset),
  })) as WikipediaSearchResponse;

  assertNoApiError(data);
  return data;
}

/**
 * Paginated nearby article discovery via Elasticsearch `nearcoord`.
 * Uses `continue.sroffset` until exhausted or `maxResults` is reached.
 */
export async function fetchNearbyWikipediaSearchHits(
  options: FetchNearbySearchHitsOptions,
): Promise<WikipediaSearchHit[]> {
  const {
    latitude,
    longitude,
    radiusKm,
    maxResults = DEFAULT_NEARBY_SEARCH_MAX_RESULTS,
    pageSize = WIKIPEDIA_SEARCH_PAGE_SIZE,
  } = options;

  if (maxResults <= 0) {
    return [];
  }

  const hits: WikipediaSearchHit[] = [];
  let sroffset = 0;

  while (hits.length < maxResults) {
    const remaining = maxResults - hits.length;
    const limit = Math.min(pageSize, remaining);

    const response = await fetchSearchPage({
      latitude,
      longitude,
      radiusKm,
      sroffset,
      pageSize: limit,
    });

    const page = response.query?.search ?? [];
    if (page.length === 0) {
      break;
    }

    hits.push(...page);

    const nextOffset = response.continue?.sroffset;
    if (nextOffset == null) {
      break;
    }

    sroffset = nextOffset;
  }

  return hits.slice(0, maxResults);
}
