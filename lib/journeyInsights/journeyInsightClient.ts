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
 *
 * IMPORTANT:
 * Browser code does NOT read journeyInsightAggregates directly.
 *
 * All family-facing reads go through the trusted server API.
 * ============================================================
 */

function notAvailable(): PublicJourneyInsightResponse {
  return {
    available: false,
    reason: "not_available",
    insight: null,
  };
}

/*
 * ============================================================
 * STAGE COMPLETION INSIGHT
 * ============================================================
 *
 * Stage completion is the first family-facing Journey Insight.
 *
 * We intentionally do not expose task completion insights yet.
 * The current task-event denominator is not strong enough for a
 * family-facing "% of similar families completed this step"
 * statement.
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

  /*
   * Current production aggregation uses:
   *
   *   Journey focus + Journey stage
   *
   * Age band is collected for future cohort refinement but is
   * intentionally not used in the first production comparison.
   */

  const focus =
    cohort.focus?.trim();

  if (!focus) {
    return notAvailable();
  }

  try {
    const params =
      new URLSearchParams({
        focus,
        stageNumber:
          String(
            normalizedStageNumber
          ),
      });

    const response =
      await fetch(
        `/api/journey/insights/read?${params.toString()}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

    if (!response.ok) {
      return notAvailable();
    }

    const data =
      (await response.json()) as
        PublicJourneyInsightResponse;

    if (
      !data ||
      typeof data !== "object" ||
      typeof data.available !== "boolean"
    ) {
      return notAvailable();
    }

    return data;
  } catch (error) {
    console.error(
      "Unable to load Journey Insight:",
      error
    );

    return notAvailable();
  }
}