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
   * This file is the single application-level location for
   * reading and writing a family's current saved journey.
   *
   * Firestore structure:
   *
   * users/
   *   {userId}/
   *     journeys/
   *       current
   *
   * The repository intentionally hides Firestore implementation
   * details from the UI components.
   * ============================================================
   */
  
  
  /*
   * ============================================================
   * TYPES
   * ============================================================
   */
  
  export type SavedJourney = {
    familyProfile: FamilyProfile;
  
    journey: PersonalizedJourney;
  
    updatedAt: number;
  
    createdBy: string;
  
    /*
     * Present when the current journey was generated from a
     * completed previous task set.
     */
    previousCompletedTaskIds?: string[];
  
    /*
     * Describes why the current journey was generated.
     */
    journeyReason?:
      | "initial"
      | "tasks_completed"
      | "manual_refresh";
  };
  
  
  /*
   * ============================================================
   * FIRESTORE PATH
   * ============================================================
   */
  
  function getCurrentJourneyRef(
    userId: string
  ) {
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
   * LOAD CURRENT JOURNEY
   * ============================================================
   *
   * Returns:
   *
   *   SavedJourney
   *
   * when a saved journey exists.
   *
   * Returns:
   *
   *   null
   *
   * when the user does not have a saved journey.
   * ============================================================
   */
  
  export async function getCurrentJourney(
    userId: string
  ): Promise<SavedJourney | null> {
  
    if (!userId) {
      throw new Error(
        "A user ID is required to load a journey."
      );
    }
  
  
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
  
  
    /*
     * ----------------------------------------------------------
     * BASIC VALIDATION
     * ----------------------------------------------------------
     */
  
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
   *
   * This replaces the direct Firestore setDoc calls currently
   * living inside JourneyDashboard.
   *
   * The repository always owns:
   *
   *   users/{uid}/journeys/current
   *
   * ============================================================
   */
  
  export async function saveCurrentJourney(
    userId: string,
    familyProfile: FamilyProfile,
    journey: PersonalizedJourney,
    options?: {
      previousCompletedTaskIds?: string[];
  
      journeyReason?:
        | "initial"
        | "tasks_completed"
        | "manual_refresh";
    }
  ): Promise<void> {
  
    if (!userId) {
      throw new Error(
        "A user ID is required to save a journey."
      );
    }
  
  
    const journeyRef =
      getCurrentJourneyRef(
        userId
      );
  
  
    const savedJourney: SavedJourney = {
      familyProfile,
  
      journey,
  
      updatedAt:
        Date.now(),
  
      createdBy:
        userId,
  
      previousCompletedTaskIds:
        options
          ?.previousCompletedTaskIds,
  
      journeyReason:
        options
          ?.journeyReason,
    };
  
  
    /*
     * ----------------------------------------------------------
     * REMOVE UNDEFINED OPTIONAL VALUES
     * ----------------------------------------------------------
     *
     * Firestore should not receive undefined fields.
     */
  
    const firestoreData: Record<
      string,
      unknown
    > = {
      familyProfile:
        savedJourney.familyProfile,
  
      journey:
        savedJourney.journey,
  
      updatedAt:
        savedJourney.updatedAt,
  
      createdBy:
        savedJourney.createdBy,
    };
  
  
    if (
      savedJourney.previousCompletedTaskIds
    ) {
  
      firestoreData
        .previousCompletedTaskIds =
        savedJourney
          .previousCompletedTaskIds;
    }
  
  
    if (
      savedJourney.journeyReason
    ) {
  
      firestoreData
        .journeyReason =
        savedJourney
          .journeyReason;
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
   * DELETE CURRENT JOURNEY
   * ============================================================
   *
   * Not used by the current interface yet.
   *
   * This is intentionally left out until we build the account
   * deletion / "start over" behavior.
   * ============================================================
   */