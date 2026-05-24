"use client";

import { experimental_useObject as useObject } from "@ai-sdk/react";
import { useCallback, useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { LoreResultsPanel } from "@/components/LoreResultsPanel";
import { getMapboxAccessToken } from "@/lib/mapbox/access-token";
import { DEFAULT_MAP_ZOOM } from "@/lib/mapbox/constants";
import { buildLorePopupHtml, createLorePinElement } from "@/lib/mapbox/lore-pin";
import { normalizeLoreItems } from "@/lib/lore/normalize-items";
import {
  getLoreHeadline,
  getLoreItemKey,
  isPlottableLoreItem,
} from "@/lib/lore/plottable-items";
import { loreStreamSchema } from "@/lib/lore/schema";
import type { SelectedLocation } from "@/lib/types/location";

type ExploreMapProps = {
  location: SelectedLocation;
  onSearchAgain: () => void;
};

export function ExploreMap({ location, onSearchAgain }: ExploreMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const centerMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const loreMarkersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const hasFitBoundsRef = useRef(false);
  const submittedForId = useRef<string | null>(null);

  const { object, submit, isLoading, error, stop } = useObject({
    api: "/api/lore",
    schema: loreStreamSchema,
  });

  const loreItems = normalizeLoreItems(object);
  const plottableItems = loreItems.filter(isPlottableLoreItem);

  const requestLore = useCallback(() => {
    submit({
      latitude: location.latitude,
      longitude: location.longitude,
      label: location.label,
    });
  }, [location.latitude, location.longitude, location.label, submit]);

  useEffect(() => {
    if (submittedForId.current === location.id) {
      return;
    }

    submittedForId.current = location.id;
    hasFitBoundsRef.current = false;
    stop();
    requestLore();
  }, [location.id, requestLore, stop]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    mapboxgl.accessToken = getMapboxAccessToken();

    const map = new mapboxgl.Map({
      container,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [location.longitude, location.latitude],
      zoom: DEFAULT_MAP_ZOOM,
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");
    mapRef.current = map;

    centerMarkerRef.current = new mapboxgl.Marker({ color: "#78716c" })
      .setLngLat([location.longitude, location.latitude])
      .addTo(map);

    return () => {
      for (const marker of loreMarkersRef.current.values()) {
        marker.remove();
      }
      loreMarkersRef.current.clear();
      centerMarkerRef.current?.remove();
      centerMarkerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, [location.id, location.latitude, location.longitude]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    const nextIds = new Set(
      plottableItems.map((item, index) => getLoreItemKey(item, index)),
    );

    for (const [id, marker] of loreMarkersRef.current) {
      if (!nextIds.has(id)) {
        marker.remove();
        loreMarkersRef.current.delete(id);
      }
    }

    plottableItems.forEach((item, index) => {
      const id = getLoreItemKey(item, index);
      const lngLat: [number, number] = [item.longitude, item.latitude];
      const headline = getLoreHeadline(item);

      const existing = loreMarkersRef.current.get(id);
      if (existing) {
        existing.setLngLat(lngLat);
        return;
      }

      const element = createLorePinElement(headline);
      const marker = new mapboxgl.Marker({ element, anchor: "bottom" })
        .setLngLat(lngLat)
        .setPopup(
          new mapboxgl.Popup({ offset: 16, maxWidth: "300px" }).setHTML(
            buildLorePopupHtml(item),
          ),
        )
        .addTo(map);

      loreMarkersRef.current.set(id, marker);
    });
  }, [plottableItems]);

  useEffect(() => {
    if (isLoading || plottableItems.length === 0 || hasFitBoundsRef.current) {
      return;
    }

    const map = mapRef.current;
    if (!map) {
      return;
    }

    const bounds = new mapboxgl.LngLatBounds();
    bounds.extend([location.longitude, location.latitude]);
    for (const item of plottableItems) {
      bounds.extend([item.longitude, item.latitude]);
    }

    map.fitBounds(bounds, { padding: 72, maxZoom: 15, duration: 800 });
    hasFitBoundsRef.current = true;
  }, [isLoading, plottableItems, location.latitude, location.longitude]);

  const showStatusPanel = isLoading || error != null;

  return (
    <div className="fixed inset-0 z-50 bg-stone-900">
      <div ref={containerRef} className="h-full w-full" aria-label="Map" />

      <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center p-4 sm:p-6">
        <div className="pointer-events-auto rounded-xl bg-white/95 px-5 py-3 text-center shadow-lg backdrop-blur-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-amber-800">
            Exploring
          </p>
          <h1 className="mt-1 text-lg font-semibold text-zinc-900">
            {location.label}
          </h1>
          {plottableItems.length > 0 ? (
            <p className="mt-1 text-xs text-zinc-500">
              {plottableItems.length} stor
              {plottableItems.length === 1 ? "y" : "ies"} on the map — tap a pin
              for details
            </p>
          ) : null}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 p-4 sm:p-6">
        {showStatusPanel ? (
          <LoreResultsPanel
            pinCount={plottableItems.length}
            isLoading={isLoading}
            error={error}
            onRetry={requestLore}
          />
        ) : null}

        <button
          type="button"
          onClick={onSearchAgain}
          className="pointer-events-auto rounded-xl border border-white/20 bg-zinc-900/80 px-6 py-3 text-sm font-medium text-white shadow-lg backdrop-blur-sm transition hover:bg-zinc-800"
        >
          New search
        </button>
      </div>
    </div>
  );
}
