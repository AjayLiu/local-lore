import { google } from "@ai-sdk/google";
import { generateText, Output } from "ai";
import {
  expectedHeadlineCount,
  type LoreJobStage,
} from "@/lib/jobs/lore-stages";
import {
  fetchNearbyWikipediaArticles,
  type FetchNearbyArticlesProgress,
} from "@/lib/wikipedia/geosearch";
import { isGeminiTransientError } from "./errors";
import { pickLoreModelChain } from "./model";
import {
  buildLoreSynthesisPrompt,
  LORE_SYNTHESIS_SYSTEM,
} from "./prompt";
import { attachWikipediaImages } from "./attach-images";
import { loreItemSchema, type LoreItem } from "./schema";

const LORE_GENERATE_MAX_RETRIES = 3;

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

  const synthesisPrompt = buildLoreSynthesisPrompt(input.label, articles);
  const output = await generateLoreHeadlines(synthesisPrompt);

  return attachWikipediaImages(output, articles);
}

async function generateLoreHeadlines(prompt: string): Promise<LoreItem[]> {
  const modelChain = await pickLoreModelChain();
  let lastError: unknown;

  for (let i = 0; i < modelChain.length; i++) {
    const modelId = modelChain[i];
    const isLastModel = i === modelChain.length - 1;

    if (i === 0) {
      console.info(`[LocalLore] Lore synthesis using ${modelId}`);
    }

    try {
      const { output } = await generateText({
        model: google(modelId),
        maxRetries: LORE_GENERATE_MAX_RETRIES,
        output: Output.array({ element: loreItemSchema }),
        system: LORE_SYNTHESIS_SYSTEM,
        prompt,
      });
      return output;
    } catch (error) {
      lastError = error;
      if (!isGeminiTransientError(error) || isLastModel) {
        throw error;
      }
      console.warn(
        `[LocalLore] Model ${modelId} unavailable (${getTransientLogDetail(error)}), trying fallback…`,
      );
    }
  }

  throw lastError;
}

function getTransientLogDetail(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
