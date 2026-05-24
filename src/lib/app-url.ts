import { isLocalQStash } from "@/lib/qstash/env";

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/$/, "");
}

function isLoopbackAppUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

/**
 * Public base URL QStash uses to POST `/api/cron/process-lore`.
 * With local QStash in development, defaults to this dev server (not LORE_APP_URL on Vercel).
 */
export function getLoreAppUrl(): string {
  const localOverride = process.env.LORE_APP_URL_LOCAL?.trim();
  if (localOverride) {
    return normalizeBaseUrl(localOverride);
  }

  if (isLocalQStash() && process.env.NODE_ENV === "development") {
    const explicit = process.env.LORE_APP_URL?.trim();
    if (explicit && isLoopbackAppUrl(explicit)) {
      return normalizeBaseUrl(explicit);
    }

    const port = process.env.PORT?.trim() || "3000";
    return `http://127.0.0.1:${port}`;
  }

  const explicit = process.env.LORE_APP_URL?.trim();
  if (explicit) {
    return normalizeBaseUrl(explicit);
  }

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    return `https://${normalizeBaseUrl(vercel)}`;
  }

  throw new Error(
    "LORE_APP_URL is not configured (set it to your public app URL for QStash callbacks)",
  );
}
