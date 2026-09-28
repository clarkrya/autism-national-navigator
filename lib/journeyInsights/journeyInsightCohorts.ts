import type {
    JourneyInsightAgeBand,
    JourneyInsightFocus,
  } from "./journeyAnalyticsTypes";
  
  import type {
    JourneyInsightAggregateAvailability,
    JourneyInsightCohortDefinition,
  } from "./journeyInsightAggregationTypes";
  
  /*
   * ============================================================
   * COHORT PRIVACY CONFIGURATION
   * ============================================================
   *
   * This threshold controls whether a family-facing comparison
   * may be displayed.
   *
   * IMPORTANT:
   *
   * This is NOT fake analytics data.
   *
   * It is a privacy/product eligibility threshold.
   *
   * No percentages or comparison statistics are fabricated
   * when the threshold is not met.
   * ============================================================
   */
  
  export const JOURNEY_INSIGHT_MINIMUM_COHORT_SIZE =
    25;
  
  /*
   * ============================================================
   * COHORT BUILDER
   * ============================================================
   */
  
  export interface BuildJourneyInsightCohortInput {
    focus?: JourneyInsightFocus;
  
    ageBand?: JourneyInsightAgeBand;
  
    stageNumber?: number;
  }
  
  export function buildJourneyInsightCohort(
    input: BuildJourneyInsightCohortInput
  ): JourneyInsightCohortDefinition {
    const cohort:
      JourneyInsightCohortDefinition = {};
  
    if (input.focus) {
      cohort.focus =
        input.focus;
    }
  
    if (input.ageBand) {
      cohort.ageBand =
        input.ageBand;
    }
  
    if (
      typeof input.stageNumber ===
        "number" &&
      Number.isFinite(
        input.stageNumber
      )
    ) {
      cohort.stageNumber =
        Math.max(
          1,
          Math.floor(
            input.stageNumber
          )
        );
    }
  
    return cohort;
  }
  
  /*
   * ============================================================
   * AVAILABILITY
   * ============================================================
   */
  
  export function getJourneyInsightAvailability(
    cohortSize: number
  ): JourneyInsightAggregateAvailability {
    const normalizedSize =
      Math.max(
        0,
        Math.floor(
          cohortSize
        )
      );
  
    if (
      normalizedSize === 0
    ) {
      return {
        available: false,
        cohortSize: 0,
        reason:
          "no_matching_cohort",
      };
    }
  
    if (
      normalizedSize <
      JOURNEY_INSIGHT_MINIMUM_COHORT_SIZE
    ) {
      return {
        available: false,
        cohortSize:
          normalizedSize,
        reason:
          "insufficient_data",
      };
    }
  
    return {
      available: true,
      cohortSize:
        normalizedSize,
    };
  }