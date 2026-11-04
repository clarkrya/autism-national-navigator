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

import {
  getActiveFamilyOrganizerMembershipsForUser,
} from "./familyOrganizerRepository";

import type {
  FamilyOrganizerSupportTeamCategory,
  FamilyOrganizerSupportTeamMember,
} from "./familyOrganizerTypes";

/*
 * ============================================================
 * FAMILY ORGANIZER SUPPORT TEAM REPOSITORY
 * ============================================================
 *
 * Support Team contacts belong to the canonical child
 * workspace:
 *
 * users/{ownerUserId}/children/{childId}/supportTeam/{contactId}
 *
 * IMPORTANT:
 *
 * - Support Team contacts are organizational contacts.
 * - They do NOT automatically receive Myriad account access.
 * - Family Team access and Support Team contacts are separate.
 * - Authorized Family Team members work with the SAME
 *   canonical Support Team records.
 * ============================================================
 */

/*
 * ============================================================
 * CREATE INPUT
 * ============================================================
 */

export interface CreateFamilyOrganizerSupportTeamMemberInput {
  currentUserId: string;

  ownerUserId: string;

  childId: string;

  name: string;

  title?: string;

  organization?: string;

  category:
    FamilyOrganizerSupportTeamCategory;

  email?: string;

  phone?: string;

  notes?: string;
}

/*
 * ============================================================
 * UPDATE INPUT
 * ============================================================
 */

export interface UpdateFamilyOrganizerSupportTeamMemberInput {
  currentUserId: string;

  ownerUserId: string;

  childId: string;

  memberId: string;

  name: string;

  title?: string;

  organization?: string;

  category:
    FamilyOrganizerSupportTeamCategory;

  email?: string;

  phone?: string;

  notes?: string;
}

/*
 * ============================================================
 * DELETE INPUT
 * ============================================================
 */

export interface DeleteFamilyOrganizerSupportTeamMemberInput {
  currentUserId: string;

  ownerUserId: string;

  childId: string;

  memberId: string;
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

async function verifySupportTeamAccess(
  currentUserId: string,
  ownerUserId: string,
  childId: string
): Promise<void> {
  const isOwner =
    currentUserId ===
    ownerUserId;

  const memberships =
    isOwner
      ? []
      : await getActiveFamilyOrganizerMembershipsForUser(
          currentUserId
        );

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
 * GET SUPPORT TEAM
 * ============================================================
 */

export async function getFamilyOrganizerSupportTeam(
  currentUserId: string,
  ownerUserId: string,
  childId: string
): Promise<
  FamilyOrganizerSupportTeamMember[]
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

  await verifySupportTeamAccess(
    normalizedCurrentUserId,
    normalizedOwnerUserId,
    normalizedChildId
  );

  const supportTeamReference =
    collection(
      db,
      "users",
      normalizedOwnerUserId,
      "children",
      normalizedChildId,
      "supportTeam"
    );

  const supportTeamQuery =
    query(
      supportTeamReference,
      orderBy(
        "name",
        "asc"
      )
    );

  const snapshot =
    await getDocs(
      supportTeamQuery
    );

  return snapshot.docs.map(
    (supportTeamDocument) => {
      const data =
        supportTeamDocument.data();

      return {
        id:
          supportTeamDocument.id,

        ownerUserId:
          normalizedOwnerUserId,

        childId:
          normalizedChildId,

        name:
          typeof data.name ===
            "string"
            ? data.name
            : "",

        ...(typeof data.title ===
        "string"
          ? {
              title:
                data.title,
            }
          : {}),

        ...(typeof data.organization ===
        "string"
          ? {
              organization:
                data.organization,
            }
          : {}),

        category:
          data.category as
            FamilyOrganizerSupportTeamCategory,

        ...(typeof data.email ===
        "string"
          ? {
              email:
                data.email,
            }
          : {}),

        ...(typeof data.phone ===
        "string"
          ? {
              phone:
                data.phone,
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
 * CREATE SUPPORT TEAM MEMBER
 * ============================================================
 */

export async function createFamilyOrganizerSupportTeamMember(
  input:
    CreateFamilyOrganizerSupportTeamMemberInput
): Promise<string> {
  const currentUserId =
    input.currentUserId.trim();

  const ownerUserId =
    input.ownerUserId.trim();

  const childId =
    input.childId.trim();

  const name =
    input.name.trim();

  if (
    !currentUserId ||
    !ownerUserId ||
    !childId
  ) {
    throw new Error(
      "A valid Family Organizer workspace is required."
    );
  }

  if (!name) {
    throw new Error(
      "Support Team member name is required."
    );
  }

  await verifySupportTeamAccess(
    currentUserId,
    ownerUserId,
    childId
  );

  const title =
    normalizeOptionalString(
      input.title
    );

  const organization =
    normalizeOptionalString(
      input.organization
    );

  const email =
    normalizeOptionalString(
      input.email
    );

  const phone =
    normalizeOptionalString(
      input.phone
    );

  const notes =
    normalizeOptionalString(
      input.notes
    );

  const now =
    Date.now();

  const supportTeamReference =
    collection(
      db,
      "users",
      ownerUserId,
      "children",
      childId,
      "supportTeam"
    );

  const documentReference =
    await addDoc(
      supportTeamReference,
      {
        name,

        category:
          input.category,

        ...(title
          ? {
              title,
            }
          : {}),

        ...(organization
          ? {
              organization,
            }
          : {}),

        ...(email
          ? {
              email,
            }
          : {}),

        ...(phone
          ? {
              phone,
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
 * UPDATE SUPPORT TEAM MEMBER
 * ============================================================
 */

export async function updateFamilyOrganizerSupportTeamMember(
  input:
    UpdateFamilyOrganizerSupportTeamMemberInput
): Promise<void> {
  const currentUserId =
    input.currentUserId.trim();

  const ownerUserId =
    input.ownerUserId.trim();

  const childId =
    input.childId.trim();

  const memberId =
    input.memberId.trim();

  const name =
    input.name.trim();

  if (
    !currentUserId ||
    !ownerUserId ||
    !childId ||
    !memberId
  ) {
    throw new Error(
      "A valid Support Team member is required."
    );
  }

  if (!name) {
    throw new Error(
      "Support Team member name is required."
    );
  }

  await verifySupportTeamAccess(
    currentUserId,
    ownerUserId,
    childId
  );

  const title =
    normalizeOptionalString(
      input.title
    );

  const organization =
    normalizeOptionalString(
      input.organization
    );

  const email =
    normalizeOptionalString(
      input.email
    );

  const phone =
    normalizeOptionalString(
      input.phone
    );

  const notes =
    normalizeOptionalString(
      input.notes
    );

  const memberReference =
    doc(
      db,
      "users",
      ownerUserId,
      "children",
      childId,
      "supportTeam",
      memberId
    );

  await updateDoc(
    memberReference,
    {
      name,

      category:
        input.category,

      title:
        title ?? null,

      organization:
        organization ?? null,

      email:
        email ?? null,

      phone:
        phone ?? null,

      notes:
        notes ?? null,

      updatedAt:
        Date.now(),
    }
  );
}

/*
 * ============================================================
 * DELETE SUPPORT TEAM MEMBER
 * ============================================================
 */

export async function deleteFamilyOrganizerSupportTeamMember(
  input:
    DeleteFamilyOrganizerSupportTeamMemberInput
): Promise<void> {
  const currentUserId =
    input.currentUserId.trim();

  const ownerUserId =
    input.ownerUserId.trim();

  const childId =
    input.childId.trim();

  const memberId =
    input.memberId.trim();

  if (
    !currentUserId ||
    !ownerUserId ||
    !childId ||
    !memberId
  ) {
    throw new Error(
      "A valid Support Team member is required."
    );
  }

  await verifySupportTeamAccess(
    currentUserId,
    ownerUserId,
    childId
  );

  const memberReference =
    doc(
      db,
      "users",
      ownerUserId,
      "children",
      childId,
      "supportTeam",
      memberId
    );

  await deleteDoc(
    memberReference
  );
}