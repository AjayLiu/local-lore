"use client";

import {
  getLoreHeadline,
  type PlottableLoreItem,
} from "@/lib/lore/plottable-items";

type LoreStoryCardProps = {
  item: PlottableLoreItem;
  onClose: () => void;
};

export function LoreStoryCard({ item, onClose }: LoreStoryCardProps) {
  const title = getLoreHeadline(item);
  const displayTitle = item.headline ?? item.title ?? title;

  return (
    <div
      className="relative w-full overflow-hidden rounded-xl bg-white shadow-2xl"
      role="dialog"
      aria-labelledby="lore-story-card-title"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900/70 text-lg leading-none text-white transition hover:bg-zinc-900"
        aria-label="Close story"
      >
        ×
      </button>

      {item.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.imageUrl}
          alt={item.title ?? displayTitle}
          className="h-40 w-full object-cover"
          loading="lazy"
          decoding="async"
        />
      ) : null}

      <div className="p-4 pr-12">
        <h2
          id="lore-story-card-title"
          className="text-base font-semibold text-zinc-900"
        >
          {displayTitle}
        </h2>
        {item.hook ? (
          <p className="mt-2 text-sm leading-relaxed text-zinc-600">{item.hook}</p>
        ) : null}
        {item.wikipediaUrl ? (
          <a
            href={item.wikipediaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block text-sm font-semibold text-amber-700 hover:text-amber-800"
          >
            Read on Wikipedia
          </a>
        ) : null}
      </div>
    </div>
  );
}
