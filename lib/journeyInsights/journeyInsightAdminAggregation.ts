import "server-only";

import {
  FieldPath,
  Timestamp,
} from "firebase-admin/firestore";

import {
  getAdminDb,
} from "../firebaseAdmin";

import {
  calculateStageCompletionAggregate,
  calculateTaskCompletionAggregate,
} from "./journeyInsightAggregation";

import {
  buildStageCompletionAggregateId,
  buildTaskCompletionAggregateId,
} from "./journeyInsightAggregateKeys";

import type {
  JourneyAnalyticsEvent,
  JourneyAnalyticsEventType,
  JourneyInsightAgeBand,
  JourneyInsightFocus,
} from "./journeyAnalyticsTypes";

import type {
  JourneyInsightCohortDefinition,
} from "./journeyInsightAggregationTypes";

import type {
  StoredJourneyInsightAggregate,
} from "./journeyInsightStoredAggregateTypes";

/*
 * ============================================================
 * TRUSTED JOURNEY INSIGHT AGGREGATION
 * ============================================================
 *
 * SERVER ONLY.
 *
 * Reads raw Journey analytics using Firebase Admin and writes
 * only privacy-safe aggregate documents.
 *
 * Firebase Admin is initialized lazily through getAdminDb().
 *
 * Never import this module into a client component.
 * ============================================================
 */

const RAW_COLLECTION =
  "journeyAnalyticsEvents";

const AGGREGATE_COLLECTION =
  "journeyInsightAggregates";

/*
 * ============================================================
 * VALID STORED VALUES
 * ============================================================
 */

const VALID_EVENT_TYPES:
  JourneyAnalyticsEventType[] = [
    "journey_started",
    "stage_started",
    "task_completed",
    "task_uncompleted",
    "stage_completed",
    "resource_opened",
    "template_used",
  ];

const VALID_FOCUS_VALUES:
  JourneyInsightFocus[] = [
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
  ];

const VALID_AGE_BANDS:
  JourneyInsightAgeBand[] = [
    "0_3",
    "4_5",
    "6_9",
    "10_13",
    "14_17",
    "18_plus",
    "unknown",
  ];

/*
 * ============================================================
 * TYPE HELPERS
 * ============================================================
 */

function isRecord(
  value: unknown
): value is Record<
  string,
  unknown
> {
  return (
    typeof value ===
      "object" &&
    value !== null &&
    !Array.isArray(
      value
    )
  );
}

function isEventType(
  value: unknown
): value is JourneyAnalyticsEventType {
  return (
    typeof value ===
      "string" &&
    VALID_EVENT_TYPES.includes(
      value as JourneyAnalyticsEventType
    )
  );
}

function isFocus(
  value: unknown
): value is JourneyInsightFocus {
  return (
    typeof value ===
      "string" &&
    VALID_FOCUS_VALUES.includes(
      value as JourneyInsightFocus
    )
  );
}

function isAgeBand(
  value: unknown
): value is JourneyInsightAgeBand {
  return (
    typeof value ===
      "string" &&
    VALID_AGE_BANDS.includes(
      value as JourneyInsightAgeBand
    )
  );
}

/*
 * ============================================================
 * TIMESTAMP NORMALIZATION
 * ============================================================
 */

function normalizeOccurredAt(
  value: unknown
): number | null {
  if (
    typeof value ===
      "number" &&
    Number.isFinite(
      value
    )
  ) {
    return value;
  }

  if (
    value instanceof
    Timestamp
  ) {
    return value.toMillis();
  }

  /*
   * Defensive support for timestamp-like objects.
   */

  if (
    isRecord(
      value
    ) &&
    typeof value.toMillis ===
      "function"
  ) {
    try {
      const milliseconds =
        (
          value.toMillis as () => unknown
        )();

      if (
        typeof milliseconds ===
          "number" &&
        Number.isFinite(
          milliseconds
        )
      ) {
        return milliseconds;
      }
    } catch {
      return null;
    }
  }

  return null;
}

/*
 * ============================================================
 * RAW EVENT NORMALIZATION
 * ============================================================
 *
 * Firestore documents are treated as untrusted input.
 *
 * Only fields required by Journey Insights are accepted.
 * ============================================================
 */

function normalizeRawEvent(
  id: string,
  raw: unknown
): JourneyAnalyticsEvent | null {
  if (
    !isRecord(
      raw
    )
  ) {
    return null;
  }

  if (
    !isEventType(
      raw.eventType
    ) ||
    typeof raw.userId !==
      "string" ||
    !raw.userId.trim() ||
    typeof raw.childId !==
      "string" ||
    !raw.childId.trim() ||
    !isRecord(
      raw.context
    )
  ) {
    return null;
  }

  const journeyId =
    raw.context.journeyId;

  const stageNumber =
    raw.context.stageNumber;

  if (
    typeof journeyId !==
      "string" ||
    !journeyId.trim() ||
    typeof stageNumber !==
      "number" ||
    !Number.isFinite(
      stageNumber
    ) ||
    stageNumber < 1
  ) {
    return null;
  }

  const occurredAt =
    normalizeOccurredAt(
      raw.occurredAt
    );

  if (
    occurredAt === null
  ) {
    return null;
  }

  const context:
    JourneyAnalyticsEvent["context"] = {
      journeyId:
        journeyId.trim(),

      stageNumber:
        Math.floor(
          stageNumber
        ),
    };

  if (
    isFocus(
      raw.context.focus
    )
  ) {
    context.focus =
      raw.context.focus;
  }

  if (
    isAgeBand(
      raw.context.ageBand
    )
  ) {
    context.ageBand =
      raw.context.ageBand;
  }

  const event:
    JourneyAnalyticsEvent = {
      id,

      eventType:
        raw.eventType,

      userId:
        raw.userId.trim(),

      childId:
        raw.childId.trim(),

      context,

      occurredAt,

      schemaVersion: 1,
    };

  if (
    typeof raw.taskId ===
      "string" &&
    raw.taskId.trim()
  ) {
    event.taskId =
      raw.taskId.trim();
  }

  if (
    typeof raw.resourceId ===
      "string" &&
    raw.resourceId.trim()
  ) {
    event.resourceId =
      raw.resourceId.trim();
  }

  if (
    typeof raw.templateId ===
      "string" &&
    raw.templateId.trim()
  ) {
    event.templateId =
      raw.templateId.trim();
  }

  return event;
}

/*
 * ============================================================
 * INTERNAL COHORT KEY
 * ============================================================
 */

function buildInternalCohortKey(
  cohort:
    JourneyInsightCohortDefinition
): string {
  return JSON.stringify({
    focus:
      cohort.focus ??
      null,

    stageNumber:
      cohort.stageNumber ??
      null,
  });
}

/*
 * ============================================================
 * DERIVE REAL COHORTS
 * ============================================================
 *
 * Initial production cohort:
 *
 *   same Journey focus
 *   +
 *   same Journey stage
 *
 * Age band is intentionally NOT included yet.
 *
 * Adding age band now could fragment early Myriad usage into
 * cohorts too small to meet the privacy threshold.
 *
 * No comparison data is fabricated.
 * ============================================================
 */

function deriveCohorts(
  events:
    JourneyAnalyticsEvent[]
): JourneyInsightCohortDefinition[] {
  const cohorts =
    new Map<
      string,
      JourneyInsightCohortDefinition
    >();

  for (
    const event of events
  ) {
    if (
      !event.context.focus
    ) {
      continue;
    }

    const cohort:
      JourneyInsightCohortDefinition = {
        focus:
          event.context.focus,

        stageNumber:
          event.context.stageNumber,
      };

    cohorts.set(
      buildInternalCohortKey(
        cohort
      ),
      cohort
    );
  }

  return Array.from(
    cohorts.values()
  );
}

/*
 * ============================================================
 * DERIVE TASK IDS
 * ============================================================
 *
 * Only tasks that actually exist in real analytics events
 * are considered.
 * ============================================================
 */

function deriveTaskIds(
  events:
    JourneyAnalyticsEvent[],

  cohort:
    JourneyInsightCohortDefinition
): string[] {
  const taskIds =
    new Set<string>();

  for (
    const event of events
  ) {
    if (
      (
        event.eventType !==
          "task_completed" &&
        event.eventType !==
          "task_uncompleted"
      ) ||
      !event.taskId
    ) {
      continue;
    }

    if (
      cohort.focus &&
      event.context.focus !==
        cohort.focus
    ) {
      continue;
    }

    if (
      typeof cohort.stageNumber ===
        "number" &&
      event.context.stageNumber !==
        cohort.stageNumber
    ) {
      continue;
    }

    taskIds.add(
      event.taskId
    );
  }

  return Array.from(
    taskIds
  );
}

/*
 * ============================================================
 * READ RAW JOURNEY EVENTS
 * ============================================================
 *
 * Firebase Admin initialization happens HERE rather than when
 * this module is imported.
 *
 * This prevents Next.js production builds from requiring the
 * Admin credential simply to analyze the route.
 * ============================================================
 */

async function loadRawJourneyEvents():
  Promise<
    JourneyAnalyticsEvent[]
  > {
  const adminDb =
    getAdminDb();

  const snapshot =
    await adminDb
      .collection(
        RAW_COLLECTION
      )
      .orderBy(
        FieldPath.documentId()
      )
      .get();

  const events:
    JourneyAnalyticsEvent[] = [];

  for (
    const document of
      snapshot.docs
  ) {
    const event =
      normalizeRawEvent(
        document.id,
        document.data()
      );

    if (event) {
      events.push(
        event
      );
    }
  }

  return events;
}

/*
 * ============================================================
 * WRITE AGGREGATE
 * ============================================================
 *
 * Only already-calculated aggregate information reaches this
 * collection.
 *
 * Raw userId and childId values are never written here.
 * ============================================================
 */

async function writeAggregate(
  aggregateId: string,
  aggregate:
    StoredJourneyInsightAggregate
): Promise<void> {
  const adminDb =
    getAdminDb();

  await adminDb
    .collection(
      AGGREGATE_COLLECTION
    )
    .doc(
      aggregateId
    )
    .set(
      aggregate,
      {
        merge: false,
      }
    );
}

/*
 * ============================================================
 * RUN RESULT
 * ============================================================
 */

export interface JourneyInsightAggregationRunResult {
  rawEventCount: number;

  cohortCount: number;

  aggregatesWritten: number;

  taskAggregatesWritten: number;

  stageAggregatesWritten: number;
}

/*
 * ============================================================
 * RUN TRUSTED AGGREGATION
 * ============================================================
 */

export async function runJourneyInsightAggregation():
  Promise<
    JourneyInsightAggregationRunResult
  > {
  /*
   * ----------------------------------------------------------
   * LOAD REAL ANALYTICS
   * ----------------------------------------------------------
   */

  const events =
    await loadRawJourneyEvents();

  /*
   * ----------------------------------------------------------
   * DERIVE REAL COHORTS
   * ----------------------------------------------------------
   */

  const cohorts =
    deriveCohorts(
      events
    );

  let aggregatesWritten =
    0;

  let taskAggregatesWritten =
    0;

  let stageAggregatesWritten =
    0;

  /*
   * ----------------------------------------------------------
   * PROCESS EACH COHORT
   * ----------------------------------------------------------
   */

  for (
    const cohort of cohorts
  ) {
    /*
     * ========================================================
     * STAGE COMPLETION
     * ========================================================
     */

    if (
      typeof cohort.stageNumber ===
        "number"
    ) {
      const stageResult =
        calculateStageCompletionAggregate(
          events,
          cohort.stageNumber,
          cohort
        );

      /*
       * The aggregation function already applies the
       * minimum cohort requirement.
       *
       * If fewer than the configured minimum families exist,
       * nothing is written.
       */

      if (
        stageResult.available &&
        stageResult.data
      ) {
        const aggregateId =
          buildStageCompletionAggregateId(
            stageResult.data
              .stageNumber,
            cohort
          );

        const storedAggregate:
          StoredJourneyInsightAggregate = {
            metricType:
              "stage_completion",

            stageNumber:
              stageResult.data
                .stageNumber,

            cohort:
              stageResult.data
                .cohort,

            cohortSize:
              stageResult.data
                .cohortSize,

            completedFamilyCount:
              stageResult.data
                .completedFamilyCount,

            completionPercent:
              stageResult.data
                .completionPercent,

            calculatedAt:
              stageResult.data
                .calculatedAt,

            schemaVersion:
              1,
          };

        await writeAggregate(
          aggregateId,
          storedAggregate
        );

        aggregatesWritten +=
          1;

        stageAggregatesWritten +=
          1;
      }
    }

    /*
     * ========================================================
     * TASK COMPLETION
     * ========================================================
     */

    const taskIds =
      deriveTaskIds(
        events,
        cohort
      );

    for (
      const taskId of
        taskIds
    ) {
      const taskResult =
        calculateTaskCompletionAggregate(
          events,
          taskId,
          cohort
        );

      if (
        !taskResult.available ||
        !taskResult.data
      ) {
        continue;
      }

      const aggregateId =
        buildTaskCompletionAggregateId(
          taskResult.data
            .taskId,
          cohort
        );

      const storedAggregate:
        StoredJourneyInsightAggregate = {
          metricType:
            "task_completion",

          taskId:
            taskResult.data
              .taskId,

          cohort:
            taskResult.data
              .cohort,

          cohortSize:
            taskResult.data
              .cohortSize,

          completedFamilyCount:
            taskResult.data
              .completedFamilyCount,

          completionPercent:
            taskResult.data
              .completionPercent,

          calculatedAt:
            taskResult.data
              .calculatedAt,

          schemaVersion:
            1,
        };

      await writeAggregate(
        aggregateId,
        storedAggregate
      );

      aggregatesWritten +=
        1;

      taskAggregatesWritten +=
        1;
    }
  }

  /*
   * ----------------------------------------------------------
   * SAFE SUMMARY
   * ----------------------------------------------------------
   *
   * No individual user or child identifiers are returned.
   * ----------------------------------------------------------
   */

  return {
    rawEventCount:
      events.length,

    cohortCount:
      cohorts.length,

    aggregatesWritten,

    taskAggregatesWritten,

    stageAggregatesWritten,
  };
}