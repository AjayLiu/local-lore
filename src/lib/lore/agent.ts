import { generateText, Output } from "ai";
import {
  fetchNearbyWikipediaArticles,
  type WikipediaArticle,
} from "@/lib/wikipedia/geosearch";
import { loreModel } from "./model";
import {
  buildLoreSynthesisPrompt,
  LORE_SYNTHESIS_SYSTEM,
} from "./prompt";
import { loreItemSchema, type LoreItem } from "./schema";

/** Wikipedia geosearch only — one Gemini call per search (synthesis). */
export async function fetchLoreArticles(options: {
  latitude: number;
  longitude: number;
}): Promise<WikipediaArticle[]> {
  return fetchNearbyWikipediaArticles(options);
}

export async function generateLoreSynthesis(options: {
  label: string;
  articles: WikipediaArticle[];
}): Promise<LoreItem[]> {
  const { label, articles } = options;

  const { output } = await generateText({
    model: loreModel,
    maxRetries: 0,
    output: Output.array({ element: loreItemSchema }),
    system: LORE_SYNTHESIS_SYSTEM,
    prompt: buildLoreSynthesisPrompt(label, articles),
  });

  return output;
}
