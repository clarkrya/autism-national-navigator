import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDocs,
    orderBy,
    query,
    updateDoc,
  } from "firebase/firestore";
  
  import { db } from "../firebase";
  
  import {
    canAccessFamilyOrganizerChild,
  } from "./familyOrganizerAccess";
  
  import type {
    FamilyOrganizerCalendarEvent,
    FamilyOrganizerCalendarEventType,
  } from "./familyOrganizerTypes";
  
  /*
   * ============================================================
   * FAMILY ORGANIZER CALENDAR REPOSITORY
   * ============================================================
   *
   * Shared calendar events belong to the canonical child
   * workspace.
   *
   * Canonical location:
   *
   * users/{ownerUserId}/children/{childId}/calendarEvents/{eventId}
   *
   * This means:
   *
   * - the owner sees the calendar
   * - authorized Family Team members see the SAME calendar
   * - events are never duplicated into another user's account
   * ============================================================
   */
  
  /*
   * ============================================================
   * CREATE INPUT
   * ============================================================
   */
  
  export interface CreateFamilyOrganizerCalendarEventInput {
    currentUserId: string;
  
    ownerUserId: string;
  
    childId: string;
  
    title: string;
  
    eventType:
      FamilyOrganizerCalendarEventType;
  
    startAt: number;
  
    endAt?: number;
  
    allDay?: boolean;
  
    location?: string;
  
    notes?: string;
  }
  
  /*
   * ============================================================
   * UPDATE INPUT
   * ============================================================
   */
  
  export interface UpdateFamilyOrganizerCalendarEventInput {
    currentUserId: string;
  
    ownerUserId: string;
  
    childId: string;
  
    eventId: string;
  
    title: string;
  
    eventType:
      FamilyOrganizerCalendarEventType;
  
    startAt: number;
  
    endAt?: number;
  
    allDay?: boolean;
  
    location?: string;
  
    notes?: string;
  }
  
  /*
   * ============================================================
   * DELETE INPUT
   * ============================================================
   */
  
  export interface DeleteFamilyOrganizerCalendarEventInput {
    currentUserId: string;
  
    ownerUserId: string;
  
    childId: string;
  
    eventId: string;
  }
  
  /*
   * ============================================================
   * NORMALIZE OPTIONAL STRING
   * ============================================================
   */
  
  function normalizeOptionalString(
    value: string | undefined
  ): string | undefined {
    if (
      typeof value !== "string"
    ) {
      return undefined;
    }
  
    const normalized =
      value.trim();
  
    return normalized
      ? normalized
      : undefined;
  }
  
  /*
   * ============================================================
   * VERIFY ACCESS
   * ============================================================
   */
  
  async function verifyCalendarAccess(
    currentUserId: string,
    ownerUserId: string,
    childId: string
  ): Promise<void> {
    const access =
      await canAccessFamilyOrganizerChild(
        currentUserId,
        ownerUserId,
        childId
      );
  
    if (!access.allowed) {
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
    childId: string
  ): Promise<
    FamilyOrganizerCalendarEvent[]
  > {
    const normalizedCurrentUserId =
      currentUserId.trim();
  
    const normalizedOwnerUserId =
      ownerUserId.trim();
  
    const normalizedChildId =
      childId.trim();
  
    if (
      !normalizedCurrentUserId ||
      !normalizedOwnerUserId ||
      !normalizedChildId
    ) {
      return [];
    }
  
    await verifyCalendarAccess(
      normalizedCurrentUserId,
      normalizedOwnerUserId,
      normalizedChildId
    );
  
    const calendarReference =
      collection(
        db,
        "users",
        normalizedOwnerUserId,
        "children",
        normalizedChildId,
        "calendarEvents"
      );
  
    const calendarQuery =
      query(
        calendarReference,
        orderBy(
          "startAt",
          "asc"
        )
      );
  
    const snapshot =
      await getDocs(
        calendarQuery
      );
  
    return snapshot.docs.map(
      (calendarDocument) => {
        const data =
          calendarDocument.data();
  
        return {
          id:
            calendarDocument.id,
  
          ownerUserId:
            normalizedOwnerUserId,
  
          childId:
            normalizedChildId,
  
          title:
            typeof data.title ===
              "string"
              ? data.title
              : "",
  
          eventType:
            data.eventType as
              FamilyOrganizerCalendarEventType,
  
          startAt:
            typeof data.startAt ===
              "number"
              ? data.startAt
              : 0,
  
          ...(typeof data.endAt ===
          "number"
            ? {
                endAt:
                  data.endAt,
              }
            : {}),
  
          ...(typeof data.allDay ===
          "boolean"
            ? {
                allDay:
                  data.allDay,
              }
            : {}),
  
          ...(typeof data.location ===
          "string"
            ? {
                location:
                  data.location,
              }
            : {}),
  
          ...(typeof data.notes ===
          "string"
            ? {
                notes:
                  data.notes,
              }
            : {}),
  
          createdAt:
            typeof data.createdAt ===
              "number"
              ? data.createdAt
              : 0,
  
          createdByUserId:
            typeof data.createdByUserId ===
              "string"
              ? data.createdByUserId
              : "",
  
          ...(typeof data.updatedAt ===
          "number"
            ? {
                updatedAt:
                  data.updatedAt,
              }
            : {}),
        };
      }
    );
  }
  
  /*
   * ============================================================
   * CREATE CALENDAR EVENT
   * ============================================================
   */
  
  export async function createFamilyOrganizerCalendarEvent(
    input:
      CreateFamilyOrganizerCalendarEventInput
  ): Promise<string> {
    const currentUserId =
      input.currentUserId.trim();
  
    const ownerUserId =
      input.ownerUserId.trim();
  
    const childId =
      input.childId.trim();
  
    const title =
      input.title.trim();
  
    if (
      !currentUserId ||
      !ownerUserId ||
      !childId
    ) {
      throw new Error(
        "A valid Family Organizer workspace is required."
      );
    }
  
    if (!title) {
      throw new Error(
        "Event title is required."
      );
    }
  
    if (
      !Number.isFinite(
        input.startAt
      )
    ) {
      throw new Error(
        "A valid event date is required."
      );
    }
  
    if (
      input.endAt !== undefined &&
      (!Number.isFinite(
        input.endAt
      ) ||
        input.endAt <
          input.startAt)
    ) {
      throw new Error(
        "Event end time cannot be before the start time."
      );
    }
  
    await verifyCalendarAccess(
      currentUserId,
      ownerUserId,
      childId
    );
  
    const now =
      Date.now();
  
    const calendarReference =
      collection(
        db,
        "users",
        ownerUserId,
        "children",
        childId,
        "calendarEvents"
      );
  
    const location =
      normalizeOptionalString(
        input.location
      );
  
    const notes =
      normalizeOptionalString(
        input.notes
      );
  
    const documentReference =
      await addDoc(
        calendarReference,
        {
          title,
  
          eventType:
            input.eventType,
  
          startAt:
            input.startAt,
  
          ...(input.endAt !==
          undefined
            ? {
                endAt:
                  input.endAt,
              }
            : {}),
  
          allDay:
            input.allDay ===
            true,
  
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
  
          createdAt:
            now,
  
          createdByUserId:
            currentUserId,
  
          updatedAt:
            now,
        }
      );
  
    return documentReference.id;
  }
  
  /*
   * ============================================================
   * UPDATE CALENDAR EVENT
   * ============================================================
   */
  
  export async function updateFamilyOrganizerCalendarEvent(
    input:
      UpdateFamilyOrganizerCalendarEventInput
  ): Promise<void> {
    const currentUserId =
      input.currentUserId.trim();
  
    const ownerUserId =
      input.ownerUserId.trim();
  
    const childId =
      input.childId.trim();
  
    const eventId =
      input.eventId.trim();
  
    const title =
      input.title.trim();
  
    if (
      !currentUserId ||
      !ownerUserId ||
      !childId ||
      !eventId
    ) {
      throw new Error(
        "A valid calendar event is required."
      );
    }
  
    if (!title) {
      throw new Error(
        "Event title is required."
      );
    }
  
    if (
      !Number.isFinite(
        input.startAt
      )
    ) {
      throw new Error(
        "A valid event date is required."
      );
    }
  
    if (
      input.endAt !== undefined &&
      (!Number.isFinite(
        input.endAt
      ) ||
        input.endAt <
          input.startAt)
    ) {
      throw new Error(
        "Event end time cannot be before the start time."
      );
    }
  
    await verifyCalendarAccess(
      currentUserId,
      ownerUserId,
      childId
    );
  
    const eventReference =
      doc(
        db,
        "users",
        ownerUserId,
        "children",
        childId,
        "calendarEvents",
        eventId
      );
  
    const location =
      normalizeOptionalString(
        input.location
      );
  
    const notes =
      normalizeOptionalString(
        input.notes
      );
  
    await updateDoc(
      eventReference,
      {
        title,
  
        eventType:
          input.eventType,
  
        startAt:
          input.startAt,
  
        endAt:
          input.endAt ??
          null,
  
        allDay:
          input.allDay ===
          true,
  
        location:
          location ??
          null,
  
        notes:
          notes ??
          null,
  
        updatedAt:
          Date.now(),
      }
    );
  }
  
  /*
   * ============================================================
   * DELETE CALENDAR EVENT
   * ============================================================
   */
  
  export async function deleteFamilyOrganizerCalendarEvent(
    input:
      DeleteFamilyOrganizerCalendarEventInput
  ): Promise<void> {
    const currentUserId =
      input.currentUserId.trim();
  
    const ownerUserId =
      input.ownerUserId.trim();
  
    const childId =
      input.childId.trim();
  
    const eventId =
      input.eventId.trim();
  
    if (
      !currentUserId ||
      !ownerUserId ||
      !childId ||
      !eventId
    ) {
      throw new Error(
        "A valid calendar event is required."
      );
    }
  
    await verifyCalendarAccess(
      currentUserId,
      ownerUserId,
      childId
    );
  
    const eventReference =
      doc(
        db,
        "users",
        ownerUserId,
        "children",
        childId,
        "calendarEvents",
        eventId
      );
  
    await deleteDoc(
      eventReference
    );
  }