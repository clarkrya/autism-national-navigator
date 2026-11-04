import type {
  FamilyOrganizerAccessResult,
  FamilyOrganizerMembership,
} from "./familyOrganizerTypes";

/*
 * ============================================================
 * FAMILY ORGANIZER ACCESS
 * ============================================================
 *
 * Shared access is granted only when:
 *
 * - the signed-in user owns the child, OR
 * - the signed-in user has an ACTIVE Family Organizer
 *   membership for that exact canonical child.
 *
 * Canonical child:
 *
 * users/{ownerUserId}/children/{childId}
 * ============================================================
 */

/*
 * ============================================================
 * ACTIVE MEMBERSHIP CHECK
 * ============================================================
 */

export function isActiveFamilyOrganizerMembership(
  membership:
    FamilyOrganizerMembership
): boolean {
  return (
    membership.status === "active" &&
    membership.role === "family_member"
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
  memberUserId: string,
  ownerUserId: string,
  childId: string
):
  | FamilyOrganizerMembership
  | null {
  const normalizedMemberUserId =
    memberUserId.trim();

  const normalizedOwnerUserId =
    ownerUserId.trim();

  const normalizedChildId =
    childId.trim();

  if (
    !normalizedMemberUserId ||
    !normalizedOwnerUserId ||
    !normalizedChildId
  ) {
    return null;
  }

  return (
    memberships.find(
      (membership) =>
        membership.memberUserId ===
          normalizedMemberUserId &&
        membership.ownerUserId ===
          normalizedOwnerUserId &&
        membership.childId ===
          normalizedChildId &&
        isActiveFamilyOrganizerMembership(
          membership
        )
    ) ?? null
  );
}

/*
 * ============================================================
 * CAN ACCESS CHILD
 * ============================================================
 */

export function canAccessFamilyOrganizerChild(
  currentUserId: string,
  ownerUserId: string,
  childId: string,
  memberships:
    FamilyOrganizerMembership[] = []
): boolean {
  const normalizedCurrentUserId =
    currentUserId.trim();

  const normalizedOwnerUserId =
    ownerUserId.trim();

  const normalizedChildId =
    childId.trim();

  if (
    !normalizedCurrentUserId ||
    !normalizedOwnerUserId ||
    !normalizedChildId
  ) {
    return false;
  }

  /*
   * Owner always has access to their own child.
   */

  if (
    normalizedCurrentUserId ===
    normalizedOwnerUserId
  ) {
    return true;
  }

  /*
   * Otherwise require an active membership.
   */

  return Boolean(
    findActiveFamilyOrganizerMembership(
      memberships,
      normalizedCurrentUserId,
      normalizedOwnerUserId,
      normalizedChildId
    )
  );
}

/*
 * ============================================================
 * RESOLVE ACCESS RESULT
 * ============================================================
 */

export function resolveFamilyOrganizerAccess(
  currentUserId:
    | string
    | null
    | undefined,
  ownerUserId: string,
  childId: string,
  memberships:
    FamilyOrganizerMembership[] = []
): FamilyOrganizerAccessResult {
  const normalizedOwnerUserId =
    ownerUserId.trim();

  const normalizedChildId =
    childId.trim();

  if (!currentUserId) {
    return {
      allowed: false,
      reason: "not_authenticated",
    };
  }

  const normalizedCurrentUserId =
    currentUserId.trim();

  if (!normalizedCurrentUserId) {
    return {
      allowed: false,
      reason: "not_authenticated",
    };
  }

  if (
    !normalizedOwnerUserId ||
    !normalizedChildId
  ) {
    return {
      allowed: false,
      reason: "child_not_found",
    };
  }

  /*
   * OWNER
   */

  if (
    normalizedCurrentUserId ===
    normalizedOwnerUserId
  ) {
    return {
      allowed: true,
      role: "owner",
      ownerUserId:
        normalizedOwnerUserId,
      childId:
        normalizedChildId,
    };
  }

  /*
   * SHARED FAMILY MEMBER
   */

  const membership =
    memberships.find(
      (candidate) =>
        candidate.memberUserId ===
          normalizedCurrentUserId &&
        candidate.ownerUserId ===
          normalizedOwnerUserId &&
        candidate.childId ===
          normalizedChildId
    );

  if (!membership) {
    return {
      allowed: false,
      reason: "not_member",
    };
  }

  if (
    !isActiveFamilyOrganizerMembership(
      membership
    )
  ) {
    return {
      allowed: false,
      reason: "membership_inactive",
    };
  }

  return {
    allowed: true,
    role: "family_member",
    ownerUserId:
      normalizedOwnerUserId,
    childId:
      normalizedChildId,
  };
}

/*
 * ============================================================
 * FEATURE-SPECIFIC ACCESS
 * ============================================================
 */

export function canAccessFamilyOrganizerCalendar(
  currentUserId: string,
  ownerUserId: string,
  childId: string,
  memberships:
    FamilyOrganizerMembership[] = []
): boolean {
  return canAccessFamilyOrganizerChild(
    currentUserId,
    ownerUserId,
    childId,
    memberships
  );
}

export function canAccessFamilyOrganizerSupportTeam(
  currentUserId: string,
  ownerUserId: string,
  childId: string,
  memberships:
    FamilyOrganizerMembership[] = []
): boolean {
  return canAccessFamilyOrganizerChild(
    currentUserId,
    ownerUserId,
    childId,
    memberships
  );
}