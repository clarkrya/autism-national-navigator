import {
    acceptFamilyOrganizerInvitation,
    type AcceptFamilyOrganizerInvitationInput,
    type AcceptFamilyOrganizerInvitationResult,
  } from "./familyOrganizerInvitationAcceptance";
  
  import {
    declineFamilyOrganizerInvitation,
    type DeclineFamilyOrganizerInvitationInput,
    type DeclineFamilyOrganizerInvitationResult,
  } from "./familyOrganizerInvitationDecline";
  
  /*
   * ============================================================
   * FAMILY ORGANIZER INVITATION ACTIONS
   * ============================================================
   *
   * Central client-facing actions for responding to Family
   * Organizer invitations.
   *
   * Keeps invitation acceptance and decline behavior behind one
   * consistent interface.
   * ============================================================
   */
  
  /*
   * ============================================================
   * ACTION RESULT
   * ============================================================
   */
  
  export type FamilyOrganizerInvitationActionResult =
    | {
        action: "accepted";
  
        invitationId: string;
  
        ownerUserId: string;
  
        childId: string;
  
        membershipId: string;
      }
    | {
        action: "declined";
  
        invitationId: string;
  
        ownerUserId: string;
  
        childId: string;
      };
  
  /*
   * ============================================================
   * ACCEPT
   * ============================================================
   */
  
  export async function acceptFamilyOrganizerInvitationAction(
    input:
      AcceptFamilyOrganizerInvitationInput
  ): Promise<
    FamilyOrganizerInvitationActionResult
  > {
    const result:
      AcceptFamilyOrganizerInvitationResult =
        await acceptFamilyOrganizerInvitation(
          input
        );
  
    return {
      action:
        "accepted",
  
      invitationId:
        result.invitationId,
  
      ownerUserId:
        result.ownerUserId,
  
      childId:
        result.childId,
  
      membershipId:
        result.membershipId,
    };
  }
  
  /*
   * ============================================================
   * DECLINE
   * ============================================================
   */
  
  export async function declineFamilyOrganizerInvitationAction(
    input:
      DeclineFamilyOrganizerInvitationInput
  ): Promise<
    FamilyOrganizerInvitationActionResult
  > {
    const result:
      DeclineFamilyOrganizerInvitationResult =
        await declineFamilyOrganizerInvitation(
          input
        );
  
    return {
      action:
        "declined",
  
      invitationId:
        result.invitationId,
  
      ownerUserId:
        result.ownerUserId,
  
      childId:
        result.childId,
    };
  }
  
  /*
   * ============================================================
   * GENERIC RESPOND ACTION
   * ============================================================
   */
  
  export type RespondToFamilyOrganizerInvitationInput =
    | ({
        action: "accept";
      } &
        AcceptFamilyOrganizerInvitationInput)
    | ({
        action: "decline";
      } &
        DeclineFamilyOrganizerInvitationInput);
  
  export async function respondToFamilyOrganizerInvitation(
    input:
      RespondToFamilyOrganizerInvitationInput
  ): Promise<
    FamilyOrganizerInvitationActionResult
  > {
    if (
      input.action ===
      "accept"
    ) {
      return acceptFamilyOrganizerInvitationAction(
        {
          invitationId:
            input.invitationId,
  
          currentUserId:
            input.currentUserId,
  
          currentUserEmail:
            input.currentUserEmail,
        }
      );
    }
  
    return declineFamilyOrganizerInvitationAction(
      {
        invitationId:
          input.invitationId,
  
        currentUserId:
          input.currentUserId,
  
        currentUserEmail:
          input.currentUserEmail,
      }
    );
  }