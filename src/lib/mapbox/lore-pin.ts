const MAX_HEADLINE_LENGTH = 52;

export function truncateHeadline(headline: string): string {
  if (headline.length <= MAX_HEADLINE_LENGTH) {
    return headline;
  }

  return `${headline.slice(0, MAX_HEADLINE_LENGTH - 1)}…`;
}

export function createLorePinElement(headline: string): HTMLDivElement {
  const root = document.createElement("div");
  root.className = "lore-map-pin";

  const label = document.createElement("div");
  label.className = "lore-map-pin__label";
  label.textContent = truncateHeadline(headline);

  const dot = document.createElement("div");
  dot.className = "lore-map-pin__dot";
  dot.setAttribute("aria-hidden", "true");

  root.append(label, dot);
  return root;
}

export function buildLorePopupHtml(item: {
  headline?: string;
  title?: string;
  hook?: string;
  wikipediaUrl?: string;
}): string {
  const title = item.headline ?? item.title ?? "Local story";
  const hook = item.hook
    ? `<p class="lore-map-popup__hook">${escapeHtml(item.hook)}</p>`
    : "";
  const link = item.wikipediaUrl
    ? `<a class="lore-map-popup__link" href="${escapeHtml(item.wikipediaUrl)}" target="_blank" rel="noopener noreferrer">Read on Wikipedia</a>`
    : "";

  return `<div class="lore-map-popup">
    <p class="lore-map-popup__title">${escapeHtml(title)}</p>
    ${hook}
    ${link}
  </div>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
