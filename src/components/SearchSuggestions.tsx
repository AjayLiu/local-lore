"use client";

import type { SearchSuggestion } from "@/lib/photon/search";

type SearchSuggestionsProps = {
  suggestions: SearchSuggestion[];
  activeIndex: number;
  listboxId: string;
  onSelect: (suggestion: SearchSuggestion) => void;
  onHover: (index: number) => void;
};

export function SearchSuggestions({
  suggestions,
  activeIndex,
  listboxId,
  onSelect,
  onHover,
}: SearchSuggestionsProps) {
  if (suggestions.length === 0) {
    return null;
  }

  return (
    <ul
      id={listboxId}
      role="listbox"
      className="absolute z-10 mt-2 w-full overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg"
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
