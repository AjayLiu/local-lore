import { APICallError } from "ai";

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export function isGeminiQuotaError(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase();

  return (
    message.includes("quota") ||
    message.includes("resource_exhausted") ||
    message.includes("rate-limit") ||
    message.includes("429")
  );
}

/** Transient capacity / availability errors (503, UNAVAILABLE, high demand). */
export function isGeminiTransientError(error: unknown): boolean {
  if (APICallError.isInstance(error)) {
    return (
      error.isRetryable ||
      error.statusCode === 503 ||
      error.statusCode === 502 ||
      error.statusCode === 504
    );
  }

  const message = getErrorMessage(error).toLowerCase();
  return (
    message.includes("high demand") ||
    message.includes("unavailable") ||
    message.includes("503") ||
    message.includes("502") ||
    message.includes("504")
  );
}

export function formatLoreApiError(error: unknown): {
  message: string;
  status: number;
} {
  if (isGeminiQuotaError(error)) {
    return {
      status: 429,
      message:
        "Gemini API quota exceeded. Each location search uses one AI request. " +
        "Wait and retry, or enable billing in Google AI Studio.",
    };
  }

  if (isGeminiTransientError(error)) {
    return {
      status: 503,
      message:
        "Gemini is temporarily overloaded for this model. Your search is being retried automatically; " +
        "if it still fails, wait a minute and try again, or adjust LORE_MODEL_ID / LORE_MODEL_FALLBACK_IDS in .env.local.",
    };
  }

  return {
    status: 500,
    message: "Failed to generate lore",
  };
}
