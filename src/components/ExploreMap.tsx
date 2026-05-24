"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { LoreResultsPanel } from "@/components/LoreResultsPanel";
import { getMapboxAccessToken } from "@/lib/mapbox/access-token";
import { DEFAULT_MAP_ZOOM } from "@/lib/mapbox/constants";
import { buildLorePopupHtml, createLorePinElement } from "@/lib/mapbox/lore-pin";
import {
  getLoreHeadline,
  getLoreItemKey,
  isPlottableLoreItem,
} from "@/lib/lore/plottable-items";
import type { LoreItem } from "@/lib/lore/schema";
import { loreJobResponseSchema } from "@/lib/jobs/types";
import type { SelectedLocation } from "@/lib/types/location";

const POLL_INTERVAL_MS = 2000;

type ExploreMapProps = {
  location: SelectedLocation;
  onSearchAgain: () => void;
};

export function ExploreMap({ location, onSearchAgain }: ExploreMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const centerMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const centerMarkerElementRef = useRef<HTMLDivElement | null>(null);
  const loreMarkersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const hasFitBoundsRef = useRef(false);
  const submittedForId = useRef<string | null>(null);
  const pollAbortRef = useRef<AbortController | null>(null);

  const [loreItems, setLoreItems] = useState<LoreItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const plottableItems = loreItems.filter(isPlottableLoreItem);

  const requestLore = useCallback(async () => {
    pollAbortRef.current?.abort();
    pollAbortRef.current = null;

    setIsLoading(true);
    setError(null);
    setLoreItems([]);
    hasFitBoundsRef.current = false;

    try {
      const response = await fetch("/api/lore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: location.latitude,
          longitude: location.longitude,
          label: location.label,
        }),
      });

      const data: unknown = await response.json();
      if (!response.ok) {
        const message =
          typeof data === "object" &&
          data !== null &&
          "error" in data &&
          typeof (data as { error: unknown }).error === "string"
            ? (data as { error: string }).error
            : "Failed to start lore discovery";
        throw new Error(message);
      }

      const jobId =
        typeof data === "object" &&
        data !== null &&
        "jobId" in data &&
        typeof (data as { jobId: unknown }).jobId === "string"
          ? (data as { jobId: string }).jobId
          : null;

      if (!jobId) {
        throw new Error("Invalid response from lore API");
      }

      const abort = new AbortController();
      pollAbortRef.current = abort;

      const poll = async () => {
        while (!abort.signal.aborted) {
          const statusResponse = await fetch(
            `/api/lore?jobId=${encodeURIComponent(jobId)}`,
            { signal: abort.signal },
          );

          const statusData: unknown = await statusResponse.json();
          if (!statusResponse.ok) {
            const message =
              typeof statusData === "object" &&
              statusData !== null &&
              "error" in statusData &&
              typeof (statusData as { error: unknown }).error === "string"
                ? (statusData as { error: string }).error
                : "Failed to check lore job status";
            throw new Error(message);
          }

          const parsed = loreJobResponseSchema.safeParse(statusData);
          if (!parsed.success) {
            throw new Error("Invalid lore job status response");
          }

          const job = parsed.data;
          if (job.status === "complete") {
            setLoreItems(job.items ?? []);
            setIsLoading(false);
            return;
          }

          if (job.status === "failed") {
            throw new Error(job.error ?? "Lore discovery failed");
          }

          await new Promise((resolve) => {
            const timeout = setTimeout(resolve, POLL_INTERVAL_MS);
            abort.signal.addEventListener(
              "abort",
              () => {
                clearTimeout(timeout);
                resolve(undefined);
              },
              { once: true },
            );
          });
        }
      };

      void poll().catch((pollError) => {
        if (abort.signal.aborted) {
          return;
        }
        setError(
          pollError instanceof Error
            ? pollError.message
            : "Lore discovery failed",
        );
        setIsLoading(false);
      });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to start lore discovery",
      );
      setIsLoading(false);
    }
  }, [location.latitude, location.longitude, location.label]);

  useEffect(() => {
    if (submittedForId.current === location.id) {
      return;
    }

    submittedForId.current = location.id;
    void requestLore();

    return () => {
      pollAbortRef.current?.abort();
    };
  }, [location.id, requestLore]);

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

    const centerElement = document.createElement("div");
    centerElement.className = "lore-center-marker";
    centerMarkerElementRef.current = centerElement;

    centerMarkerRef.current = new mapboxgl.Marker({ element: centerElement })
      .setLngLat([location.longitude, location.latitude])
      .addTo(map);

    return () => {
      const loreMarkers = loreMarkersRef.current;
      for (const marker of loreMarkers.values()) {
        marker.remove();
      }
      loreMarkers.clear();
      centerMarkerRef.current?.remove();
      centerMarkerRef.current = null;
      centerMarkerElementRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, [location.id, location.latitude, location.longitude]);

  useEffect(() => {
    const centerElement = centerMarkerElementRef.current;
    if (!centerElement) {
      return;
    }

    centerElement.classList.toggle("lore-center-marker--loading", isLoading);
  }, [isLoading]);

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
            errorMessage={error}
            onRetry={() => void requestLore()}
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
