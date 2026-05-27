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
import { isGeminiModelFallbackError } from "./errors";
import {
  logGeminiFallbackAttempt,
  logGeminiSynthesisFailed,
  logPrimaryGeminiFailure,
  type LoreGeminiLogContext,
} from "./gemini-log";
import { LORE_MODEL_ID, pickLoreModelChain } from "./model";
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

export type LoreRunContext = LoreGeminiLogContext;

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
  runContext?: LoreRunContext,
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
  const logContext: LoreGeminiLogContext = {
    jobId: runContext?.jobId,
    searchLabel: input.label,
  };
  const output = await generateLoreHeadlines(synthesisPrompt, logContext);

  return attachWikipediaImages(output, articles);
}

async function generateLoreHeadlines(
  prompt: string,
  logContext: LoreGeminiLogContext,
): Promise<LoreItem[]> {
  const modelChain = pickLoreModelChain();
  let lastError: unknown;
  let lastModelId: string | undefined;

  for (let i = 0; i < modelChain.length; i++) {
    const modelId = modelChain[i];
    const isLastModel = i === modelChain.length - 1;
    const nextModelId = isLastModel ? null : modelChain[i + 1];
    lastModelId = modelId;

    if (i > 0) {
      await logGeminiFallbackAttempt(logContext, {
        previousModelId: modelChain[i - 1],
        fallbackModelId: modelId,
      });
    }

    console.info(`[LocalLore] Lore synthesis using ${modelId}`);

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
      const willFallback =
        isGeminiModelFallbackError(error) && !isLastModel && nextModelId != null;

      if (modelId === LORE_MODEL_ID) {
        await logPrimaryGeminiFailure(error, logContext, {
          willFallback,
          fallbackModelId: willFallback ? nextModelId : null,
        });
      }

      if (!willFallback) {
        if (isLastModel) {
          await logGeminiSynthesisFailed(error, logContext, modelId);
        }
        throw error;
      }

      console.warn(
        `[LocalLore] Model ${modelId} at capacity, trying ${nextModelId}…`,
      );
    }
  }

  if (lastModelId) {
    await logGeminiSynthesisFailed(lastError, logContext, lastModelId);
  }
  throw lastError;
}
