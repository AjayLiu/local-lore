import { z } from "zod";

export const loreItemSchema = z.object({
  pageId: z.number(),
  title: z.string(),
  headline: z.string().max(80),
  hook: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  wikipediaUrl: z.string().url(),
  /** Wikipedia lead image; attached server-side from pageId, not from the model. */
  imageUrl: z.string().url().optional(),
});

export type LoreItem = z.infer<typeof loreItemSchema>;

/** Matches AI SDK `Output.array` wire format (`{ elements: [...] }`). */
export const loreStreamSchema = z.object({
  elements: z.array(loreItemSchema),
});

export type LoreStream = z.infer<typeof loreStreamSchema>;

export const loreRequestSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  label: z.string().min(1),
});

export type LoreRequest = z.infer<typeof loreRequestSchema>;
