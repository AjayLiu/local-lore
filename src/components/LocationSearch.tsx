"use client";

import {
  useCallback,
  useEffect,
  useId,
  useState,
} from "react";
import { SearchSuggestions } from "@/components/SearchSuggestions";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { DEBOUNCE_MS, MIN_QUERY_LENGTH } from "@/lib/mapbox/constants";
import {
  createSessionToken,
  fetchSuggestions,
  retrieveLocation,
  type SearchSuggestion,
} from "@/lib/mapbox/search";
import type { SelectedLocation } from "@/lib/types/location";

type LocationSearchProps = {
  onSelect: (location: SelectedLocation) => void;
};

export function LocationSearch({ onSelect }: LocationSearchProps) {
  const inputId = useId();
  const listboxId = useId();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRetrieving, setIsRetrieving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  const debouncedQuery = useDebouncedValue(query, DEBOUNCE_MS);
  const canFetch =
    sessionToken !== null &&
    debouncedQuery.trim().length >= MIN_QUERY_LENGTH;
  const visibleSuggestions = canFetch ? suggestions : [];

  const ensureSessionToken = useCallback(() => {
    setSessionToken((current) => current ?? createSessionToken());
  }, []);

  const resetSession = useCallback(() => {
    setSessionToken(createSessionToken());
  }, []);

  useEffect(() => {
    if (!sessionToken || debouncedQuery.trim().length < MIN_QUERY_LENGTH) {
      return;
    }

    const token = sessionToken;
    let cancelled = false;

    async function loadSuggestions() {
      setIsLoading(true);
      setError(null);

      try {
        const results = await fetchSuggestions(debouncedQuery, token);
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
  }, [debouncedQuery, sessionToken]);

  const handleSelect = useCallback(
    async (suggestion: SearchSuggestion) => {
      if (!sessionToken) {
        return;
      }

      setIsRetrieving(true);
      setError(null);
      setIsOpen(false);

      try {
        const location = await retrieveLocation(
          suggestion.mapboxId,
          sessionToken,
        );
        onSelect({
          ...location,
          label: suggestion.label || location.label,
        });
        setQuery("");
        setSuggestions([]);
        setActiveIndex(-1);
        resetSession();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to retrieve location",
        );
        setIsOpen(true);
      } finally {
        setIsRetrieving(false);
      }
    },
    [onSelect, resetSession, sessionToken],
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
          void handleSelect(visibleSuggestions[activeIndex]);
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
            ensureSessionToken();
            if (visibleSuggestions.length > 0) {
              setIsOpen(true);
            }
          }}
          onBlur={() => {
            window.setTimeout(() => setIsOpen(false), 150);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search cities, neighborhoods, landmarks..."
          autoComplete="off"
          role="combobox"
          aria-expanded={isOpen && visibleSuggestions.length > 0}
          aria-controls={listboxId}
          aria-activedescendant={activeDescendant}
          aria-autocomplete="list"
          disabled={isRetrieving}
          className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-4 text-base text-zinc-900 shadow-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
        />
        {(isRetrieving || (canFetch && isLoading)) && (
          <span
            className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-zinc-400"
            aria-live="polite"
          >
            {isRetrieving ? "Loading..." : "Searching..."}
          </span>
        )}
      </div>

      {error ? (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {isOpen && !error && visibleSuggestions.length > 0 ? (
        <SearchSuggestions
          suggestions={visibleSuggestions}
          activeIndex={activeIndex}
          listboxId={listboxId}
          onSelect={(suggestion) => void handleSelect(suggestion)}
          onHover={setActiveIndex}
        />
      ) : null}
    </div>
  );
}
