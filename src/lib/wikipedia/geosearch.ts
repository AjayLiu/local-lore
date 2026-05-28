import {
  DEFAULT_GESEARCH_RADIUS_METERS,
  DEFAULT_NEARBY_SEARCH_MAX_RESULTS,
  WIKIPEDIA_SEARCH_PAGE_SIZE,
  WIKIPEDIA_PAGE_BATCH_SIZE,
} from "./constants";
import { wikipediaFetch } from "./client";

/** Lead image width requested from Wikipedia (`pithumbsize`). */
export const WIKIPEDIA_THUMBNAIL_WIDTH = 400;

export type WikipediaArticle = {
  pageId: number;
  title: string;
  latitude: number;
  longitude: number;
  extract: string;
  wikipediaUrl: string;
  /** From Elasticsearch search metadata; proxy for article depth / prominence. */
  wordcount: number;
  /** Wikipedia lead image, when the article has one. */
  thumbnailUrl?: string;
};

type WikipediaPage = {
  pageid: number;
  ns?: number;
  title: string;
  index?: number;
  length?: number;
  fullurl?: string;
  extract?: string;
  description?: string;
  terms?: {
    description?: string[];
  };
  coordinates?: Array<{ lat: number; lon: number }>;
  thumbnail?: { source: string; width: number; height: number };
};

type GeosearchQueryResponse = {
  continue?: {
    continue?: string;
    ggscontinue?: string;
    picontinue?: number | string;
    excontinue?: number | string;
  };
  query?: {
    pages?: WikipediaPage[];
  };
  error?: { code: string; info: string };
};

export function buildWikipediaUrl(title: string): string {
  const slug = title.replace(/ /g, "_");
  return `https://en.wikipedia.org/wiki/${encodeURIComponent(slug)}`;
}

function normalizeRadiusMeters(radiusMeters: number): number {
  // MediaWiki geosearch supports up to 10km.
  return Math.max(10, Math.min(radiusMeters, DEFAULT_GESEARCH_RADIUS_METERS));
}

function buildCoordParam(latitude: number, longitude: number): string {
  return `${latitude.toFixed(6)}|${longitude.toFixed(6)}`;
}

function mergeWikipediaPage(
  previous: WikipediaPage | undefined,
  incoming: WikipediaPage,
): WikipediaPage {
  if (!previous) {
    return incoming;
  }

  return {
    ...previous,
    ...incoming,
    coordinates: incoming.coordinates ?? previous.coordinates,
    thumbnail: incoming.thumbnail ?? previous.thumbnail,
    extract: incoming.extract ?? previous.extract,
    fullurl: incoming.fullurl ?? previous.fullurl,
    description: incoming.description ?? previous.description,
    terms: incoming.terms ?? previous.terms,
    length: incoming.length ?? previous.length,
    index: incoming.index ?? previous.index,
  };
}

async function fetchGeosearchPages(options: {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  maxResults: number;
}): Promise<WikipediaPage[]> {
  const pagesById = new Map<number, WikipediaPage>();
  const coord = buildCoordParam(options.latitude, options.longitude);
  const ggsradius = String(normalizeRadiusMeters(options.radiusMeters));
  const ggslimit = String(Math.min(options.maxResults, WIKIPEDIA_SEARCH_PAGE_SIZE));
  let continuation: { continue?: string; ggscontinue?: string } | undefined;
  let safetyCounter = 0;

  while (pagesById.size < options.maxResults) {
    const params: Record<string, string> = {
      action: "query",
      formatversion: "2",
      origin: "*",
      generator: "geosearch",
      ggsradius,
      ggsnamespace: "0|0",
      ggslimit,
      ggscoord: coord,
      redirects: "no",
      uselang: "en",
      prop: "coordinates|pageprops|pageimages|description|info|pageterms|extracts",
      inprop: "url",
      colimit: "max",
      ppprop: "displaytitle",
      piprop: "thumbnail",
      pithumbsize: String(WIKIPEDIA_THUMBNAIL_WIDTH),
      pilimit: "50",
      codistancefrompoint: coord,
      exintro: "1",
      explaintext: "1",
      exchars: "600",
      exlimit: "max",
    };

    if (continuation?.continue) {
      params.continue = continuation.continue;
    }
    if (continuation?.ggscontinue) {
      params.ggscontinue = continuation.ggscontinue;
    }

    const data = (await wikipediaFetch(params)) as GeosearchQueryResponse;
    if (data.error) {
      throw new Error(`Wikipedia API error (${data.error.code}): ${data.error.info}`);
    }

    const responsePages = data.query?.pages ?? [];
    for (const page of responsePages) {
      pagesById.set(page.pageid, mergeWikipediaPage(pagesById.get(page.pageid), page));
    }

    if (!data.continue) {
      break;
    }

    continuation = {
      continue: data.continue.continue,
      ggscontinue: data.continue.ggscontinue,
    };

    safetyCounter += 1;
    if (safetyCounter > 30) {
      break;
    }
  }

  return Array.from(pagesById.values()).slice(0, options.maxResults);
}

async function fetchWikipediaExtractsByIds(
  pageIds: number[],
): Promise<Map<number, string>> {
  const extractsByPageId = new Map<number, string>();

  for (let i = 0; i < pageIds.length; i += WIKIPEDIA_PAGE_BATCH_SIZE) {
    const batch = pageIds.slice(i, i + WIKIPEDIA_PAGE_BATCH_SIZE);
    const data = (await wikipediaFetch({
      action: "query",
      formatversion: "2",
      pageids: batch.join("|"),
      prop: "extracts",
      exintro: "1",
      explaintext: "1",
      exchars: "600",
    })) as GeosearchQueryResponse;

    if (data.error) {
      throw new Error(
        `Wikipedia API error (${data.error.code}): ${data.error.info}`,
      );
    }

    for (const page of data.query?.pages ?? []) {
      const extract = page.extract?.trim();
      if (extract) {
        extractsByPageId.set(page.pageid, extract);
      }
    }
  }

  return extractsByPageId;
}

/**
 * Nearby Wikipedia articles for lore synthesis using MediaWiki geosearch generator.
 * Pulls coordinates + metadata + extracts directly, then backfills missing extracts
 * in batches. The full eligible set is passed to Gemini.
 */
export type FetchNearbyArticlesProgress = {
  stage: "fetching_nearby";
  count?: number;
};

export async function fetchNearbyWikipediaArticles(
  options: {
    latitude: number;
    longitude: number;
    radiusMeters?: number;
    /** Cap on paginated `nearcoord` search hits before enrichment. */
    maxSearchResults?: number;
  },
  onProgress?: (progress: FetchNearbyArticlesProgress) => void | Promise<void>,
): Promise<WikipediaArticle[]> {
  const {
    latitude,
    longitude,
    radiusMeters = DEFAULT_GESEARCH_RADIUS_METERS,
    maxSearchResults = DEFAULT_NEARBY_SEARCH_MAX_RESULTS,
  } = options;

  await onProgress?.({ stage: "fetching_nearby" });

  const wikiPages = await fetchGeosearchPages({
    latitude,
    longitude,
    radiusMeters,
    maxResults: maxSearchResults,
  });

  if (wikiPages.length === 0) {
    return [];
  }

  await onProgress?.({ stage: "fetching_nearby", count: wikiPages.length });

  const pageIdsMissingExtract = wikiPages
    .filter((page) => !page.extract?.trim())
    .map((page) => page.pageid);
  const fallbackExtracts = await fetchWikipediaExtractsByIds(
    pageIdsMissingExtract,
  );

  const articles: WikipediaArticle[] = [];

  for (const page of wikiPages) {
    const coords = page.coordinates?.[0];
    const extract = page.extract?.trim() ?? fallbackExtracts.get(page.pageid);
    if (!extract || !coords) {
      continue;
    }

    articles.push({
      pageId: page.pageid,
      title: page.title,
      latitude: coords.lat,
      longitude: coords.lon,
      extract,
      wikipediaUrl: page.fullurl ?? buildWikipediaUrl(page.title),
      wordcount: page.length ?? 0,
      ...(page.thumbnail?.source
        ? { thumbnailUrl: page.thumbnail.source }
        : {}),
    });
  }

  return articles.sort((a, b) => b.wordcount - a.wordcount);
}
