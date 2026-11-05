
import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  query,
  runTransaction,
  updateDoc,
  where,
} from "firebase/firestore";

import { db } from "../firebase";

import type {
  FamilyOrganizerAccessLevel,
  FamilyOrganizerChildReference,
  FamilyOrganizerInvitation,
  FamilyOrganizerMembership,
  FamilyOrganizerRelationship,
} from "./familyOrganizerTypes";

import {
  normalizeFamilyOrganizerAccessLevel,
} from "./familyOrganizerTypes";

/*
 * ============================================================
 * AUTIVOYA — FAMILY ORGANIZER REPOSITORY
 * ============================================================
 *
 * Canonical child:
 * users/{ownerUserId}/children/{childId}
 *
 * Membership:
 * familyOrganizerMemberships/
 *   {ownerUserId}__{childId}__{memberUserId}
 *
 * Relationship and access level are independent.
 *
 * Legacy memberships without accessLevel are Viewers.
 * ============================================================
 */

const INVITATIONS_COLLECTION =
  "familyOrganizerInvitations";

const MEMBERSHIPS_COLLECTION =
  "familyOrganizerMemberships";

/*
 * HELPERS
 */

function normalizeRequiredString(
  value: string,
  fieldName: string
): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }

  return normalized;
}

function normalizeEmail(email: string): string {
  const normalized = email.trim().toLowerCase();

  if (!normalized) {
    throw new Error("Email is required.");
  }

  return normalized;
}

function validateChildReference(
  reference: FamilyOrganizerChildReference
): FamilyOrganizerChildReference {
  return {
    ownerUserId: normalizeRequiredString(
      reference.ownerUserId,
      "ownerUserId"
    ),
    childId: normalizeRequiredString(
      reference.childId,
      "childId"
    ),
  };
}

function normalizeMembership(
  membership: FamilyOrganizerMembership
): FamilyOrganizerMembership {
  return {
    ...membership,
    accessLevel: normalizeFamilyOrganizerAccessLevel(
      membership.accessLevel
    ),
  };
}

function normalizeInvitation(
  invitation: FamilyOrganizerInvitation
): FamilyOrganizerInvitation {
  return {
    ...invitation,
    accessLevel: normalizeFamilyOrganizerAccessLevel(
      invitation.accessLevel
    ),
  };
}

/*
 * MEMBERSHIP DOCUMENT ID
 */

export function buildFamilyOrganizerMembershipId(
  ownerUserId: string,
  childId: string,
  memberUserId: string
): string {
  return [
    normalizeRequiredString(
      ownerUserId,
      "ownerUserId"
    ),
    normalizeRequiredString(childId, "childId"),
    normalizeRequiredString(
      memberUserId,
      "memberUserId"
    ),
  ].join("__");
}

/*
 * CREATE INVITATION
 *
 * The requested access level is optional.
 *
 * Until the Firestore rules support elevated
 * permissions, invitation creation stores
 * only the original compatible fields.
 *
 * Viewer is the effective default.
 */

export interface CreateFamilyOrganizerInvitationInput
  extends FamilyOrganizerChildReference {
  invitedEmail: string;
  relationship: FamilyOrganizerRelationship;
  invitedByUserId: string;
  expiresAt?: number;
  accessLevel?: FamilyOrganizerAccessLevel;
}

export async function createFamilyOrganizerInvitation(
  input: CreateFamilyOrganizerInvitationInput
): Promise<FamilyOrganizerInvitation> {
  const childReference =
    validateChildReference(input);

  const invitedEmail =
    normalizeEmail(input.invitedEmail);

  const invitedByUserId =
    normalizeRequiredString(
      input.invitedByUserId,
      "invitedByUserId"
    );

  if (
    invitedByUserId !==
    childReference.ownerUserId
  ) {
    throw new Error(
      "Only the child owner may create Family Organizer invitations."
    );
  }

  const requestedAccessLevel =
    normalizeFamilyOrganizerAccessLevel(
      input.accessLevel
    );

  if (requestedAccessLevel !== "viewer") {
    throw new Error(
      "Elevated invitation permissions are not enabled yet."
    );
  }

  const existingQuery = query(
    collection(db, INVITATIONS_COLLECTION),
    where(
      "invitedByUserId",
      "==",
      childReference.ownerUserId
    ),
    where(
      "ownerUserId",
      "==",
      childReference.ownerUserId
    ),
    where(
      "childId",
      "==",
      childReference.childId
    ),
    where(
      "invitedEmail",
      "==",
      invitedEmail
    ),
    where(
      "status",
      "==",
      "pending"
    ),
    limit(1)
  );

  const existingSnapshot =
    await getDocs(existingQuery);

  if (!existingSnapshot.empty) {
    throw new Error(
      "A pending invitation already exists for this email."
    );
  }

  const createdAt = Date.now();

  const payload = {
    ownerUserId: childReference.ownerUserId,
    childId: childReference.childId,
    invitedEmail,
    relationship: input.relationship,
    status: "pending" as const,
    invitedByUserId,
    createdAt,

    ...(typeof input.expiresAt === "number"
      ? { expiresAt: input.expiresAt }
      : {}),
  };

  const reference = await addDoc(
    collection(db, INVITATIONS_COLLECTION),
    payload
  );

  return normalizeInvitation({
    id: reference.id,
    ...payload,
  });
}

/*
 * GET CHILD INVITATIONS
 *
 * Owner-side query.
 */

export async function getFamilyOrganizerInvitationsForChild(
  reference: FamilyOrganizerChildReference
): Promise<FamilyOrganizerInvitation[]> {
  const childReference =
    validateChildReference(reference);

  const invitationsQuery = query(
    collection(db, INVITATIONS_COLLECTION),
    where(
      "invitedByUserId",
      "==",
      childReference.ownerUserId
    ),
    where(
      "ownerUserId",
      "==",
      childReference.ownerUserId
    ),
    where(
      "childId",
      "==",
      childReference.childId
    )
  );

  const snapshot = await getDocs(
    invitationsQuery
  );

  return snapshot.docs.map((snapshotDoc) =>
    normalizeInvitation({
      id: snapshotDoc.id,
      ...(snapshotDoc.data() as Omit<
        FamilyOrganizerInvitation,
        "id"
      >),
    })
  );
}

/*
 * GET PENDING INVITATIONS FOR EMAIL
 *
 * Recipient-side query.
 */

export async function getPendingFamilyOrganizerInvitationsForEmail(
  email: string
): Promise<FamilyOrganizerInvitation[]> {
  const invitedEmail = normalizeEmail(email);

  const invitationsQuery = query(
    collection(db, INVITATIONS_COLLECTION),
    where(
      "invitedEmail",
      "==",
      invitedEmail
    ),
    where(
      "status",
      "==",
      "pending"
    )
  );

  const snapshot = await getDocs(
    invitationsQuery
  );

  const now = Date.now();

  return snapshot.docs
    .map((snapshotDoc) =>
      normalizeInvitation({
        id: snapshotDoc.id,
        ...(snapshotDoc.data() as Omit<
          FamilyOrganizerInvitation,
          "id"
        >),
      })
    )
    .filter(
      (invitation) =>
        typeof invitation.expiresAt !== "number" ||
        invitation.expiresAt > now
    );
}

/*
 * GET CHILD MEMBERSHIPS
 *
 * Owner-side query.
 */

export async function getFamilyOrganizerMembershipsForChild(
  reference: FamilyOrganizerChildReference
): Promise<FamilyOrganizerMembership[]> {
  const childReference =
    validateChildReference(reference);

  const membershipsQuery = query(
    collection(db, MEMBERSHIPS_COLLECTION),
    where(
      "ownerUserId",
      "==",
      childReference.ownerUserId
    ),
    where(
      "childId",
      "==",
      childReference.childId
    )
  );

  const snapshot = await getDocs(
    membershipsQuery
  );

  return snapshot.docs.map((snapshotDoc) =>
    normalizeMembership({
      id: snapshotDoc.id,
      ...(snapshotDoc.data() as Omit<
        FamilyOrganizerMembership,
        "id"
      >),
    })
  );
}

/*
 * GET ACTIVE MEMBERSHIPS FOR USER
 *
 * Used to discover children shared with
 * the signed-in account.
 */

export async function getActiveFamilyOrganizerMembershipsForUser(
  memberUserId: string
): Promise<FamilyOrganizerMembership[]> {
  const normalizedUserId =
    normalizeRequiredString(
      memberUserId,
      "memberUserId"
    );

  const membershipsQuery = query(
    collection(db, MEMBERSHIPS_COLLECTION),
    where(
      "memberUserId",
      "==",
      normalizedUserId
    ),
    where(
      "status",
      "==",
      "active"
    )
  );

  const snapshot = await getDocs(
    membershipsQuery
  );

  return snapshot.docs.map((snapshotDoc) =>
    normalizeMembership({
      id: snapshotDoc.id,
      ...(snapshotDoc.data() as Omit<
        FamilyOrganizerMembership,
        "id"
      >),
    })
  );
}

/*
 * ACCEPT INVITATION
 *
 * Creates a canonical membership and marks
 * the invitation accepted in one transaction.
 *
 * New members initially receive Viewer access.
 *
 * Existing Firestore rule compatibility is
 * preserved by not writing accessLevel yet.
 */

export interface AcceptFamilyOrganizerInvitationInput {
  invitation: FamilyOrganizerInvitation;
  acceptingUserId: string;
  acceptingUserEmail: string;
}

export async function acceptFamilyOrganizerInvitation(
  input: AcceptFamilyOrganizerInvitationInput
): Promise<FamilyOrganizerMembership> {
  const invitation = input.invitation;

  const invitationId =
    normalizeRequiredString(
      invitation.id,
      "invitationId"
    );

  const acceptingUserId =
    normalizeRequiredString(
      input.acceptingUserId,
      "acceptingUserId"
    );

  const acceptingUserEmail =
    normalizeEmail(
      input.acceptingUserEmail
    );

  if (invitation.status !== "pending") {
    throw new Error(
      "This invitation is no longer pending."
    );
  }

  if (
    normalizeEmail(invitation.invitedEmail) !==
    acceptingUserEmail
  ) {
    throw new Error(
      "This invitation does not belong to the signed-in account."
    );
  }

  if (
    typeof invitation.expiresAt === "number" &&
    invitation.expiresAt <= Date.now()
  ) {
    throw new Error(
      "This invitation has expired."
    );
  }

  const membershipId =
    buildFamilyOrganizerMembershipId(
      invitation.ownerUserId,
      invitation.childId,
      acceptingUserId
    );

  const membershipReference = doc(
    db,
    MEMBERSHIPS_COLLECTION,
    membershipId
  );

  const invitationReference = doc(
    db,
    INVITATIONS_COLLECTION,
    invitationId
  );

  const acceptedAt = Date.now();

  const membershipPayload = {
    invitationId,
    ownerUserId: invitation.ownerUserId,
    childId: invitation.childId,
    memberUserId: acceptingUserId,
    role: "family_member" as const,
    relationship: invitation.relationship,
    status: "active" as const,
    createdAt: acceptedAt,
    createdByUserId: invitation.invitedByUserId,
    acceptedAt,
  };

  await runTransaction(
    db,
    async (transaction) => {
      const invitationSnapshot =
        await transaction.get(
          invitationReference
        );

      if (!invitationSnapshot.exists()) {
        throw new Error(
          "This invitation no longer exists."
        );
      }

      const storedInvitation =
        invitationSnapshot.data();

      if (
        storedInvitation.ownerUserId !==
          invitation.ownerUserId ||
        storedInvitation.childId !==
          invitation.childId ||
        storedInvitation.invitedByUserId !==
          invitation.invitedByUserId ||
        storedInvitation.relationship !==
          invitation.relationship
      ) {
        throw new Error(
          "Invitation information no longer matches."
        );
      }

      if (
        storedInvitation.status !== "pending"
      ) {
        throw new Error(
          "This invitation is no longer pending."
        );
      }

      if (
        typeof storedInvitation.invitedEmail !==
          "string" ||
        normalizeEmail(
          storedInvitation.invitedEmail
        ) !== acceptingUserEmail
      ) {
        throw new Error(
          "This invitation does not belong to the signed-in account."
        );
      }

      if (
        typeof storedInvitation.expiresAt ===
          "number" &&
        storedInvitation.expiresAt <= Date.now()
      ) {
        throw new Error(
          "This invitation has expired."
        );
      }

      const existingMembershipSnapshot =
        await transaction.get(
          membershipReference
        );

      if (
        existingMembershipSnapshot.exists()
      ) {
        const existingMembership =
          existingMembershipSnapshot.data();

        if (
          existingMembership.status === "active"
        ) {
          throw new Error(
            "This account already has access to this child."
          );
        }
      }

      transaction.set(
        membershipReference,
        membershipPayload
      );

      transaction.update(
        invitationReference,
        {
          status: "accepted",
          acceptedByUserId: acceptingUserId,
          acceptedAt,
        }
      );
    }
  );

  return normalizeMembership({
    id: membershipId,
    ...membershipPayload,
  });
}

/*
 * DECLINE INVITATION
 */

export async function declineFamilyOrganizerInvitation(
  invitationId: string
): Promise<void> {
  const normalizedId =
    normalizeRequiredString(
      invitationId,
      "invitationId"
    );

  await updateDoc(
    doc(
      db,
      INVITATIONS_COLLECTION,
      normalizedId
    ),
    {
      status: "declined",
      declinedAt: Date.now(),
    }
  );
}

/*
 * REVOKE INVITATION
 */

export async function revokeFamilyOrganizerInvitation(
  invitationId: string
): Promise<void> {
  const normalizedId =
    normalizeRequiredString(
      invitationId,
      "invitationId"
    );

  await updateDoc(
    doc(
      db,
      INVITATIONS_COLLECTION,
      normalizedId
    ),
    {
      status: "revoked",
      revokedAt: Date.now(),
    }
  );
}

/*
 * REVOKE MEMBERSHIP
 */

export async function revokeFamilyOrganizerMembership(
  membershipId: string
): Promise<void> {
  const normalizedId =
    normalizeRequiredString(
      membershipId,
      "membershipId"
    );

  await updateDoc(
    doc(
      db,
      MEMBERSHIPS_COLLECTION,
      normalizedId
    ),
    {
      status: "revoked",
      endedAt: Date.now(),
    }
  );
}

/*
 * LEAVE SHARED CHILD
 */

export async function leaveFamilyOrganizerMembership(
  membershipId: string
): Promise<void> {
  const normalizedId =
    normalizeRequiredString(
      membershipId,
      "membershipId"
    );

  await updateDoc(
    doc(
      db,
      MEMBERSHIPS_COLLECTION,
      normalizedId
    ),
    {
      status: "left",
      endedAt: Date.now(),
    }
  );
}

/*
 * UPDATE MEMBER ACCESS LEVEL
 *
 * This function is prepared for the upcoming
 * Firestore security rule changes.
 *
 * It must not be called until those rules
 * enforce owner-authorized permission updates.
 *
 * Never allow a member to promote themselves.
 */


export interface UpdateFamilyOrganizerAccessInput {
  membershipId: string;
  accessLevel: FamilyOrganizerAccessLevel;
  updatedByUserId: string;
}

export async function updateFamilyOrganizerMemberAccess(
  input: UpdateFamilyOrganizerAccessInput
): Promise<void> {
  const membershipId = normalizeRequiredString(
    input.membershipId,
    "membershipId"
  );

  const updatedByUserId = normalizeRequiredString(
    input.updatedByUserId,
    "updatedByUserId"
  );

  const accessLevel =
    normalizeFamilyOrganizerAccessLevel(input.accessLevel);

  const membershipReference = doc(
    db,
    MEMBERSHIPS_COLLECTION,
    membershipId
  );

  await runTransaction(db, async (transaction) => {
    const membershipSnapshot =
      await transaction.get(membershipReference);

    if (!membershipSnapshot.exists()) {
      throw new Error("Family member not found.");
    }

    const membership = membershipSnapshot.data();

    if (membership.status !== "active") {
      throw new Error(
        "Permissions can only be changed for active members."
      );
    }

    if (membership.ownerUserId !== updatedByUserId) {
      throw new Error(
        "Only the primary child owner can change permissions."
      );
    }

    if (
      membership.memberUserId === updatedByUserId ||
      membership.role !== "family_member"
    ) {
      throw new Error(
        "The primary owner's permissions cannot be changed."
      );
    }

    const expectedMembershipId =
      buildFamilyOrganizerMembershipId(
        membership.ownerUserId,
        membership.childId,
        membership.memberUserId
      );

    if (membershipId !== expectedMembershipId) {
      throw new Error("Invalid membership record.");
    }

    transaction.update(membershipReference, {
      accessLevel,
      accessUpdatedAt: Date.now(),
      accessUpdatedByUserId: updatedByUserId,
    });
  });
}
