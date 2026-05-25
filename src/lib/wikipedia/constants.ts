export const WIKIPEDIA_API_BASE = "https://en.wikipedia.org/w/api.php";

export const WIKIPEDIA_USER_AGENT =
  "LocalLore/0.1 (https://github.com/local-lore/local-lore; local-lore@example.com)";

/** Wikipedia geosearch / nearcoord max radius is 10_000 m (10 km). */
export const DEFAULT_GESEARCH_RADIUS_METERS = 10_000;

/** `list=search` page size (MediaWiki max). */
export const WIKIPEDIA_SEARCH_PAGE_SIZE = 500;

/** Safety cap for paginated `nearcoord` discovery before enriching pages. */
export const DEFAULT_NEARBY_SEARCH_MAX_RESULTS = 500;

/** Max page IDs per `prop` enrichment request. */
export const WIKIPEDIA_PAGE_BATCH_SIZE = 50;
