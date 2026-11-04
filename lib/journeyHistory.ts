import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
} from "firebase/firestore";

import type {
  FamilyProfile,
} from "../types/familyProfile";

import type {
  PersonalizedJourney,
} from "./ai/journeyTypes";

import {
  db,
} from "./firebase";

import {
  getCurrentJourney,
} from "./journeyRepository";


/*
 * ============================================================
 * JOURNEY HISTORY
 * ============================================================
 *
 * NEW MULTI-CHILD / MULTI-JOURNEY STRUCTURE
 *
 * Preferred history location:
 *
 * users/
 *   {userId}/
 *     children/
 *       {childId}/
 *         journeys/
 *           {journeyId}/
 *             history/
 *               stage-1
 *               stage-2
 *               stage-3
 *
 *
 * CHILD LEGACY HISTORY:
 *
 * users/
 *   {userId}/
 *     children/
 *       {childId}/
 *         journeyHistory/
 *           stage-1
 *
 *
 * OLD ACCOUNT LEGACY HISTORY:
 *
 * users/
 *   {userId}/
 *     journeyHistory/
 *       stage-1
 *
 *
 * IMPORTANT:
 *
 * Each Journey has its own history.
 *
 * Starting a New Journey must therefore begin with an empty
 * Journey History rather than showing stages from the child's
 * previous Journey.
 *
 * ============================================================
 */


/*
 * ============================================================
 * TYPES
 * ============================================================
 */

export type JourneyReason =
  | "initial"
  | "tasks_completed"
  | "manual_refresh";


export type JourneyStageRecord = {
  stageId:
    string;

  stageNumber:
    number;

  journeyId?:
    string;

  familyProfile:
    FamilyProfile;

  journey:
    PersonalizedJourney;

  completedTaskIds:
    string[];

  createdAt:
    number;

  completedAt:
    number;

  reason:
    JourneyReason;
};


/*
 * ============================================================
 * VALIDATION
 * ============================================================
 */

function requireUserId(
  userId: string
) {
  if (
    !userId
  ) {
    throw new Error(
      "A user ID is required to access journey history."
    );
  }
}


function requireChildId(
  childId: string
) {
  if (
    !childId
  ) {
    throw new Error(
      "A child ID is required to access child journey history."
    );
  }
}


function requireJourneyId(
  journeyId: string
) {
  if (
    !journeyId
  ) {
    throw new Error(
      "A journey ID is required to access journey history."
    );
  }
}


function requireStageNumber(
  stageNumber: number
) {
  if (
    !Number.isInteger(
      stageNumber
    ) ||
    stageNumber <
      1
  ) {
    throw new Error(
      "Stage number must be a positive integer."
    );
  }
}


/*
 * ============================================================
 * NORMALIZE REASON
 * ============================================================
 */

function normalizeReason(
  value: unknown
):
  JourneyReason {

  if (
    value ===
      "initial" ||
    value ===
      "tasks_completed" ||
    value ===
      "manual_refresh"
  ) {
    return value;
  }


  return "tasks_completed";
}


/*
 * ============================================================
 * CHILD DOCUMENT
 * ============================================================
 */

function getChildRef(
  userId: string,
  childId: string
) {
  requireUserId(
    userId
  );

  requireChildId(
    childId
  );


  return doc(
    db,
    "users",
    userId,
    "children",
    childId
  );
}


/*
 * ============================================================
 * PREFERRED JOURNEY HISTORY COLLECTION
 * ============================================================
 */

function getJourneySpecificHistoryCollection(
  userId: string,
  childId: string,
  journeyId: string
) {
  requireUserId(
    userId
  );

  requireChildId(
    childId
  );

  requireJourneyId(
    journeyId
  );


  return collection(
    db,
    "users",
    userId,
    "children",
    childId,
    "journeys",
    journeyId,
    "history"
  );
}


/*
 * ============================================================
 * PREFERRED JOURNEY STAGE DOCUMENT
 * ============================================================
 */

function getJourneySpecificStageRef(
  userId: string,
  childId: string,
  journeyId: string,
  stageNumber: number
) {
  requireStageNumber(
    stageNumber
  );


  return doc(
    getJourneySpecificHistoryCollection(
      userId,
      childId,
      journeyId
    ),
    `stage-${stageNumber}`
  );
}


/*
 * ============================================================
 * CHILD LEGACY HISTORY
 * ============================================================
 */

function getChildLegacyHistoryCollection(
  userId: string,
  childId: string
) {
  requireUserId(
    userId
  );

  requireChildId(
    childId
  );


  return collection(
    db,
    "users",
    userId,
    "children",
    childId,
    "journeyHistory"
  );
}


/*
 * ============================================================
 * OLD ACCOUNT LEGACY HISTORY
 * ============================================================
 */

function getLegacyJourneyHistoryCollection(
  userId: string
) {
  requireUserId(
    userId
  );


  return collection(
    db,
    "users",
    userId,
    "journeyHistory"
  );
}


/*
 * ============================================================
 * OLD ACCOUNT LEGACY STAGE
 * ============================================================
 */

function getLegacyJourneyStageRef(
  userId: string,
  stageNumber: number
) {
  requireStageNumber(
    stageNumber
  );


  return doc(
    getLegacyJourneyHistoryCollection(
      userId
    ),
    `stage-${stageNumber}`
  );
}


/*
 * ============================================================
 * NORMALIZE STAGE
 * ============================================================
 */

function normalizeStageRecord(
  data:
    Record<string, any>,
  documentId:
    string
):
  JourneyStageRecord | null {

  if (
    !data?.familyProfile ||
    !data?.journey
  ) {
    return null;
  }


  const stageNumber =
    typeof data.stageNumber ===
      "number" &&
    data.stageNumber >=
      1

      ? data.stageNumber

      : 0;


  if (
    stageNumber ===
    0
  ) {
    return null;
  }


  return {
    stageId:
      typeof data.stageId ===
        "string" &&
      data.stageId

        ? data.stageId

        : documentId,

    stageNumber,

    journeyId:
      typeof data.journeyId ===
        "string" &&
      data.journeyId

        ? data.journeyId

        : undefined,

    familyProfile:
      data.familyProfile as
        FamilyProfile,

    journey:
      data.journey as
        PersonalizedJourney,

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
      normalizeReason(
        data.reason
      ),
  };
}


/*
 * ============================================================
 * READ HISTORY COLLECTION
 * ============================================================
 */

async function readHistoryCollection(
  historyCollection:
    ReturnType<typeof collection>
):
  Promise<JourneyStageRecord[]> {

  const historyQuery =
    query(
      historyCollection,

      orderBy(
        "stageNumber",
        "asc"
      )
    );


  const snapshot =
    await getDocs(
      historyQuery
    );


  return snapshot.docs
    .map(
      (
        stageDocument
      ) =>
        normalizeStageRecord(
          stageDocument.data(),
          stageDocument.id
        )
    )
    .filter(
      (
        stage
      ):
        stage is JourneyStageRecord =>
        stage !== null
    );
}


/*
 * ============================================================
 * RESOLVE ACTIVE JOURNEY ID
 * ============================================================
 */

async function resolveJourneyId(
  userId: string,
  childId: string,
  requestedJourneyId?: string
):
  Promise<string> {

  const explicitJourneyId =
    requestedJourneyId
      ?.trim() ||
    "";


  if (
    explicitJourneyId
  ) {
    return explicitJourneyId;
  }


  const currentJourney =
    await getCurrentJourney(
      userId,
      childId
    );


  return (
    currentJourney
      ?.journeyId ||
    ""
  );
}


/*
 * ============================================================
 * GET OLD ACCOUNT LEGACY HISTORY
 * ============================================================
 *
 * This is intentionally kept because JourneyBuilder uses it
 * while migrating older accounts.
 * ============================================================
 */

export async function getLegacyJourneyHistory(
  userId: string
):
  Promise<JourneyStageRecord[]> {

  requireUserId(
    userId
  );


  return readHistoryCollection(
    getLegacyJourneyHistoryCollection(
      userId
    )
  );
}


/*
 * ============================================================
 * GET CHILD LEGACY HISTORY
 * ============================================================
 */

async function getChildLegacyJourneyHistory(
  userId: string,
  childId: string
):
  Promise<JourneyStageRecord[]> {

  requireUserId(
    userId
  );

  requireChildId(
    childId
  );


  return readHistoryCollection(
    getChildLegacyHistoryCollection(
      userId,
      childId
    )
  );
}


/*
 * ============================================================
 * MIGRATE CHILD LEGACY HISTORY
 * ============================================================
 *
 * Previous multi-child builds stored history here:
 *
 * users/{uid}/children/{childId}/journeyHistory
 *
 * That history belongs to the Journey that was active when the
 * migration first occurs.
 *
 *
 * IMPORTANT:
 *
 * historyMigratedToJourneyId is written to the child document.
 *
 * Once migration has happened, old child-level history will NOT
 * be copied into a future New Journey.
 *
 * This prevents:
 *
 * Journey A Stage 1
 *
 * from appearing inside:
 *
 * Journey B Stage 1
 *
 * ============================================================
 */

async function migrateChildLegacyHistoryIfNeeded(
  userId: string,
  childId: string,
  journeyId: string
):
  Promise<void> {

  requireUserId(
    userId
  );

  requireChildId(
    childId
  );

  requireJourneyId(
    journeyId
  );


  const childRef =
    getChildRef(
      userId,
      childId
    );


  const childSnapshot =
    await getDoc(
      childRef
    );


  const childData =
    childSnapshot.exists()

      ? childSnapshot.data()

      : null;


  const alreadyMigratedToJourneyId =
    typeof childData
      ?.historyMigratedToJourneyId ===
      "string"

      ? childData
          .historyMigratedToJourneyId

      : "";


  /*
   * If this child's old history has already been assigned
   * to ANY Journey, never assign it again.
   *
   * This is what protects future Journeys.
   */

  if (
    alreadyMigratedToJourneyId
  ) {
    return;
  }


  const legacyHistory =
    await getChildLegacyJourneyHistory(
      userId,
      childId
    );


  for (
    const stage
    of legacyHistory
  ) {
    await setDoc(
      getJourneySpecificStageRef(
        userId,
        childId,
        journeyId,
        stage.stageNumber
      ),
      {
        ...stage,

        journeyId,
      },
      {
        merge:
          true,
      }
    );
  }


  /*
   * Mark migration even when there was no legacy history.
   *
   * Otherwise old child-level records created later could
   * accidentally leak into another Journey.
   */

  await setDoc(
    childRef,
    {
      historyMigratedToJourneyId:
        journeyId,
    },
    {
      merge:
        true,
    }
  );
}


/*
 * ============================================================
 * SAVE COMPLETED STAGE
 * ============================================================
 */

export async function saveJourneyStage(
  userId: string,
  stageNumber: number,
  familyProfile: FamilyProfile,
  journey: PersonalizedJourney,
  completedTaskIds: string[],
  options?: {
    journeyId?:
      string;

    createdAt?:
      number;

    completedAt?:
      number;

    reason?:
      JourneyReason;
  }
):
  Promise<void> {

  requireUserId(
    userId
  );

  requireStageNumber(
    stageNumber
  );


  const now =
    Date.now();


  const childId =
    familyProfile
      .childId
      ?.trim() ||
    "";


  /*
   * ==========================================================
   * CHILD-SPECIFIC JOURNEY
   * ==========================================================
   */

  if (
    childId
  ) {
    const journeyId =
      await resolveJourneyId(
        userId,
        childId,
        options?.journeyId
      );


    if (
      !journeyId
    ) {
      throw new Error(
        "Unable to save Journey History because no active journey ID was found."
      );
    }


    /*
     * If necessary, attach old child-level history to this
     * Journey before writing the new stage.
     */

    await migrateChildLegacyHistoryIfNeeded(
      userId,
      childId,
      journeyId
    );


    const stageRecord:
      JourneyStageRecord = {

      stageId:
        `stage-${stageNumber}`,

      stageNumber,

      journeyId,

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
      getJourneySpecificStageRef(
        userId,
        childId,
        journeyId,
        stageNumber
      ),
      stageRecord,
      {
        merge:
          true,
      }
    );


    return;
  }


  /*
   * ==========================================================
   * LEGACY ACCOUNT FALLBACK
   * ==========================================================
   *
   * This remains only for older accounts during migration.
   */

  const legacyRecord:
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
    getLegacyJourneyStageRef(
      userId,
      stageNumber
    ),
    legacyRecord,
    {
      merge:
        true,
    }
  );
}


/*
 * ============================================================
 * GET JOURNEY HISTORY
 * ============================================================
 *
 * Preferred:
 *
 * getJourneyHistory(
 *   userId,
 *   childId,
 *   journeyId
 * )
 *
 *
 * If journeyId is omitted, the child's current Journey ID is
 * resolved automatically.
 *
 *
 * If childId is omitted, old account-level history is returned
 * for migration compatibility only.
 * ============================================================
 */

export async function getJourneyHistory(
  userId: string,
  childId?: string,
  journeyId?: string
):
  Promise<JourneyStageRecord[]> {

  requireUserId(
    userId
  );


  const normalizedChildId =
    childId
      ?.trim() ||
    "";


  /*
   * Legacy account history.
   */

  if (
    !normalizedChildId
  ) {
    return getLegacyJourneyHistory(
      userId
    );
  }


  /*
   * Resolve current Journey identity.
   */

  const resolvedJourneyId =
    await resolveJourneyId(
      userId,
      normalizedChildId,
      journeyId
    );


  /*
   * A child without an active Journey has no CURRENT
   * Journey History.
   *
   * This is especially important immediately after
   * Start a New Journey.
   */

  if (
    !resolvedJourneyId
  ) {
    return [];
  }


  /*
   * One-time migration of previous child-level history.
   */

  await migrateChildLegacyHistoryIfNeeded(
    userId,
    normalizedChildId,
    resolvedJourneyId
  );


  return readHistoryCollection(
    getJourneySpecificHistoryCollection(
      userId,
      normalizedChildId,
      resolvedJourneyId
    )
  );
}


/*
 * ============================================================
 * GET NEXT STAGE NUMBER
 * ============================================================
 */

export async function getNextStageNumber(
  userId: string,
  childId?: string,
  journeyId?: string
):
  Promise<number> {

  const history =
    await getJourneyHistory(
      userId,
      childId,
      journeyId
    );


  if (
    history.length ===
    0
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
    highestStage +
    1
  );
}


/*
 * ============================================================
 * GET CURRENT STAGE NUMBER
 * ============================================================
 */

export async function getCurrentStageNumber(
  userId: string,
  childId?: string,
  journeyId?: string
):
  Promise<number> {

  const history =
    await getJourneyHistory(
      userId,
      childId,
      journeyId
    );


  if (
    history.length ===
    0
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