import {
  getRecentSearches,
  isRecentSearchesConfigured,
} from "@/lib/lore/recent-searches";
import { getCommunityStats } from "@/lib/lore/supabase-cache";

export async function GET() {
  try {
    const [items, stats] = await Promise.all([
      isRecentSearchesConfigured() ? getRecentSearches() : Promise.resolve([]),
      getCommunityStats(),
    ]);

    return Response.json(
      { items, stats },
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
