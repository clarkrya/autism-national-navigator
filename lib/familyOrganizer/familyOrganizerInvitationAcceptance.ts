
import {
  doc,
  getDoc,
  runTransaction,
} from "firebase/firestore";

import { db } from "../firebase";

import {
  buildFamilyOrganizerMembershipId,
} from "./familyOrganizerRepository";

import type {
  FamilyOrganizerInvitation,
  FamilyOrganizerMembership,
} from "./familyOrganizerTypes";

/*
 * ============================================================
 * AUTIVOYA — FAMILY ORGANIZER INVITATION ACCEPTANCE
 * ============================================================
 *
 * Accepts an invitation and creates an active Family Team
 * membership.
 *
 * Important:
 * - The child remains owned by the original owner.
 * - No duplicate child or Journey is created.
 * - New memberships default to Viewer access.
 * - Membership and invitation updates are atomic.
 * ============================================================
 */

export interface AcceptFamilyOrganizerInvitationInput {
  invitationId: string;
  currentUserId: string;
  currentUserEmail: string;
}

export interface AcceptFamilyOrganizerInvitationResult {
  invitationId: string;
  membershipId: string;
  ownerUserId: string;
  childId: string;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

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

export async function acceptFamilyOrganizerInvitation(
  input: AcceptFamilyOrganizerInvitationInput
): Promise<AcceptFamilyOrganizerInvitationResult> {
  const invitationId = normalizeRequiredString(
    input.invitationId,
    "invitationId"
  );

  const currentUserId = normalizeRequiredString(
    input.currentUserId,
    "currentUserId"
  );

  const currentUserEmail = normalizeEmail(
    input.currentUserEmail
  );

  if (!currentUserEmail) {
    throw new Error(
      "A signed-in email address is required."
    );
  }

  const invitationReference = doc(
    db,
    "familyOrganizerInvitations",
    invitationId
  );

  /*
   * ----------------------------------------------------------
   * READ INVITATION
   * ----------------------------------------------------------
   */

  const invitationSnapshot = await getDoc(
    invitationReference
  );

  if (!invitationSnapshot.exists()) {
    throw new Error(
      "This Family Organizer invitation could not be found."
    );
  }

  const invitationData =
    invitationSnapshot.data() as Omit<
      FamilyOrganizerInvitation,
      "id"
    >;

  const ownerUserId = normalizeRequiredString(
    invitationData.ownerUserId,
    "ownerUserId"
  );

  const childId = normalizeRequiredString(
    invitationData.childId,
    "childId"
  );

  /*
   * ----------------------------------------------------------
   * VALIDATE RECIPIENT
   * ----------------------------------------------------------
   */

  if (ownerUserId === currentUserId) {
    throw new Error(
      "The child owner already has access."
    );
  }

  if (
    normalizeEmail(invitationData.invitedEmail) !==
    currentUserEmail
  ) {
    throw new Error(
      "This invitation belongs to another account."
    );
  }

  /*
   * ----------------------------------------------------------
   * CANONICAL MEMBERSHIP ID
   * ----------------------------------------------------------
   */

  const membershipId =
    buildFamilyOrganizerMembershipId(
      ownerUserId,
      childId,
      currentUserId
    );

  const membershipReference = doc(
    db,
    "familyOrganizerMemberships",
    membershipId
  );

  /*
   * ----------------------------------------------------------
   * ACCEPT INVITATION ATOMICALLY
   * ----------------------------------------------------------
   */

  await runTransaction(db, async (transaction) => {
    const latestInvitationSnapshot =
      await transaction.get(invitationReference);

    if (!latestInvitationSnapshot.exists()) {
      throw new Error(
        "This invitation no longer exists."
      );
    }

    const invitation =
      latestInvitationSnapshot.data() as Omit<
        FamilyOrganizerInvitation,
        "id"
      >;

    if (
      invitation.ownerUserId !== ownerUserId ||
      invitation.childId !== childId
    ) {
      throw new Error(
        "Invitation information has changed."
      );
    }

    if (invitation.status !== "pending") {
      throw new Error(
        "This invitation is no longer pending."
      );
    }

    if (
      normalizeEmail(invitation.invitedEmail) !==
      currentUserEmail
    ) {
      throw new Error(
        "This invitation belongs to another account."
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
    console.log(
      "[Family Organizer] Checking existing membership",
      membershipReference.path
    );
    const existingMembership =
      await transaction.get(membershipReference);
      console.log(
        "[Family Organizer] Membership read succeeded",
        existingMembership.exists()
      );
      if (existingMembership.exists()) {
        throw new Error(
          "A previous Family Team membership already exists for this child. Please ask the child owner to review your access."
        );
      }

    /*
     * --------------------------------------------------------
     * CREATE ACTIVE VIEWER MEMBERSHIP
     * --------------------------------------------------------
     */

    const now = Date.now();

    const membership: Omit<
      FamilyOrganizerMembership,
      "id"
    > = {
      invitationId,
      ownerUserId,
      childId,
      memberUserId: currentUserId,
      role: "family_member",
      relationship: invitation.relationship,
      status: "active",
      accessLevel: "viewer",
      createdAt: now,
      createdByUserId: invitation.invitedByUserId,
      acceptedAt: now,
    };

    transaction.set(
      membershipReference,
      membership
    );

    /*
     * --------------------------------------------------------
     * MARK INVITATION ACCEPTED
     * --------------------------------------------------------
     */

    transaction.update(invitationReference, {
      status: "accepted",
      acceptedByUserId: currentUserId,
      acceptedAt: now,
    });
  });

  /*
   * ----------------------------------------------------------
   * RETURN CANONICAL CHILD REFERENCE
   * ----------------------------------------------------------
   */

  return {
    invitationId,
    membershipId,
    ownerUserId,
    childId,
  };
}
