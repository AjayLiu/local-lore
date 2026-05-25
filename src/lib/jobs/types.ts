import { z } from "zod";
import { loreItemSchema } from "@/lib/lore/schema";
import { loreJobStageSchema } from "./lore-stages";

export const loreJobStatusSchema = z.enum([
  "pending",
  "processing",
  "complete",
  "failed",
]);

export type LoreJobStatus = z.infer<typeof loreJobStatusSchema>;

export const loreJobRecordSchema = z.object({
  jobId: z.string().uuid(),
  status: loreJobStatusSchema,
  latitude: z.number(),
  longitude: z.number(),
  label: z.string(),
  private: z.boolean().optional(),
  items: z.array(loreItemSchema).optional(),
  error: z.string().optional(),
  createdAt: z.string(),
  stage: loreJobStageSchema.optional(),
  stageCount: z.number().int().nonnegative().optional(),
  processingStartedAt: z.string().optional(),
  stageStartedAt: z.string().optional(),
});

export type LoreJobRecord = z.infer<typeof loreJobRecordSchema>;

export const loreJobResponseSchema = z.object({
  jobId: z.string(),
  status: loreJobStatusSchema,
  items: z.array(loreItemSchema).optional(),
  error: z.string().optional(),
  /** 1-based place in line while status is pending */
  queuePosition: z.number().int().positive().optional(),
  /** Estimated 0–100 progress for the loading UI */
  progressPercent: z.number().min(0).max(100).optional(),
  stage: loreJobStageSchema.optional(),
  stageCount: z.number().int().nonnegative().optional(),
  stageMessage: z.string().optional(),
});

export type LoreJobResponse = z.infer<typeof loreJobResponseSchema>;

export const loreEnqueueResponseSchema = z.object({
  jobId: z.string(),
  status: z.literal("pending"),
});
