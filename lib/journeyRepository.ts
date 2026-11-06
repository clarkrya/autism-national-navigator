
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  setDoc,
} from "firebase/firestore";

import type { FamilyProfile } from "../types/familyProfile";
import type { PersonalizedJourney } from "./ai/journeyTypes";
import { db } from "./firebase";

/**
 * AUTIVOYA JOURNEY REPOSITORY
 *
 * Firestore structure:
 *
 * users/{userId}/children/{childId}
 * users/{userId}/children/{childId}/journeys/current
 * users/{userId}/children/{childId}/pastJourneys/{journeyId}
 * users/{userId}/children/{childId}/taskProgress/current
 *
 * Legacy:
 * users/{userId}/journeys/current
 */

export type JourneyReason =
  | "initial"
  | "tasks_completed"
  | "manual_refresh";

export type SavedJourney = {
  journeyId: string;
  familyProfile: FamilyProfile;
  journey: PersonalizedJourney;
  updatedAt: number;
  createdAt: number;
  createdBy: string;
  stageNumber: number;
  previousCompletedTaskIds?: string[];
  journeyReason?: JourneyReason;
};

export type SavedChild = {
  childId: string;
  familyProfile: FamilyProfile;
  updatedAt: number;
};

export type ArchivedJourney = {
  journeyId: string;
  familyProfile: FamilyProfile;
  journey: PersonalizedJourney;
  stageNumber: number;
  previousCompletedTaskIds?: string[];
  journeyReason?: JourneyReason;
  createdAt: number;
  updatedAt: number;
  archivedAt: number;
  createdBy: string;
};

// ============================================================
// ID GENERATION
// ============================================================

export function createJourneyId(): string {
  if (
    typeof globalThis !== "undefined" &&
    globalThis.crypto &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }

  return `journey-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

// ============================================================
// VALIDATION
// ============================================================

function requireUserId(userId: string): void {
  if (!userId || !userId.trim()) {
    throw new Error(
      "A user ID is required to access journey data."
    );
  }
}

function requireChildId(
  childId: string | undefined | null
): string {
  if (
    typeof childId !== "string" ||
    !childId.trim()
  ) {
    throw new Error(
      "A child ID is required to access a child journey."
    );
  }

  return childId;
}

function requireJourneyId(journeyId: string): void {
  if (!journeyId || !journeyId.trim()) {
    throw new Error(
      "A journey ID is required to access journey data."
    );
  }
}

// ============================================================
// FIRESTORE REFERENCES
// ============================================================

function getChildRef(
  userId: string,
  childId: string
) {
  requireUserId(userId);
  const validChildId = requireChildId(childId);

  return doc(
    db,
    "users",
    userId,
    "children",
    validChildId
  );
}

function getChildrenCollection(userId: string) {
  requireUserId(userId);

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
  requireUserId(userId);
  const validChildId = requireChildId(childId);

  return doc(
    db,
    "users",
    userId,
    "children",
    validChildId,
    "journeys",
    "current"
  );
}

function getPastJourneysCollection(
  userId: string,
  childId: string
) {
  requireUserId(userId);
  const validChildId = requireChildId(childId);

  return collection(
    db,
    "users",
    userId,
    "children",
    validChildId,
    "pastJourneys"
  );
}

function getPastJourneyRef(
  userId: string,
  childId: string,
  journeyId: string
) {
  requireUserId(userId);
  const validChildId = requireChildId(childId);
  requireJourneyId(journeyId);

  return doc(
    db,
    "users",
    userId,
    "children",
    validChildId,
    "pastJourneys",
    journeyId
  );
}

function getLegacyCurrentJourneyRef(userId: string) {
  requireUserId(userId);

  return doc(
    db,
    "users",
    userId,
    "journeys",
    "current"
  );
}

function getSharedTaskProgressRef(
  ownerUserId: string,
  childId: string
) {
  requireUserId(ownerUserId);
  const validChildId = requireChildId(childId);

  return doc(
    db,
    "users",
    ownerUserId,
    "children",
    validChildId,
    "taskProgress",
    "current"
  );
}

// ============================================================
// NORMALIZATION
// ============================================================

function normalizeJourneyReason(
  value: unknown
): JourneyReason | undefined {
  if (
    value === "initial" ||
    value === "tasks_completed" ||
    value === "manual_refresh"
  ) {
    return value;
  }

  return undefined;
}

function normalizeSavedJourney(
  data: Record<string, any>,
  userId: string
): SavedJourney | null {
  if (!data?.familyProfile || !data?.journey) {
    console.warn(
      "Saved journey exists but is incomplete."
    );
    return null;
  }

  const journeyId =
    typeof data.journeyId === "string" &&
    data.journeyId.trim()
      ? data.journeyId.trim()
      : createJourneyId();

  const updatedAt =
    typeof data.updatedAt === "number"
      ? data.updatedAt
      : Date.now();

  const createdAt =
    typeof data.createdAt === "number"
      ? data.createdAt
      : updatedAt;

  return {
    journeyId,
    familyProfile: data.familyProfile as FamilyProfile,
    journey: data.journey as PersonalizedJourney,
    updatedAt,
    createdAt,
    createdBy:
      typeof data.createdBy === "string"
        ? data.createdBy
        : userId,
    stageNumber:
      typeof data.stageNumber === "number" &&
      data.stageNumber >= 1
        ? data.stageNumber
        : 1,
    previousCompletedTaskIds:
      Array.isArray(data.previousCompletedTaskIds)
        ? data.previousCompletedTaskIds
        : undefined,
    journeyReason: normalizeJourneyReason(
      data.journeyReason
    ),
  };
}

// ============================================================
// GET SHARED FAMILY TEAM TASK PROGRESS
// ============================================================

/**
 * Retrieves shared task-completion overrides for
 * the specified current Journey.
 *
 * Progress from a different Journey is ignored.
 */
export async function getSharedTaskProgress(
  ownerUserId: string,
  childId: string,
  journeyId: string
): Promise<Record<string, boolean>> {
  requireUserId(ownerUserId);
  requireChildId(childId);
  requireJourneyId(journeyId);

  const snapshot = await getDoc(
    getSharedTaskProgressRef(ownerUserId, childId)
  );

  if (!snapshot.exists()) {
    return {};
  }

  const data = snapshot.data();

  if (data.journeyId !== journeyId) {
    return {};
  }

  const statuses = data.completedByTaskId;

  if (
    !statuses ||
    typeof statuses !== "object" ||
    Array.isArray(statuses)
  ) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(statuses).filter(
      ([, value]) => typeof value === "boolean"
    )
  ) as Record<string, boolean>;
}

// ============================================================
// GET CURRENT JOURNEY
// ============================================================

/**
 * Loads the canonical current Journey and applies
 * any matching Family Team task-completion overrides.
 *
 * Original task descriptions, priorities and other
 * AI-generated content remain unchanged.
 */
export async function getCurrentJourney(
  userId: string,
  childId: string
): Promise<SavedJourney | null> {
  requireUserId(userId);
  requireChildId(childId);

  const snapshot = await getDoc(
    getChildCurrentJourneyRef(userId, childId)
  );

  if (!snapshot.exists()) {
    return null;
  }

  const savedJourney = normalizeSavedJourney(
    snapshot.data(),
    userId
  );

  if (!savedJourney) {
    return null;
  }

  const progress = await getSharedTaskProgress(
    userId,
    childId,
    savedJourney.journeyId
  );

  return {
    ...savedJourney,
    journey: {
      ...savedJourney.journey,
      tasks: (savedJourney.journey.tasks || []).map(
        (task) => ({
          ...task,
          completed:
            progress[task.id] ?? task.completed,
        })
      ),
    },
  };
}

// ============================================================
// GET LEGACY CURRENT JOURNEY
// ============================================================

export async function getLegacyCurrentJourney(
  userId: string
): Promise<SavedJourney | null> {
  requireUserId(userId);

  const snapshot = await getDoc(
    getLegacyCurrentJourneyRef(userId)
  );

  if (!snapshot.exists()) {
    return null;
  }

  return normalizeSavedJourney(
    snapshot.data(),
    userId
  );
}

// ============================================================
// GET SAVED CHILDREN
// ============================================================

export async function getSavedChildren(
  userId: string
): Promise<SavedChild[]> {
  requireUserId(userId);

  const childrenQuery = query(
    getChildrenCollection(userId),
    orderBy("updatedAt", "desc")
  );

  const snapshot = await getDocs(childrenQuery);

  return snapshot.docs
    .map((childDocument): SavedChild | null => {
      const data = childDocument.data();

      if (!data?.familyProfile) {
        return null;
      }

      const storedProfile =
        data.familyProfile as Partial<FamilyProfile>;

      const familyProfile: FamilyProfile = {
        childId:
          typeof storedProfile.childId === "string" &&
          storedProfile.childId
            ? storedProfile.childId
            : childDocument.id,

        childName:
          typeof storedProfile.childName === "string"
            ? storedProfile.childName
            : "",

        childAge:
          typeof storedProfile.childAge === "string"
            ? storedProfile.childAge
            : "",

        state:
          typeof storedProfile.state === "string"
            ? storedProfile.state
            : "",

        journeyStage:
          typeof storedProfile.journeyStage === "string"
            ? storedProfile.journeyStage
            : "",

        supports: Array.isArray(storedProfile.supports)
          ? storedProfile.supports
          : [],

        priority:
          typeof storedProfile.priority === "string"
            ? storedProfile.priority
            : "",

        insurance:
          typeof storedProfile.insurance === "string"
            ? storedProfile.insurance
            : "",

        notes:
          typeof storedProfile.notes === "string"
            ? storedProfile.notes
            : "",
      };

      return {
        childId: childDocument.id,
        familyProfile,
        updatedAt:
          typeof data.updatedAt === "number"
            ? data.updatedAt
            : 0,
      };
    })
    .filter(
      (child): child is SavedChild => child !== null
    );
}

// ============================================================
// SAVE CHILD RECORD
// ============================================================

async function saveChildRecord(
  userId: string,
  familyProfile: FamilyProfile
): Promise<void> {
  requireUserId(userId);

  const childId = requireChildId(
    familyProfile.childId
  );

  await setDoc(
    getChildRef(userId, childId),
    {
      childId,
      familyProfile,
      updatedAt: Date.now(),
      createdBy: userId,
    },
    {
      merge: true,
    }
  );
}

// ============================================================
// SAVE CURRENT JOURNEY
// ============================================================

export async function saveCurrentJourney(
  userId: string,
  familyProfile: FamilyProfile,
  journey: PersonalizedJourney,
  options?: {
    stageNumber?: number;
    previousCompletedTaskIds?: string[];
    journeyReason?: JourneyReason;
    journeyId?: string;
  }
): Promise<SavedJourney> {
  requireUserId(userId);

  const childId = requireChildId(
    familyProfile.childId
  );

  const currentRef = getChildCurrentJourneyRef(
    userId,
    childId
  );

  const existingSnapshot = await getDoc(currentRef);

  let existingJourney: SavedJourney | null = null;

  if (existingSnapshot.exists()) {
    existingJourney = normalizeSavedJourney(
      existingSnapshot.data(),
      userId
    );
  }

  const journeyId =
    options?.journeyId ||
    existingJourney?.journeyId ||
    createJourneyId();

  const now = Date.now();

  const stageNumber =
    options?.stageNumber &&
    Number.isInteger(options.stageNumber) &&
    options.stageNumber >= 1
      ? options.stageNumber
      : existingJourney?.stageNumber || 1;

  const createdAt =
    existingJourney?.createdAt || now;

  const savedJourney: SavedJourney = {
    journeyId,
    familyProfile,
    journey,
    updatedAt: now,
    createdAt,
    createdBy: userId,
    stageNumber,
    previousCompletedTaskIds:
      options?.previousCompletedTaskIds ??
      existingJourney?.previousCompletedTaskIds,
    journeyReason:
      options?.journeyReason ??
      existingJourney?.journeyReason,
  };

  const firestoreData: Record<string, unknown> = {
    journeyId: savedJourney.journeyId,
    familyProfile: savedJourney.familyProfile,
    journey: savedJourney.journey,
    updatedAt: savedJourney.updatedAt,
    createdAt: savedJourney.createdAt,
    createdBy: savedJourney.createdBy,
    stageNumber: savedJourney.stageNumber,
  };

  if (savedJourney.previousCompletedTaskIds) {
    firestoreData.previousCompletedTaskIds =
      savedJourney.previousCompletedTaskIds;
  }

  if (savedJourney.journeyReason) {
    firestoreData.journeyReason =
      savedJourney.journeyReason;
  }

  await saveChildRecord(userId, familyProfile);

  await setDoc(
    currentRef,
    firestoreData,
    { merge: true }
  );

  return savedJourney;
}

// ============================================================
// SAVE TASK PROGRESS
// ============================================================

/**
 * Owner-only task progress saving.
 *
 * Shared Family Team members must use
 * saveSharedTaskProgress() instead.
 */
export async function saveTaskProgress(
  userId: string,
  familyProfile: FamilyProfile,
  journey: PersonalizedJourney,
  options?: {
    stageNumber?: number;
    journeyReason?: JourneyReason;
  }
): Promise<void> {
  requireUserId(userId);

  const childId = requireChildId(
    familyProfile.childId
  );

  const currentRef = getChildCurrentJourneyRef(
    userId,
    childId
  );

  const existingSnapshot = await getDoc(currentRef);

  const existingJourney = existingSnapshot.exists()
    ? normalizeSavedJourney(
        existingSnapshot.data(),
        userId
      )
    : null;

  const journeyId =
    existingJourney?.journeyId ||
    createJourneyId();

  const stageNumber =
    options?.stageNumber &&
    Number.isInteger(options.stageNumber) &&
    options.stageNumber >= 1
      ? options.stageNumber
      : existingJourney?.stageNumber || 1;

  const now = Date.now();

  await saveChildRecord(userId, familyProfile);

  await setDoc(
    currentRef,
    {
      journeyId,
      familyProfile,
      journey,
      updatedAt: now,
      createdAt: existingJourney?.createdAt || now,
      createdBy: userId,
      stageNumber,

      ...(options?.journeyReason
        ? {
            journeyReason: options.journeyReason,
          }
        : existingJourney?.journeyReason
        ? {
            journeyReason:
              existingJourney.journeyReason,
          }
        : {}),
    },
    {
      merge: true,
    }
  );
}

// ============================================================
// SAVE SHARED FAMILY TEAM TASK PROGRESS
// ============================================================

/**
 * Saves a shared member's task-completion change
 * without modifying the owner's Journey document
 * or child profile.
 *
 * Firestore Security Rules must independently verify
 * that the member has permission to write.
 */
export async function saveSharedTaskProgress(
  ownerUserId: string,
  childId: string,
  taskId: string,
  completed: boolean
): Promise<void> {
  requireUserId(ownerUserId);
  requireChildId(childId);

  if (
    typeof taskId !== "string" ||
    !taskId.trim()
  ) {
    throw new Error("A task ID is required.");
  }

  if (typeof completed !== "boolean") {
    throw new Error(
      "Task completion must be a boolean."
    );
  }

  const currentRef = getChildCurrentJourneyRef(
    ownerUserId,
    childId
  );

  const progressRef = getSharedTaskProgressRef(
    ownerUserId,
    childId
  );

  await runTransaction(db, async (transaction) => {
    const journeySnapshot =
      await transaction.get(currentRef);

    if (!journeySnapshot.exists()) {
      throw new Error(
        "Current Journey not found."
      );
    }

    const savedJourney = normalizeSavedJourney(
      journeySnapshot.data(),
      ownerUserId
    );

    if (!savedJourney) {
      throw new Error(
        "Journey data is invalid."
      );
    }

    const taskExists =
      (savedJourney.journey.tasks || []).some(
        (task) => task.id === taskId
      );

    if (!taskExists) {
      throw new Error(
        "Task not found in current Journey."
      );
    }

    const progressSnapshot =
      await transaction.get(progressRef);

    const existingProgress =
      progressSnapshot.exists()
        ? progressSnapshot.data()
        : null;

    const existingStatuses =
      existingProgress?.journeyId ===
        savedJourney.journeyId &&
      existingProgress?.completedByTaskId &&
      typeof existingProgress.completedByTaskId ===
        "object" &&
      !Array.isArray(
        existingProgress.completedByTaskId
      )
        ? existingProgress.completedByTaskId
        : {};

    transaction.set(progressRef, {
      journeyId: savedJourney.journeyId,
      completedByTaskId: {
        ...existingStatuses,
        [taskId]: completed,
      },
      updatedAt: Date.now(),
    });
  });
}

// ============================================================
// ARCHIVE CURRENT JOURNEY
// ============================================================

export async function archiveCurrentJourney(
  userId: string,
  childId: string
): Promise<ArchivedJourney | null> {
  requireUserId(userId);
  requireChildId(childId);

  const currentRef = getChildCurrentJourneyRef(
    userId,
    childId
  );

  const currentSnapshot = await getDoc(currentRef);

  if (!currentSnapshot.exists()) {
    return null;
  }

  const currentJourney = normalizeSavedJourney(
    currentSnapshot.data(),
    userId
  );

  if (!currentJourney) {
    return null;
  }

  const archivedJourney: ArchivedJourney = {
    journeyId: currentJourney.journeyId,
    familyProfile: currentJourney.familyProfile,
    journey: currentJourney.journey,
    stageNumber: currentJourney.stageNumber,
    previousCompletedTaskIds:
      currentJourney.previousCompletedTaskIds,
    journeyReason: currentJourney.journeyReason,
    createdAt: currentJourney.createdAt,
    updatedAt: currentJourney.updatedAt,
    archivedAt: Date.now(),
    createdBy: currentJourney.createdBy,
  };

  const archiveData: Record<string, unknown> = {
    journeyId: archivedJourney.journeyId,
    familyProfile: archivedJourney.familyProfile,
    journey: archivedJourney.journey,
    stageNumber: archivedJourney.stageNumber,
    createdAt: archivedJourney.createdAt,
    updatedAt: archivedJourney.updatedAt,
    archivedAt: archivedJourney.archivedAt,
    createdBy: archivedJourney.createdBy,
  };

  if (archivedJourney.previousCompletedTaskIds) {
    archiveData.previousCompletedTaskIds =
      archivedJourney.previousCompletedTaskIds;
  }

  if (archivedJourney.journeyReason) {
    archiveData.journeyReason =
      archivedJourney.journeyReason;
  }

  await setDoc(
    getPastJourneyRef(
      userId,
      childId,
      currentJourney.journeyId
    ),
    archiveData
  );

  await deleteDoc(currentRef);

  return archivedJourney;
}

// ============================================================
// GET PAST JOURNEYS
// ============================================================

export async function getPastJourneys(
  userId: string,
  childId: string
): Promise<ArchivedJourney[]> {
  requireUserId(userId);
  requireChildId(childId);

  const pastQuery = query(
    getPastJourneysCollection(userId, childId),
    orderBy("archivedAt", "desc")
  );

  const snapshot = await getDocs(pastQuery);

  return snapshot.docs
    .map((journeyDocument): ArchivedJourney | null => {
      const data = journeyDocument.data();

      if (!data?.familyProfile || !data?.journey) {
        return null;
      }

      return {
        journeyId:
          typeof data.journeyId === "string" &&
          data.journeyId
            ? data.journeyId
            : journeyDocument.id,

        familyProfile:
          data.familyProfile as FamilyProfile,

        journey:
          data.journey as PersonalizedJourney,

        stageNumber:
          typeof data.stageNumber === "number" &&
          data.stageNumber >= 1
            ? data.stageNumber
            : 1,

        previousCompletedTaskIds:
          Array.isArray(data.previousCompletedTaskIds)
            ? data.previousCompletedTaskIds
            : undefined,

        journeyReason: normalizeJourneyReason(
          data.journeyReason
        ),

        createdAt:
          typeof data.createdAt === "number"
            ? data.createdAt
            : 0,

        updatedAt:
          typeof data.updatedAt === "number"
            ? data.updatedAt
            : 0,

        archivedAt:
          typeof data.archivedAt === "number"
            ? data.archivedAt
            : 0,

        createdBy:
          typeof data.createdBy === "string"
            ? data.createdBy
            : userId,
      };
    })
    .filter(
      (journey): journey is ArchivedJourney =>
        journey !== null
    );
}

// ============================================================
// GET ONE PAST JOURNEY
// ============================================================

export async function getPastJourney(
  userId: string,
  childId: string,
  journeyId: string
): Promise<ArchivedJourney | null> {
  requireUserId(userId);
  requireChildId(childId);
  requireJourneyId(journeyId);

  const snapshot = await getDoc(
    getPastJourneyRef(
      userId,
      childId,
      journeyId
    )
  );

  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data();

  if (!data?.familyProfile || !data?.journey) {
    return null;
  }

  return {
    journeyId:
      typeof data.journeyId === "string" &&
      data.journeyId
        ? data.journeyId
        : journeyId,

    familyProfile:
      data.familyProfile as FamilyProfile,

    journey:
      data.journey as PersonalizedJourney,

    stageNumber:
      typeof data.stageNumber === "number" &&
      data.stageNumber >= 1
        ? data.stageNumber
        : 1,

    previousCompletedTaskIds:
      Array.isArray(data.previousCompletedTaskIds)
        ? data.previousCompletedTaskIds
        : undefined,

    journeyReason: normalizeJourneyReason(
      data.journeyReason
    ),

    createdAt:
      typeof data.createdAt === "number"
        ? data.createdAt
        : 0,

    updatedAt:
      typeof data.updatedAt === "number"
        ? data.updatedAt
        : 0,

    archivedAt:
      typeof data.archivedAt === "number"
        ? data.archivedAt
        : 0,

    createdBy:
      typeof data.createdBy === "string"
        ? data.createdBy
        : userId,
  };
}

// ============================================================
// DELETE CHILD JOURNEY DATA
// ============================================================

/**
 * Deletes child-scoped Journey records.
 *
 * Firestore does not automatically delete
 * subcollections when a parent is deleted.
 */
export async function deleteChildJourneyData(
  userId: string,
  childId: string
): Promise<void> {
  requireUserId(userId);
  requireChildId(childId);

  const childRef = getChildRef(userId, childId);

  const childSnapshot = await getDoc(childRef);

  if (!childSnapshot.exists()) {
    throw new Error(
      "This child could not be found."
    );
  }

  const pastJourneysSnapshot = await getDocs(
    getPastJourneysCollection(userId, childId)
  );

  if (!pastJourneysSnapshot.empty) {
    await Promise.all(
      pastJourneysSnapshot.docs.map(
        (journeyDocument) =>
          deleteDoc(journeyDocument.ref)
      )
    );
  }

  await deleteDoc(
    getSharedTaskProgressRef(userId, childId)
  );

  await deleteDoc(
    getChildCurrentJourneyRef(
      userId,
      childId
    )
  );

  await deleteDoc(childRef);
}
