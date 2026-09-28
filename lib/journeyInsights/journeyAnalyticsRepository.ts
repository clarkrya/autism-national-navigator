import {
    addDoc,
    collection,
    serverTimestamp,
  } from "firebase/firestore";
  
  import {
    db,
  } from "../firebase";
  
  import type {
    CreateJourneyAnalyticsEventInput,
    JourneyAnalyticsEventType,
  } from "./journeyAnalyticsTypes";
  
  /*
   * ============================================================
   * JOURNEY ANALYTICS REPOSITORY
   * ============================================================
   *
   * Records structured Journey activity that can later be used
   * to calculate de-identified aggregate Journey Insights.
   *
   * IMPORTANT:
   *
   * - No free-text family notes are stored here.
   * - No document contents are stored here.
   * - No AI-generated recommendation text is stored here.
   * - No fake comparison data is generated here.
   *
   * User-facing comparison statistics must eventually be
   * calculated from actual stored Myriad activity.
   * ============================================================
   */
  
  const JOURNEY_ANALYTICS_COLLECTION =
    "journeyAnalyticsEvents";
  
  /*
   * ============================================================
   * VALID EVENT TYPES
   * ============================================================
   */
  
  const VALID_EVENT_TYPES: JourneyAnalyticsEventType[] = [
    "journey_started",
    "stage_started",
    "task_completed",
    "task_uncompleted",
    "stage_completed",
    "resource_opened",
    "template_used",
  ];
  
  /*
   * ============================================================
   * HELPERS
   * ============================================================
   */
  
  function requireNonEmptyString(
    value: string,
    fieldName: string
  ): string {
    const normalized =
      value.trim();
  
    if (!normalized) {
      throw new Error(
        `${fieldName} is required for Journey analytics.`
      );
    }
  
    return normalized;
  }
  
  function normalizeOptionalString(
    value?: string
  ): string | undefined {
    if (
      typeof value !==
      "string"
    ) {
      return undefined;
    }
  
    const normalized =
      value.trim();
  
    return normalized ||
      undefined;
  }
  
  /*
   * ============================================================
   * RECORD EVENT
   * ============================================================
   */
  
  export async function recordJourneyAnalyticsEvent(
    input: CreateJourneyAnalyticsEventInput
  ): Promise<string> {
    if (
      !VALID_EVENT_TYPES.includes(
        input.eventType
      )
    ) {
      throw new Error(
        "Unsupported Journey analytics event type."
      );
    }
  
    const userId =
      requireNonEmptyString(
        input.userId,
        "userId"
      );
  
    const childId =
      requireNonEmptyString(
        input.childId,
        "childId"
      );
  
    const journeyId =
      requireNonEmptyString(
        input.context.journeyId,
        "journeyId"
      );
  
    const stageNumber =
      Math.max(
        1,
        Math.floor(
          input.context.stageNumber
        )
      );
  
    const taskId =
      normalizeOptionalString(
        input.taskId
      );
  
    const resourceId =
      normalizeOptionalString(
        input.resourceId
      );
  
    const templateId =
      normalizeOptionalString(
        input.templateId
      );
  
    /*
     * Task events must identify the structured task.
     */
  
    if (
      (
        input.eventType ===
          "task_completed" ||
        input.eventType ===
          "task_uncompleted"
      ) &&
      !taskId
    ) {
      throw new Error(
        "taskId is required for task analytics events."
      );
    }
  
    /*
     * Resource events must identify the resource.
     */
  
    if (
      input.eventType ===
        "resource_opened" &&
      !resourceId
    ) {
      throw new Error(
        "resourceId is required for resource analytics events."
      );
    }
  
    /*
     * Template events must identify the template.
     */
  
    if (
      input.eventType ===
        "template_used" &&
      !templateId
    ) {
      throw new Error(
        "templateId is required for template analytics events."
      );
    }
  
    const eventData = {
      eventType:
        input.eventType,
  
      userId,
  
      childId,
  
      context: {
        journeyId,
  
        stageNumber,
  
        ...(input.context.focus
          ? {
              focus:
                input.context.focus,
            }
          : {}),
  
        ...(input.context.ageBand
          ? {
              ageBand:
                input.context.ageBand,
            }
          : {}),
      },
  
      ...(taskId
        ? {
            taskId,
          }
        : {}),
  
      ...(resourceId
        ? {
            resourceId,
          }
        : {}),
  
      ...(templateId
        ? {
            templateId,
          }
        : {}),
  
      /*
       * Client timestamp supports immediate analytics work.
       *
       * serverCreatedAt gives Firestore an authoritative
       * server-side timestamp as well.
       */
      occurredAt:
        Date.now(),
  
      serverCreatedAt:
        serverTimestamp(),
  
      schemaVersion:
        1 as const,
    };
  
    const documentReference =
      await addDoc(
        collection(
          db,
          JOURNEY_ANALYTICS_COLLECTION
        ),
        eventData
      );
  
    return documentReference.id;
  }
  
  /*
   * ============================================================
   * SAFE EVENT RECORDING
   * ============================================================
   *
   * Analytics must never break the family's Journey experience.
   *
   * Use this helper from UI interactions. If analytics recording
   * fails, the Journey action itself can still succeed.
   * ============================================================
   */
  
  export async function safelyRecordJourneyAnalyticsEvent(
    input: CreateJourneyAnalyticsEventInput
  ): Promise<boolean> {
    try {
      await recordJourneyAnalyticsEvent(
        input
      );
  
      return true;
    } catch (
      error
    ) {
      console.error(
        "Unable to record Journey analytics event:",
        error
      );
  
      return false;
    }
  }