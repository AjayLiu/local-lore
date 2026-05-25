"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import {
  getDefaultMapCenter,
  tryGetUserMapCenter,
  type MapCenter,
} from "@/lib/geolocation/get-initial-map-center";

const ExploreMap = dynamic(
  () =>
    import("@/components/ExploreMap").then((module) => module.ExploreMap),
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900">
        <p className="text-sm text-zinc-400">Loading map…</p>
      </div>
    ),
  },
);

export function HomePage() {
  const [userCenter, setUserCenter] = useState<MapCenter | null>(null);

  useEffect(() => {
    let cancelled = false;

    void tryGetUserMapCenter().then((center) => {
      if (!cancelled && center) {
        setUserCenter(center);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ExploreMap initialCenter={getDefaultMapCenter()} userCenter={userCenter} />
  );
}
