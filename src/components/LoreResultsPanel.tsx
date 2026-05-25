"use client";

type LoreResultsPanelProps = {
  pinCount: number;
  isLoading: boolean;
  errorMessage: string | null;
  queuePosition: number | null;
  progressPercent: number;
  jobStatus: "pending" | "processing" | null;
  stageMessage: string | null;
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
      "Wait and try again, or enable billing in Google AI Studio."
    );
  }

  return message;
}

function getLoadingMessage(
  jobStatus: "pending" | "processing" | null,
  queuePosition: number | null,
  pinCount: number,
  stageMessage: string | null,
): string {
  if (pinCount > 0) {
    return `Placing ${pinCount} ${pinCount === 1 ? "story" : "stories"} on the map…`;
  }
  if (stageMessage) {
    return stageMessage;
  }
  if (queuePosition != null && queuePosition > 1) {
    return `You are #${queuePosition} in line (~10s per search ahead of you).`;
  }
  if (queuePosition === 1 || jobStatus === "pending") {
    return "You're next in line — starting soon.";
  }
  return "Starting lore discovery…";
}

export function LoreResultsPanel({
  pinCount,
  isLoading,
  errorMessage,
  queuePosition,
  progressPercent,
  jobStatus,
  stageMessage,
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

  const clampedProgress = Math.max(0, Math.min(100, progressPercent));

  return (
    <div className="pointer-events-auto w-full max-w-lg rounded-xl bg-white/95 px-5 py-4 shadow-lg backdrop-blur-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-amber-800">
          Discovering local lore…
        </p>
        <span className="text-xs font-medium tabular-nums text-zinc-500">
          {clampedProgress}%
        </span>
      </div>

      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-amber-100"
        role="progressbar"
        aria-valuenow={clampedProgress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Lore discovery progress"
      >
        <div
          className="h-full rounded-full bg-amber-700 transition-[width] duration-500 ease-out"
          style={{ width: `${clampedProgress}%` }}
        />
      </div>

      <p className="mt-3 text-sm text-zinc-600">
        {getLoadingMessage(jobStatus, queuePosition, pinCount, stageMessage)}
      </p>
    </div>
  );
}
