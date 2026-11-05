
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
} from "firebase/firestore";

import type { FamilyProfile } from "../types/familyProfile";
import type { PersonalizedJourney } from "./ai/journeyTypes";

import { auth, db } from "./firebase";
import { getCurrentJourney } from "./journeyRepository";

/*
 * ============================================================
 * JOURNEY HISTORY
 * ============================================================
 *
 * Preferred:
 * users/{ownerUserId}/children/{childId}/
 * journeys/{journeyId}/history/{stageId}
 *
 * Child legacy:
 * users/{ownerUserId}/children/{childId}/journeyHistory
 *
 * Account legacy:
 * users/{ownerUserId}/journeyHistory
 *
 * IMPORTANT:
 * - Each Journey has its own history.
 * - Starting a new Journey must not reuse old history.
 * - Shared members read the owner's canonical history.
 * - Reading shared history must not initiate migration writes.
 * ============================================================
 */

export type JourneyReason =
  | "initial"
  | "tasks_completed"
  | "manual_refresh";

export type JourneyStageRecord = {
  stageId: string;
  stageNumber: number;
  journeyId?: string;
  familyProfile: FamilyProfile;
  journey: PersonalizedJourney;
  completedTaskIds: string[];
  createdAt: number;
  completedAt: number;
  reason: JourneyReason;
};

/*
 * ============================================================
 * VALIDATION
 * ============================================================
 */

function requireUserId(userId: string): void {
  if (!userId?.trim()) {
    throw new Error(
      "A user ID is required to access journey history."
    );
  }
}

function requireChildId(childId: string): void {
  if (!childId?.trim()) {
    throw new Error(
      "A child ID is required to access child journey history."
    );
  }
}

function requireJourneyId(journeyId: string): void {
  if (!journeyId?.trim()) {
    throw new Error(
      "A journey ID is required to access journey history."
    );
  }
}

function requireStageNumber(stageNumber: number): void {
  if (!Number.isInteger(stageNumber) || stageNumber < 1) {
    throw new Error(
      "Stage number must be a positive integer."
    );
  }
}

function normalizeReason(value: unknown): JourneyReason {
  if (
    value === "initial" ||
    value === "tasks_completed" ||
    value === "manual_refresh"
  ) {
    return value;
  }

  return "tasks_completed";
}

/*
 * ============================================================
 * OWNER CHECK
 * ============================================================
 *
 * The userId argument identifies the canonical data owner.
 *
 * A shared member may read the owner's Journey, but must not
 * perform legacy migration on behalf of the owner.
 *
 * This is a client-side migration safeguard, NOT a substitute
 * for Firestore security rules.
 * ============================================================
 */

function isSignedInOwner(ownerUserId: string): boolean {
  const signedInUserId = auth.currentUser?.uid;

  return Boolean(
    signedInUserId &&
    signedInUserId === ownerUserId
  );
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
  requireUserId(userId);
  requireChildId(childId);

  return doc(
    db,
    "users",
    userId,
    "children",
    childId
  );
}

function getJourneySpecificHistoryCollection(
  userId: string,
  childId: string,
  journeyId: string
) {
  requireUserId(userId);
  requireChildId(childId);
  requireJourneyId(journeyId);

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

function getJourneySpecificStageRef(
  userId: string,
  childId: string,
  journeyId: string,
  stageNumber: number
) {
  requireStageNumber(stageNumber);

  return doc(
    getJourneySpecificHistoryCollection(
      userId,
      childId,
      journeyId
    ),
    `stage-${stageNumber}`
  );
}

function getChildLegacyHistoryCollection(
  userId: string,
  childId: string
) {
  requireUserId(userId);
  requireChildId(childId);

  return collection(
    db,
    "users",
    userId,
    "children",
    childId,
    "journeyHistory"
  );
}

function getLegacyJourneyHistoryCollection(
  userId: string
) {
  requireUserId(userId);

  return collection(
    db,
    "users",
    userId,
    "journeyHistory"
  );
}

function getLegacyJourneyStageRef(
  userId: string,
  stageNumber: number
) {
  requireStageNumber(stageNumber);

  return doc(
    getLegacyJourneyHistoryCollection(userId),
    `stage-${stageNumber}`
  );
}

/*
 * ============================================================
 * NORMALIZE STAGE
 * ============================================================
 */

function normalizeStageRecord(
  data: Record<string, any>,
  documentId: string
): JourneyStageRecord | null {
  if (!data?.familyProfile || !data?.journey) {
    return null;
  }

  const stageNumber =
    typeof data.stageNumber === "number" &&
    Number.isInteger(data.stageNumber) &&
    data.stageNumber >= 1
      ? data.stageNumber
      : 0;

  if (stageNumber === 0) {
    return null;
  }

  return {
    stageId:
      typeof data.stageId === "string" && data.stageId
        ? data.stageId
        : documentId,

    stageNumber,

    journeyId:
      typeof data.journeyId === "string" &&
      data.journeyId
        ? data.journeyId
        : undefined,

    familyProfile: data.familyProfile as FamilyProfile,

    journey: data.journey as PersonalizedJourney,

    completedTaskIds: Array.isArray(data.completedTaskIds)
      ? data.completedTaskIds
      : [],

    createdAt:
      typeof data.createdAt === "number"
        ? data.createdAt
        : 0,

    completedAt:
      typeof data.completedAt === "number"
        ? data.completedAt
        : 0,

    reason: normalizeReason(data.reason),
  };
}

/*
 * ============================================================
 * READ HISTORY COLLECTION
 * ============================================================
 */

async function readHistoryCollection(
  historyCollection: ReturnType<typeof collection>
): Promise<JourneyStageRecord[]> {
  const historyQuery = query(
    historyCollection,
    orderBy("stageNumber", "asc")
  );

  const snapshot = await getDocs(historyQuery);

  return snapshot.docs
    .map((stageDocument) =>
      normalizeStageRecord(
        stageDocument.data(),
        stageDocument.id
      )
    )
    .filter(
      (stage): stage is JourneyStageRecord =>
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
): Promise<string> {
  requireUserId(userId);
  requireChildId(childId);

  const explicitJourneyId =
    requestedJourneyId?.trim() || "";

  if (explicitJourneyId) {
    return explicitJourneyId;
  }

  const currentJourney = await getCurrentJourney(
    userId,
    childId
  );

  return currentJourney?.journeyId || "";
}

/*
 * ============================================================
 * LEGACY HISTORY READS
 * ============================================================
 *
 * Retained for existing accounts and JourneyBuilder migration.
 * ============================================================
 */

export async function getLegacyJourneyHistory(
  userId: string
): Promise<JourneyStageRecord[]> {
  requireUserId(userId);

  return readHistoryCollection(
    getLegacyJourneyHistoryCollection(userId)
  );
}

async function getChildLegacyJourneyHistory(
  userId: string,
  childId: string
): Promise<JourneyStageRecord[]> {
  requireUserId(userId);
  requireChildId(childId);

  return readHistoryCollection(
    getChildLegacyHistoryCollection(userId, childId)
  );
}

/*
 * ============================================================
 * MIGRATE CHILD LEGACY HISTORY
 * ============================================================
 *
 * Migration is owner-only.
 *
 * Shared members must not write migration metadata or copy
 * historical records when opening a Journey.
 *
 * Once migration is completed, the original child-level
 * history is never copied into a different Journey.
 * ============================================================
 */

async function migrateChildLegacyHistoryIfNeeded(
  userId: string,
  childId: string,
  journeyId: string
): Promise<void> {
  requireUserId(userId);
  requireChildId(childId);
  requireJourneyId(journeyId);

  // Never perform migration from a shared member's session.
  if (!isSignedInOwner(userId)) {
    return;
  }

  const childRef = getChildRef(userId, childId);
  const childSnapshot = await getDoc(childRef);

  const childData = childSnapshot.exists()
    ? childSnapshot.data()
    : null;

  const alreadyMigratedToJourneyId =
    typeof childData?.historyMigratedToJourneyId ===
    "string"
      ? childData.historyMigratedToJourneyId
      : "";

  if (alreadyMigratedToJourneyId) {
    return;
  }

  const legacyHistory =
    await getChildLegacyJourneyHistory(
      userId,
      childId
    );

  for (const stage of legacyHistory) {
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
        merge: true,
      }
    );
  }

  // Mark migration even if no legacy records existed.
  await setDoc(
    childRef,
    {
      historyMigratedToJourneyId: journeyId,
    },
    {
      merge: true,
    }
  );
}

/*
 * ============================================================
 * SAVE COMPLETED STAGE
 * ============================================================
 *
 * Existing function signature is preserved.
 *
 * userId is the canonical owner's UID.
 *
 * Actual write authorization is enforced by Firestore rules.
 * ============================================================
 */

export async function saveJourneyStage(
  userId: string,
  stageNumber: number,
  familyProfile: FamilyProfile,
  journey: PersonalizedJourney,
  completedTaskIds: string[],
  options?: {
    journeyId?: string;
    createdAt?: number;
    completedAt?: number;
    reason?: JourneyReason;
  }
): Promise<void> {
  requireUserId(userId);
  requireStageNumber(stageNumber);

  const now = Date.now();
  const childId = familyProfile.childId?.trim() || "";

  if (childId) {
    const journeyId = await resolveJourneyId(
      userId,
      childId,
      options?.journeyId
    );

    if (!journeyId) {
      throw new Error(
        "Unable to save Journey History because no active journey ID was found."
      );
    }

    // Legacy migration is performed only by the owner.
    await migrateChildLegacyHistoryIfNeeded(
      userId,
      childId,
      journeyId
    );

    const stageRecord: JourneyStageRecord = {
      stageId: `stage-${stageNumber}`,
      stageNumber,
      journeyId,
      familyProfile,
      journey,

      completedTaskIds: Array.isArray(completedTaskIds)
        ? completedTaskIds
        : [],

      createdAt: options?.createdAt ?? now,
      completedAt: options?.completedAt ?? now,
      reason: options?.reason ?? "tasks_completed",
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
        merge: true,
      }
    );

    return;
  }

  /*
   * LEGACY ACCOUNT FALLBACK
   *
   * Retained for older accounts without a child ID.
   */

  const legacyRecord: JourneyStageRecord = {
    stageId: `stage-${stageNumber}`,
    stageNumber,
    familyProfile,
    journey,

    completedTaskIds: Array.isArray(completedTaskIds)
      ? completedTaskIds
      : [],

    createdAt: options?.createdAt ?? now,
    completedAt: options?.completedAt ?? now,
    reason: options?.reason ?? "tasks_completed",
  };

  await setDoc(
    getLegacyJourneyStageRef(
      userId,
      stageNumber
    ),
    legacyRecord,
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
 * Preferred:
 * getJourneyHistory(ownerUserId, childId, journeyId)
 *
 * If journeyId is omitted, resolve the child's current Journey.
 *
 * If childId is omitted, return account-level legacy history.
 *
 * Shared users can read existing history without performing
 * migration writes.
 * ============================================================
 */

export async function getJourneyHistory(
  userId: string,
  childId?: string,
  journeyId?: string
): Promise<JourneyStageRecord[]> {
  requireUserId(userId);

  const normalizedChildId = childId?.trim() || "";

  if (!normalizedChildId) {
    return getLegacyJourneyHistory(userId);
  }

  const resolvedJourneyId = await resolveJourneyId(
    userId,
    normalizedChildId,
    journeyId
  );

  // A child without an active Journey has no current history.
  if (!resolvedJourneyId) {
    return [];
  }

  /*
   * Only the owner can perform legacy migration.
   *
   * For invited members, this operation returns without writes.
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
): Promise<number> {
  const history = await getJourneyHistory(
    userId,
    childId,
    journeyId
  );

  if (history.length === 0) {
    return 1;
  }

  const highestStage = history.reduce(
    (highest, stage) =>
      Math.max(highest, stage.stageNumber),
    0
  );

  return highestStage + 1;
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
): Promise<number> {
  const history = await getJourneyHistory(
    userId,
    childId,
    journeyId
  );

  if (history.length === 0) {
    return 0;
  }

  return history.reduce(
    (highest, stage) =>
      Math.max(highest, stage.stageNumber),
    0
  );
}
