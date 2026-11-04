
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

  // The recipient can read their own invitation
  // before becoming a family member.
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

  await runTransaction(db, async (transaction) => {
    const invitationSnapshot =
      await transaction.get(invitationReference);

    if (!invitationSnapshot.exists()) {
      throw new Error(
        "This invitation no longer exists."
      );
    }

    const invitation =
      invitationSnapshot.data() as Omit<
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

    const existingMembership =
      await transaction.get(membershipReference);

    if (
      existingMembership.exists() &&
      existingMembership.data().status === "active"
    ) {
      throw new Error(
        "This account already has access."
      );
    }

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
      createdAt: now,
      createdByUserId: invitation.invitedByUserId,
      acceptedAt: now,
    };

    transaction.set(
      membershipReference,
      membership
    );

    transaction.update(invitationReference, {
      status: "accepted",
      acceptedByUserId: currentUserId,
      acceptedAt: now,
    });
  });

  return {
    invitationId,
    membershipId,
    ownerUserId,
    childId,
  };
}
