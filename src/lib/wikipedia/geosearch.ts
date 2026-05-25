import {
  DEFAULT_GESEARCH_RADIUS_METERS,
  DEFAULT_NEARBY_SEARCH_MAX_RESULTS,
  WIKIPEDIA_PAGE_BATCH_SIZE,
} from "./constants";
import { wikipediaFetch } from "./client";
import { fetchNearbyWikipediaSearchHits } from "./search-nearby";

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
  title: string;
  extract?: string;
  coordinates?: Array<{ lat: number; lon: number }>;
  thumbnail?: { source: string; width: number; height: number };
};

type PagesQueryResponse = {
  query?: {
    pages?: Record<string, WikipediaPage>;
  };
  error?: { code: string; info: string };
};

export function buildWikipediaUrl(title: string): string {
  const slug = title.replace(/ /g, "_");
  return `https://en.wikipedia.org/wiki/${encodeURIComponent(slug)}`;
}

function metersToKm(radiusMeters: number): number {
  return radiusMeters / 1000;
}

async function fetchWikipediaPagesByIds(
  pageIds: number[],
): Promise<WikipediaPage[]> {
  const pages: WikipediaPage[] = [];

  for (let i = 0; i < pageIds.length; i += WIKIPEDIA_PAGE_BATCH_SIZE) {
    const batch = pageIds.slice(i, i + WIKIPEDIA_PAGE_BATCH_SIZE);
    const data = (await wikipediaFetch({
      action: "query",
      pageids: batch.join("|"),
      prop: "extracts|coordinates|pageimages",
      piprop: "thumbnail",
      pithumbsize: String(WIKIPEDIA_THUMBNAIL_WIDTH),
      exintro: "1",
      explaintext: "1",
      exchars: "600",
    })) as PagesQueryResponse;

    if (data.error) {
      throw new Error(
        `Wikipedia API error (${data.error.code}): ${data.error.info}`,
      );
    }

    const batchPages = data.query?.pages;
    if (batchPages) {
      pages.push(...Object.values(batchPages));
    }
  }

  return pages;
}

/**
 * Nearby Wikipedia articles for lore synthesis: paginated `nearcoord` discovery,
 * enrich all hits that have intro extract + coordinates, sort by `wordcount`
 * (no distance or monument heuristics). The full eligible set is passed to Gemini.
 */
export async function fetchNearbyWikipediaArticles(options: {
  latitude: number;
  longitude: number;
  radiusMeters?: number;
  /** Cap on paginated `nearcoord` search hits before enrichment. */
  maxSearchResults?: number;
}): Promise<WikipediaArticle[]> {
  const {
    latitude,
    longitude,
    radiusMeters = DEFAULT_GESEARCH_RADIUS_METERS,
    maxSearchResults = DEFAULT_NEARBY_SEARCH_MAX_RESULTS,
  } = options;

  const searchHits = await fetchNearbyWikipediaSearchHits({
    latitude,
    longitude,
    radiusKm: metersToKm(radiusMeters),
    maxResults: maxSearchResults,
  });

  if (searchHits.length === 0) {
    return [];
  }

  const wordcountByPageId = new Map(
    searchHits.map((hit) => [hit.pageid, hit.wordcount]),
  );

  const wikiPages = await fetchWikipediaPagesByIds(
    searchHits.map((hit) => hit.pageid),
  );

  const articles: WikipediaArticle[] = [];

  for (const page of wikiPages) {
    const coords = page.coordinates?.[0];
    if (!page.extract?.trim() || !coords) {
      continue;
    }

    articles.push({
      pageId: page.pageid,
      title: page.title,
      latitude: coords.lat,
      longitude: coords.lon,
      extract: page.extract.trim(),
      wikipediaUrl: buildWikipediaUrl(page.title),
      wordcount: wordcountByPageId.get(page.pageid) ?? 0,
      ...(page.thumbnail?.source
        ? { thumbnailUrl: page.thumbnail.source }
        : {}),
    });
  }

  return articles.sort((a, b) => b.wordcount - a.wordcount);
}
