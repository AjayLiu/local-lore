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
    throw new Error(`Wikipedia API failed (${response.status})`);
  }

  return response.json();
}
