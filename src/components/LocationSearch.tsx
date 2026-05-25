"use client";

import {
  useCallback,
  useEffect,
  useId,
  useState,
} from "react";
import { SearchSuggestions } from "@/components/SearchSuggestions";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { DEBOUNCE_MS, MIN_QUERY_LENGTH } from "@/lib/photon/constants";
import {
  fetchSuggestions,
  suggestionToLocation,
  type SearchSuggestion,
} from "@/lib/photon/search";
import type { SelectedLocation } from "@/lib/types/location";

type MapCenterCoords = {
  latitude: number;
  longitude: number;
};

type LocationSearchBaseProps = {
  variant?: "landing" | "map";
};

type LocationSearchSelectProps = LocationSearchBaseProps & {
  mode?: "select";
  onSelect: (location: SelectedLocation) => void;
  onCenterMap?: never;
};

type LocationSearchCenterProps = LocationSearchBaseProps & {
  mode: "center";
  onCenterMap: (coords: MapCenterCoords) => void;
  onSelect?: never;
};

export type LocationSearchProps =
  | LocationSearchSelectProps
  | LocationSearchCenterProps;

export function LocationSearch(props: LocationSearchProps) {
  const { variant = "landing" } = props;
  const isMapVariant = variant === "map";

  const inputId = useId();
  const listboxId = useId();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debouncedQuery = useDebouncedValue(query, DEBOUNCE_MS);
  const canFetch = debouncedQuery.trim().length >= MIN_QUERY_LENGTH;
  const visibleSuggestions = canFetch ? suggestions : [];

  useEffect(() => {
    if (debouncedQuery.trim().length < MIN_QUERY_LENGTH) {
      return;
    }

    let cancelled = false;

    async function loadSuggestions() {
      setIsLoading(true);
      setError(null);

      try {
        const results = await fetchSuggestions(debouncedQuery);
        if (!cancelled) {
          setSuggestions(results);
          setActiveIndex(results.length > 0 ? 0 : -1);
          setIsOpen(results.length > 0);
        }
      } catch (err) {
        if (!cancelled) {
          setSuggestions([]);
          setActiveIndex(-1);
          setIsOpen(false);
          setError(
            err instanceof Error ? err.message : "Failed to load suggestions",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadSuggestions();

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  const handleSelect = useCallback(
    (suggestion: SearchSuggestion) => {
      setError(null);
      setIsOpen(false);
      setQuery("");
      setSuggestions([]);
      setActiveIndex(-1);

      if (props.mode === "center") {
        props.onCenterMap({
          latitude: suggestion.latitude,
          longitude: suggestion.longitude,
        });
      } else {
        props.onSelect(suggestionToLocation(suggestion));
      }
    },
    [props],
  );

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || visibleSuggestions.length === 0) {
      if (event.key === "ArrowDown" && visibleSuggestions.length > 0) {
        setIsOpen(true);
        setActiveIndex(0);
      }
      return;
    }

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex((index) =>
          index < visibleSuggestions.length - 1 ? index + 1 : 0,
        );
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((index) =>
          index > 0 ? index - 1 : visibleSuggestions.length - 1,
        );
        break;
      case "Enter":
        event.preventDefault();
        if (activeIndex >= 0 && visibleSuggestions[activeIndex]) {
          handleSelect(visibleSuggestions[activeIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        setActiveIndex(-1);
        break;
    }
  };

  const activeDescendant =
    activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined;

  const placeholder =
    props.mode === "center"
      ? "Search anywhere else in the world!"
      : "Search cities, neighborhoods, landmarks...";

  const inputClassName = isMapVariant
    ? "w-full rounded-xl border border-white/20 bg-white/95 px-4 py-3 text-base text-zinc-900 shadow-lg outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200 backdrop-blur-sm"
    : "w-full rounded-xl border border-zinc-300 bg-white px-4 py-4 text-base text-zinc-900 shadow-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200";

  return (
    <div className="relative w-full">
      <label htmlFor={inputId} className="sr-only">
        Search for a location
      </label>
      <div className="relative">
        <input
          id={inputId}
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
            setError(null);
          }}
          onFocus={() => {
            if (visibleSuggestions.length > 0) {
              setIsOpen(true);
            }
          }}
          onBlur={() => {
            window.setTimeout(() => setIsOpen(false), 150);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={isOpen && visibleSuggestions.length > 0}
          aria-controls={listboxId}
          aria-activedescendant={activeDescendant}
          aria-autocomplete="list"
          className={inputClassName}
        />
        {canFetch && isLoading ? (
          <span
            className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-zinc-400"
            aria-live="polite"
          >
            Searching...
          </span>
        ) : null}
      </div>

      {error ? (
        <p
          className={`mt-2 text-sm text-red-600 ${isMapVariant ? "rounded-lg bg-white/95 px-3 py-1" : ""}`}
          role="alert"
        >
          {error}
        </p>
      ) : null}

      {isOpen && !error && visibleSuggestions.length > 0 ? (
        <SearchSuggestions
          suggestions={visibleSuggestions}
          activeIndex={activeIndex}
          listboxId={listboxId}
          placement={isMapVariant ? "above" : "below"}
          onSelect={handleSelect}
          onHover={setActiveIndex}
        />
      ) : null}
    </div>
  );
}
