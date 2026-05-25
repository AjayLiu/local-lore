import { google } from "@ai-sdk/google";

/**
 * Default gemini-3.1-flash-lite — high free-tier quota and one generateText per search.
 * Override with LORE_MODEL_ID in .env.local.
 */
export const LORE_MODEL_ID =
  process.env.LORE_MODEL_ID?.trim() || "gemini-3.1-flash-lite";

export const loreModel = google(LORE_MODEL_ID);
