import type mapboxgl from "mapbox-gl";
import type { CachedLorePin } from "@/lib/lore/cached-pin";
import type { LoreBbox } from "@/lib/lore/supabase-cache";

/** How far beyond the viewport we query for pins; grows when zoomed in. */
export function getFetchBoundsExpansionFactor(zoom: number): number {
  if (zoom <= 11) {
    return 1.25;
  }

  return 1.25 + (zoom - 11) * 0.45;
}

export function expandLngLatBounds(
  bounds: mapboxgl.LngLatBounds,
  factor: number,
): LoreBbox {
  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();
  const centerLng = (sw.lng + ne.lng) / 2;
  const centerLat = (sw.lat + ne.lat) / 2;
  const halfLng = ((ne.lng - sw.lng) / 2) * factor;
  const halfLat = ((ne.lat - sw.lat) / 2) * factor;

  return {
    west: centerLng - halfLng,
    east: centerLng + halfLng,
    south: centerLat - halfLat,
    north: centerLat + halfLat,
  };
}

export function getCachedPinFetchBbox(map: mapboxgl.Map): LoreBbox | null {
  const bounds = map.getBounds();
  if (!bounds) {
    return null;
  }

  return expandLngLatBounds(
    bounds,
    getFetchBoundsExpansionFactor(map.getZoom()),
  );
}

/** Pins outside this box are dropped from client cache after a fetch. */
export function getCachedPinPruneBbox(map: mapboxgl.Map): LoreBbox | null {
  const bounds = map.getBounds();
  if (!bounds) {
    return null;
  }

  const expansion = getFetchBoundsExpansionFactor(map.getZoom()) * 1.75;
  return expandLngLatBounds(bounds, expansion);
}

export function pinInBbox(pin: CachedLorePin, bbox: LoreBbox): boolean {
  return (
    pin.longitude >= bbox.west &&
    pin.longitude <= bbox.east &&
    pin.latitude >= bbox.south &&
    pin.latitude <= bbox.north
  );
}

export function mergeCachedPinsForViewport(
  previous: CachedLorePin[],
  incoming: CachedLorePin[],
  pruneBbox: LoreBbox,
): CachedLorePin[] {
  const byPageId = new Map<number, CachedLorePin>();

  for (const pin of previous) {
    if (pinInBbox(pin, pruneBbox)) {
      byPageId.set(pin.pageId, pin);
    }
  }

  for (const pin of incoming) {
    byPageId.set(pin.pageId, pin);
  }

  return [...byPageId.values()];
}
