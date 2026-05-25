import { balanceArticlesForLore, isNotableMonumentArticle } from "./monuments";
import {
  DEFAULT_GESEARCH_LIMIT,
  DEFAULT_GESEARCH_RADIUS_METERS,
  LORE_ARTICLE_POOL_SIZE,
  LORE_MIN_NOTABLE_MONUMENTS_IN_POOL,
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
  /** True for geotagged statues, monuments, and memorials. */
  isNotableMonument?: boolean;
};

type WikipediaPage = {
  pageid: number;
  title: string;
  extract?: string;
  coordinates?: Array<{ lat: number; lon: number }>;
  categories?: Array<{ title: string }>;
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
    ggsprimary: "all",
    prop: "extracts|coordinates|categories",
    cllimit: "max",
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

    const categoryTitles =
      page.categories?.map((category) => category.title) ?? [];
    const isNotableMonument = isNotableMonumentArticle({
      title: page.title,
      categories: categoryTitles,
    });

    articles.push({
      pageId: page.pageid,
      title: page.title,
      latitude: coords.lat,
      longitude: coords.lon,
      extract: page.extract.trim(),
      wikipediaUrl: buildWikipediaUrl(page.title),
      ...(page.dist != null ? { distanceMeters: page.dist } : {}),
      ...(isNotableMonument ? { isNotableMonument: true } : {}),
    });
  }

  const sorted = articles.sort(
    (a, b) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0),
  );

  return balanceArticlesForLore(sorted, {
    maxPool: LORE_ARTICLE_POOL_SIZE,
    minNotableMonuments: LORE_MIN_NOTABLE_MONUMENTS_IN_POOL,
  });
}
