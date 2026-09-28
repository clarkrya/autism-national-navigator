import type {
    JourneyInsightAgeBand,
    JourneyInsightFocus,
  } from "./journeyAnalyticsTypes";
  
  /*
   * ============================================================
   * JOURNEY INSIGHT AGGREGATION TYPES
   * ============================================================
   */
  
  /*
   * A family is represented by one child Journey participant.
   *
   * We do not expose the underlying userId or childId in
   * aggregate results.
   */
  export interface JourneyInsightCohortDefinition {
    focus?: JourneyInsightFocus;
    ageBand?: JourneyInsightAgeBand;
    stageNumber?: number;
  }
  
  /*
   * ============================================================
   * AGGREGATION AVAILABILITY
   * ============================================================
   */
  
  export type JourneyInsightAggregateAvailability =
    | {
        available: true;
        cohortSize: number;
      }
    | {
        available: false;
        cohortSize: number;
        reason:
          | "insufficient_data"
          | "no_matching_cohort";
      };
  
  /*
   * ============================================================
   * TASK COMPLETION AGGREGATE
   * ============================================================
   */
  
  export interface JourneyTaskCompletionAggregate {
    taskId: string;
  
    cohort:
      JourneyInsightCohortDefinition;
  
    /*
     * Distinct comparable families represented.
     */
    cohortSize: number;
  
    /*
     * Distinct comparable families whose latest known
     * state for this task is completed.
     */
    completedFamilyCount: number;
  
    /*
     * Real percentage calculated from Myriad events.
     *
     * Never populated from fallback or placeholder data.
     */
    completionPercent: number;
  
    calculatedAt: number;
  }
  
  /*
   * ============================================================
   * STAGE PROGRESSION AGGREGATE
   * ============================================================
   */
  
  export interface JourneyStageProgressionAggregate {
    stageNumber: number;
  
    cohort:
      JourneyInsightCohortDefinition;
  
    cohortSize: number;
  
    completedFamilyCount: number;
  
    completionPercent: number;
  
    calculatedAt: number;
  }
  
  /*
   * ============================================================
   * SAFE RESULT
   * ============================================================
   */
  
  export type JourneyInsightAggregateResult<T> =
    | {
        available: true;
  
        cohortSize: number;
  
        data: T;
      }
    | {
        available: false;
  
        cohortSize: number;
  
        reason:
          | "insufficient_data"
          | "no_matching_cohort";
  
        data: null;
      };