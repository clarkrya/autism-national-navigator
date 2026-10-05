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
 *
 * owner:
 * Original account responsible for the canonical child record.
 *
 * family_member:
 * Invited Myriad user who has accepted access to the child.
 *
 * More granular permissions can be added later without
 * changing the core ownership model.
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
 * This is the critical pointer to the existing canonical
 * Myriad child.
 *
 * Example:
 *
 * users/{ownerUserId}/children/{childId}
 *
 * We intentionally preserve the existing Journey architecture.
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
 * Represents one Myriad account that is authorized to
 * collaborate around a specific child.
 *
 * memberUserId must be a Firebase UID.
 * ============================================================
 */

export interface FamilyOrganizerMembership
  extends FamilyOrganizerChildReference {
  id: string;

  memberUserId: string;

  role: FamilyOrganizerMembershipRole;

  relationship: FamilyOrganizerRelationship;

  status: FamilyOrganizerMembershipStatus;

  /*
   * Milliseconds since Unix epoch.
   */
  createdAt: number;

  /*
   * Firebase UID of the user who created/granted access.
   */
  createdByUserId: string;

  /*
   * When the membership became active.
   */
  acceptedAt?: number;

  /*
   * When access ended.
   */
  endedAt?: number;
}

/*
 * ============================================================
 * FAMILY INVITATION
 * ============================================================
 *
 * Email is used to deliver and match an invitation.
 *
 * Email must NOT become the permanent authorization identity.
 * Once accepted, authorization is tied to Firebase UID through
 * FamilyOrganizerMembership.
 * ============================================================
 */

export interface FamilyOrganizerInvitation
  extends FamilyOrganizerChildReference {
  id: string;

  /*
   * Email address the owner invited.
   *
   * This should be normalized before storage.
   */
  invitedEmail: string;

  relationship: FamilyOrganizerRelationship;

  status: FamilyOrganizerInvitationStatus;

  /*
   * Firebase UID of the person who sent the invitation.
   */
  invitedByUserId: string;

  /*
   * Milliseconds since Unix epoch.
   */
  createdAt: number;

  /*
   * Optional expiration timestamp.
   */
  expiresAt?: number;

  /*
   * Populated after the invitation is accepted.
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
 * Support Team members are people involved in supporting the
 * child but do NOT automatically receive Myriad account access.
 *
 * Examples:
 *
 * - Pediatrician
 * - Developmental pediatrician
 * - Therapist
 * - Teacher
 * - IEP case manager
 * - Advocate
 * - Care coordinator
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
 * Calendar events belong to the CHILD workspace rather than
 * one individual user's account.
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
 *
 * Common result shape we can use later when determining whether
 * a logged-in Firebase user may access a shared child.
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