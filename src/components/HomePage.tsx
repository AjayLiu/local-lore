"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { LandingHero } from "@/components/LandingHero";
import { LocationSearch } from "@/components/LocationSearch";
import type { SelectedLocation } from "@/lib/types/location";

const ExploreMap = dynamic(
  () =>
    import("@/components/ExploreMap").then((module) => module.ExploreMap),
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-100">
        <p className="text-sm text-zinc-600">Loading map…</p>
      </div>
    ),
  },
);

export function HomePage() {
  const [selectedLocation, setSelectedLocation] =
    useState<SelectedLocation | null>(null);

  if (selectedLocation) {
    return (
      <ExploreMap
        location={selectedLocation}
        onSearchAgain={() => setSelectedLocation(null)}
      />
    );
  }

  return (
    <div className="flex min-h-full flex-col bg-stone-50">
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-4 py-16 sm:px-6">
        <LandingHero />

        <div className="mt-10 w-full">
          <LocationSearch onSelect={setSelectedLocation} />
        </div>
      </main>

      <footer className="pb-8 text-center text-sm text-zinc-500">
        Search by OpenStreetMap · Map by Mapbox
      </footer>
    </div>
  );
}
