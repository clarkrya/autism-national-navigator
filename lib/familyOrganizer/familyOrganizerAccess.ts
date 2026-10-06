import type {
    FamilyOrganizerAccessResult,
    FamilyOrganizerChildReference,
    FamilyOrganizerMembership,
    FamilyOrganizerMembershipRole,
  } from "./familyOrganizerTypes";
  
  /*
   * ============================================================
   * FAMILY ORGANIZER ACCESS
   * ============================================================
   *
   * Shared authorization helpers for Family Organizer.
   *
   * PURPOSE:
   *
   * Determine whether a signed-in Firebase user may access a
   * specific shared child workspace.
   *
   * IMPORTANT:
   *
   * The canonical child remains:
   *
   *   users/{ownerUserId}/children/{childId}
   *
   * Family Organizer does NOT duplicate the child or Journey.
   *
   * Owner access comes from the canonical ownerUserId.
   *
   * Shared family access comes from an ACTIVE
   * FamilyOrganizerMembership tied to the signed-in Firebase UID.
   *
   * Support Team contacts are NOT Myriad account members and are
   * intentionally excluded from these authorization helpers.
   * ============================================================
   */
  
  /*
   * ============================================================
   * NORMALIZATION
   * ============================================================
   */
  
  function normalizeId(
    value: string | null | undefined
  ): string {
    if (
      typeof value !== "string"
    ) {
      return "";
    }
  
    return value.trim();
  }
  
  /*
   * ============================================================
   * CHILD REFERENCE VALIDATION
   * ============================================================
   */
  
  export function isValidFamilyOrganizerChildReference(
    reference:
      FamilyOrganizerChildReference
  ): boolean {
    return (
      normalizeId(
        reference.ownerUserId
      ).length > 0 &&
      normalizeId(
        reference.childId
      ).length > 0
    );
  }
  
  /*
   * ============================================================
   * OWNER CHECK
   * ============================================================
   */
  
  export function isFamilyOrganizerOwner(
    currentUserId: string | null | undefined,
    ownerUserId: string
  ): boolean {
    const normalizedCurrentUserId =
      normalizeId(
        currentUserId
      );
  
    const normalizedOwnerUserId =
      normalizeId(
        ownerUserId
      );
  
    if (
      !normalizedCurrentUserId ||
      !normalizedOwnerUserId
    ) {
      return false;
    }
  
    return (
      normalizedCurrentUserId ===
      normalizedOwnerUserId
    );
  }
  
  /*
   * ============================================================
   * ACTIVE MEMBERSHIP CHECK
   * ============================================================
   */
  
  export function isActiveFamilyOrganizerMembership(
    membership:
      FamilyOrganizerMembership,
    currentUserId: string
  ): boolean {
    const normalizedCurrentUserId =
      normalizeId(
        currentUserId
      );
  
    if (!normalizedCurrentUserId) {
      return false;
    }
  
    return (
      membership.status ===
        "active" &&
      normalizeId(
        membership.memberUserId
      ) ===
        normalizedCurrentUserId
    );
  }
  
  /*
   * ============================================================
   * MEMBERSHIP MATCHES CHILD
   * ============================================================
   */
  
  export function membershipMatchesFamilyOrganizerChild(
    membership:
      FamilyOrganizerMembership,
    reference:
      FamilyOrganizerChildReference
  ): boolean {
    return (
      normalizeId(
        membership.ownerUserId
      ) ===
        normalizeId(
          reference.ownerUserId
        ) &&
      normalizeId(
        membership.childId
      ) ===
        normalizeId(
          reference.childId
        )
    );
  }
  
  /*
   * ============================================================
   * FIND ACTIVE MEMBERSHIP
   * ============================================================
   */
  
  export function findActiveFamilyOrganizerMembership(
    memberships:
      FamilyOrganizerMembership[],
    currentUserId: string,
    reference:
      FamilyOrganizerChildReference
  ): FamilyOrganizerMembership | null {
    const normalizedCurrentUserId =
      normalizeId(
        currentUserId
      );
  
    if (
      !normalizedCurrentUserId ||
      !isValidFamilyOrganizerChildReference(
        reference
      )
    ) {
      return null;
    }
  
    return (
      memberships.find(
        (membership) =>
          isActiveFamilyOrganizerMembership(
            membership,
            normalizedCurrentUserId
          ) &&
          membershipMatchesFamilyOrganizerChild(
            membership,
            reference
          )
      ) ?? null
    );
  }
  
  /*
   * ============================================================
   * RESOLVE FAMILY ORGANIZER ACCESS
   * ============================================================
   *
   * This is the primary reusable access decision.
   *
   * OWNER:
   * The authenticated user owns the canonical child.
   *
   * FAMILY MEMBER:
   * The authenticated user has an active membership for the
   * canonical child.
   *
   * NO ACCESS:
   * No matching active membership exists.
   * ============================================================
   */
  
  export interface ResolveFamilyOrganizerAccessInput {
    currentUserId:
      string | null | undefined;
  
    reference:
      FamilyOrganizerChildReference;
  
    memberships:
      FamilyOrganizerMembership[];
  }
  
  export function resolveFamilyOrganizerAccess(
    input:
      ResolveFamilyOrganizerAccessInput
  ): FamilyOrganizerAccessResult {
    const currentUserId =
      normalizeId(
        input.currentUserId
      );
  
    const ownerUserId =
      normalizeId(
        input.reference.ownerUserId
      );
  
    const childId =
      normalizeId(
        input.reference.childId
      );
  
    /*
     * ----------------------------------------------------------
     * AUTHENTICATION
     * ----------------------------------------------------------
     */
  
    if (!currentUserId) {
      return {
        allowed: false,
        reason:
          "not_authenticated",
      };
    }
  
    /*
     * ----------------------------------------------------------
     * CHILD REFERENCE
     * ----------------------------------------------------------
     */
  
    if (
      !ownerUserId ||
      !childId
    ) {
      return {
        allowed: false,
        reason:
          "child_not_found",
      };
    }
  
    /*
     * ----------------------------------------------------------
     * OWNER
     * ----------------------------------------------------------
     *
     * The canonical owner does not need a separate membership
     * document to access their own child.
     * ----------------------------------------------------------
     */
  
    if (
      currentUserId ===
      ownerUserId
    ) {
      return {
        allowed: true,
  
        role:
          "owner",
  
        ownerUserId,
  
        childId,
      };
    }
  
    /*
     * ----------------------------------------------------------
     * SHARED FAMILY MEMBER
     * ----------------------------------------------------------
     */
  
    const matchingMembership =
      input.memberships.find(
        (membership) =>
          normalizeId(
            membership.ownerUserId
          ) ===
            ownerUserId &&
          normalizeId(
            membership.childId
          ) ===
            childId &&
          normalizeId(
            membership.memberUserId
          ) ===
            currentUserId
      );
  
    if (!matchingMembership) {
      return {
        allowed: false,
        reason:
          "not_member",
      };
    }
  
    if (
      matchingMembership.status !==
      "active"
    ) {
      return {
        allowed: false,
        reason:
          "membership_inactive",
      };
    }
  
    return {
      allowed: true,
  
      role:
        matchingMembership.role,
  
      ownerUserId,
  
      childId,
    };
  }
  
  /*
   * ============================================================
   * ROLE CAPABILITIES
   * ============================================================
   *
   * V1 intentionally keeps permissions simple.
   *
   * OWNER
   * - Manage Family Organizer sharing
   * - Invite family members
   * - Revoke family members
   * - Access shared child workspace
   *
   * FAMILY MEMBER
   * - Access shared child workspace
   * - Participate in shared Journey functionality
   * - Participate in shared Calendar functionality
   *
   * More granular permissions can be introduced later without
   * changing the canonical ownership model.
   * ============================================================
   */
  
  export function canManageFamilyOrganizerSharing(
    role:
      FamilyOrganizerMembershipRole
  ): boolean {
    return role === "owner";
  }
  
  export function canAccessSharedJourney(
    role:
      FamilyOrganizerMembershipRole
  ): boolean {
    return (
      role === "owner" ||
      role === "family_member"
    );
  }
  
  export function canAccessFamilyOrganizerCalendar(
    role:
      FamilyOrganizerMembershipRole
  ): boolean {
    return (
      role === "owner" ||
      role === "family_member"
    );
  }
  
  export function canManageSupportTeam(
    role:
      FamilyOrganizerMembershipRole
  ): boolean {
    return (
      role === "owner" ||
      role === "family_member"
    );
  }
  
  /*
   * ============================================================
   * DESTRUCTIVE CHILD ACTIONS
   * ============================================================
   *
   * Only the canonical owner may perform actions that affect the
   * actual child record itself.
   *
   * An invited family member leaving Family Organizer must NEVER
   * delete the canonical child or Journey.
   * ============================================================
   */
  
  export function canDeleteCanonicalChild(
    role:
      FamilyOrganizerMembershipRole
  ): boolean {
    return role === "owner";
  }
  
  /*
   * ============================================================
   * MEMBERSHIP MANAGEMENT
   * ============================================================
   */
  
  export function canRevokeFamilyOrganizerMembership(
    role:
      FamilyOrganizerMembershipRole
  ): boolean {
    return role === "owner";
  }
  
  export function canLeaveFamilyOrganizer(
    role:
      FamilyOrganizerMembershipRole
  ): boolean {
    return role ===
      "family_member";
  }