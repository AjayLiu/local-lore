import { APICallError } from "ai";

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export type GeminiErrorKind =
  | "quota"
  | "capacity"
  | "forbidden"
  | "other";

export type GeminiErrorDetails = {
  message: string;
  statusCode: number | null;
  kind: GeminiErrorKind;
};

export function getGeminiErrorDetails(error: unknown): GeminiErrorDetails {
  const message = getErrorMessage(error);
  let statusCode: number | null = null;

  if (APICallError.isInstance(error) && error.statusCode != null) {
    statusCode = error.statusCode;
  }

  let kind: GeminiErrorKind = "other";
  if (isGeminiQuotaError(error)) {
    kind = "quota";
  } else if (isGeminiCapacityError(error)) {
    kind = "capacity";
  } else if (
    statusCode === 403 ||
    message.toLowerCase().includes("403") ||
    message.toLowerCase().includes("permission")
  ) {
    kind = "forbidden";
  }

  return { message, statusCode, kind };
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

function isGeminiCapacityError(error: unknown): boolean {
  if (APICallError.isInstance(error)) {
    return (
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

/**
 * Job-level retry (QStash redelivery): rate limits and temporary capacity issues.
 * Does not include 403 — that is a config/permission failure.
 */
export function isGeminiTransientError(error: unknown): boolean {
  return isGeminiQuotaError(error) || isGeminiCapacityError(error);
}

/**
 * Switch to LORE_MODEL_FALLBACK_IDS only on temporary capacity (503 family).
 * 429/403 stay on the primary model; QStash retries the job instead.
 */
export function isGeminiModelFallbackError(error: unknown): boolean {
  if (isGeminiQuotaError(error)) {
    return false;
  }

  if (APICallError.isInstance(error) && error.statusCode === 403) {
    return false;
  }

  const message = getErrorMessage(error).toLowerCase();
  if (message.includes("403") || message.includes("permission")) {
    return false;
  }

  return isGeminiCapacityError(error);
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
