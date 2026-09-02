import {
  collection,
  deleteDoc,
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


/*
 * ============================================================
 * JOURNEY REPOSITORY
 * ============================================================
 *
 * MULTI-CHILD / MULTI-JOURNEY STRUCTURE
 *
 * Child:
 *
 * users/{userId}/children/{childId}
 *
 *
 * Active Journey:
 *
 * users/{userId}/children/{childId}/journeys/current
 *
 *
 * Archived Journeys:
 *
 * users/{userId}/children/{childId}/pastJourneys/{journeyId}
 *
 *
 * Legacy account Journey:
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

export type JourneyReason =
  | "initial"
  | "tasks_completed"
  | "manual_refresh";


export type SavedJourney = {
  journeyId: string;

  familyProfile:
    FamilyProfile;

  journey:
    PersonalizedJourney;

  updatedAt:
    number;

  createdAt:
    number;

  createdBy:
    string;

  stageNumber:
    number;

  previousCompletedTaskIds?:
    string[];

  journeyReason?:
    JourneyReason;
};


export type SavedChild = {
  childId:
    string;

  familyProfile:
    FamilyProfile;

  updatedAt:
    number;
};


export type ArchivedJourney = {
  journeyId:
    string;

  familyProfile:
    FamilyProfile;

  journey:
    PersonalizedJourney;

  stageNumber:
    number;

  previousCompletedTaskIds?:
    string[];

  journeyReason?:
    JourneyReason;

  createdAt:
    number;

  updatedAt:
    number;

  archivedAt:
    number;

  createdBy:
    string;
};


/*
 * ============================================================
 * ID GENERATION
 * ============================================================
 */

export function createJourneyId():
  string {

  if (
    typeof globalThis !==
      "undefined" &&
    globalThis.crypto &&
    typeof globalThis.crypto.randomUUID ===
      "function"
  ) {
    return globalThis.crypto.randomUUID();
  }


  return `journey-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}


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
      "A user ID is required to access journey data."
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
      "A child ID is required to access a child journey."
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
      "A journey ID is required to access journey data."
    );
  }
}


/*
 * ============================================================
 * FIRESTORE REFERENCES
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


function getChildrenCollection(
  userId: string
) {
  requireUserId(
    userId
  );


  return collection(
    db,
    "users",
    userId,
    "children"
  );
}


function getChildCurrentJourneyRef(
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
    childId,
    "journeys",
    "current"
  );
}


function getPastJourneysCollection(
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
    "pastJourneys"
  );
}


function getPastJourneyRef(
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


  return doc(
    db,
    "users",
    userId,
    "children",
    childId,
    "pastJourneys",
    journeyId
  );
}


function getLegacyCurrentJourneyRef(
  userId: string
) {
  requireUserId(
    userId
  );


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
 * NORMALIZE JOURNEY REASON
 * ============================================================
 */

function normalizeJourneyReason(
  value: unknown
):
  | JourneyReason
  | undefined {

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


  return undefined;
}


/*
 * ============================================================
 * NORMALIZE SAVED JOURNEY
 * ============================================================
 */

function normalizeSavedJourney(
  data:
    Record<string, any>,
  userId:
    string
):
  SavedJourney | null {

  if (
    !data?.familyProfile ||
    !data?.journey
  ) {
    console.warn(
      "Saved journey exists but is incomplete."
    );

    return null;
  }


  /*
   * Older Journeys may not have journeyId.
   */

  const journeyId =
    typeof data.journeyId ===
      "string" &&
    data.journeyId.trim()

      ? data.journeyId.trim()

      : createJourneyId();


  const updatedAt =
    typeof data.updatedAt ===
      "number"

      ? data.updatedAt

      : Date.now();


  const createdAt =
    typeof data.createdAt ===
      "number"

      ? data.createdAt

      : updatedAt;


  return {
    journeyId,

    familyProfile:
      data.familyProfile as
        FamilyProfile,

    journey:
      data.journey as
        PersonalizedJourney,

    updatedAt,

    createdAt,

    createdBy:
      typeof data.createdBy ===
        "string"

        ? data.createdBy

        : userId,

    stageNumber:
      typeof data.stageNumber ===
        "number" &&
      data.stageNumber >=
        1

        ? data.stageNumber

        : 1,

    previousCompletedTaskIds:
      Array.isArray(
        data.previousCompletedTaskIds
      )

        ? data.previousCompletedTaskIds

        : undefined,

    journeyReason:
      normalizeJourneyReason(
        data.journeyReason
      ),
  };
}


/*
 * ============================================================
 * GET CURRENT JOURNEY
 * ============================================================
 */

export async function getCurrentJourney(
  userId: string,
  childId: string
):
  Promise<SavedJourney | null> {

  requireUserId(
    userId
  );

  requireChildId(
    childId
  );


  const snapshot =
    await getDoc(
      getChildCurrentJourneyRef(
        userId,
        childId
      )
    );


  if (
    !snapshot.exists()
  ) {
    return null;
  }


  return normalizeSavedJourney(
    snapshot.data(),
    userId
  );
}


/*
 * ============================================================
 * GET LEGACY CURRENT JOURNEY
 * ============================================================
 *
 * Used only so existing accounts can migrate from:
 *
 * users/{uid}/journeys/current
 *
 * ============================================================
 */

export async function getLegacyCurrentJourney(
  userId: string
):
  Promise<SavedJourney | null> {

  requireUserId(
    userId
  );


  const snapshot =
    await getDoc(
      getLegacyCurrentJourneyRef(
        userId
      )
    );


  if (
    !snapshot.exists()
  ) {
    return null;
  }


  return normalizeSavedJourney(
    snapshot.data(),
    userId
  );
}


/*
 * ============================================================
 * GET SAVED CHILDREN
 * ============================================================
 */

export async function getSavedChildren(
  userId: string
):
  Promise<SavedChild[]> {

  requireUserId(
    userId
  );


  const childrenQuery =
    query(
      getChildrenCollection(
        userId
      ),

      orderBy(
        "updatedAt",
        "desc"
      )
    );


  const snapshot =
    await getDocs(
      childrenQuery
    );


  return snapshot.docs
    .map(
      (
        childDocument
      ):
        SavedChild | null => {

        const data =
          childDocument.data();


        if (
          !data?.familyProfile
        ) {
          return null;
        }


        const storedProfile =
          data.familyProfile as
            Partial<FamilyProfile>;


        const familyProfile:
          FamilyProfile = {

          childId:
            typeof storedProfile.childId ===
              "string" &&
            storedProfile.childId

              ? storedProfile.childId

              : childDocument.id,

          childName:
            typeof storedProfile.childName ===
              "string"

              ? storedProfile.childName

              : "",

          childAge:
            typeof storedProfile.childAge ===
              "string"

              ? storedProfile.childAge

              : "",

          state:
            typeof storedProfile.state ===
              "string"

              ? storedProfile.state

              : "",

          journeyStage:
            typeof storedProfile.journeyStage ===
              "string"

              ? storedProfile.journeyStage

              : "",

          supports:
            Array.isArray(
              storedProfile.supports
            )

              ? storedProfile.supports

              : [],

          priority:
            typeof storedProfile.priority ===
              "string"

              ? storedProfile.priority

              : "",

          insurance:
            typeof storedProfile.insurance ===
              "string"

              ? storedProfile.insurance

              : "",

          notes:
            typeof storedProfile.notes ===
              "string"

              ? storedProfile.notes

              : "",
        };


        return {
          childId:
            childDocument.id,

          familyProfile,

          updatedAt:
            typeof data.updatedAt ===
              "number"

              ? data.updatedAt

              : 0,
        };
      }
    )
    .filter(
      (
        child
      ):
        child is SavedChild =>
        child !== null
    );
}


/*
 * ============================================================
 * SAVE CHILD RECORD
 * ============================================================
 */

async function saveChildRecord(
  userId: string,
  familyProfile:
    FamilyProfile
):
  Promise<void> {

  requireUserId(
    userId
  );

  requireChildId(
    familyProfile.childId
  );


  await setDoc(
    getChildRef(
      userId,
      familyProfile.childId
    ),
    {
      childId:
        familyProfile.childId,

      familyProfile,

      updatedAt:
        Date.now(),

      createdBy:
        userId,
    },
    {
      merge:
        true,
    }
  );
}


/*
 * ============================================================
 * SAVE CURRENT JOURNEY
 * ============================================================
 */

export async function saveCurrentJourney(
  userId: string,
  familyProfile:
    FamilyProfile,
  journey:
    PersonalizedJourney,
  options?: {
    stageNumber?:
      number;

    previousCompletedTaskIds?:
      string[];

    journeyReason?:
      JourneyReason;

    journeyId?:
      string;
  }
):
  Promise<SavedJourney> {

  requireUserId(
    userId
  );

  requireChildId(
    familyProfile.childId
  );


  const currentRef =
    getChildCurrentJourneyRef(
      userId,
      familyProfile.childId
    );


  /*
   * Preserve the current journeyId whenever possible.
   */

  const existingSnapshot =
    await getDoc(
      currentRef
    );


  let existingJourney:
    SavedJourney | null =
    null;


  if (
    existingSnapshot.exists()
  ) {
    existingJourney =
      normalizeSavedJourney(
        existingSnapshot.data(),
        userId
      );
  }


  const journeyId =
    options?.journeyId ||
    existingJourney?.journeyId ||
    createJourneyId();


  const now =
    Date.now();


  const stageNumber =
    options?.stageNumber &&
    Number.isInteger(
      options.stageNumber
    ) &&
    options.stageNumber >=
      1

      ? options.stageNumber

      : existingJourney?.stageNumber ||
        1;


  const createdAt =
    existingJourney?.createdAt ||
    now;


  const savedJourney:
    SavedJourney = {

    journeyId,

    familyProfile,

    journey,

    updatedAt:
      now,

    createdAt,

    createdBy:
      userId,

    stageNumber,

    previousCompletedTaskIds:
      options?.previousCompletedTaskIds ??
      existingJourney
        ?.previousCompletedTaskIds,

    journeyReason:
      options?.journeyReason ??
      existingJourney
        ?.journeyReason,
  };


  const firestoreData:
    Record<string, unknown> = {

    journeyId:
      savedJourney.journeyId,

    familyProfile:
      savedJourney.familyProfile,

    journey:
      savedJourney.journey,

    updatedAt:
      savedJourney.updatedAt,

    createdAt:
      savedJourney.createdAt,

    createdBy:
      savedJourney.createdBy,

    stageNumber:
      savedJourney.stageNumber,
  };


  if (
    savedJourney
      .previousCompletedTaskIds
  ) {
    firestoreData.previousCompletedTaskIds =
      savedJourney
        .previousCompletedTaskIds;
  }


  if (
    savedJourney
      .journeyReason
  ) {
    firestoreData.journeyReason =
      savedJourney
        .journeyReason;
  }


  /*
   * Save child record first.
   */

  await saveChildRecord(
    userId,
    familyProfile
  );


  /*
   * Save active Journey.
   */

  await setDoc(
    currentRef,
    firestoreData,
    {
      merge:
        true,
    }
  );


  return savedJourney;
}


/*
 * ============================================================
 * SAVE TASK PROGRESS
 * ============================================================
 */

export async function saveTaskProgress(
  userId: string,
  familyProfile:
    FamilyProfile,
  journey:
    PersonalizedJourney,
  options?: {
    stageNumber?:
      number;

    journeyReason?:
      JourneyReason;
  }
):
  Promise<void> {

  requireUserId(
    userId
  );

  requireChildId(
    familyProfile.childId
  );


  const currentRef =
    getChildCurrentJourneyRef(
      userId,
      familyProfile.childId
    );


  /*
   * Load existing active Journey so we do not accidentally
   * create a new journeyId when a checkbox changes.
   */

  const existingSnapshot =
    await getDoc(
      currentRef
    );


  const existingJourney =
    existingSnapshot.exists()

      ? normalizeSavedJourney(
          existingSnapshot.data(),
          userId
        )

      : null;


  const journeyId =
    existingJourney
      ?.journeyId ||
    createJourneyId();


  const stageNumber =
    options?.stageNumber &&
    Number.isInteger(
      options.stageNumber
    ) &&
    options.stageNumber >=
      1

      ? options.stageNumber

      : existingJourney
          ?.stageNumber ||
        1;


  const now =
    Date.now();


  await saveChildRecord(
    userId,
    familyProfile
  );


  await setDoc(
    currentRef,
    {
      journeyId,

      familyProfile,

      journey,

      updatedAt:
        now,

      createdAt:
        existingJourney
          ?.createdAt ||
        now,

      createdBy:
        userId,

      stageNumber,

      ...(options
        ?.journeyReason

        ? {
            journeyReason:
              options
                .journeyReason,
          }

        : existingJourney
            ?.journeyReason

          ? {
              journeyReason:
                existingJourney
                  .journeyReason,
            }

          : {}),
    },
    {
      merge:
        true,
    }
  );
}


/*
 * ============================================================
 * ARCHIVE CURRENT JOURNEY
 * ============================================================
 *
 * Called only when the family intentionally chooses:
 *
 * Start a New Journey
 *
 * The active Journey is copied to Past Journeys and then
 * journeys/current is deleted.
 *
 * The next saved Journey will therefore receive a NEW
 * journeyId.
 * ============================================================
 */

export async function archiveCurrentJourney(
  userId: string,
  childId: string
):
  Promise<ArchivedJourney | null> {

  requireUserId(
    userId
  );

  requireChildId(
    childId
  );


  const currentRef =
    getChildCurrentJourneyRef(
      userId,
      childId
    );


  const currentSnapshot =
    await getDoc(
      currentRef
    );


  if (
    !currentSnapshot.exists()
  ) {
    return null;
  }


  const currentJourney =
    normalizeSavedJourney(
      currentSnapshot.data(),
      userId
    );


  if (
    !currentJourney
  ) {
    return null;
  }


  const archivedJourney:
    ArchivedJourney = {

    journeyId:
      currentJourney
        .journeyId,

    familyProfile:
      currentJourney
        .familyProfile,

    journey:
      currentJourney
        .journey,

    stageNumber:
      currentJourney
        .stageNumber,

    previousCompletedTaskIds:
      currentJourney
        .previousCompletedTaskIds,

    journeyReason:
      currentJourney
        .journeyReason,

    createdAt:
      currentJourney
        .createdAt,

    updatedAt:
      currentJourney
        .updatedAt,

    archivedAt:
      Date.now(),

    createdBy:
      currentJourney
        .createdBy,
  };


  const archiveData:
    Record<string, unknown> = {

    journeyId:
      archivedJourney
        .journeyId,

    familyProfile:
      archivedJourney
        .familyProfile,

    journey:
      archivedJourney
        .journey,

    stageNumber:
      archivedJourney
        .stageNumber,

    createdAt:
      archivedJourney
        .createdAt,

    updatedAt:
      archivedJourney
        .updatedAt,

    archivedAt:
      archivedJourney
        .archivedAt,

    createdBy:
      archivedJourney
        .createdBy,
  };


  if (
    archivedJourney
      .previousCompletedTaskIds
  ) {
    archiveData.previousCompletedTaskIds =
      archivedJourney
        .previousCompletedTaskIds;
  }


  if (
    archivedJourney
      .journeyReason
  ) {
    archiveData.journeyReason =
      archivedJourney
        .journeyReason;
  }


  /*
   * Save archive.
   */

  await setDoc(
    getPastJourneyRef(
      userId,
      childId,
      currentJourney
        .journeyId
    ),
    archiveData
  );


  /*
   * CRITICAL:
   *
   * Remove the old current Journey.
   *
   * Otherwise saveCurrentJourney() would see the old current
   * document and reuse its journeyId when the family starts over.
   */

  await deleteDoc(
    currentRef
  );


  return archivedJourney;
}


/*
 * ============================================================
 * GET PAST JOURNEYS
 * ============================================================
 */

export async function getPastJourneys(
  userId: string,
  childId: string
):
  Promise<ArchivedJourney[]> {

  requireUserId(
    userId
  );

  requireChildId(
    childId
  );


  const pastQuery =
    query(
      getPastJourneysCollection(
        userId,
        childId
      ),

      orderBy(
        "archivedAt",
        "desc"
      )
    );


  const snapshot =
    await getDocs(
      pastQuery
    );


  return snapshot.docs
    .map(
      (
        journeyDocument
      ):
        ArchivedJourney | null => {

        const data =
          journeyDocument.data();


        if (
          !data?.familyProfile ||
          !data?.journey
        ) {
          return null;
        }


        return {
          journeyId:
            typeof data.journeyId ===
              "string" &&
            data.journeyId

              ? data.journeyId

              : journeyDocument.id,

          familyProfile:
            data.familyProfile as
              FamilyProfile,

          journey:
            data.journey as
              PersonalizedJourney,

          stageNumber:
            typeof data.stageNumber ===
              "number" &&
            data.stageNumber >=
              1

              ? data.stageNumber

              : 1,

          previousCompletedTaskIds:
            Array.isArray(
              data.previousCompletedTaskIds
            )

              ? data.previousCompletedTaskIds

              : undefined,

          journeyReason:
            normalizeJourneyReason(
              data.journeyReason
            ),

          createdAt:
            typeof data.createdAt ===
              "number"

              ? data.createdAt

              : 0,

          updatedAt:
            typeof data.updatedAt ===
              "number"

              ? data.updatedAt

              : 0,

          archivedAt:
            typeof data.archivedAt ===
              "number"

              ? data.archivedAt

              : 0,

          createdBy:
            typeof data.createdBy ===
              "string"

              ? data.createdBy

              : userId,
        };
      }
    )
    .filter(
      (
        journey
      ):
        journey is ArchivedJourney =>
        journey !== null
    );
}


/*
 * ============================================================
 * GET ONE PAST JOURNEY
 * ============================================================
 */

export async function getPastJourney(
  userId: string,
  childId: string,
  journeyId: string
):
  Promise<ArchivedJourney | null> {

  requireUserId(
    userId
  );

  requireChildId(
    childId
  );

  requireJourneyId(
    journeyId
  );


  const snapshot =
    await getDoc(
      getPastJourneyRef(
        userId,
        childId,
        journeyId
      )
    );


  if (
    !snapshot.exists()
  ) {
    return null;
  }


  const data =
    snapshot.data();


  if (
    !data?.familyProfile ||
    !data?.journey
  ) {
    return null;
  }


  return {
    journeyId:
      typeof data.journeyId ===
        "string" &&
      data.journeyId

        ? data.journeyId

        : journeyId,

    familyProfile:
      data.familyProfile as
        FamilyProfile,

    journey:
      data.journey as
        PersonalizedJourney,

    stageNumber:
      typeof data.stageNumber ===
        "number" &&
      data.stageNumber >=
        1

        ? data.stageNumber

        : 1,

    previousCompletedTaskIds:
      Array.isArray(
        data.previousCompletedTaskIds
      )

        ? data.previousCompletedTaskIds

        : undefined,

    journeyReason:
      normalizeJourneyReason(
        data.journeyReason
      ),

    createdAt:
      typeof data.createdAt ===
        "number"

        ? data.createdAt

        : 0,

    updatedAt:
      typeof data.updatedAt ===
        "number"

        ? data.updatedAt

        : 0,

    archivedAt:
      typeof data.archivedAt ===
        "number"

        ? data.archivedAt

        : 0,

    createdBy:
      typeof data.createdBy ===
        "string"

        ? data.createdBy

        : userId,
  };
}