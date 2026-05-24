"use client";

type LoreResultsPanelProps = {
  pinCount: number;
  isLoading: boolean;
  error: Error | undefined;
  onRetry: () => void;
};

function formatLoreError(error: Error): string {
  try {
    const parsed = JSON.parse(error.message) as { error?: string };
    if (parsed.error) {
      return parsed.error;
    }
  } catch {
    // use raw message
  }

  return error.message;
}

export function LoreResultsPanel({
  pinCount,
  isLoading,
  error,
  onRetry,
}: LoreResultsPanelProps) {
  if (error) {
    return (
      <div className="pointer-events-auto w-full max-w-lg rounded-xl bg-white/95 px-5 py-4 shadow-lg backdrop-blur-sm">
        <p className="text-sm font-medium text-red-700">Could not load lore</p>
        <p className="mt-1 text-sm text-zinc-600">{formatLoreError(error)}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-lg bg-amber-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-900"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!isLoading) {
    return null;
  }

  return (
    <div className="pointer-events-auto w-full max-w-lg rounded-xl bg-white/95 px-5 py-4 shadow-lg backdrop-blur-sm">
      <p className="text-sm font-medium text-amber-800">
        Discovering local lore…
      </p>
      <p className="mt-1 text-sm text-zinc-600">
        {pinCount > 0
          ? `Placing ${pinCount} ${pinCount === 1 ? "story" : "stories"} on the map…`
          : "Searching Wikipedia and synthesizing stories nearby."}
      </p>
    </div>
  );
}
