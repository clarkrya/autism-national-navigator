import type {
    JourneyInsightAgeBand,
    JourneyInsightFocus,
  } from "./journeyAnalyticsTypes";
  
  /*
   * ============================================================
   * PUBLIC JOURNEY INSIGHT TYPES
   * ============================================================
   *
   * These are safe family-facing response types.
   *
   * Individual family identifiers are intentionally absent.
   * ============================================================
   */
  
  export interface PublicJourneyInsightCohort {
    focus?: JourneyInsightFocus;
    ageBand?: JourneyInsightAgeBand;
    stageNumber?: number;
  }
  
  export interface PublicTaskCompletionInsight {
    type:
      "task_completion";
  
    taskId: string;
  
    cohortSize: number;
  
    completedFamilyCount: number;
  
    completionPercent: number;
  
    cohort:
      PublicJourneyInsightCohort;
  
    calculatedAt: number;
  }
  
  export interface PublicStageCompletionInsight {
    type:
      "stage_completion";
  
    stageNumber: number;
  
    cohortSize: number;
  
    completedFamilyCount: number;
  
    completionPercent: number;
  
    cohort:
      PublicJourneyInsightCohort;
  
    calculatedAt: number;
  }
  
  export type PublicJourneyInsight =
    | PublicTaskCompletionInsight
    | PublicStageCompletionInsight;
  
  export type PublicJourneyInsightResponse =
    | {
        available: true;
  
        insight:
          PublicJourneyInsight;
      }
    | {
        available: false;
  
        reason:
          | "insufficient_data"
          | "not_available";
  
        insight: null;
      };