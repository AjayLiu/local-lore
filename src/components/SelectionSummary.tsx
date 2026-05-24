import type { SelectedLocation } from "@/lib/types/location";

type SelectionSummaryProps = {
  location: SelectedLocation;
  onSearchAgain: () => void;
};

export function SelectionSummary({
  location,
  onSearchAgain,
}: SelectionSummaryProps) {
  return (
    <section
      className="w-full rounded-xl border border-amber-200 bg-amber-50 p-6 text-left"
      aria-live="polite"
    >
      <h2 className="text-sm font-medium uppercase tracking-wide text-amber-800">
        Location selected
      </h2>
      <p className="mt-2 text-xl font-semibold text-zinc-900">{location.label}</p>
      <dl className="mt-4 grid gap-2 text-sm text-zinc-700 sm:grid-cols-2">
        <div>
          <dt className="font-medium text-zinc-500">Latitude</dt>
          <dd className="font-mono">{location.latitude.toFixed(6)}</dd>
        </div>
        <div>
          <dt className="font-medium text-zinc-500">Longitude</dt>
          <dd className="font-mono">{location.longitude.toFixed(6)}</dd>
        </div>
      </dl>
      <button
        type="button"
        onClick={onSearchAgain}
        className="mt-6 rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-900 transition hover:bg-amber-100"
      >
        Search again
      </button>
    </section>
  );
}
