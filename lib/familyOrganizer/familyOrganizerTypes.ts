
/*
 * ============================================================
 * AUTIVOYA — FAMILY ORGANIZER TYPES
 * ============================================================
 *
 * Family Organizer allows authorized Autivoya users to
 * collaborate around the SAME child and Journey while
 * using their own individual accounts.
 *
 * - Shared children are never duplicated.
 * - The original owner and childId remain canonical.
 * - Invitations use email for delivery and matching.
 * - Membership access is tied to Firebase UID.
 * - Relationship and permissions are separate concepts.
 * - The original owner retains ultimate control.
 * - Support Team contacts do not automatically gain access.
 * ============================================================
 */

/*
 * FAMILY RELATIONSHIP
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
 * MEMBERSHIP ROLE
 *
 * Identifies whether the user is the canonical owner
 * or an invited family member.
 *
 * Do not use this field alone to determine permissions.
 */

export type FamilyOrganizerMembershipRole =
  | "owner"
  | "family_member";

/*
 * ACCESS LEVEL
 *
 * Viewer:
 *   Can view authorized shared information.
 *
 * Contributor:
 *   Can view shared information and update permitted
 *   collaborative records, including journey task progress.
 *
 * Administrator:
 *   Can manage permitted shared information and
 *   Family Team access.
 *
 * The canonical owner retains exclusive control over
 * permanent deletion and ownership.
 */

export type FamilyOrganizerAccessLevel =
  | "viewer"
  | "contributor"
  | "administrator";

/*
 * PERMISSION HELPERS
 *
 * Existing membership documents may not contain
 * accessLevel. Treat them as Viewer until upgraded.
 *
 * These helpers are for UI/application behavior.
 * Firestore rules must independently enforce access.
 */

export function normalizeFamilyOrganizerAccessLevel(
  value: unknown
): FamilyOrganizerAccessLevel {
  if (
    value === "viewer" ||
    value === "contributor" ||
    value === "administrator"
  ) {
    return value;
  }

  return "viewer";
}

export function canContributeToFamilyOrganizer(
  accessLevel: FamilyOrganizerAccessLevel
): boolean {
  return (
    accessLevel === "contributor" ||
    accessLevel === "administrator"
  );
}

export function canAdministerFamilyOrganizer(
  accessLevel: FamilyOrganizerAccessLevel
): boolean {
  return accessLevel === "administrator";
}

/*
 * MEMBERSHIP STATUS
 */

export type FamilyOrganizerMembershipStatus =
  | "active"
  | "revoked"
  | "left";

/*
 * INVITATION STATUS
 */

export type FamilyOrganizerInvitationStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "revoked"
  | "expired";

/*
 * CHILD REFERENCE
 *
 * Canonical child:
 *
 * users/{ownerUserId}/children/{childId}
 */

export interface FamilyOrganizerChildReference {
  ownerUserId: string;
  childId: string;
}

/*
 * FAMILY MEMBERSHIP
 *
 * Represents an invited authenticated account with
 * access to a specific canonical child.
 *
 * The invitationId maintains the authorization trail.
 * Owner access does not require a membership document.
 */

export interface FamilyOrganizerMembership
  extends FamilyOrganizerChildReference {
  id: string;

  invitationId: string;

  memberUserId: string;

  role: FamilyOrganizerMembershipRole;

  relationship: FamilyOrganizerRelationship;

  /*
   * Optional for backward compatibility.
   *
   * Missing accessLevel means Viewer.
   */
  accessLevel?: FamilyOrganizerAccessLevel;

  status: FamilyOrganizerMembershipStatus;

  /*
   * Milliseconds since Unix epoch.
   */
  createdAt: number;

  createdByUserId: string;

  acceptedAt?: number;

  endedAt?: number;

  /*
   * Most recent permission change.
   */
  accessUpdatedAt?: number;

  /*
   * Firebase UID of the user who changed permissions.
   */
  accessUpdatedByUserId?: string;
}

/*
 * FAMILY INVITATION
 *
 * Email is used for invitation delivery and matching.
 * Once accepted, authorization uses the member's UID.
 */

export interface FamilyOrganizerInvitation
  extends FamilyOrganizerChildReference {
  id: string;

  invitedEmail: string;

  relationship: FamilyOrganizerRelationship;

  /*
   * Optional for compatibility with existing invitations.
   *
   * Missing accessLevel means Viewer.
   */
  accessLevel?: FamilyOrganizerAccessLevel;

  status: FamilyOrganizerInvitationStatus;

  invitedByUserId: string;

  createdAt: number;

  expiresAt?: number;

  acceptedByUserId?: string;

  acceptedAt?: number;

  declinedAt?: number;

  revokedAt?: number;
}

/*
 * SUPPORT TEAM
 *
 * Contacts involved in supporting the child.
 * These contacts do not automatically receive
 * authenticated Autivoya account access.
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
 * SHARED CALENDAR
 *
 * Events belong to the shared child workspace,
 * not to an individual family member's account.
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
 * ACCESS CHECK
 *
 * Successful access includes the membership role
 * and effective permission level.
 *
 * accessLevel is optional for compatibility with
 * existing callers that return only role and IDs.
 *
 * When absent:
 *   owner -> administrator
 *   family_member -> viewer
 */

export type FamilyOrganizerAccessResult =
  | {
      allowed: true;

      role: FamilyOrganizerMembershipRole;

      accessLevel?: FamilyOrganizerAccessLevel;

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
