import { generateText, Output } from "ai";
import { fetchNearbyWikipediaArticles } from "@/lib/wikipedia/geosearch";
import { loreModel } from "./model";
import {
  buildLoreSynthesisPrompt,
  LORE_SYNTHESIS_SYSTEM,
} from "./prompt";
import { attachWikipediaImages } from "./attach-images";
import { loreItemSchema, type LoreItem } from "./schema";

export type LoreLocationInput = {
  latitude: number;
  longitude: number;
  label: string;
};

/**
 * Full lore pipeline for one location search:
 * - Wikipedia HTTP fetches (no Gemini quota)
 * - Exactly one Gemini `generateText` call for synthesis
 */
export async function runLoreForLocation(
  input: LoreLocationInput,
): Promise<LoreItem[]> {
  const articles = await fetchNearbyWikipediaArticles({
    latitude: input.latitude,
    longitude: input.longitude,
  });

  if (articles.length === 0) {
    throw new Error("NO_NEARBY_ARTICLES");
  }

  const { output } = await generateText({
    model: loreModel,
    maxRetries: 0,
    output: Output.array({ element: loreItemSchema }),
    system: LORE_SYNTHESIS_SYSTEM,
    prompt: buildLoreSynthesisPrompt(input.label, articles),
  });

  return attachWikipediaImages(output, articles);
}
