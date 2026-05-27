import type { GeminiErrorKind } from "./errors";
import { getGeminiErrorDetails } from "./errors";
import { LORE_MODEL_ID } from "./model";
import { getSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

export type LoreGeminiLogContext = {
  jobId?: string;
  searchLabel?: string;
};

type LoreGeminiLogEvent =
  | "primary_failed"
  | "fallback_attempt"
  | "synthesis_failed";

type LoreGeminiLogRow = {
  job_id: string | null;
  search_label: string | null;
  event: LoreGeminiLogEvent;
  model_id: string;
  previous_model_id: string | null;
  fallback_model_id: string | null;
  status_code: number | null;
  error_kind: GeminiErrorKind | null;
  error_message: string;
  will_fallback: boolean | null;
};

async function insertLoreGeminiLog(row: LoreGeminiLogRow): Promise<void> {
  if (!isSupabaseConfigured()) {
    return;
  }

  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("lore_gemini_logs").insert(row);

  if (error) {
    console.error("[LocalLore] Failed to write lore_gemini_logs:", error.message);
  }
}

/** Log when the primary model (LORE_MODEL_ID) fails. */
export async function logPrimaryGeminiFailure(
  error: unknown,
  ctx: LoreGeminiLogContext,
  options: { willFallback: boolean; fallbackModelId: string | null },
): Promise<void> {
  const details = getGeminiErrorDetails(error);

  console.warn(
    `[LocalLore] Primary model ${LORE_MODEL_ID} failed`,
    JSON.stringify({
      jobId: ctx.jobId,
      label: ctx.searchLabel,
      statusCode: details.statusCode,
      kind: details.kind,
      willFallback: options.willFallback,
      fallbackModelId: options.fallbackModelId,
      message: details.message.slice(0, 200),
    }),
  );

  try {
    await insertLoreGeminiLog({
      job_id: ctx.jobId ?? null,
      search_label: ctx.searchLabel ?? null,
      event: "primary_failed",
      model_id: LORE_MODEL_ID,
      previous_model_id: null,
      fallback_model_id: options.fallbackModelId,
      status_code: details.statusCode,
      error_kind: details.kind,
      error_message: details.message,
      will_fallback: options.willFallback,
    });
  } catch (logError) {
    console.error("[LocalLore] lore_gemini_logs insert threw:", logError);
  }
}

/** Log when a fallback model is about to be tried. */
export async function logGeminiFallbackAttempt(
  ctx: LoreGeminiLogContext,
  options: {
    previousModelId: string;
    fallbackModelId: string;
  },
): Promise<void> {
  console.info(
    `[LocalLore] Trying fallback ${options.fallbackModelId} after ${options.previousModelId}`,
    JSON.stringify({ jobId: ctx.jobId, label: ctx.searchLabel }),
  );

  try {
    await insertLoreGeminiLog({
      job_id: ctx.jobId ?? null,
      search_label: ctx.searchLabel ?? null,
      event: "fallback_attempt",
      model_id: options.fallbackModelId,
      previous_model_id: options.previousModelId,
      fallback_model_id: options.fallbackModelId,
      status_code: null,
      error_kind: null,
      error_message: "",
      will_fallback: null,
    });
  } catch (logError) {
    console.error("[LocalLore] lore_gemini_logs insert threw:", logError);
  }
}

/** Log when the last model in the chain fails (no further fallback). */
export async function logGeminiSynthesisFailed(
  error: unknown,
  ctx: LoreGeminiLogContext,
  modelId: string,
): Promise<void> {
  const details = getGeminiErrorDetails(error);

  console.error(
    `[LocalLore] Lore synthesis failed on ${modelId}`,
    JSON.stringify({
      jobId: ctx.jobId,
      label: ctx.searchLabel,
      statusCode: details.statusCode,
      kind: details.kind,
      message: details.message.slice(0, 200),
    }),
  );

  try {
    await insertLoreGeminiLog({
      job_id: ctx.jobId ?? null,
      search_label: ctx.searchLabel ?? null,
      event: "synthesis_failed",
      model_id: modelId,
      previous_model_id: null,
      fallback_model_id: null,
      status_code: details.statusCode,
      error_kind: details.kind,
      error_message: details.message,
      will_fallback: false,
    });
  } catch (logError) {
    console.error("[LocalLore] lore_gemini_logs insert threw:", logError);
  }
}
