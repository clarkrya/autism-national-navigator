import type {
    FamilyProfile,
  } from "../../types/familyProfile";
  
  import {
    safelyRecordJourneyAnalyticsEvent,
  } from "./journeyAnalyticsRepository";
  
  import {
    buildJourneyAnalyticsContext,
  } from "./journeyAnalyticsContext";
  
  /*
   * ============================================================
   * JOURNEY ANALYTICS SERVICE
   * ============================================================
   *
   * Higher-level service for recording structured Journey
   * activity.
   *
   * PURPOSE:
   *
   * JourneyDashboard and other UI components should describe
   * what happened:
   *
   * - Journey started
   * - Stage started
   * - Task completed
   * - Task uncompleted
   * - Stage completed
   *
   * This service handles:
   *
   * - Building standardized analytics context
   * - Adding Journey focus
   * - Adding age band
   * - Constructing analytics events
   * - Sending events through the analytics repository
   *
   * IMPORTANT:
   *
   * - No fake comparison data is created here.
   * - No aggregate statistics are calculated here.
   * - Analytics failures must never break the family's Journey.
   * - Raw free-text notes are never sent to analytics.
   * ============================================================
   */
  
  /*
   * ============================================================
   * SHARED EVENT INPUT
   * ============================================================
   */
  
  interface JourneyAnalyticsServiceInput {
    userId: string;
  
    childId: string;
  
    journeyId: string;
  
    stageNumber: number;
  
    familyProfile: FamilyProfile;
  }
  
  /*
   * ============================================================
   * NORMALIZATION
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
  
  /*
   * ============================================================
   * BUILD SHARED CONTEXT
   * ============================================================
   */
  
  function buildServiceContext(
    input: JourneyAnalyticsServiceInput
  ) {
    return buildJourneyAnalyticsContext({
      journeyId:
        requireNonEmptyString(
          input.journeyId,
          "journeyId"
        ),
  
      stageNumber:
        input.stageNumber,
  
      childAge:
        input.familyProfile.childAge,
  
      journeyStage:
        input.familyProfile.journeyStage,
    });
  }
  
  /*
   * ============================================================
   * JOURNEY STARTED
   * ============================================================
   */
  
  export async function recordJourneyStarted(
    input: JourneyAnalyticsServiceInput
  ): Promise<boolean> {
    try {
      return await safelyRecordJourneyAnalyticsEvent({
        eventType:
          "journey_started",
  
        userId:
          requireNonEmptyString(
            input.userId,
            "userId"
          ),
  
        childId:
          requireNonEmptyString(
            input.childId,
            "childId"
          ),
  
        context:
          buildServiceContext(
            input
          ),
      });
    } catch (error) {
      console.error(
        "Unable to record Journey started analytics:",
        error
      );
  
      return false;
    }
  }
  
  /*
   * ============================================================
   * STAGE STARTED
   * ============================================================
   */
  
  export async function recordStageStarted(
    input: JourneyAnalyticsServiceInput
  ): Promise<boolean> {
    try {
      return await safelyRecordJourneyAnalyticsEvent({
        eventType:
          "stage_started",
  
        userId:
          requireNonEmptyString(
            input.userId,
            "userId"
          ),
  
        childId:
          requireNonEmptyString(
            input.childId,
            "childId"
          ),
  
        context:
          buildServiceContext(
            input
          ),
      });
    } catch (error) {
      console.error(
        "Unable to record Journey stage started analytics:",
        error
      );
  
      return false;
    }
  }
  
  /*
   * ============================================================
   * TASK COMPLETED
   * ============================================================
   */
  
  export async function recordTaskCompleted(
    input:
      JourneyAnalyticsServiceInput & {
        taskId: string;
      }
  ): Promise<boolean> {
    try {
      const taskId =
        requireNonEmptyString(
          input.taskId,
          "taskId"
        );
  
      return await safelyRecordJourneyAnalyticsEvent({
        eventType:
          "task_completed",
  
        userId:
          requireNonEmptyString(
            input.userId,
            "userId"
          ),
  
        childId:
          requireNonEmptyString(
            input.childId,
            "childId"
          ),
  
        taskId,
  
        context:
          buildServiceContext(
            input
          ),
      });
    } catch (error) {
      console.error(
        "Unable to record Journey task completion analytics:",
        error
      );
  
      return false;
    }
  }
  
  /*
   * ============================================================
   * TASK UNCOMPLETED
   * ============================================================
   */
  
  export async function recordTaskUncompleted(
    input:
      JourneyAnalyticsServiceInput & {
        taskId: string;
      }
  ): Promise<boolean> {
    try {
      const taskId =
        requireNonEmptyString(
          input.taskId,
          "taskId"
        );
  
      return await safelyRecordJourneyAnalyticsEvent({
        eventType:
          "task_uncompleted",
  
        userId:
          requireNonEmptyString(
            input.userId,
            "userId"
          ),
  
        childId:
          requireNonEmptyString(
            input.childId,
            "childId"
          ),
  
        taskId,
  
        context:
          buildServiceContext(
            input
          ),
      });
    } catch (error) {
      console.error(
        "Unable to record Journey task uncompleted analytics:",
        error
      );
  
      return false;
    }
  }
  
  /*
   * ============================================================
   * TASK STATE CHANGED
   * ============================================================
   *
   * Convenience function for UI task toggles.
   *
   * completed = true
   *      -> task_completed
   *
   * completed = false
   *      -> task_uncompleted
   * ============================================================
   */
  
  export async function recordTaskStateChanged(
    input:
      JourneyAnalyticsServiceInput & {
        taskId: string;
  
        completed: boolean;
      }
  ): Promise<boolean> {
    if (input.completed) {
      return recordTaskCompleted(
        input
      );
    }
  
    return recordTaskUncompleted(
      input
    );
  }
  
  /*
   * ============================================================
   * STAGE COMPLETED
   * ============================================================
   */
  
  export async function recordStageCompleted(
    input: JourneyAnalyticsServiceInput
  ): Promise<boolean> {
    try {
      return await safelyRecordJourneyAnalyticsEvent({
        eventType:
          "stage_completed",
  
        userId:
          requireNonEmptyString(
            input.userId,
            "userId"
          ),
  
        childId:
          requireNonEmptyString(
            input.childId,
            "childId"
          ),
  
        context:
          buildServiceContext(
            input
          ),
      });
    } catch (error) {
      console.error(
        "Unable to record Journey stage completion analytics:",
        error
      );
  
      return false;
    }
  }
  
  /*
   * ============================================================
   * INITIAL JOURNEY ACTIVITY
   * ============================================================
   *
   * Convenience function for a newly-created Journey.
   *
   * Records:
   *
   * 1. journey_started
   * 2. stage_started
   *
   * The two events remain separate because future aggregate
   * calculations may use them independently.
   * ============================================================
   */
  
  export async function recordInitialJourneyActivity(
    input: JourneyAnalyticsServiceInput
  ): Promise<{
    journeyStarted: boolean;
    stageStarted: boolean;
  }> {
    const [
      journeyStarted,
      stageStarted,
    ] =
      await Promise.all([
        recordJourneyStarted(
          input
        ),
  
        recordStageStarted(
          input
        ),
      ]);
  
    return {
      journeyStarted,
      stageStarted,
    };
  }
  
  /*
   * ============================================================
   * STAGE TRANSITION
   * ============================================================
   *
   * Convenience function used when one Journey stage has been
   * completed and the next stage has started.
   *
   * IMPORTANT:
   *
   * The completed and next stage numbers are deliberately
   * separate.
   * ============================================================
   */
  
  export interface RecordStageTransitionInput {
    userId: string;
  
    childId: string;
  
    journeyId: string;
  
    completedStageNumber: number;
  
    nextStageNumber: number;
  
    familyProfile: FamilyProfile;
  }
  
  export async function recordStageTransition(
    input: RecordStageTransitionInput
  ): Promise<{
    stageCompleted: boolean;
    nextStageStarted: boolean;
  }> {
    const sharedInput = {
      userId:
        input.userId,
  
      childId:
        input.childId,
  
      journeyId:
        input.journeyId,
  
      familyProfile:
        input.familyProfile,
    };
  
    const [
      stageCompleted,
      nextStageStarted,
    ] =
      await Promise.all([
        recordStageCompleted({
          ...sharedInput,
  
          stageNumber:
            input.completedStageNumber,
        }),
  
        recordStageStarted({
          ...sharedInput,
  
          stageNumber:
            input.nextStageNumber,
        }),
      ]);
  
    return {
      stageCompleted,
      nextStageStarted,
    };
  }