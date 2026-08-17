import {
    collection,
    doc,
    getDocs,
    orderBy,
    query,
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
   * JOURNEY HISTORY
   * ============================================================
   *
   * Stores completed journey stages separately from the user's
   * current active journey.
   *
   * Firestore structure:
   *
   * users/
   *   {userId}/
   *     journeyHistory/
   *       stage-1
   *       stage-2
   *       stage-3
   *
   * The current journey remains in:
   *
   * users/{userId}/journeys/current
   *
   * ============================================================
   */
  
  
  /*
   * ============================================================
   * TYPES
   * ============================================================
   */
  
  export type JourneyStageRecord = {
    stageId: string;
  
    stageNumber: number;
  
    familyProfile: FamilyProfile;
  
    journey: PersonalizedJourney;
  
    completedTaskIds: string[];
  
    createdAt: number;
  
    completedAt: number;
  
    /*
     * Identifies why this stage existed.
     */
  
    reason:
      | "initial"
      | "tasks_completed"
      | "manual_refresh";
  };
  
  
  /*
   * ============================================================
   * COLLECTION REFERENCE
   * ============================================================
   */
  
  function getJourneyHistoryCollection(
    userId: string
  ) {
  
    if (!userId) {
      throw new Error(
        "A user ID is required to access journey history."
      );
    }
  
    return collection(
      db,
      "users",
      userId,
      "journeyHistory"
    );
  }
  
  
  /*
   * ============================================================
   * STAGE DOCUMENT REFERENCE
   * ============================================================
   */
  
  function getJourneyStageRef(
    userId: string,
    stageNumber: number
  ) {
  
    return doc(
      getJourneyHistoryCollection(
        userId
      ),
      `stage-${stageNumber}`
    );
  }
  
  
  /*
   * ============================================================
   * SAVE COMPLETED STAGE
   * ============================================================
   *
   * Saves a completed journey stage to the user's history.
   *
   * This does NOT change the current journey.
   *
   * The current journey is handled by journeyRepository.ts.
   * ============================================================
   */
  
  export async function saveJourneyStage(
    userId: string,
    stageNumber: number,
    familyProfile: FamilyProfile,
    journey: PersonalizedJourney,
    completedTaskIds: string[],
    options?: {
      createdAt?: number;
  
      completedAt?: number;
  
      reason?:
        | "initial"
        | "tasks_completed"
        | "manual_refresh";
    }
  ): Promise<void> {
  
    if (!userId) {
      throw new Error(
        "A user ID is required to save journey history."
      );
    }
  
  
    if (
      !Number.isInteger(stageNumber) ||
      stageNumber < 1
    ) {
  
      throw new Error(
        "Stage number must be a positive integer."
      );
  
    }
  
  
    const now =
      Date.now();
  
  
    const stageRecord:
      JourneyStageRecord = {
  
      stageId:
        `stage-${stageNumber}`,
  
      stageNumber,
  
      familyProfile,
  
      journey,
  
      completedTaskIds:
  
        Array.isArray(
          completedTaskIds
        )
          ? completedTaskIds
          : [],
  
      createdAt:
        options?.createdAt ??
        now,
  
      completedAt:
        options?.completedAt ??
        now,
  
      reason:
        options?.reason ??
        "tasks_completed",
    };
  
  
    await setDoc(
      getJourneyStageRef(
        userId,
        stageNumber
      ),
      stageRecord,
      {
        merge: true,
      }
    );
  }
  
  
  /*
   * ============================================================
   * GET JOURNEY HISTORY
   * ============================================================
   *
   * Returns all saved journey stages in ascending order.
   * ============================================================
   */
  
  export async function getJourneyHistory(
    userId: string
  ): Promise<JourneyStageRecord[]> {
  
    if (!userId) {
      throw new Error(
        "A user ID is required to load journey history."
      );
    }
  
  
    const historyQuery =
      query(
        getJourneyHistoryCollection(
          userId
        ),
        orderBy(
          "stageNumber",
          "asc"
        )
      );
  
  
    const snapshot =
      await getDocs(
        historyQuery
      );
  
  
    return snapshot.docs.map(
      (stageDocument) => {
  
        const data =
          stageDocument.data();
  
  
        return {
          stageId:
            typeof data.stageId ===
            "string"
              ? data.stageId
              : stageDocument.id,
  
          stageNumber:
            typeof data.stageNumber ===
            "number"
              ? data.stageNumber
              : 0,
  
          familyProfile:
            data.familyProfile as FamilyProfile,
  
          journey:
            data.journey as PersonalizedJourney,
  
          completedTaskIds:
            Array.isArray(
              data.completedTaskIds
            )
              ? data.completedTaskIds
              : [],
  
          createdAt:
            typeof data.createdAt ===
            "number"
              ? data.createdAt
              : 0,
  
          completedAt:
            typeof data.completedAt ===
            "number"
              ? data.completedAt
              : 0,
  
          reason:
            data.reason ===
              "initial" ||
            data.reason ===
              "tasks_completed" ||
            data.reason ===
              "manual_refresh"
              ? data.reason
              : "tasks_completed",
        };
  
      }
    );
  }
  
  
  /*
   * ============================================================
   * GET NEXT STAGE NUMBER
   * ============================================================
   *
   * Looks at the user's existing history and returns the next
   * available stage number.
   *
   * Examples:
   *
   * No history  -> 1
   * Stage 1     -> 2
   * Stage 1,2   -> 3
   * ============================================================
   */
  
  export async function getNextStageNumber(
    userId: string
  ): Promise<number> {
  
    const history =
      await getJourneyHistory(
        userId
      );
  
  
    if (
      history.length === 0
    ) {
  
      return 1;
  
    }
  
  
    const highestStage =
      history.reduce(
        (
          highest,
          stage
        ) =>
          Math.max(
            highest,
            stage.stageNumber
          ),
        0
      );
  
  
    return (
      highestStage + 1
    );
  }
  
  
  /*
   * ============================================================
   * GET CURRENT STAGE NUMBER
   * ============================================================
   *
   * Returns the highest stage currently saved in history.
   *
   * Returns 0 when there is no history.
   * ============================================================
   */
  
  export async function getCurrentStageNumber(
    userId: string
  ): Promise<number> {
  
    const history =
      await getJourneyHistory(
        userId
      );
  
  
    if (
      history.length === 0
    ) {
  
      return 0;
  
    }
  
  
    return history.reduce(
      (
        highest,
        stage
      ) =>
        Math.max(
          highest,
          stage.stageNumber
        ),
      0
    );
  }