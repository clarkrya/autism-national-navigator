import type {
    JourneyInsightAgeBand,
    JourneyInsightFocus,
  } from "./journeyAnalyticsTypes";
  
  /*
   * ============================================================
   * STORED JOURNEY INSIGHT AGGREGATES
   * ============================================================
   *
   * These documents contain aggregate statistics only.
   *
   * They MUST NOT contain:
   *
   * - userId
   * - childId
   * - family names
   * - child names
   * - free-text notes
   * - document contents
   * - individual-family activity
   * ============================================================
   */
  
  export type JourneyInsightMetricType =
    | "task_completion"
    | "stage_completion";
  
  /*
   * ============================================================
   * STORED COHORT
   * ============================================================
   */
  
  export interface StoredJourneyInsightCohort {
    focus?: JourneyInsightFocus;
    ageBand?: JourneyInsightAgeBand;
    stageNumber?: number;
  }
  
  /*
   * ============================================================
   * BASE AGGREGATE
   * ============================================================
   */
  
  interface StoredJourneyInsightAggregateBase {
    metricType:
      JourneyInsightMetricType;
  
    cohort:
      StoredJourneyInsightCohort;
  
    /*
     * Number of distinct family/child participants represented.
     */
    cohortSize: number;
  
    /*
     * Number represented in the numerator.
     */
    completedFamilyCount: number;
  
    /*
     * Real calculated percentage.
     *
     * 0 through 100.
     */
    completionPercent: number;
  
    /*
     * When the aggregate was calculated.
     */
    calculatedAt: number;
  
    schemaVersion: 1;
  }
  
  /*
   * ============================================================
   * TASK COMPLETION
   * ============================================================
   */
  
  export interface StoredTaskCompletionAggregate
    extends StoredJourneyInsightAggregateBase {
    metricType: "task_completion";
  
    taskId: string;
  }
  
  /*
   * ============================================================
   * STAGE COMPLETION
   * ============================================================
   */
  
  export interface StoredStageCompletionAggregate
    extends StoredJourneyInsightAggregateBase {
    metricType: "stage_completion";
  
    stageNumber: number;
  }
  
  /*
   * ============================================================
   * STORED AGGREGATE
   * ============================================================
   */
  
  export type StoredJourneyInsightAggregate =
    | StoredTaskCompletionAggregate
    | StoredStageCompletionAggregate;