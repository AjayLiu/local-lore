"use client";

import { useState } from "react";
import { LandingHero } from "@/components/LandingHero";
import { LocationSearch } from "@/components/LocationSearch";
import { SelectionSummary } from "@/components/SelectionSummary";
import type { SelectedLocation } from "@/lib/types/location";

export function HomePage() {
  const [selectedLocation, setSelectedLocation] =
    useState<SelectedLocation | null>(null);

  return (
    <div className="flex min-h-full flex-col bg-stone-50">
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-4 py-16 sm:px-6">
        <LandingHero />

        <div className="mt-10 w-full">
          {!selectedLocation ? (
            <LocationSearch onSelect={setSelectedLocation} />
          ) : (
            <SelectionSummary
              location={selectedLocation}
              onSearchAgain={() => setSelectedLocation(null)}
            />
          )}
        </div>
      </main>

      <footer className="pb-8 text-center text-sm text-zinc-500">
        Powered by Mapbox Search
      </footer>
    </div>
  );
}
