"use client";

import { useCallback, useEffect, useState } from "react";
import type { RecentSearchEntry } from "@/lib/lore/recent-searches";

type RecentSearchesLeaderboardProps = {
  onSelect: (entry: RecentSearchEntry) => void;
  refreshKey?: number;
};

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function formatRelativeTime(iso: string): string {
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) {
    return "";
  }

  const seconds = Math.floor((Date.now() - then) / 1000);
  if (seconds < 60) {
    return "just now";
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function RecentSearchesLeaderboard({
  onSelect,
  refreshKey = 0,
}: RecentSearchesLeaderboardProps) {
  const [items, setItems] = useState<RecentSearchEntry[]>([]);
  const [isOpen, setIsOpen] = useState(true);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/lore/recent-searches");
      const data: unknown = await response.json();
      if (!response.ok) {
        return;
      }
      if (
        typeof data === "object" &&
        data !== null &&
        "items" in data &&
        Array.isArray((data as { items: unknown }).items)
      ) {
        setItems((data as { items: RecentSearchEntry[] }).items);
      }
    } catch {
      // Leaderboard is optional.
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  if (items.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label="Recent community searches"
      className="max-w-[min(100vw-1.5rem,16rem)] rounded-xl border border-white/20 bg-white/95 p-2 shadow-lg backdrop-blur-sm"
    >
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1 text-left transition hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-200"
      >
        <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">
          Recent searches
        </span>
        <ChevronDownIcon
          className={`h-4 w-4 shrink-0 text-zinc-500 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isOpen ? (
        <ul className="mt-0.5 flex flex-col gap-0.5">
          {items.map((entry) => (
            <li key={`${entry.searchedAt}-${entry.label}`}>
              <button
                type="button"
                onClick={() => onSelect(entry)}
                className="w-full rounded-lg px-2 py-1.5 text-left text-sm text-zinc-900 transition hover:bg-amber-50 focus:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-200"
              >
                <span className="line-clamp-2 font-medium leading-snug">
                  {entry.label}
                </span>
                {entry.searchedAt ? (
                  <span className="mt-0.5 block text-[0.65rem] text-zinc-500">
                    {formatRelativeTime(entry.searchedAt)}
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </nav>
  );
}
