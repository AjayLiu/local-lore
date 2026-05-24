import {
  DEFAULT_GESEARCH_LIMIT,
  DEFAULT_GESEARCH_RADIUS_METERS,
} from "./constants";
import { wikipediaFetch } from "./client";

export type WikipediaArticle = {
  pageId: number;
  title: string;
  latitude: number;
  longitude: number;
  extract: string;
  wikipediaUrl: string;
  distanceMeters?: number;
};

type WikipediaPage = {
  pageid: number;
  title: string;
  extract?: string;
  coordinates?: Array<{ lat: number; lon: number }>;
  dist?: number;
};

type GeosearchResponse = {
  query?: {
    pages?: Record<string, WikipediaPage>;
  };
};

export function buildWikipediaUrl(title: string): string {
  const slug = title.replace(/ /g, "_");
  return `https://en.wikipedia.org/wiki/${encodeURIComponent(slug)}`;
}

export async function fetchNearbyWikipediaArticles(options: {
  latitude: number;
  longitude: number;
  radiusMeters?: number;
  limit?: number;
}): Promise<WikipediaArticle[]> {
  const {
    latitude,
    longitude,
    radiusMeters = DEFAULT_GESEARCH_RADIUS_METERS,
    limit = DEFAULT_GESEARCH_LIMIT,
  } = options;

  const data = (await wikipediaFetch({
    action: "query",
    generator: "geosearch",
    ggscoord: `${latitude}|${longitude}`,
    ggsradius: String(radiusMeters),
    ggslimit: String(limit),
    prop: "extracts|coordinates",
    exintro: "1",
    explaintext: "1",
    exchars: "600",
  })) as GeosearchResponse;

  const pages = data.query?.pages;
  if (!pages) {
    return [];
  }

  const articles: WikipediaArticle[] = [];

  for (const page of Object.values(pages)) {
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
      ...(page.dist != null ? { distanceMeters: page.dist } : {}),
    });
  }

  return articles.sort(
    (a, b) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0),
  );
}
