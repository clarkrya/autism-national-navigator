import {
    doc,
    runTransaction,
  } from "firebase/firestore";
  
  import { db } from "../firebase";
  
  import type {
    FamilyOrganizerInvitation,
  } from "./familyOrganizerTypes";
  
  /*
   * ============================================================
   * FAMILY ORGANIZER INVITATION DECLINE
   * ============================================================
   *
   * Allows the authenticated invited user to decline a pending
   * Family Organizer invitation.
   *
   * IMPORTANT:
   *
   * - Email is used to verify the invitation recipient.
   * - Declining does NOT create a membership.
   * - Declined invitations cannot later grant access unless a
   *   new invitation is created.
   * ============================================================
   */
  
  /*
   * ============================================================
   * DECLINE INPUT
   * ============================================================
   */
  
  export interface DeclineFamilyOrganizerInvitationInput {
    invitationId: string;
  
    currentUserId: string;
  
    currentUserEmail: string;
  }
  
  /*
   * ============================================================
   * DECLINE RESULT
   * ============================================================
   */
  
  export interface DeclineFamilyOrganizerInvitationResult {
    invitationId: string;
  
    ownerUserId: string;
  
    childId: string;
  
    status: "declined";
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
   * INVITATION REFERENCE
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
   * DECLINE INVITATION
   * ============================================================
   */
  
  export async function declineFamilyOrganizerInvitation(
    input:
      DeclineFamilyOrganizerInvitationInput
  ): Promise<
    DeclineFamilyOrganizerInvitationResult
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
        "A signed-in email address is required to decline this invitation."
      );
    }
  
    const invitationReference =
      getInvitationReference(
        invitationId
      );
  
    let ownerUserId = "";
    let childId = "";
  
    /*
     * ==========================================================
     * TRANSACTION
     * ==========================================================
     */
  
    await runTransaction(
      db,
      async (transaction) => {
        const invitationSnapshot =
          await transaction.get(
            invitationReference
          );
  
        if (
          !invitationSnapshot.exists()
        ) {
          throw new Error(
            "This Family Organizer invitation could not be found."
          );
        }
  
        const invitation =
          invitationSnapshot.data() as
            Omit<
              FamilyOrganizerInvitation,
              "id"
            >;
  
        ownerUserId =
          normalizeRequiredString(
            invitation.ownerUserId,
            "ownerUserId"
          );
  
        childId =
          normalizeRequiredString(
            invitation.childId,
            "childId"
          );
  
        /*
         * ------------------------------------------------------
         * STATUS
         * ------------------------------------------------------
         */
  
        if (
          invitation.status ===
          "declined"
        ) {
          return;
        }
  
        if (
          invitation.status !==
          "pending"
        ) {
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
         * OWNER CANNOT DECLINE OWN INVITATION
         * ------------------------------------------------------
         */
  
        if (
          invitation.ownerUserId ===
          currentUserId
        ) {
          throw new Error(
            "The Family Organizer owner cannot decline their own access."
          );
        }
  
        /*
         * ------------------------------------------------------
         * DECLINE
         * ------------------------------------------------------
         */
  
        transaction.update(
          invitationReference,
          {
            status:
              "declined",
  
            declinedAt:
              now,
          }
        );
      }
    );
  
    return {
      invitationId,
  
      ownerUserId,
  
      childId,
  
      status:
        "declined",
    };
  }