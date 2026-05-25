import {
  getLoreCardsInBbox,
  parseLoreBbox,
} from "@/lib/lore/supabase-cache";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export async function GET(req: Request) {
  if (!isSupabaseConfigured()) {
    return Response.json({ items: [] });
  }

  const parsed = parseLoreBbox(new URL(req.url).searchParams);
  if ("error" in parsed) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const items = await getLoreCardsInBbox(parsed.bbox);
    return Response.json(
      { items },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60",
        },
      },
    );
  } catch (error) {
    console.error("Failed to load cached lore cards:", error);
    const message =
      error instanceof Error ? error.message : "Failed to load cached lore";
    return Response.json({ error: message }, { status: 500 });
  }
}
