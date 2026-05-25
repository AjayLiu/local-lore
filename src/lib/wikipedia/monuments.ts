/** Wikipedia signals for geotagged monuments, statues, and memorials. */
const MONUMENT_CATEGORY_PATTERNS = [
  /^Category:.*\bstatues of\b/i,
  /^Category:.*\bmemorials to\b/i,
  /^Category:Cultural depictions of /,
  /^Category:Monuments and memorials/,
];

const MONUMENT_TITLE_PATTERNS = [
  /^Statue of /i,
  /^Equestrian statue of /i,
  / memorial$/i,
  /^Monument to /i,
];

export function isNotableMonumentCategory(categoryTitle: string): boolean {
  return MONUMENT_CATEGORY_PATTERNS.some((pattern) =>
    pattern.test(categoryTitle),
  );
}

export function isNotableMonumentTitle(title: string): boolean {
  return MONUMENT_TITLE_PATTERNS.some((pattern) => pattern.test(title));
}

export function isNotableMonumentArticle(options: {
  title: string;
  categories?: string[];
}): boolean {
  if (isNotableMonumentTitle(options.title)) {
    return true;
  }
  if (!options.categories?.length) {
    return false;
  }
  return options.categories.some(isNotableMonumentCategory);
}

type ArticleWithDistance = {
  isNotableMonument?: boolean;
  distanceMeters?: number;
};

/** Reserve slots for monuments/statues/memorials in the synthesis pool. */
export function balanceArticlesForLore<T extends ArticleWithDistance>(
  articles: T[],
  options: { maxPool: number; minNotableMonuments: number },
): T[] {
  const { maxPool, minNotableMonuments } = options;
  if (articles.length <= maxPool) {
    return articles;
  }

  const monuments = articles.filter((a) => a.isNotableMonument);
  const other = articles.filter((a) => !a.isNotableMonument);

  const monumentCount = Math.min(
    minNotableMonuments,
    monuments.length,
    maxPool,
  );
  const otherCount = maxPool - monumentCount;

  const pool = [
    ...monuments.slice(0, monumentCount),
    ...other.slice(0, otherCount),
  ];

  return pool.sort(
    (a, b) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0),
  );
}
