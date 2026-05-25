import { generateText, Output } from "ai";
import {
  expectedHeadlineCount,
  type LoreJobStage,
} from "@/lib/jobs/lore-stages";
import {
  fetchNearbyWikipediaArticles,
  type FetchNearbyArticlesProgress,
} from "@/lib/wikipedia/geosearch";
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

export type LorePipelineProgress = {
  stage: LoreJobStage;
  count?: number;
};

export type LoreProgressReporter = (
  progress: LorePipelineProgress,
) => void | Promise<void>;

/**
 * Full lore pipeline for one location search:
 * - Wikipedia HTTP fetches (no Gemini quota)
 * - Exactly one Gemini `generateText` call for synthesis
 */
export async function runLoreForLocation(
  input: LoreLocationInput,
  onProgress?: LoreProgressReporter,
): Promise<LoreItem[]> {
  const report = async (progress: LorePipelineProgress) => {
    await onProgress?.(progress);
  };

  const articles = await fetchNearbyWikipediaArticles(
    {
      latitude: input.latitude,
      longitude: input.longitude,
    },
    (fetchProgress: FetchNearbyArticlesProgress) =>
      report(fetchProgress),
  );

  if (articles.length === 0) {
    throw new Error("NO_NEARBY_ARTICLES");
  }

  await report({ stage: "curating", count: articles.length });

  const headlineCount = expectedHeadlineCount(articles.length);
  await report({ stage: "generating_headlines", count: headlineCount });

  const { output } = await generateText({
    model: loreModel,
    maxRetries: 0,
    output: Output.array({ element: loreItemSchema }),
    system: LORE_SYNTHESIS_SYSTEM,
    prompt: buildLoreSynthesisPrompt(input.label, articles),
  });

  return attachWikipediaImages(output, articles);
}
