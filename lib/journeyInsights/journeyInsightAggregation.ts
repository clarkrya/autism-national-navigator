import type {
    JourneyAnalyticsEvent,
  } from "./journeyAnalyticsTypes";
  
  import {
    getJourneyInsightAvailability,
  } from "./journeyInsightCohorts";
  
  import type {
    JourneyInsightAggregateResult,
    JourneyInsightCohortDefinition,
    JourneyStageProgressionAggregate,
    JourneyTaskCompletionAggregate,
  } from "./journeyInsightAggregationTypes";
  
  /*
   * ============================================================
   * JOURNEY INSIGHT AGGREGATION
   * ============================================================
   *
   * Pure aggregation functions.
   *
   * These functions do NOT query Firestore.
   *
   * Raw cross-family analytics must be retrieved in a trusted
   * server environment and passed into these functions.
   * ============================================================
   */
  
  /*
   * ============================================================
   * INTERNAL FAMILY KEY
   * ============================================================
   *
   * userId + childId represents one family/child participant
   * for aggregation purposes.
   *
   * This key is never returned to the client.
   */
  
  function getFamilyKey(
    event: JourneyAnalyticsEvent
  ): string {
    return `${event.userId}::${event.childId}`;
  }
  
  /*
   * ============================================================
   * COHORT MATCHING
   * ============================================================
   */
  
  function eventMatchesCohort(
    event: JourneyAnalyticsEvent,
    cohort: JourneyInsightCohortDefinition
  ): boolean {
    if (
      cohort.focus &&
      event.context.focus !==
        cohort.focus
    ) {
      return false;
    }
  
    if (
      cohort.ageBand &&
      event.context.ageBand !==
        cohort.ageBand
    ) {
      return false;
    }
  
    if (
      typeof cohort.stageNumber ===
        "number" &&
      event.context.stageNumber !==
        cohort.stageNumber
    ) {
      return false;
    }
  
    return true;
  }
  
  /*
   * ============================================================
   * DISTINCT FAMILY COUNT
   * ============================================================
   */
  
  function countDistinctFamilies(
    events: JourneyAnalyticsEvent[]
  ): number {
    return new Set(
      events.map(
        getFamilyKey
      )
    ).size;
  }
  
  /*
   * ============================================================
   * TASK COMPLETION
   * ============================================================
   *
   * We use the latest task event for each family.
   *
   * Example:
   *
   * task_completed
   * task_uncompleted
   *
   * Latest event wins.
   *
   * This prevents an old completion event from incorrectly
   * counting a family as completed after they unchecked it.
   */
  
  export function calculateTaskCompletionAggregate(
    events: JourneyAnalyticsEvent[],
    taskId: string,
    cohort: JourneyInsightCohortDefinition
  ): JourneyInsightAggregateResult<
    JourneyTaskCompletionAggregate
  > {
    const normalizedTaskId =
      taskId.trim();
  
    if (!normalizedTaskId) {
      return {
        available: false,
        cohortSize: 0,
        reason:
          "no_matching_cohort",
        data: null,
      };
    }
  
    const taskEvents =
      events.filter(
        (event) =>
          (
            event.eventType ===
              "task_completed" ||
            event.eventType ===
              "task_uncompleted"
          ) &&
          event.taskId ===
            normalizedTaskId &&
          eventMatchesCohort(
            event,
            cohort
          )
      );
  
    const latestByFamily =
      new Map<
        string,
        JourneyAnalyticsEvent
      >();
  
    for (
      const event of taskEvents
    ) {
      const familyKey =
        getFamilyKey(event);
  
      const existing =
        latestByFamily.get(
          familyKey
        );
  
      if (
        !existing ||
        event.occurredAt >
          existing.occurredAt
      ) {
        latestByFamily.set(
          familyKey,
          event
        );
      }
    }
  
    const latestEvents =
      Array.from(
        latestByFamily.values()
      );
  
    const cohortSize =
      countDistinctFamilies(
        latestEvents
      );
  
    const availability =
      getJourneyInsightAvailability(
        cohortSize
      );
  
    if (!availability.available) {
      return {
        available: false,
        cohortSize:
          availability.cohortSize,
        reason:
          availability.reason,
        data: null,
      };
    }
  
    const completedFamilyCount =
      latestEvents.filter(
        (event) =>
          event.eventType ===
          "task_completed"
      ).length;
  
    const completionPercent =
      cohortSize > 0
        ? Math.round(
            (
              completedFamilyCount /
              cohortSize
            ) *
              100
          )
        : 0;
  
    return {
      available: true,
  
      cohortSize,
  
      data: {
        taskId:
          normalizedTaskId,
  
        cohort,
  
        cohortSize,
  
        completedFamilyCount,
  
        completionPercent,
  
        calculatedAt:
          Date.now(),
      },
    };
  }
  
  /*
   * ============================================================
   * STAGE COMPLETION
   * ============================================================
   */
  
  export function calculateStageCompletionAggregate(
    events: JourneyAnalyticsEvent[],
    stageNumber: number,
    cohort: JourneyInsightCohortDefinition
  ): JourneyInsightAggregateResult<
    JourneyStageProgressionAggregate
  > {
    const normalizedStageNumber =
      Math.max(
        1,
        Math.floor(
          stageNumber
        )
      );
  
    /*
     * Families who started this stage form the denominator.
     */
  
    const startedEvents =
      events.filter(
        (event) =>
          event.eventType ===
            "stage_started" &&
          event.context.stageNumber ===
            normalizedStageNumber &&
          eventMatchesCohort(
            event,
            cohort
          )
      );
  
    const startedFamilyKeys =
      new Set(
        startedEvents.map(
          getFamilyKey
        )
      );
  
    const cohortSize =
      startedFamilyKeys.size;
  
    const availability =
      getJourneyInsightAvailability(
        cohortSize
      );
  
    if (!availability.available) {
      return {
        available: false,
        cohortSize:
          availability.cohortSize,
        reason:
          availability.reason,
        data: null,
      };
    }
  
    /*
     * Only count completion for families who were actually
     * represented in the stage-start denominator.
     */
  
    const completedFamilyKeys =
      new Set(
        events
          .filter(
            (event) =>
              event.eventType ===
                "stage_completed" &&
              event.context.stageNumber ===
                normalizedStageNumber &&
              eventMatchesCohort(
                event,
                cohort
              )
          )
          .map(
            getFamilyKey
          )
          .filter(
            (familyKey) =>
              startedFamilyKeys.has(
                familyKey
              )
          )
      );
  
    const completedFamilyCount =
      completedFamilyKeys.size;
  
    const completionPercent =
      Math.round(
        (
          completedFamilyCount /
          cohortSize
        ) *
          100
      );
  
    return {
      available: true,
  
      cohortSize,
  
      data: {
        stageNumber:
          normalizedStageNumber,
  
        cohort,
  
        cohortSize,
  
        completedFamilyCount,
  
        completionPercent,
  
        calculatedAt:
          Date.now(),
      },
    };
  }