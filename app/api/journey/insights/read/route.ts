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
   * FAMILY-FACING JOURNEY INSIGHT READ ENDPOINT
   * ============================================================
   *
   * This endpoint exposes ONLY safe aggregate Journey Insight data.
   *
   * It never returns:
   *
   * - userId
   * - childId
   * - child/family names
   * - free text
   * - raw Journey events
   * - individual-family activity
   *
   * Raw analytics remain server-only.
   * ============================================================
   */
  
  export const runtime =
    "nodejs";
  
  export const dynamic =
    "force-dynamic";
  
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
      value.trim() as
        JourneyInsightFocus;
  
    return VALID_FOCUSES.has(
      normalized
    )
      ? normalized
      : null;
  }
  
  function parseStageNumber(
    value: string | null
  ): number | null {
    if (!value) {
      return null;
    }
  
    const parsed =
      Number(value);
  
    if (
      !Number.isInteger(parsed) ||
      parsed < 1
    ) {
      return null;
    }
  
    return parsed;
  }
  
  export async function GET(
    request: NextRequest
  ) {
    try {
      const focus =
        parseFocus(
          request.nextUrl.searchParams.get(
            "focus"
          )
        );
  
      const stageNumber =
        parseStageNumber(
          request.nextUrl.searchParams.get(
            "stageNumber"
          )
        );
  
      if (
        !focus ||
        !stageNumber
      ) {
        return NextResponse.json(
          unavailable(
            "not_available"
          ),
          {
            status: 400,
          }
        );
      }
  
      /*
       * ----------------------------------------------------------
       * IMPORTANT
       * ----------------------------------------------------------
       *
       * Production cohort:
       *
       *   same Journey focus
       *   +
       *   same Journey stage
       *
       * We intentionally do not add ageBand here yet.
       */
  
      const cohort = {
        focus,
        stageNumber,
      };
  
      const aggregateId =
        buildStageCompletionAggregateId(
          stageNumber,
          cohort
        );
  
      const adminDb =
        await getAdminDb();
  
      const snapshot =
        await adminDb
          .collection(
            AGGREGATE_COLLECTION
          )
          .doc(
            aggregateId
          )
          .get();
  
      if (!snapshot.exists) {
        return NextResponse.json(
          unavailable(
            "insufficient_data"
          )
        );
      }
  
      const data =
        snapshot.data();
  
      if (
        !data ||
        data.metricType !==
          "stage_completion"
      ) {
        return NextResponse.json(
          unavailable(
            "not_available"
          )
        );
      }
  
      const cohortSize =
        Number(
          data.cohortSize
        );
  
      const completedFamilyCount =
        Number(
          data.completedFamilyCount
        );
  
      const completionPercent =
        Number(
          data.completionPercent
        );
  
      const calculatedAt =
        Number(
          data.calculatedAt
        );
  
      /*
       * ----------------------------------------------------------
       * SERVER-SIDE PRIVACY GUARD
       * ----------------------------------------------------------
       *
       * Even if an invalid aggregate document somehow exists,
       * never expose it below the minimum cohort.
       */
  
      if (
        !Number.isFinite(
          cohortSize
        ) ||
        cohortSize <
          JOURNEY_INSIGHT_MINIMUM_COHORT_SIZE
      ) {
        return NextResponse.json(
          unavailable(
            "insufficient_data"
          )
        );
      }
  
      if (
        !Number.isFinite(
          completedFamilyCount
        ) ||
        completedFamilyCount < 0 ||
        completedFamilyCount >
          cohortSize
      ) {
        return NextResponse.json(
          unavailable(
            "not_available"
          )
        );
      }
  
      if (
        !Number.isFinite(
          completionPercent
        ) ||
        completionPercent < 0 ||
        completionPercent > 100
      ) {
        return NextResponse.json(
          unavailable(
            "not_available"
          )
        );
      }
  
      if (
        !Number.isFinite(
          calculatedAt
        ) ||
        calculatedAt <= 0
      ) {
        return NextResponse.json(
          unavailable(
            "not_available"
          )
        );
      }
  
      /*
       * ----------------------------------------------------------
       * SAFE PUBLIC RESPONSE
       * ----------------------------------------------------------
       */
  
      const response:
        PublicJourneyInsightResponse = {
          available: true,
  
          insight: {
            type:
              "stage_completion",
  
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
        response
      );
    } catch (error) {
      console.error(
        "Unable to read Journey Insight:",
        error
      );
  
      return NextResponse.json(
        unavailable(
          "not_available"
        ),
        {
          status: 500,
        }
      );
    }
  }