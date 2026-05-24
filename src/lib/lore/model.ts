import { google } from "@ai-sdk/google";

/**
 * Default gemini-2.5-flash has a much higher free-tier limit than gemini-3.5-flash (~20/day).
 * Override with LORE_MODEL_ID in .env.local (e.g. gemini-3.5-flash).
 */
export const LORE_MODEL_ID =
  process.env.LORE_MODEL_ID?.trim() || "gemini-2.5-flash";

export const loreModel = google(LORE_MODEL_ID);
