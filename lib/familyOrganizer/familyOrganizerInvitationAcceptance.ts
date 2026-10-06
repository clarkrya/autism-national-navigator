import {
    doc,
    getDoc,
    runTransaction,
  } from "firebase/firestore";
  
  import { db } from "../firebase";
  
  import type {
    FamilyOrganizerInvitation,
    FamilyOrganizerMembership,
  } from "./familyOrganizerTypes";
  
  /*
   * ============================================================
   * FAMILY ORGANIZER INVITATION ACCEPTANCE
   * ============================================================
   *
   * Converts a valid pending Family Organizer invitation into an
   * active membership.
   *
   * IMPORTANT:
   *
   * - Email is used only for invitation matching.
   * - Permanent access is tied to Firebase UID.
   * - The canonical child remains under the owner's UID.
   * - The child is never copied into the invited user's account.
   * - Membership retains invitationId for authorization history.
   * ============================================================
   */
  
  /*
   * ============================================================
   * ACCEPT INPUT
   * ============================================================
   */
  
  export interface AcceptFamilyOrganizerInvitationInput {
    invitationId: string;
  
    currentUserId: string;
  
    currentUserEmail: string;
  }
  
  /*
   * ============================================================
   * ACCEPT RESULT
   * ============================================================
   */
  
  export interface AcceptFamilyOrganizerInvitationResult {
    invitationId: string;
  
    membershipId: string;
  
    ownerUserId: string;
  
    childId: string;
  }
  
  /*
   * ============================================================
   * NORMALIZE EMAIL
   * ============================================================
   */
  
  function normalizeEmail(
    email: string
  ): string {
    return email
      .trim()
      .toLowerCase();
  }
  
  /*
   * ============================================================
   * NORMALIZE REQUIRED STRING
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
  
  /*
   * ============================================================
   * MEMBERSHIP ID
   * ============================================================
   *
   * One membership per invitation.
   *
   * Using the invitation ID as the membership document ID makes
   * invitation -> membership authorization deterministic.
   * ============================================================
   */
  
  function buildMembershipId(
    invitationId: string
  ): string {
    return invitationId;
  }
  
  /*
   * ============================================================
   * INVITATION REFERENCE
   * ============================================================
   *
   * Invitations are stored in the top-level Family Organizer
   * invitation collection.
   * ============================================================
   */
  
  function getInvitationReference(
    invitationId: string
  ) {
    return doc(
      db,
      "familyOrganizerInvitations",
      invitationId
    );
  }
  
  /*
   * ============================================================
   * MEMBERSHIP REFERENCE
   * ============================================================
   *
   * Memberships are stored in the top-level Family Organizer
   * membership collection.
   * ============================================================
   */
  
  function getMembershipReference(
    membershipId: string
  ) {
    return doc(
      db,
      "familyOrganizerMemberships",
      membershipId
    );
  }
  
  /*
   * ============================================================
   * CHILD REFERENCE
   * ============================================================
   */
  
  function getChildReference(
    ownerUserId: string,
    childId: string
  ) {
    return doc(
      db,
      "users",
      ownerUserId,
      "children",
      childId
    );
  }
  
  /*
   * ============================================================
   * ACCEPT INVITATION
   * ============================================================
   */
  
  export async function acceptFamilyOrganizerInvitation(
    input:
      AcceptFamilyOrganizerInvitationInput
  ): Promise<
    AcceptFamilyOrganizerInvitationResult
  > {
    const invitationId =
      normalizeRequiredString(
        input.invitationId,
        "invitationId"
      );
  
    const currentUserId =
      normalizeRequiredString(
        input.currentUserId,
        "currentUserId"
      );
  
    const currentUserEmail =
      normalizeEmail(
        input.currentUserEmail
      );
  
    if (!currentUserEmail) {
      throw new Error(
        "A signed-in email address is required to accept this invitation."
      );
    }
  
    const invitationReference =
      getInvitationReference(
        invitationId
      );
  
    /*
     * ----------------------------------------------------------
     * PRE-CHECK INVITATION
     * ----------------------------------------------------------
     *
     * This gives us the canonical owner + child reference before
     * entering the transaction.
     * ----------------------------------------------------------
     */
  
    const invitationSnapshot =
      await getDoc(
        invitationReference
      );
  
    if (
      !invitationSnapshot.exists()
    ) {
      throw new Error(
        "This Family Organizer invitation could not be found."
      );
    }
  
    const invitationData =
      invitationSnapshot.data() as
        Omit<
          FamilyOrganizerInvitation,
          "id"
        >;
  
    const ownerUserId =
      normalizeRequiredString(
        invitationData.ownerUserId,
        "ownerUserId"
      );
  
    const childId =
      normalizeRequiredString(
        invitationData.childId,
        "childId"
      );
  
    /*
     * ----------------------------------------------------------
     * VERIFY CANONICAL CHILD EXISTS
     * ----------------------------------------------------------
     */
  
    const childSnapshot =
      await getDoc(
        getChildReference(
          ownerUserId,
          childId
        )
      );
  
    if (!childSnapshot.exists()) {
      throw new Error(
        "The child connected to this invitation could not be found."
      );
    }
  
    const membershipId =
      buildMembershipId(
        invitationId
      );
  
    const membershipReference =
      getMembershipReference(
        membershipId
      );
  
    /*
     * ----------------------------------------------------------
     * TRANSACTION
     * ----------------------------------------------------------
     */
  
    await runTransaction(
      db,
      async (transaction) => {
        const transactionInvitationSnapshot =
          await transaction.get(
            invitationReference
          );
  
        if (
          !transactionInvitationSnapshot.exists()
        ) {
          throw new Error(
            "This Family Organizer invitation could not be found."
          );
        }
  
        const invitation =
          transactionInvitationSnapshot.data() as
            Omit<
              FamilyOrganizerInvitation,
              "id"
            >;
  
        /*
         * ------------------------------------------------------
         * STATUS
         * ------------------------------------------------------
         */
  
        if (
          invitation.status !==
          "pending"
        ) {
          if (
            invitation.status ===
              "accepted" &&
            invitation.acceptedByUserId ===
              currentUserId
          ) {
            return;
          }
  
          throw new Error(
            "This Family Organizer invitation is no longer available."
          );
        }
  
        /*
         * ------------------------------------------------------
         * EXPIRATION
         * ------------------------------------------------------
         */
  
        const now =
          Date.now();
  
        if (
          typeof invitation.expiresAt ===
            "number" &&
          invitation.expiresAt <= now
        ) {
          transaction.update(
            invitationReference,
            {
              status:
                "expired",
            }
          );
  
          throw new Error(
            "This Family Organizer invitation has expired."
          );
        }
  
        /*
         * ------------------------------------------------------
         * EMAIL MATCH
         * ------------------------------------------------------
         */
  
        const invitedEmail =
          normalizeEmail(
            invitation.invitedEmail
          );
  
        if (
          invitedEmail !==
          currentUserEmail
        ) {
          throw new Error(
            "This invitation was sent to a different email address."
          );
        }
  
        /*
         * ------------------------------------------------------
         * OWNER CANNOT ACCEPT OWN INVITATION
         * ------------------------------------------------------
         */
  
        if (
          invitation.ownerUserId ===
          currentUserId
        ) {
          throw new Error(
            "The Family Organizer owner already has access to this child."
          );
        }
  
        /*
         * ------------------------------------------------------
         * MEMBERSHIP
         * ------------------------------------------------------
         */
  
        const membership:
          Omit<
            FamilyOrganizerMembership,
            "id"
          > = {
            invitationId,
  
            ownerUserId:
              invitation.ownerUserId,
  
            childId:
              invitation.childId,
  
            memberUserId:
              currentUserId,
  
            role:
              "family_member",
  
            relationship:
              invitation.relationship,
  
            status:
              "active",
  
            createdAt:
              now,
  
            createdByUserId:
              invitation.invitedByUserId,
  
            acceptedAt:
              now,
          };
  
        transaction.set(
          membershipReference,
          membership
        );
  
        /*
         * ------------------------------------------------------
         * MARK INVITATION ACCEPTED
         * ------------------------------------------------------
         */
  
        transaction.update(
          invitationReference,
          {
            status:
              "accepted",
  
            acceptedByUserId:
              currentUserId,
  
            acceptedAt:
              now,
          }
        );
      }
    );
  
    return {
      invitationId,
  
      membershipId,
  
      ownerUserId,
  
      childId,
    };
  }