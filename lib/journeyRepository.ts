import {
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";

import type { FamilyProfile } from "../types/familyProfile";

import type {
  PersonalizedJourney,
} from "./ai/journeyTypes";

import {
  db,
} from "./firebase";


/*
 * ============================================================
 * JOURNEY REPOSITORY
 * ============================================================
 *
 * Responsible for the user's ACTIVE/current journey.
 *
 * Firestore:
 *
 * users/{userId}/journeys/current
 *
 * Completed historical stages are handled separately by:
 *
 * lib/journeyHistory.ts
 *
 * This repository also owns saving task completion changes
 * for the currently active journey.
 * ============================================================
 */


export type SavedJourney = {
  familyProfile: FamilyProfile;

  journey: PersonalizedJourney;

  updatedAt: number;

  createdBy: string;

  stageNumber: number;

  previousCompletedTaskIds?: string[];

  journeyReason?:
    | "initial"
    | "tasks_completed"
    | "manual_refresh";
};


/*
 * ============================================================
 * CURRENT JOURNEY REFERENCE
 * ============================================================
 */

function getCurrentJourneyRef(
  userId: string
) {

  if (!userId) {
    throw new Error(
      "A user ID is required to access the current journey."
    );
  }

  return doc(
    db,
    "users",
    userId,
    "journeys",
    "current"
  );
}


/*
 * ============================================================
 * GET CURRENT JOURNEY
 * ============================================================
 */

export async function getCurrentJourney(
  userId: string
): Promise<SavedJourney | null> {

  const journeyRef =
    getCurrentJourneyRef(
      userId
    );


  const snapshot =
    await getDoc(
      journeyRef
    );


  if (!snapshot.exists()) {
    return null;
  }


  const data =
    snapshot.data();


  if (
    !data?.familyProfile ||
    !data?.journey
  ) {

    console.warn(
      "Saved journey exists but is incomplete."
    );

    return null;
  }


  return {
    familyProfile:
      data.familyProfile as FamilyProfile,

    journey:
      data.journey as PersonalizedJourney,

    updatedAt:
      typeof data.updatedAt ===
      "number"
        ? data.updatedAt
        : Date.now(),

    createdBy:
      typeof data.createdBy ===
      "string"
        ? data.createdBy
        : userId,

    stageNumber:
      typeof data.stageNumber ===
      "number" &&
      data.stageNumber >= 1
        ? data.stageNumber
        : 1,

    previousCompletedTaskIds:
      Array.isArray(
        data.previousCompletedTaskIds
      )
        ? data.previousCompletedTaskIds
        : undefined,

    journeyReason:
      data.journeyReason ===
        "initial" ||
      data.journeyReason ===
        "tasks_completed" ||
      data.journeyReason ===
        "manual_refresh"
        ? data.journeyReason
        : undefined,
  };
}


/*
 * ============================================================
 * SAVE CURRENT JOURNEY
 * ============================================================
 */

export async function saveCurrentJourney(
  userId: string,
  familyProfile: FamilyProfile,
  journey: PersonalizedJourney,
  options?: {
    stageNumber?: number;

    previousCompletedTaskIds?: string[];

    journeyReason?:
      | "initial"
      | "tasks_completed"
      | "manual_refresh";
  }
): Promise<void> {

  const journeyRef =
    getCurrentJourneyRef(
      userId
    );


  const stageNumber =
    options?.stageNumber &&
    Number.isInteger(
      options.stageNumber
    ) &&
    options.stageNumber >= 1
      ? options.stageNumber
      : 1;


  const firestoreData:
    Record<string, unknown> = {

    familyProfile,

    journey,

    updatedAt:
      Date.now(),

    createdBy:
      userId,

    stageNumber,
  };


  if (
    options?.previousCompletedTaskIds
  ) {

    firestoreData.previousCompletedTaskIds =
      options.previousCompletedTaskIds;

  }


  if (
    options?.journeyReason
  ) {

    firestoreData.journeyReason =
      options.journeyReason;

  }


  await setDoc(
    journeyRef,
    firestoreData,
    {
      merge: true,
    }
  );
}


/*
 * ============================================================
 * SAVE TASK PROGRESS
 * ============================================================
 *
 * Saves the current task completion state without changing
 * the journey stage or other journey metadata.
 *
 * This is used when a logged-in user checks or unchecks a task.
 *
 * IMPORTANT:
 *
 * The UI should update immediately.
 *
 * Firestore persistence happens asynchronously after that.
 * ============================================================
 */

export async function saveTaskProgress(
  userId: string,
  familyProfile: FamilyProfile,
  journey: PersonalizedJourney,
  options?: {
    stageNumber?: number;

    journeyReason?:
      | "initial"
      | "tasks_completed"
      | "manual_refresh";
  }
): Promise<void> {

  const journeyRef =
    getCurrentJourneyRef(
      userId
    );


  const currentStageNumber =
    options?.stageNumber &&
    Number.isInteger(
      options.stageNumber
    ) &&
    options.stageNumber >= 1
      ? options.stageNumber
      : 1;


  await setDoc(
    journeyRef,
    {
      familyProfile,

      journey,

      updatedAt:
        Date.now(),

      createdBy:
        userId,

      stageNumber:
        currentStageNumber,

      ...(options?.journeyReason
        ? {
            journeyReason:
              options.journeyReason,
          }
        : {}),
    },
    {
      merge: true,
    }
  );
}