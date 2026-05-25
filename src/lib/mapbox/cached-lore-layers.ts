import type { FeatureCollection, Point } from "geojson";
import type { Map as MapboxMap } from "mapbox-gl";
import type { CachedLorePin } from "@/lib/lore/cached-pin";
import { truncateHeadline } from "@/lib/mapbox/lore-pin";

export const CACHED_LORE_SOURCE_ID = "cached-lore";
export const CACHED_LORE_DOTS_LAYER_ID = "cached-lore-dots";
export const CACHED_LORE_LABELS_LAYER_ID = "cached-lore-labels";
export const CACHED_LORE_LABEL_MIN_ZOOM = 14;

const EMPTY_COLLECTION: FeatureCollection<Point> = {
  type: "FeatureCollection",
  features: [],
};

export function cachedPinsToGeoJSON(
  pins: CachedLorePin[],
  excludePageIds: ReadonlySet<number> = new Set(),
): FeatureCollection<Point> {
  const features = pins
    .filter((pin) => !excludePageIds.has(pin.pageId))
    .map((pin) => ({
      type: "Feature" as const,
      id: pin.pageId,
      geometry: {
        type: "Point" as const,
        coordinates: [pin.longitude, pin.latitude],
      },
      properties: {
        pageId: pin.pageId,
        title: pin.title,
        headline: pin.headline,
        label: truncateHeadline(pin.headline),
        hook: pin.hook,
        wikipediaUrl: pin.wikipediaUrl,
        imageUrl: pin.imageUrl ?? "",
        latitude: pin.latitude,
        longitude: pin.longitude,
      },
    }));

  return { type: "FeatureCollection", features };
}

export function ensureCachedLoreLayers(map: MapboxMap): void {
  if (!map.getSource(CACHED_LORE_SOURCE_ID)) {
    map.addSource(CACHED_LORE_SOURCE_ID, {
      type: "geojson",
      data: EMPTY_COLLECTION,
      promoteId: "pageId",
    });
  }

  if (!map.getLayer(CACHED_LORE_DOTS_LAYER_ID)) {
    map.addLayer({
      id: CACHED_LORE_DOTS_LAYER_ID,
      type: "circle",
      source: CACHED_LORE_SOURCE_ID,
      paint: {
        "circle-radius": 4,
        "circle-color": "#a8a29e",
        "circle-stroke-width": 1.5,
        "circle-stroke-color": "#ffffff",
      },
    });
  }

  if (!map.getLayer(CACHED_LORE_LABELS_LAYER_ID)) {
    map.addLayer({
      id: CACHED_LORE_LABELS_LAYER_ID,
      type: "symbol",
      source: CACHED_LORE_SOURCE_ID,
      minzoom: CACHED_LORE_LABEL_MIN_ZOOM,
      layout: {
        "text-field": ["get", "label"],
        "text-size": 11,
        "text-anchor": "bottom",
        "text-offset": [0, -0.8],
        "text-max-width": 11,
        "text-allow-overlap": false,
        "text-ignore-placement": false,
      },
      paint: {
        "text-color": "#57534e",
        "text-halo-color": "#ffffff",
        "text-halo-width": 1.5,
      },
    });
  }
}

export function setCachedLoreGeoJSON(
  map: MapboxMap,
  data: FeatureCollection<Point>,
): void {
  const source = map.getSource(CACHED_LORE_SOURCE_ID);
  if (source?.type === "geojson") {
    source.setData(data);
  }
}

export function removeCachedLoreLayers(map: MapboxMap): void {
  if (map.getLayer(CACHED_LORE_LABELS_LAYER_ID)) {
    map.removeLayer(CACHED_LORE_LABELS_LAYER_ID);
  }
  if (map.getLayer(CACHED_LORE_DOTS_LAYER_ID)) {
    map.removeLayer(CACHED_LORE_DOTS_LAYER_ID);
  }
  if (map.getSource(CACHED_LORE_SOURCE_ID)) {
    map.removeSource(CACHED_LORE_SOURCE_ID);
  }
}
