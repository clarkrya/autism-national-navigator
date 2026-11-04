import type {
    JourneyAnalyticsContext,
    JourneyInsightAgeBand,
    JourneyInsightFocus,
  } from "./journeyAnalyticsTypes";
  
  /*
   * ============================================================
   * JOURNEY ANALYTICS CONTEXT
   * ============================================================
   *
   * Converts existing Journey / Family Profile information into
   * standardized analytics cohort dimensions.
   *
   * IMPORTANT:
   *
   * - No comparison statistics are calculated here.
   * - No fake data is generated here.
   * - Unsupported Journey stages are not guessed.
   * - Ages that cannot be interpreted safely use "unknown".
   * - These values describe broad comparison cohorts only.
   * ============================================================
   */
  
  /*
   * ============================================================
   * AGE BAND
   * ============================================================
   */
  
  export function getJourneyInsightAgeBand(
    childAge: string
  ): JourneyInsightAgeBand {
    const normalizedAge =
      childAge.trim();
  
    if (!normalizedAge) {
      return "unknown";
    }
  
    /*
     * FamilyProfile currently stores childAge as a string.
     *
     * This supports existing values such as:
     *
     * "6"
     * "6 years"
     * "Age 6"
     *
     * If a usable age cannot be found, return "unknown"
     * rather than guessing.
     */
  
    const ageMatch =
      normalizedAge.match(
        /\d+/
      );
  
    if (!ageMatch) {
      return "unknown";
    }
  
    const age =
      Number(
        ageMatch[0]
      );
  
    if (
      !Number.isFinite(age) ||
      age < 0
    ) {
      return "unknown";
    }
  
    if (age <= 3) {
      return "0_3";
    }
  
    if (age <= 5) {
      return "4_5";
    }
  
    if (age <= 9) {
      return "6_9";
    }
  
    if (age <= 13) {
      return "10_13";
    }
  
    if (age <= 17) {
      return "14_17";
    }
  
    return "18_plus";
  }
  
  /*
   * ============================================================
   * JOURNEY FOCUS
   * ============================================================
   *
   * FamilyProfile.journeyStage currently uses:
   *
   * concerned
   * evaluation
   * diagnosis
   * therapies
   * school
   * adulthood
   *
   * These are mapped into the broader, stable Journey Insights
   * focus categories stored in analytics.
   * ============================================================
   */
  
  export function getJourneyInsightFocus(
    journeyStage: string
  ): JourneyInsightFocus | undefined {
    const normalizedStage =
      journeyStage
        .trim()
        .toLowerCase();
  
    switch (normalizedStage) {
      case "concerned":
      case "evaluation":
      case "diagnosis":
        return "diagnosis_evaluation";
  
      case "therapies":
        return "therapy";
  
      case "school":
        return "school_iep";
  
      case "adulthood":
        return "transition";
  
      default:
        /*
         * Do not automatically assign "general" or "other".
         *
         * A future Journey Stage should be deliberately mapped
         * before it becomes part of aggregate comparisons.
         */
        return undefined;
    }
  }
  
  /*
   * ============================================================
   * BUILD ANALYTICS CONTEXT
   * ============================================================
   */
  
  export interface BuildJourneyAnalyticsContextInput {
    journeyId: string;
  
    stageNumber: number;
  
    childAge: string;
  
    journeyStage: string;
  }
  
  export function buildJourneyAnalyticsContext(
    input: BuildJourneyAnalyticsContextInput
  ): JourneyAnalyticsContext {
    const journeyId =
      input.journeyId.trim();
  
    if (!journeyId) {
      throw new Error(
        "journeyId is required to build Journey analytics context."
      );
    }
  
    const stageNumber =
      Math.max(
        1,
        Math.floor(
          input.stageNumber
        )
      );
  
    const ageBand =
      getJourneyInsightAgeBand(
        input.childAge
      );
  
    const focus =
      getJourneyInsightFocus(
        input.journeyStage
      );
  
    return {
      journeyId,
  
      stageNumber,
  
      ageBand,
  
      ...(focus
        ? {
            focus,
          }
        : {}),
    };
  }