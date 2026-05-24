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

export function formatLoreApiError(error: unknown): {
  message: string;
  status: number;
} {
  if (isGeminiQuotaError(error)) {
    return {
      status: 429,
      message:
        "Gemini API quota exceeded (free tier is ~20 requests/day for gemini-3.5-flash). " +
        "Wait and retry, set LORE_MODEL_ID=gemini-2.5-flash in .env.local, or enable billing in Google AI Studio.",
    };
  }

  return {
    status: 500,
    message: "Failed to generate lore",
  };
}
