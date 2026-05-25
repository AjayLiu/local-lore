import { z } from "zod";

export const loreJobStageSchema = z.enum([
  "fetching_nearby",
  "curating",
  "generating_headlines",
]);

export type LoreJobStage = z.infer<typeof loreJobStageSchema>;

/** Observed solo-queue runtime for progress estimation. */
export const TYPICAL_LORE_JOB_MS = 10_000;

/** Extra wait per job ahead in the Redis pending queue. */
export const TYPICAL_QUEUE_SLOT_MS = TYPICAL_LORE_JOB_MS;

/** Expected duration of each pipeline stage (sums to TYPICAL_LORE_JOB_MS). */
export const STAGE_DURATION_MS: Record<LoreJobStage, number> = {
  fetching_nearby: 3_500,
  curating: 500,
  generating_headlines: 6_000,
};

/** Progress range (0–100) while status is processing. */
export const STAGE_PROGRESS_RANGE: Record<
  LoreJobStage,
  { start: number; end: number }
> = {
  fetching_nearby: { start: 8, end: 42 },
  curating: { start: 42, end: 48 },
  generating_headlines: { start: 48, end: 95 },
};

export function expectedHeadlineCount(eligibleCount: number): number {
  if (eligibleCount <= 0) {
    return 0;
  }
  if (eligibleCount <= 20) {
    return eligibleCount;
  }
  return 25;
}

export function formatLoreStageMessage(
  stage: LoreJobStage,
  count?: number,
): string {
  switch (stage) {
    case "fetching_nearby":
      if (count != null) {
        return `Fetching nearby ${count} ${count === 1 ? "article" : "articles"}…`;
      }
      return "Fetching nearby Wikipedia articles…";
    case "curating":
      if (count != null) {
        return `Finding the most interesting ${count} ${count === 1 ? "article" : "articles"}…`;
      }
      return "Finding the most interesting articles…";
    case "generating_headlines":
      if (count != null) {
        return `Generating ${count} ${count === 1 ? "headline" : "headlines"}…`;
      }
      return "Generating headlines…";
  }
}
