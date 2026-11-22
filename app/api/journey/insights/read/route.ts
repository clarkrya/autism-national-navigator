
import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getAdminDb,
} from "../../../../../lib/firebaseAdmin";

import {
  buildStageCompletionAggregateId,
} from "../../../../../lib/journeyInsights/journeyInsightAggregateKeys";

import {
  JOURNEY_INSIGHT_MINIMUM_COHORT_SIZE,
} from "../../../../../lib/journeyInsights/journeyInsightCohorts";

import type {
  JourneyInsightFocus,
} from "../../../../../lib/journeyInsights/journeyAnalyticsTypes";

import type {
  PublicJourneyInsightResponse,
} from "../../../../../lib/journeyInsights/journeyInsightPublicTypes";

/*
 * ============================================================
 * AUTIVOYA JOURNEY INSIGHTS
 * ============================================================
 *
 * Privacy-safe aggregate insight endpoint.
 *
 * Firebase Admin failures do not interrupt
 * the family's personalized Journey.
 *
 * No individual family data is exposed.
 * ============================================================
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AGGREGATE_COLLECTION =
  "journeyInsightAggregates";

const VALID_FOCUSES =
  new Set<JourneyInsightFocus>([
    "diagnosis_evaluation",
    "medical",
    "school_iep",
    "therapy",
    "insurance_benefits",
    "financial_support",
    "family_support",
    "transition",
    "general",
    "other",
  ]);

function unavailable(
  reason:
    | "insufficient_data"
    | "not_available"
): PublicJourneyInsightResponse {
  return {
    available: false,
    reason,
    insight: null,
  };
}

function parseFocus(
  value: string | null
): JourneyInsightFocus | null {
  if (!value) {
    return null;
  }

  const normalized =
    value.trim() as JourneyInsightFocus;

  return VALID_FOCUSES.has(normalized)
    ? normalized
    : null;
}

function parseStageNumber(
  value: string | null
): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number(value);

  return Number.isInteger(parsed) &&
    parsed >= 1
    ? parsed
    : null;
}

/*
 * ============================================================
 * SAFE RESPONSE
 * ============================================================
 */

function safeResponse(
  reason:
    | "insufficient_data"
    | "not_available",
  status = 200
) {
  return NextResponse.json(
    unavailable(reason),
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

/*
 * ============================================================
 * GET JOURNEY INSIGHTS
 * ============================================================
 */

export async function GET(
  request: NextRequest
) {
  const focus = parseFocus(
    request.nextUrl.searchParams.get(
      "focus"
    )
  );

  const stageNumber = parseStageNumber(
    request.nextUrl.searchParams.get(
      "stageNumber"
    )
  );

  if (!focus || !stageNumber) {
    return safeResponse(
      "not_available",
      400
    );
  }

  const cohort = {
    focus,
    stageNumber,
  };

  const aggregateId =
    buildStageCompletionAggregateId(
      stageNumber,
      cohort
    );

  /*
   * Firebase Admin is optional for this
   * family-facing feature.
   *
   * If credentials cannot initialize,
   * return an unavailable insight instead
   * of a server error.
   */

  let adminDb;

  try {
    adminDb = getAdminDb();
  } catch {
    return safeResponse("not_available");
  }

  try {
    const snapshot = await adminDb
      .collection(AGGREGATE_COLLECTION)
      .doc(aggregateId)
      .get();

    if (!snapshot.exists) {
      return safeResponse(
        "insufficient_data"
      );
    }

    const data = snapshot.data();

    if (
      !data ||
      data.metricType !==
        "stage_completion"
    ) {
      return safeResponse(
        "not_available"
      );
    }

    const cohortSize = Number(
      data.cohortSize
    );

    const completedFamilyCount = Number(
      data.completedFamilyCount
    );

    const completionPercent = Number(
      data.completionPercent
    );

    const calculatedAt = Number(
      data.calculatedAt
    );

    /*
     * Privacy protection:
     * Never expose small cohorts.
     */

    if (
      !Number.isFinite(cohortSize) ||
      cohortSize <
        JOURNEY_INSIGHT_MINIMUM_COHORT_SIZE
    ) {
      return safeResponse(
        "insufficient_data"
      );
    }

    if (
      !Number.isFinite(
        completedFamilyCount
      ) ||
      completedFamilyCount < 0 ||
      completedFamilyCount > cohortSize
    ) {
      return safeResponse(
        "not_available"
      );
    }

    if (
      !Number.isFinite(
        completionPercent
      ) ||
      completionPercent < 0 ||
      completionPercent > 100
    ) {
      return safeResponse(
        "not_available"
      );
    }

    if (
      !Number.isFinite(
        calculatedAt
      ) ||
      calculatedAt <= 0
    ) {
      return safeResponse(
        "not_available"
      );
    }

    const response:
      PublicJourneyInsightResponse = {
        available: true,

        insight: {
          type: "stage_completion",

          stageNumber,

          cohortSize,

          completedFamilyCount,

          completionPercent,

          cohort: {
            focus,
            stageNumber,
          },

          calculatedAt,
        },
      };

    return NextResponse.json(
      response,
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "Journey Insights aggregate read failed:",
      error
    );

    return safeResponse(
      "not_available"
    );
  }
}
