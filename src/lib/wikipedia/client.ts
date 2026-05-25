import { WIKIPEDIA_API_BASE, WIKIPEDIA_USER_AGENT } from "./constants";

export async function wikipediaFetch(
  params: Record<string, string>,
): Promise<unknown> {
  const searchParams = new URLSearchParams({
    format: "json",
    ...params,
  });

  const response = await fetch(`${WIKIPEDIA_API_BASE}?${searchParams}`, {
    headers: {
      "User-Agent": WIKIPEDIA_USER_AGENT,
    },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Wikipedia API HTTP ${response.status}${body ? `: ${body.slice(0, 200)}` : ""}`,
    );
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
    throw new Error(
      `Wikipedia API error (${err.code ?? "unknown"}): ${err.info}`,
    );
  }

  return data;
}
