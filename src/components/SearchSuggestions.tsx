"use client";

import type { SearchSuggestion } from "@/lib/photon/search";

type SearchSuggestionsProps = {
  suggestions: SearchSuggestion[];
  activeIndex: number;
  listboxId: string;
  placement?: "above" | "below";
  onSelect: (suggestion: SearchSuggestion) => void;
  onHover: (index: number) => void;
};

export function SearchSuggestions({
  suggestions,
  activeIndex,
  listboxId,
  placement = "below",
  onSelect,
  onHover,
}: SearchSuggestionsProps) {
  if (suggestions.length === 0) {
    return null;
  }

  const positionClass =
    placement === "above"
      ? "bottom-full mb-2"
      : "mt-2";

  return (
    <ul
      id={listboxId}
      role="listbox"
      className={`absolute z-10 w-full overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg ${positionClass}`}
    >
      {suggestions.map((suggestion, index) => {
        const isActive = index === activeIndex;

        return (
          <li
            key={suggestion.id}
            id={`${listboxId}-option-${index}`}
            role="option"
            aria-selected={isActive}
            className={`cursor-pointer px-4 py-3 text-left transition-colors ${
              isActive ? "bg-amber-50 text-zinc-900" : "text-zinc-700 hover:bg-zinc-50"
            }`}
            onMouseEnter={() => onHover(index)}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onSelect(suggestion)}
          >
            <span className="block font-medium">{suggestion.label}</span>
            {suggestion.placeFormatted ? (
              <span className="mt-0.5 block text-sm text-zinc-500">
                {suggestion.placeFormatted}
              </span>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
