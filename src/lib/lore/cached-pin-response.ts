import { z } from "zod";
import { loreItemSchema } from "./schema";

const cachedLorePinSchema = loreItemSchema.pick({
  pageId: true,
  title: true,
  headline: true,
  hook: true,
  wikipediaUrl: true,
  latitude: true,
  longitude: true,
}).extend({
  imageUrl: z.string().url().optional(),
});

export const cachedLoreResponseSchema = z.object({
  items: z.array(cachedLorePinSchema),
});
