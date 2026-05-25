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
        "Gemini API quota exceeded. Each location search uses one AI request. " +
        "Wait and retry, or enable billing in Google AI Studio.",
    };
  }

  return {
    status: 500,
    message: "Failed to generate lore",
  };
}
