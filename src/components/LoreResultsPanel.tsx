"use client";

type LoreResultsPanelProps = {
  pinCount: number;
  isLoading: boolean;
  errorMessage: string | null;
  onRetry: () => void;
};

function formatLoreError(message: string): string {
  try {
    const parsed = JSON.parse(message) as { error?: string };
    if (parsed.error) {
      return parsed.error;
    }
  } catch {
    // use raw message
  }

  if (
    message.toLowerCase().includes("quota") ||
    message.includes("429") ||
    message.includes("RESOURCE_EXHAUSTED")
  ) {
    return (
      "Gemini API quota exceeded. Each search uses one AI request. " +
      "Wait and try again, or set LORE_MODEL_ID=gemini-2.5-flash in .env.local."
    );
  }

  return message;
}

export function LoreResultsPanel({
  pinCount,
  isLoading,
  errorMessage,
  onRetry,
}: LoreResultsPanelProps) {
  if (errorMessage) {
    return (
      <div className="pointer-events-auto w-full max-w-lg rounded-xl bg-white/95 px-5 py-4 shadow-lg backdrop-blur-sm">
        <p className="text-sm font-medium text-red-700">Could not load lore</p>
        <p className="mt-1 text-sm text-zinc-600">
          {formatLoreError(errorMessage)}
        </p>
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
          : "Queued for Wikipedia lookup and AI synthesis. This may take a moment when the queue is busy."}
      </p>
    </div>
  );
}
