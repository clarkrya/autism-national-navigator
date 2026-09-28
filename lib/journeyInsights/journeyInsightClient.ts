import {
    buildStageCompletionAggregateId,
    buildTaskCompletionAggregateId,
  } from "./journeyInsightAggregateKeys";
  
  import {
    getJourneyInsightAggregate,
  } from "./journeyInsightAggregateRepository";
  
  import type {
    JourneyInsightCohortDefinition,
  } from "./journeyInsightAggregationTypes";
  
  import type {
    PublicJourneyInsightResponse,
  } from "./journeyInsightPublicTypes";
  
  /*
   * ============================================================
   * JOURNEY INSIGHT CLIENT
   * ============================================================
   *
   * Family-facing access to safe aggregate Journey Insights.
   * ============================================================
   */
  
  /*
   * ============================================================
   * TASK COMPLETION INSIGHT
   * ============================================================
   */
  
  export async function getTaskCompletionInsight(
    taskId: string,
    cohort: JourneyInsightCohortDefinition
  ): Promise<PublicJourneyInsightResponse> {
    const normalizedTaskId =
      taskId.trim();
  
    if (!normalizedTaskId) {
      return {
        available: false,
        reason: "not_available",
        insight: null,
      };
    }
  
    const aggregateId =
      buildTaskCompletionAggregateId(
        normalizedTaskId,
        cohort
      );
  
    return getJourneyInsightAggregate(
      aggregateId
    );
  }
  
  /*
   * ============================================================
   * STAGE COMPLETION INSIGHT
   * ============================================================
   */
  
  export async function getStageCompletionInsight(
    stageNumber: number,
    cohort: JourneyInsightCohortDefinition
  ): Promise<PublicJourneyInsightResponse> {
    const normalizedStageNumber =
      Math.max(
        1,
        Math.floor(stageNumber)
      );
  
    const aggregateId =
      buildStageCompletionAggregateId(
        normalizedStageNumber,
        cohort
      );
  
    return getJourneyInsightAggregate(
      aggregateId
    );
  }