"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { getMapboxAccessToken } from "@/lib/mapbox/access-token";
import { DEFAULT_MAP_ZOOM } from "@/lib/mapbox/constants";
import type { SelectedLocation } from "@/lib/types/location";

type ExploreMapProps = {
  location: SelectedLocation;
  onSearchAgain: () => void;
};

export function ExploreMap({ location, onSearchAgain }: ExploreMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);

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

    const marker = new mapboxgl.Marker({ color: "#b45309" })
      .setLngLat([location.longitude, location.latitude])
      .addTo(map);

    return () => {
      marker.remove();
      map.remove();
    };
  }, [location.id, location.latitude, location.longitude]);

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
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-4 sm:p-6">
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
