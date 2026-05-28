import { WIKIPEDIA_API_BASE, WIKIPEDIA_USER_AGENT } from "./constants";

const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 350;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function retryDelayMs(attempt: number): number {
  const jitter = Math.floor(Math.random() * 120);
  return RETRY_BASE_DELAY_MS * 2 ** attempt + jitter;
}

export async function wikipediaFetch(
  params: Record<string, string>,
): Promise<unknown> {
  const searchParams = new URLSearchParams({
    format: "json",
    ...params,
  });

  const url = `${WIKIPEDIA_API_BASE}?${searchParams}`;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    const response = await fetch(url, {
      headers: {
        "User-Agent": WIKIPEDIA_USER_AGENT,
      },
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      lastError = new Error(
        `Wikipedia API HTTP ${response.status}${body ? `: ${body.slice(0, 200)}` : ""}`,
      );

      if (response.status === 429 && attempt < MAX_RETRIES) {
        await sleep(retryDelayMs(attempt));
        continue;
      }

      throw lastError;
    }

    const data: unknown = await response.json();
    if (
      data &&
      typeof data === "object" &&
      "error" in data &&
      data.error &&
      typeof data.error === "object" &&
      "info" in data.error
    ) {
      const err = data.error as { code?: string; info: string };
      lastError = new Error(
        `Wikipedia API error (${err.code ?? "unknown"}): ${err.info}`,
      );

      if (
        (err.code === "ratelimited" || err.code === "maxlag") &&
        attempt < MAX_RETRIES
      ) {
        await sleep(retryDelayMs(attempt));
        continue;
      }

      throw lastError;
    }

    return data;
  }

  throw lastError ?? new Error("Wikipedia API request failed unexpectedly");
}
