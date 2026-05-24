import { google } from "@ai-sdk/google";

export const LORE_MODEL_ID = "gemini-3.5-flash" as const;

export const loreModel = google(LORE_MODEL_ID);
