import type {
    JourneyInsightCohortDefinition,
  } from "./journeyInsightAggregationTypes";
  
  /*
   * ============================================================
   * JOURNEY INSIGHT AGGREGATE KEYS
   * ============================================================
   *
   * Stored aggregate documents need deterministic IDs so the
   * family-facing application can request one specific aggregate
   * without querying raw Journey activity.
   * ============================================================
   */
  
  function normalizeKeyPart(
    value: string | number | undefined
  ): string {
    if (
      value === undefined ||
      value === ""
    ) {
      return "all";
    }
  
    return String(value)
      .trim()
      .toLowerCase()
      .replace(
        /[^a-z0-9_-]+/g,
        "_"
      );
  }
  
  function cohortKey(
    cohort: JourneyInsightCohortDefinition
  ): string {
    return [
      `focus_${normalizeKeyPart(
        cohort.focus
      )}`,
  
      `age_${normalizeKeyPart(
        cohort.ageBand
      )}`,
  
      `stage_${normalizeKeyPart(
        cohort.stageNumber
      )}`,
    ].join("__");
  }
  
  /*
   * ============================================================
   * TASK AGGREGATE ID
   * ============================================================
   */
  
  export function buildTaskCompletionAggregateId(
    taskId: string,
    cohort: JourneyInsightCohortDefinition
  ): string {
    const normalizedTaskId =
      normalizeKeyPart(
        taskId
      );
  
    return [
      "task_completion",
      normalizedTaskId,
      cohortKey(cohort),
    ].join("__");
  }
  
  /*
   * ============================================================
   * STAGE AGGREGATE ID
   * ============================================================
   */
  
  export function buildStageCompletionAggregateId(
    stageNumber: number,
    cohort: JourneyInsightCohortDefinition
  ): string {
    const normalizedStage =
      Math.max(
        1,
        Math.floor(
          stageNumber
        )
      );
  
    return [
      "stage_completion",
      normalizedStage,
      cohortKey(cohort),
    ].join("__");
  }