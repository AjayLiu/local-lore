"use client";

type PrivateModeToggleProps = {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
};

function InfoIcon({ className }: { className?: string }) {
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
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </svg>
  );
}

export function PrivateModeToggle({ enabled, onChange }: PrivateModeToggleProps) {
  const switchId = "private-mode-switch";
  const tooltipId = "private-mode-tooltip";

  return (
    <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-white/20 bg-white/95 px-3 py-2.5 text-sm text-zinc-800 shadow-lg backdrop-blur-sm">
      <label htmlFor={switchId} className="cursor-pointer font-medium">
        Private
      </label>

      <div className="group/info relative flex shrink-0">
        <button
          type="button"
          className="flex h-5 w-5 items-center justify-center rounded-full text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-200"
          aria-describedby={tooltipId}
        >
          <InfoIcon className="h-4 w-4" />
          <span className="sr-only">About private mode</span>
        </button>
        <div
          id={tooltipId}
          role="tooltip"
          className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-52 -translate-x-1/2 rounded-lg bg-zinc-900 px-2.5 py-2 text-xs leading-snug text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover/info:opacity-100 group-focus-within/info:opacity-100"
        >
          Private Mode prevents your searches from being displayed on the Most Recent Searches board and the global map cache.
          <span
            className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-zinc-900"
            aria-hidden
          />
        </div>
      </div>

      <button
        id={switchId}
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={() => onChange(!enabled)}
        className={`relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-amber-300 focus:ring-offset-2 focus:ring-offset-white/95 ${enabled ? "bg-amber-600" : "bg-zinc-300"
          }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-5" : "translate-x-0"
            }`}
          aria-hidden
        />
        <span className="sr-only">
          {enabled ? "Private mode on" : "Private mode off"}
        </span>
      </button>
    </div>
  );
}
