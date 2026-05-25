import {
  getRecentSearches,
  isRecentSearchesConfigured,
} from "@/lib/lore/recent-searches";

export async function GET() {
  if (!isRecentSearchesConfigured()) {
    return Response.json({ items: [] });
  }

  try {
    const items = await getRecentSearches();
    return Response.json(
      { items },
      {
        headers: {
          "Cache-Control": "public, s-maxage=10",
        },
      },
    );
  } catch (error) {
    console.error("Failed to load recent searches:", error);
    const message =
      error instanceof Error ? error.message : "Failed to load recent searches";
    return Response.json({ error: message }, { status: 500 });
  }
}
