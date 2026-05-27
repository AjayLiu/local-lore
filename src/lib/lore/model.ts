/**
 * Default gemini-3.1-flash-lite — high free-tier quota and one generateText per search.
 * Override with LORE_MODEL_ID in .env.local.
 */
export const LORE_MODEL_ID =
  process.env.LORE_MODEL_ID?.trim() || "gemini-3.1-flash-lite";

/**
 * Comma-separated fallbacks tried only after LORE_MODEL_ID hits 503/502/504.
 * 429 and 403 never trigger fallback — the job stays on LORE_MODEL_ID and QStash retries.
 * Default: gemini-2.5-flash, then gemini-2.5-flash-lite
 */
export const LORE_MODEL_FALLBACK_IDS = (
  process.env.LORE_MODEL_FALLBACK_IDS?.trim() ||
  "gemini-2.5-flash,gemini-2.5-flash-lite"
)
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);

/** Primary model first, then fallbacks (deduped, stable order). */
export function pickLoreModelChain(): string[] {
  const chain: string[] = [LORE_MODEL_ID];
  for (const id of LORE_MODEL_FALLBACK_IDS) {
    if (!chain.includes(id)) {
      chain.push(id);
    }
  }
  return chain;
}
