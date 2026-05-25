import {
  STAGE_DURATION_MS,
  STAGE_PROGRESS_RANGE,
  TYPICAL_LORE_JOB_MS,
  TYPICAL_QUEUE_SLOT_MS,
  type LoreJobStage,
} from "./lore-stages";
import type { LoreJobStatus } from "./types";

export function getLoreJobProgressPercent(input: {
  status: LoreJobStatus;
  queuePosition?: number;
  stage?: LoreJobStage;
  processingStartedAt?: string;
  stageStartedAt?: string;
}): number {
  const { status, queuePosition, stage, processingStartedAt, stageStartedAt } =
    input;

  if (status === "complete") {
    return 100;
  }
  if (status === "failed") {
    return 0;
  }

  if (status === "pending") {
    if (queuePosition != null && queuePosition > 1) {
      const waitMs = (queuePosition - 1) * TYPICAL_QUEUE_SLOT_MS;
      const waitProgress = Math.min(6, (waitMs / TYPICAL_LORE_JOB_MS) * 6);
      return Math.max(2, Math.round(waitProgress));
    }
    return 3;
  }

  const processingStart = processingStartedAt
    ? Date.parse(processingStartedAt)
    : NaN;
  const now = Date.now();
  const elapsed =
    Number.isFinite(processingStart) ? Math.max(0, now - processingStart) : 0;

  const timeBased = 8 + 87 * Math.min(1, elapsed / TYPICAL_LORE_JOB_MS);

  if (!stage) {
    return Math.round(Math.min(95, timeBased));
  }

  const range = STAGE_PROGRESS_RANGE[stage];
  const stageStart = stageStartedAt ? Date.parse(stageStartedAt) : processingStart;
  const stageElapsed =
    Number.isFinite(stageStart) ? Math.max(0, now - stageStart) : elapsed;
  const stageDuration = STAGE_DURATION_MS[stage];
  const stageRatio = Math.min(1, stageElapsed / stageDuration);
  const stageBased =
    range.start + (range.end - range.start) * stageRatio;

  return Math.round(Math.min(95, Math.max(timeBased, stageBased)));
}
