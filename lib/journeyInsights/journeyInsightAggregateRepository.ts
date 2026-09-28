import {
  doc,
  getDoc,
} from "firebase/firestore";

import {
  db,
} from "../firebase";

import {
  JOURNEY_INSIGHT_MINIMUM_COHORT_SIZE,
} from "./journeyInsightCohorts";

import type {
  StoredJourneyInsightAggregate,
  StoredStageCompletionAggregate,
  StoredTaskCompletionAggregate,
} from "./journeyInsightStoredAggregateTypes";

import type {
  PublicJourneyInsightResponse,
} from "./journeyInsightPublicTypes";

/*
 * ============================================================
 * JOURNEY INSIGHT AGGREGATE REPOSITORY
 * ============================================================
 *
 * Reads de-identified aggregate Journey Insights.
 *
 * This repository NEVER reads journeyAnalyticsEvents.
 * ============================================================
 */

const JOURNEY_INSIGHT_AGGREGATES_COLLECTION =
  "journeyInsightAggregates";

/*
 * ============================================================
 * HELPERS
 * ============================================================
 */

function isValidNumber(
  value: unknown
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value)
  );
}

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

/*
 * ============================================================
 * TASK AGGREGATE VALIDATION
 * ============================================================
 */

function isStoredTaskCompletionAggregate(
  value: unknown
): value is StoredTaskCompletionAggregate {
  if (!isRecord(value)) {
    return false;
  }

  if (
    value.metricType !==
    "task_completion"
  ) {
    return false;
  }

  if (
    typeof value.taskId !==
      "string" ||
    value.taskId.trim().length ===
      0
  ) {
    return false;
  }

  if (
    !isRecord(value.cohort)
  ) {
    return false;
  }

  if (
    !isValidNumber(
      value.cohortSize
    ) ||
    !isValidNumber(
      value.completedFamilyCount
    ) ||
    !isValidNumber(
      value.completionPercent
    ) ||
    !isValidNumber(
      value.calculatedAt
    )
  ) {
    return false;
  }

  if (
    value.cohortSize < 0 ||
    value.completedFamilyCount < 0 ||
    value.completedFamilyCount >
      value.cohortSize ||
    value.completionPercent < 0 ||
    value.completionPercent > 100
  ) {
    return false;
  }

  if (
    value.schemaVersion !== 1
  ) {
    return false;
  }

  return true;
}

/*
 * ============================================================
 * STAGE AGGREGATE VALIDATION
 * ============================================================
 */

function isStoredStageCompletionAggregate(
  value: unknown
): value is StoredStageCompletionAggregate {
  if (!isRecord(value)) {
    return false;
  }

  if (
    value.metricType !==
    "stage_completion"
  ) {
    return false;
  }

  if (
    !isValidNumber(
      value.stageNumber
    ) ||
    value.stageNumber < 1
  ) {
    return false;
  }

  if (
    !isRecord(value.cohort)
  ) {
    return false;
  }

  if (
    !isValidNumber(
      value.cohortSize
    ) ||
    !isValidNumber(
      value.completedFamilyCount
    ) ||
    !isValidNumber(
      value.completionPercent
    ) ||
    !isValidNumber(
      value.calculatedAt
    )
  ) {
    return false;
  }

  if (
    value.cohortSize < 0 ||
    value.completedFamilyCount < 0 ||
    value.completedFamilyCount >
      value.cohortSize ||
    value.completionPercent < 0 ||
    value.completionPercent > 100
  ) {
    return false;
  }

  if (
    value.schemaVersion !== 1
  ) {
    return false;
  }

  return true;
}

/*
 * ============================================================
 * STORED AGGREGATE VALIDATION
 * ============================================================
 */

function isStoredAggregate(
  value: unknown
): value is StoredJourneyInsightAggregate {
  return (
    isStoredTaskCompletionAggregate(
      value
    ) ||
    isStoredStageCompletionAggregate(
      value
    )
  );
}

/*
 * ============================================================
 * READ AGGREGATE
 * ============================================================
 */

export async function getJourneyInsightAggregate(
  aggregateId: string
): Promise<PublicJourneyInsightResponse> {
  const normalizedId =
    aggregateId.trim();

  if (!normalizedId) {
    return {
      available: false,
      reason: "not_available",
      insight: null,
    };
  }

  try {
    const reference =
      doc(
        db,
        JOURNEY_INSIGHT_AGGREGATES_COLLECTION,
        normalizedId
      );

    const snapshot =
      await getDoc(reference);

    if (!snapshot.exists()) {
      return {
        available: false,
        reason: "not_available",
        insight: null,
      };
    }

    const raw =
      snapshot.data();

    if (
      !isStoredAggregate(raw)
    ) {
      console.error(
        "Invalid Journey Insight aggregate document:",
        normalizedId
      );

      return {
        available: false,
        reason: "not_available",
        insight: null,
      };
    }

    /*
     * --------------------------------------------------------
     * MINIMUM COHORT PROTECTION
     * --------------------------------------------------------
     */

    if (
      raw.cohortSize <
      JOURNEY_INSIGHT_MINIMUM_COHORT_SIZE
    ) {
      return {
        available: false,
        reason:
          "insufficient_data",
        insight: null,
      };
    }

    /*
     * --------------------------------------------------------
     * TASK COMPLETION
     * --------------------------------------------------------
     */

    if (
      raw.metricType ===
      "task_completion"
    ) {
      return {
        available: true,

        insight: {
          type:
            "task_completion",

          taskId:
            raw.taskId,

          cohortSize:
            raw.cohortSize,

          completedFamilyCount:
            raw.completedFamilyCount,

          completionPercent:
            raw.completionPercent,

          cohort:
            raw.cohort,

          calculatedAt:
            raw.calculatedAt,
        },
      };
    }

    /*
     * --------------------------------------------------------
     * STAGE COMPLETION
     * --------------------------------------------------------
     */

    return {
      available: true,

      insight: {
        type:
          "stage_completion",

        stageNumber:
          raw.stageNumber,

        cohortSize:
          raw.cohortSize,

        completedFamilyCount:
          raw.completedFamilyCount,

        completionPercent:
          raw.completionPercent,

        cohort:
          raw.cohort,

        calculatedAt:
          raw.calculatedAt,
      },
    };
  } catch (error) {
    console.error(
      "Unable to read Journey Insight aggregate:",
      error
    );

    return {
      available: false,
      reason: "not_available",
      insight: null,
    };
  }
}