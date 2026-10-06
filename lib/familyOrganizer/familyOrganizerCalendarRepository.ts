import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  type UpdateData,
} from "firebase/firestore";

import { db } from "../firebase";

import {
  canAccessFamilyOrganizerChild,
} from "./familyOrganizerAccess";

import type {
  FamilyOrganizerCalendarEvent,
  FamilyOrganizerCalendarEventType,
  FamilyOrganizerMembership,
} from "./familyOrganizerTypes";

/*
 * ============================================================
 * FAMILY ORGANIZER CALENDAR REPOSITORY
 * ============================================================
 *
 * Shared calendar path:
 *
 * users/{ownerUserId}/children/{childId}/calendarEvents/{eventId}
 *
 * The canonical child remains under the owner's UID.
 * ============================================================
 */

/*
 * ============================================================
 * HELPERS
 * ============================================================
 */

function normalizeRequiredString(
  value: string,
  fieldName: string
): string {
  const normalized =
    value.trim();

  if (!normalized) {
    throw new Error(
      `${fieldName} is required.`
    );
  }

  return normalized;
}

function normalizeOptionalString(
  value:
    | string
    | undefined
): string | undefined {
  if (
    typeof value !== "string"
  ) {
    return undefined;
  }

  const normalized =
    value.trim();

  return normalized ||
    undefined;
}

function getCalendarCollection(
  ownerUserId: string,
  childId: string
) {
  return collection(
    db,
    "users",
    ownerUserId,
    "children",
    childId,
    "calendarEvents"
  );
}

function getCalendarEventDocument(
  ownerUserId: string,
  childId: string,
  eventId: string
) {
  return doc(
    db,
    "users",
    ownerUserId,
    "children",
    childId,
    "calendarEvents",
    eventId
  );
}

/*
 * ============================================================
 * ACCESS
 * ============================================================
 */

function requireCalendarAccess(
  currentUserId: string,
  ownerUserId: string,
  childId: string,
  memberships:
    FamilyOrganizerMembership[]
): void {
  const allowed =
    canAccessFamilyOrganizerChild(
      currentUserId,
      ownerUserId,
      childId,
      memberships
    );

  if (!allowed) {
    throw new Error(
      "You do not have access to this child's Family Organizer."
    );
  }
}

/*
 * ============================================================
 * GET CALENDAR EVENTS
 * ============================================================
 */

export async function getFamilyOrganizerCalendarEvents(
  currentUserId: string,
  ownerUserId: string,
  childId: string,
  memberships:
    FamilyOrganizerMembership[] = []
): Promise<
  FamilyOrganizerCalendarEvent[]
> {
  const normalizedCurrentUserId =
    normalizeRequiredString(
      currentUserId,
      "currentUserId"
    );

  const normalizedOwnerUserId =
    normalizeRequiredString(
      ownerUserId,
      "ownerUserId"
    );

  const normalizedChildId =
    normalizeRequiredString(
      childId,
      "childId"
    );

  requireCalendarAccess(
    normalizedCurrentUserId,
    normalizedOwnerUserId,
    normalizedChildId,
    memberships
  );

  const eventsQuery =
    query(
      getCalendarCollection(
        normalizedOwnerUserId,
        normalizedChildId
      ),
      orderBy(
        "startAt",
        "asc"
      )
    );

  const snapshot =
    await getDocs(
      eventsQuery
    );

  return snapshot.docs.map(
    (snapshotDoc) => ({
      id:
        snapshotDoc.id,

      ...(snapshotDoc.data() as Omit<
        FamilyOrganizerCalendarEvent,
        "id"
      >),
    })
  );
}

/*
 * ============================================================
 * CREATE CALENDAR EVENT
 * ============================================================
 */

export interface CreateFamilyOrganizerCalendarEventInput {
  currentUserId: string;

  ownerUserId: string;

  childId: string;

  memberships?:
    FamilyOrganizerMembership[];

  title: string;

  eventType:
    FamilyOrganizerCalendarEventType;

  startAt: number;

  endAt?: number;

  allDay?: boolean;

  location?: string;

  notes?: string;
}

export async function createFamilyOrganizerCalendarEvent(
  input:
    CreateFamilyOrganizerCalendarEventInput
): Promise<
  FamilyOrganizerCalendarEvent
> {
  const currentUserId =
    normalizeRequiredString(
      input.currentUserId,
      "currentUserId"
    );

  const ownerUserId =
    normalizeRequiredString(
      input.ownerUserId,
      "ownerUserId"
    );

  const childId =
    normalizeRequiredString(
      input.childId,
      "childId"
    );

  const title =
    normalizeRequiredString(
      input.title,
      "title"
    );

  requireCalendarAccess(
    currentUserId,
    ownerUserId,
    childId,
    input.memberships ?? []
  );

  if (
    !Number.isFinite(
      input.startAt
    )
  ) {
    throw new Error(
      "startAt is required."
    );
  }

  if (
    typeof input.endAt ===
      "number" &&
    input.endAt <
      input.startAt
  ) {
    throw new Error(
      "Event end time cannot be before the start time."
    );
  }

  const createdAt =
    Date.now();

  const location =
    normalizeOptionalString(
      input.location
    );

  const notes =
    normalizeOptionalString(
      input.notes
    );

  const payload: Omit<
    FamilyOrganizerCalendarEvent,
    "id"
  > = {
    ownerUserId,

    childId,

    title,

    eventType:
      input.eventType,

    startAt:
      input.startAt,

    createdAt,

    createdByUserId:
      currentUserId,

    ...(typeof input.endAt ===
    "number"
      ? {
          endAt:
            input.endAt,
        }
      : {}),

    ...(typeof input.allDay ===
    "boolean"
      ? {
          allDay:
            input.allDay,
        }
      : {}),

    ...(location
      ? {
          location,
        }
      : {}),

    ...(notes
      ? {
          notes,
        }
      : {}),
  };

  const reference =
    await addDoc(
      getCalendarCollection(
        ownerUserId,
        childId
      ),
      payload
    );

  return {
    id:
      reference.id,

    ...payload,
  };
}

/*
 * ============================================================
 * UPDATE CALENDAR EVENT
 * ============================================================
 */

export interface UpdateFamilyOrganizerCalendarEventInput {
  currentUserId: string;

  ownerUserId: string;

  childId: string;

  eventId: string;

  memberships?:
    FamilyOrganizerMembership[];

  title?: string;

  eventType?:
    FamilyOrganizerCalendarEventType;

  startAt?: number;

  endAt?: number;

  allDay?: boolean;

  location?: string;

  notes?: string;
}

export async function updateFamilyOrganizerCalendarEvent(
  input:
    UpdateFamilyOrganizerCalendarEventInput
): Promise<void> {
  const currentUserId =
    normalizeRequiredString(
      input.currentUserId,
      "currentUserId"
    );

  const ownerUserId =
    normalizeRequiredString(
      input.ownerUserId,
      "ownerUserId"
    );

  const childId =
    normalizeRequiredString(
      input.childId,
      "childId"
    );

  const eventId =
    normalizeRequiredString(
      input.eventId,
      "eventId"
    );

  requireCalendarAccess(
    currentUserId,
    ownerUserId,
    childId,
    input.memberships ?? []
  );

  const updates: UpdateData<
    Omit<
      FamilyOrganizerCalendarEvent,
      "id"
    >
  > = {
    updatedAt:
      Date.now(),
  };

  if (
    typeof input.title ===
    "string"
  ) {
    updates.title =
      normalizeRequiredString(
        input.title,
        "title"
      );
  }

  if (input.eventType) {
    updates.eventType =
      input.eventType;
  }

  if (
    typeof input.startAt ===
    "number"
  ) {
    updates.startAt =
      input.startAt;
  }

  if (
    typeof input.endAt ===
    "number"
  ) {
    updates.endAt =
      input.endAt;
  }

  if (
    typeof input.allDay ===
    "boolean"
  ) {
    updates.allDay =
      input.allDay;
  }

  if (
    typeof input.location ===
    "string"
  ) {
    updates.location =
      input.location.trim();
  }

  if (
    typeof input.notes ===
    "string"
  ) {
    updates.notes =
      input.notes.trim();
  }

  await updateDoc(
    getCalendarEventDocument(
      ownerUserId,
      childId,
      eventId
    ),
    updates
  );
}

/*
 * ============================================================
 * DELETE CALENDAR EVENT
 * ============================================================
 */

export interface DeleteFamilyOrganizerCalendarEventInput {
  currentUserId: string;

  ownerUserId: string;

  childId: string;

  eventId: string;

  memberships?:
    FamilyOrganizerMembership[];
}

export async function deleteFamilyOrganizerCalendarEvent(
  input:
    DeleteFamilyOrganizerCalendarEventInput
): Promise<void> {
  const currentUserId =
    normalizeRequiredString(
      input.currentUserId,
      "currentUserId"
    );

  const ownerUserId =
    normalizeRequiredString(
      input.ownerUserId,
      "ownerUserId"
    );

  const childId =
    normalizeRequiredString(
      input.childId,
      "childId"
    );

  const eventId =
    normalizeRequiredString(
      input.eventId,
      "eventId"
    );

  requireCalendarAccess(
    currentUserId,
    ownerUserId,
    childId,
    input.memberships ?? []
  );

  await deleteDoc(
    getCalendarEventDocument(
      ownerUserId,
      childId,
      eventId
    )
  );
}