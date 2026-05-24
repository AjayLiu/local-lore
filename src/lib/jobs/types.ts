import { z } from "zod";
import { loreItemSchema } from "@/lib/lore/schema";

export const loreJobStatusSchema = z.enum(["pending", "complete", "failed"]);

export type LoreJobStatus = z.infer<typeof loreJobStatusSchema>;

export const loreJobRecordSchema = z.object({
  jobId: z.string().uuid(),
  status: loreJobStatusSchema,
  latitude: z.number(),
  longitude: z.number(),
  label: z.string(),
  items: z.array(loreItemSchema).optional(),
  error: z.string().optional(),
  createdAt: z.string(),
});

export type LoreJobRecord = z.infer<typeof loreJobRecordSchema>;

export const loreJobResponseSchema = z.object({
  jobId: z.string(),
  status: loreJobStatusSchema,
  items: z.array(loreItemSchema).optional(),
  error: z.string().optional(),
});

export type LoreJobResponse = z.infer<typeof loreJobResponseSchema>;

export const loreEnqueueResponseSchema = z.object({
  jobId: z.string(),
  status: z.literal("pending"),
});
