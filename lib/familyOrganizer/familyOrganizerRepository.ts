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
    FamilyOrganizerChildReference,
    FamilyOrganizerInvitation,
    FamilyOrganizerMembership,
    FamilyOrganizerRelationship,
  } from "./familyOrganizerTypes";
  
  /*
   * ============================================================
   * FAMILY ORGANIZER REPOSITORY
   * ============================================================
   *
   * Client-side Firestore repository for Family Organizer.
   *
   * RESPONSIBILITIES:
   *
   * - Create invitations
   * - Read invitations for a child
   * - Find pending invitations for an authenticated email
   * - Accept invitations atomically
   * - Create UID-based memberships
   * - Read memberships
   * - Revoke invitations
   * - Revoke memberships
   * - Leave shared child access
   *
   * IMPORTANT:
   *
   * This repository does NOT:
   *
   * - duplicate children
   * - duplicate Journeys
   * - move existing Journey data
   * - authorize permanent access by email
   *
   * Canonical child identity remains:
   *
   *   ownerUserId + childId
   * ============================================================
   */
  
  const INVITATIONS_COLLECTION =
    "familyOrganizerInvitations";
  
  const MEMBERSHIPS_COLLECTION =
    "familyOrganizerMemberships";
  
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
  
  function normalizeEmail(
    email: string
  ): string {
    const normalized =
      email
        .trim()
        .toLowerCase();
  
    if (!normalized) {
      throw new Error(
        "Email is required."
      );
    }
  
    return normalized;
  }
  
  function validateChildReference(
    reference:
      FamilyOrganizerChildReference
  ): FamilyOrganizerChildReference {
    return {
      ownerUserId:
        normalizeRequiredString(
          reference.ownerUserId,
          "ownerUserId"
        ),
  
      childId:
        normalizeRequiredString(
          reference.childId,
          "childId"
        ),
    };
  }
  
  /*
   * ============================================================
   * CREATE INVITATION
   * ============================================================
   */
  
  export interface CreateFamilyOrganizerInvitationInput
    extends FamilyOrganizerChildReference {
    invitedEmail: string;
  
    relationship:
      FamilyOrganizerRelationship;
  
    invitedByUserId: string;
  
    expiresAt?: number;
  }
  
  export async function createFamilyOrganizerInvitation(
    input:
      CreateFamilyOrganizerInvitationInput
  ): Promise<FamilyOrganizerInvitation> {
    const childReference =
      validateChildReference(input);
  
    const invitedEmail =
      normalizeEmail(
        input.invitedEmail
      );
  
    const invitedByUserId =
      normalizeRequiredString(
        input.invitedByUserId,
        "invitedByUserId"
      );
  
    /*
     * Only the canonical owner may initiate sharing.
     *
     * Firestore Rules will independently enforce this.
     */
    if (
      invitedByUserId !==
      childReference.ownerUserId
    ) {
      throw new Error(
        "Only the child owner may create Family Organizer invitations."
      );
    }
  
    /*
     * Prevent duplicate pending invitations for the same child
     * and normalized email.
     */
    const existingQuery =
      query(
        collection(
          db,
          INVITATIONS_COLLECTION
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
      await getDocs(
        existingQuery
      );
  
    if (!existingSnapshot.empty) {
      throw new Error(
        "A pending invitation already exists for this email."
      );
    }
  
    const createdAt =
      Date.now();
  
    const payload = {
      ownerUserId:
        childReference.ownerUserId,
  
      childId:
        childReference.childId,
  
      invitedEmail,
  
      relationship:
        input.relationship,
  
      status:
        "pending" as const,
  
      invitedByUserId,
  
      createdAt,
  
      ...(typeof input.expiresAt ===
      "number"
        ? {
            expiresAt:
              input.expiresAt,
          }
        : {}),
    };
  
    const reference =
      await addDoc(
        collection(
          db,
          INVITATIONS_COLLECTION
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
   * GET CHILD INVITATIONS
   * ============================================================
   */
  
  export async function getFamilyOrganizerInvitationsForChild(
    reference:
      FamilyOrganizerChildReference
  ): Promise<FamilyOrganizerInvitation[]> {
    const childReference =
      validateChildReference(
        reference
      );
  
    const invitationsQuery =
      query(
        collection(
          db,
          INVITATIONS_COLLECTION
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
  
    const snapshot =
      await getDocs(
        invitationsQuery
      );
  
    return snapshot.docs.map(
      (snapshotDoc) => ({
        id:
          snapshotDoc.id,
  
        ...(snapshotDoc.data() as Omit<
          FamilyOrganizerInvitation,
          "id"
        >),
      })
    );
  }
  
  /*
   * ============================================================
   * GET PENDING INVITATIONS FOR EMAIL
   * ============================================================
   *
   * Email is used only to locate an invitation.
   *
   * After acceptance, Firebase UID becomes the permanent
   * membership identity.
   * ============================================================
   */
  
  export async function getPendingFamilyOrganizerInvitationsForEmail(
    email: string
  ): Promise<FamilyOrganizerInvitation[]> {
    const invitedEmail =
      normalizeEmail(email);
  
    const invitationsQuery =
      query(
        collection(
          db,
          INVITATIONS_COLLECTION
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
        )
      );
  
    const snapshot =
      await getDocs(
        invitationsQuery
      );
  
    const now =
      Date.now();
  
    return snapshot.docs
      .map(
        (snapshotDoc) => ({
          id:
            snapshotDoc.id,
  
          ...(snapshotDoc.data() as Omit<
            FamilyOrganizerInvitation,
            "id"
          >),
        })
      )
      .filter(
        (invitation) =>
          typeof invitation.expiresAt !==
            "number" ||
          invitation.expiresAt > now
      );
  }
  
  /*
   * ============================================================
   * GET CHILD MEMBERSHIPS
   * ============================================================
   */
  
  export async function getFamilyOrganizerMembershipsForChild(
    reference:
      FamilyOrganizerChildReference
  ): Promise<FamilyOrganizerMembership[]> {
    const childReference =
      validateChildReference(
        reference
      );
  
    const membershipsQuery =
      query(
        collection(
          db,
          MEMBERSHIPS_COLLECTION
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
  
    const snapshot =
      await getDocs(
        membershipsQuery
      );
  
    return snapshot.docs.map(
      (snapshotDoc) => ({
        id:
          snapshotDoc.id,
  
        ...(snapshotDoc.data() as Omit<
          FamilyOrganizerMembership,
          "id"
        >),
      })
    );
  }
  
  /*
   * ============================================================
   * GET ACTIVE MEMBERSHIPS FOR USER
   * ============================================================
   *
   * Allows an authenticated family member to discover children
   * that have been shared with their Firebase UID.
   * ============================================================
   */
  
  export async function getActiveFamilyOrganizerMembershipsForUser(
    memberUserId: string
  ): Promise<FamilyOrganizerMembership[]> {
    const normalizedUserId =
      normalizeRequiredString(
        memberUserId,
        "memberUserId"
      );
  
    const membershipsQuery =
      query(
        collection(
          db,
          MEMBERSHIPS_COLLECTION
        ),
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
  
    const snapshot =
      await getDocs(
        membershipsQuery
      );
  
    return snapshot.docs.map(
      (snapshotDoc) => ({
        id:
          snapshotDoc.id,
  
        ...(snapshotDoc.data() as Omit<
          FamilyOrganizerMembership,
          "id"
        >),
      })
    );
  }
  
  /*
   * ============================================================
   * ACCEPT INVITATION
   * ============================================================
   *
   * Converts an email invitation into UID-based membership.
   *
   * IMPORTANT:
   *
   * Membership creation and invitation acceptance occur inside
   * one Firestore transaction.
   *
   * This prevents partial state such as:
   *
   *   membership = active
   *   invitation = pending
   *
   * The resulting membership retains invitationId so Firestore
   * Rules can verify the authorization chain.
   * ============================================================
   */
  
  export interface AcceptFamilyOrganizerInvitationInput {
    invitation:
      FamilyOrganizerInvitation;
  
    acceptingUserId: string;
  
    acceptingUserEmail: string;
  }
  
  export async function acceptFamilyOrganizerInvitation(
    input:
      AcceptFamilyOrganizerInvitationInput
  ): Promise<FamilyOrganizerMembership> {
    const invitation =
      input.invitation;
  
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
  
    if (
      invitation.status !==
      "pending"
    ) {
      throw new Error(
        "This invitation is no longer pending."
      );
    }
  
    if (
      normalizeEmail(
        invitation.invitedEmail
      ) !==
      acceptingUserEmail
    ) {
      throw new Error(
        "This invitation does not belong to the signed-in account."
      );
    }
  
    if (
      typeof invitation.expiresAt ===
        "number" &&
      invitation.expiresAt <=
        Date.now()
    ) {
      throw new Error(
        "This invitation has expired."
      );
    }
  
    /*
     * Prevent duplicate active memberships before starting the
     * transaction.
     *
     * Firestore Rules will provide the actual security boundary.
     */
    const existingMembershipQuery =
      query(
        collection(
          db,
          MEMBERSHIPS_COLLECTION
        ),
        where(
          "ownerUserId",
          "==",
          invitation.ownerUserId
        ),
        where(
          "childId",
          "==",
          invitation.childId
        ),
        where(
          "memberUserId",
          "==",
          acceptingUserId
        ),
        where(
          "status",
          "==",
          "active"
        ),
        limit(1)
      );
  
    const existingMembershipSnapshot =
      await getDocs(
        existingMembershipQuery
      );
  
    if (
      !existingMembershipSnapshot.empty
    ) {
      throw new Error(
        "This account already has access to this child."
      );
    }
  
    const acceptedAt =
      Date.now();
  
    /*
     * Generate the membership document reference before entering
     * the transaction.
     */
    const membershipReference =
      doc(
        collection(
          db,
          MEMBERSHIPS_COLLECTION
        )
      );
  
    const invitationReference =
      doc(
        db,
        INVITATIONS_COLLECTION,
        invitationId
      );
  
    const membershipPayload = {
      invitationId,
  
      ownerUserId:
        invitation.ownerUserId,
  
      childId:
        invitation.childId,
  
      memberUserId:
        acceptingUserId,
  
      role:
        "family_member" as const,
  
      relationship:
        invitation.relationship,
  
      status:
        "active" as const,
  
      createdAt:
        acceptedAt,
  
      createdByUserId:
        invitation.invitedByUserId,
  
      acceptedAt,
    };
  
    await runTransaction(
      db,
      async (transaction) => {
        /*
         * Re-read the invitation inside the transaction.
         *
         * We do not rely solely on the invitation object supplied
         * by browser state.
         */
        const invitationSnapshot =
          await transaction.get(
            invitationReference
          );
  
        if (
          !invitationSnapshot.exists()
        ) {
          throw new Error(
            "This invitation no longer exists."
          );
        }
  
        const storedInvitation =
          invitationSnapshot.data();
  
        /*
         * Validate immutable invitation identity.
         */
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
  
        /*
         * The stored invitation must still be pending.
         */
        if (
          storedInvitation.status !==
          "pending"
        ) {
          throw new Error(
            "This invitation is no longer pending."
          );
        }
  
        /*
         * Re-check the stored email rather than trusting browser
         * state.
         */
        if (
          typeof storedInvitation.invitedEmail !==
            "string" ||
          normalizeEmail(
            storedInvitation.invitedEmail
          ) !==
            acceptingUserEmail
        ) {
          throw new Error(
            "This invitation does not belong to the signed-in account."
          );
        }
  
        /*
         * Re-check expiration using stored Firestore data.
         */
        if (
          typeof storedInvitation.expiresAt ===
            "number" &&
          storedInvitation.expiresAt <=
            Date.now()
        ) {
          throw new Error(
            "This invitation has expired."
          );
        }
  
        /*
         * Create the UID-based membership.
         */
        transaction.set(
          membershipReference,
          membershipPayload
        );
  
        /*
         * Mark the same invitation accepted.
         */
        transaction.update(
          invitationReference,
          {
            status:
              "accepted",
  
            acceptedByUserId:
              acceptingUserId,
  
            acceptedAt,
          }
        );
      }
    );
  
    return {
      id:
        membershipReference.id,
  
      ...membershipPayload,
    };
  }
  
  /*
   * ============================================================
   * DECLINE INVITATION
   * ============================================================
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
        status:
          "declined",
  
        declinedAt:
          Date.now(),
      }
    );
  }
  
  /*
   * ============================================================
   * REVOKE INVITATION
   * ============================================================
   *
   * Intended for the canonical child owner.
   * ============================================================
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
        status:
          "revoked",
  
        revokedAt:
          Date.now(),
      }
    );
  }
  
  /*
   * ============================================================
   * REVOKE MEMBERSHIP
   * ============================================================
   *
   * Intended for the canonical child owner.
   *
   * Revocation never deletes the canonical child or Journey.
   * ============================================================
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
        status:
          "revoked",
  
        endedAt:
          Date.now(),
      }
    );
  }
  
  /*
   * ============================================================
   * LEAVE SHARED CHILD
   * ============================================================
   *
   * Used by an invited family member who no longer wants access.
   *
   * Leaving never deletes the canonical child or Journey.
   * ============================================================
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
        status:
          "left",
  
        endedAt:
          Date.now(),
      }
    );
  }