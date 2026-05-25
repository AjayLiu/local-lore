import { nextRoundRobinIndex } from "./model-rotation";

/**
 * Default gemini-3.1-flash-lite — high free-tier quota and one generateText per search.
 * Override with LORE_MODEL_ID in .env.local.
 */
export const LORE_MODEL_ID =
  process.env.LORE_MODEL_ID?.trim() || "gemini-3.1-flash-lite";

/**
 * Comma-separated fallbacks tried in order after the round-robin primary (on 503, etc.).
 * Default: gemini-2.5-flash, then gemini-2.5-flash-lite
 */
export const LORE_MODEL_FALLBACK_IDS = (
  process.env.LORE_MODEL_FALLBACK_IDS?.trim() ||
  "gemini-2.5-flash,gemini-2.5-flash-lite"
)
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);

/** All models used for rotation and transient fallbacks (deduped, stable order). */
export const LORE_MODEL_POOL = [
  ...new Set([LORE_MODEL_ID, ...LORE_MODEL_FALLBACK_IDS]),
];

/**
 * Round-robin primary, then LORE_MODEL_ID (if not primary), then fallbacks in env order.
 */
export async function pickLoreModelChain(): Promise<string[]> {
  if (LORE_MODEL_POOL.length === 0) {
    return [LORE_MODEL_ID];
  }

  const startIndex = await nextRoundRobinIndex(LORE_MODEL_POOL.length);
  const primary = LORE_MODEL_POOL[startIndex];

  const chain: string[] = [primary];
  if (primary !== LORE_MODEL_ID) {
    chain.push(LORE_MODEL_ID);
  }
  for (const id of LORE_MODEL_FALLBACK_IDS) {
    if (!chain.includes(id)) {
      chain.push(id);
    }
  }
  return chain;
}
