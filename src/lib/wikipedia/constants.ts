export const WIKIPEDIA_API_BASE = "https://en.wikipedia.org/w/api.php";

export const WIKIPEDIA_USER_AGENT =
  "LocalLore/0.1 (https://github.com/local-lore/local-lore; local-lore@example.com)";

/** Wikipedia geosearch max radius is 10_000 m. */
export const DEFAULT_GESEARCH_RADIUS_METERS = 10_000;
export const DEFAULT_GESEARCH_LIMIT = 50;
/** Articles passed to lore synthesis after balancing monuments vs. other places. */
export const LORE_ARTICLE_POOL_SIZE = 40;
export const LORE_MIN_NOTABLE_MONUMENTS_IN_POOL = 8;
