import type { LoreItem } from "./schema";

/** Lightweight lore card for map bbox queries and GeoJSON features. */
export type CachedLorePin = {
  pageId: number;
  title: string;
  headline: string;
  hook: string;
  wikipediaUrl: string;
  imageUrl?: string;
  latitude: number;
  longitude: number;
};

export function cachedPinToLoreItem(pin: CachedLorePin): LoreItem {
  return {
    pageId: pin.pageId,
    title: pin.title,
    headline: pin.headline,
    hook: pin.hook,
    latitude: pin.latitude,
    longitude: pin.longitude,
    wikipediaUrl: pin.wikipediaUrl,
    ...(pin.imageUrl ? { imageUrl: pin.imageUrl } : {}),
  };
}

export function loreItemToCachedPin(item: LoreItem): CachedLorePin {
  return {
    pageId: item.pageId,
    title: item.title,
    headline: item.headline,
    hook: item.hook,
    wikipediaUrl: item.wikipediaUrl,
    latitude: item.latitude,
    longitude: item.longitude,
    ...(item.imageUrl ? { imageUrl: item.imageUrl } : {}),
  };
}
