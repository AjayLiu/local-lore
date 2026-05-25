import type { LoreItem } from "./schema";
import type { WikipediaArticle } from "@/lib/wikipedia/geosearch";

/** Map Wikipedia thumbnails onto synthesized lore items by pageId. */
export function attachWikipediaImages(
  items: LoreItem[],
  articles: WikipediaArticle[],
): LoreItem[] {
  const thumbnailByPageId = new Map<number, string>();
  for (const article of articles) {
    if (article.thumbnailUrl) {
      thumbnailByPageId.set(article.pageId, article.thumbnailUrl);
    }
  }

  return items.map((item) => {
    const imageUrl = thumbnailByPageId.get(item.pageId);
    return imageUrl ? { ...item, imageUrl } : item;
  });
}
