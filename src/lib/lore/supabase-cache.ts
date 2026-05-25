import type { LoreItem } from "./schema";
import type { CachedLorePin } from "./cached-pin";
import { getSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

const BBOX_ROW_LIMIT = 2000;

type LoreCardRow = {
  page_id: number;
  title: string;
  headline: string;
  hook: string;
  wikipedia_url: string;
  image_url: string | null;
  latitude: number;
  longitude: number;
};

type SearchContext = {
  label: string;
  latitude: number;
  longitude: number;
};

export type LoreBbox = {
  west: number;
  south: number;
  east: number;
  north: number;
};

function rowToCachedPin(row: LoreCardRow): CachedLorePin {
  return {
    pageId: row.page_id,
    title: row.title,
    headline: row.headline,
    hook: row.hook,
    wikipediaUrl: row.wikipedia_url,
    latitude: row.latitude,
    longitude: row.longitude,
    ...(row.image_url ? { imageUrl: row.image_url } : {}),
  };
}

function dedupeItemsByPageId(items: LoreItem[]): LoreItem[] {
  const byPageId = new Map<number, LoreItem>();
  for (const item of items) {
    byPageId.set(item.pageId, item);
  }
  return [...byPageId.values()];
}

export async function upsertLoreCards(
  items: LoreItem[],
  search: SearchContext,
): Promise<void> {
  if (!isSupabaseConfigured() || items.length === 0) {
    return;
  }

  const uniqueItems = dedupeItemsByPageId(items);
  const now = new Date().toISOString();

  const rows = uniqueItems.map((item) => ({
    page_id: item.pageId,
    title: item.title,
    headline: item.headline,
    hook: item.hook,
    wikipedia_url: item.wikipediaUrl,
    image_url: item.imageUrl ?? null,
    latitude: item.latitude,
    longitude: item.longitude,
    search_label: search.label,
    search_lat: search.latitude,
    search_lng: search.longitude,
    updated_at: now,
  }));

  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("lore_cards").upsert(rows, {
    onConflict: "page_id",
    ignoreDuplicates: false,
  });

  if (error) {
    throw new Error(`Failed to upsert lore cards: ${error.message}`);
  }
}

export async function getLoreCardsInBbox(
  bbox: LoreBbox,
  limit = BBOX_ROW_LIMIT,
): Promise<CachedLorePin[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_lore_cards_in_bbox", {
    west: bbox.west,
    south: bbox.south,
    east: bbox.east,
    north: bbox.north,
    max_rows: limit,
  });

  if (error) {
    throw new Error(`Failed to fetch lore cards in bbox: ${error.message}`);
  }

  return ((data ?? []) as LoreCardRow[]).map(rowToCachedPin);
}

export function parseLoreBbox(
  params: URLSearchParams,
): { bbox: LoreBbox } | { error: string } {
  const west = Number(params.get("west"));
  const south = Number(params.get("south"));
  const east = Number(params.get("east"));
  const north = Number(params.get("north"));

  if (
    !Number.isFinite(west) ||
    !Number.isFinite(south) ||
    !Number.isFinite(east) ||
    !Number.isFinite(north)
  ) {
    return { error: "west, south, east, and north must be valid numbers" };
  }

  if (west >= east) {
    return { error: "west must be less than east" };
  }

  if (south >= north) {
    return { error: "south must be less than north" };
  }

  if (west < -180 || east > 180 || south < -90 || north > 90) {
    return { error: "bbox coordinates are out of range" };
  }

  return { bbox: { west, south, east, north } };
}
