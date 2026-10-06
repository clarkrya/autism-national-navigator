/*
 * ============================================================
 * MYRIAD FAMILY ORGANIZER TYPES
 * ============================================================
 *
 * Shared types for Family Organizer.
 *
 * Family Organizer allows authorized Myriad users to
 * collaborate around the SAME child and Journey while using
 * their own individual Myriad accounts.
 *
 * IMPORTANT:
 *
 * - A shared child is NOT duplicated.
 * - The existing owner + childId remain the canonical source.
 * - Invitations may use email for delivery/matching.
 * - Accepted access is tied to Firebase UID.
 * - Memberships retain the invitationId that authorized access.
 * - Support Team contacts do NOT automatically receive
 *   Myriad account access.
 * ============================================================
 */

/*
 * ============================================================
 * FAMILY RELATIONSHIP
 * ============================================================
 */

export type FamilyOrganizerRelationship =
  | "parent"
  | "stepparent"
  | "guardian"
  | "grandparent"
  | "sibling"
  | "relative"
  | "caregiver"
  | "other";

/*
 * ============================================================
 * MEMBERSHIP ROLE
 * ============================================================
 */

export type FamilyOrganizerMembershipRole =
  | "owner"
  | "family_member";

/*
 * ============================================================
 * MEMBERSHIP STATUS
 * ============================================================
 */

export type FamilyOrganizerMembershipStatus =
  | "active"
  | "revoked"
  | "left";

/*
 * ============================================================
 * INVITATION STATUS
 * ============================================================
 */

export type FamilyOrganizerInvitationStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "revoked"
  | "expired";

/*
 * ============================================================
 * CHILD REFERENCE
 * ============================================================
 *
 * Canonical child:
 *
 * users/{ownerUserId}/children/{childId}
 * ============================================================
 */

export interface FamilyOrganizerChildReference {
  ownerUserId: string;
  childId: string;
}

/*
 * ============================================================
 * FAMILY MEMBERSHIP
 * ============================================================
 *
 * Represents an authenticated Myriad account that has access
 * to a specific canonical child.
 *
 * IMPORTANT:
 *
 * invitationId provides the authorization trail connecting
 * an invited family member to the invitation that originally
 * granted access.
 * ============================================================
 */

export interface FamilyOrganizerMembership
  extends FamilyOrganizerChildReference {
  id: string;

  /*
   * Invitation that authorized this membership.
   *
   * Owner access does not require a membership document.
   * Therefore stored memberships are expected to represent
   * invited family members.
   */
  invitationId: string;

  /*
   * Firebase UID of the invited family member.
   */
  memberUserId: string;

  role: FamilyOrganizerMembershipRole;

  relationship: FamilyOrganizerRelationship;

  status: FamilyOrganizerMembershipStatus;

  /*
   * Milliseconds since Unix epoch.
   */
  createdAt: number;

  /*
   * Firebase UID of the owner who originally granted access.
   */
  createdByUserId: string;

  /*
   * When invitation acceptance occurred.
   */
  acceptedAt?: number;

  /*
   * When membership access ended.
   */
  endedAt?: number;
}

/*
 * ============================================================
 * FAMILY INVITATION
 * ============================================================
 *
 * Email is used for invitation delivery and matching.
 *
 * Email is NOT the permanent authorization identity.
 *
 * Once accepted, access is tied to Firebase UID through the
 * corresponding FamilyOrganizerMembership.
 * ============================================================
 */

export interface FamilyOrganizerInvitation
  extends FamilyOrganizerChildReference {
  id: string;

  invitedEmail: string;

  relationship: FamilyOrganizerRelationship;

  status: FamilyOrganizerInvitationStatus;

  /*
   * Firebase UID of the canonical owner who sent the invite.
   */
  invitedByUserId: string;

  /*
   * Milliseconds since Unix epoch.
   */
  createdAt: number;

  expiresAt?: number;

  /*
   * Populated after successful acceptance.
   */
  acceptedByUserId?: string;

  acceptedAt?: number;

  declinedAt?: number;

  revokedAt?: number;
}

/*
 * ============================================================
 * SUPPORT TEAM
 * ============================================================
 *
 * Support Team members are contacts involved in supporting
 * the child.
 *
 * They DO NOT automatically receive Myriad account access.
 * ============================================================
 */

export type FamilyOrganizerSupportTeamCategory =
  | "medical"
  | "therapy"
  | "school"
  | "insurance"
  | "advocacy"
  | "care_coordination"
  | "community"
  | "other";

export interface FamilyOrganizerSupportTeamMember
  extends FamilyOrganizerChildReference {
  id: string;

  name: string;

  title?: string;

  organization?: string;

  category: FamilyOrganizerSupportTeamCategory;

  email?: string;

  phone?: string;

  notes?: string;

  createdAt: number;

  createdByUserId: string;

  updatedAt?: number;
}

/*
 * ============================================================
 * SHARED CALENDAR
 * ============================================================
 *
 * Calendar events belong to the shared child workspace rather
 * than one individual family member's account.
 * ============================================================
 */

export type FamilyOrganizerCalendarEventType =
  | "appointment"
  | "therapy"
  | "school"
  | "iep"
  | "evaluation"
  | "insurance"
  | "deadline"
  | "meeting"
  | "other";

export interface FamilyOrganizerCalendarEvent
  extends FamilyOrganizerChildReference {
  id: string;

  title: string;

  eventType: FamilyOrganizerCalendarEventType;

  /*
   * Milliseconds since Unix epoch.
   */
  startAt: number;

  endAt?: number;

  allDay?: boolean;

  location?: string;

  notes?: string;

  createdAt: number;

  createdByUserId: string;

  updatedAt?: number;
}

/*
 * ============================================================
 * ACCESS CHECK
 * ============================================================
 */

export type FamilyOrganizerAccessResult =
  | {
      allowed: true;

      role: FamilyOrganizerMembershipRole;

      ownerUserId: string;

      childId: string;
    }
  | {
      allowed: false;

      reason:
        | "not_authenticated"
        | "not_member"
        | "membership_inactive"
        | "child_not_found";
    };