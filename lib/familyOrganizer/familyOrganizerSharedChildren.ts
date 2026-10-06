import type {
    FamilyOrganizerChildReference,
    FamilyOrganizerMembership,
    FamilyOrganizerMembershipRole,
  } from "./familyOrganizerTypes";
  
  /*
   * ============================================================
   * FAMILY ORGANIZER SHARED CHILDREN
   * ============================================================
   *
   * Resolves the child workspaces available to a signed-in user.
   *
   * A user may access a child because:
   *
   * 1. They are the canonical owner.
   * 2. They have an ACTIVE Family Organizer membership.
   *
   * IMPORTANT:
   *
   * Shared children are references to the canonical child.
   *
   * They do NOT create or duplicate child records.
   *
   * Canonical child:
   *
   * users/{ownerUserId}/children/{childId}
   * ============================================================
   */
  
  /*
   * ============================================================
   * SHARED CHILD ACCESS
   * ============================================================
   */
  
  export interface FamilyOrganizerSharedChildAccess
    extends FamilyOrganizerChildReference {
    role: FamilyOrganizerMembershipRole;
  
    /*
     * Present only when access comes from an invited membership.
     */
    membershipId?: string;
  
    /*
     * Present only when access comes from an invitation.
     */
    invitationId?: string;
  }
  
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
   * REFERENCE KEY
   * ============================================================
   *
   * Used only for in-memory de-duplication.
   * ============================================================
   */
  
  function buildChildReferenceKey(
    ownerUserId: string,
    childId: string
  ): string {
    return [
      normalizeId(
        ownerUserId
      ),
      normalizeId(
        childId
      ),
    ].join("::");
  }
  
  /*
   * ============================================================
   * ACTIVE SHARED MEMBERSHIPS
   * ============================================================
   *
   * Returns active memberships belonging to the authenticated
   * user.
   *
   * Invalid or incomplete membership records are ignored.
   * ============================================================
   */
  
  export function getActiveSharedChildMemberships(
    memberships: FamilyOrganizerMembership[],
    currentUserId: string
  ): FamilyOrganizerMembership[] {
    const normalizedUserId =
      normalizeId(
        currentUserId
      );
  
    if (!normalizedUserId) {
      return [];
    }
  
    return memberships.filter(
      (membership) => {
        const ownerUserId =
          normalizeId(
            membership.ownerUserId
          );
  
        const childId =
          normalizeId(
            membership.childId
          );
  
        const memberUserId =
          normalizeId(
            membership.memberUserId
          );
  
        return (
          membership.status ===
            "active" &&
          ownerUserId.length > 0 &&
          childId.length > 0 &&
          memberUserId ===
            normalizedUserId
        );
      }
    );
  }
  
  /*
   * ============================================================
   * BUILD SHARED CHILD ACCESS
   * ============================================================
   *
   * Converts active memberships into canonical child references.
   *
   * If duplicate membership records somehow exist for the same
   * child, only one shared child reference is returned.
   * ============================================================
   */
  
  export function buildSharedChildAccessFromMemberships(
    memberships: FamilyOrganizerMembership[],
    currentUserId: string
  ): FamilyOrganizerSharedChildAccess[] {
    const activeMemberships =
      getActiveSharedChildMemberships(
        memberships,
        currentUserId
      );
  
    const seen =
      new Set<string>();
  
    const sharedChildren:
      FamilyOrganizerSharedChildAccess[] =
        [];
  
    for (
      const membership
      of activeMemberships
    ) {
      const ownerUserId =
        normalizeId(
          membership.ownerUserId
        );
  
      const childId =
        normalizeId(
          membership.childId
        );
  
      const key =
        buildChildReferenceKey(
          ownerUserId,
          childId
        );
  
      if (
        seen.has(
          key
        )
      ) {
        continue;
      }
  
      seen.add(
        key
      );
  
      sharedChildren.push(
        {
          ownerUserId,
  
          childId,
  
          role:
            "family_member",
  
          membershipId:
            membership.id,
  
          invitationId:
            membership.invitationId,
        }
      );
    }
  
    return sharedChildren;
  }
  
  /*
   * ============================================================
   * BUILD OWNER CHILD ACCESS
   * ============================================================
   *
   * Converts the user's existing child IDs into canonical owner
   * references.
   *
   * This function does not read Firestore.
   * ============================================================
   */
  
  export function buildOwnedChildAccess(
    ownerUserId: string,
    childIds: string[]
  ): FamilyOrganizerSharedChildAccess[] {
    const normalizedOwnerUserId =
      normalizeId(
        ownerUserId
      );
  
    if (!normalizedOwnerUserId) {
      return [];
    }
  
    const seen =
      new Set<string>();
  
    const ownedChildren:
      FamilyOrganizerSharedChildAccess[] =
        [];
  
    for (
      const rawChildId
      of childIds
    ) {
      const childId =
        normalizeId(
          rawChildId
        );
  
      if (!childId) {
        continue;
      }
  
      const key =
        buildChildReferenceKey(
          normalizedOwnerUserId,
          childId
        );
  
      if (
        seen.has(
          key
        )
      ) {
        continue;
      }
  
      seen.add(
        key
      );
  
      ownedChildren.push(
        {
          ownerUserId:
            normalizedOwnerUserId,
  
          childId,
  
          role:
            "owner",
        }
      );
    }
  
    return ownedChildren;
  }
  
  /*
   * ============================================================
   * MERGE CHILD ACCESS
   * ============================================================
   *
   * Combines:
   *
   * - children owned by the authenticated user
   * - children shared with the authenticated user
   *
   * The canonical owner + child ID pair remains authoritative.
   *
   * Owner access takes precedence if the same canonical child
   * somehow appears in both collections.
   * ============================================================
   */
  
  export function mergeFamilyOrganizerChildAccess(
    ownedChildren:
      FamilyOrganizerSharedChildAccess[],
    sharedChildren:
      FamilyOrganizerSharedChildAccess[]
  ): FamilyOrganizerSharedChildAccess[] {
    const merged =
      new Map<
        string,
        FamilyOrganizerSharedChildAccess
      >();
  
    /*
     * Shared access first.
     */
  
    for (
      const child
      of sharedChildren
    ) {
      const ownerUserId =
        normalizeId(
          child.ownerUserId
        );
  
      const childId =
        normalizeId(
          child.childId
        );
  
      if (
        !ownerUserId ||
        !childId
      ) {
        continue;
      }
  
      const key =
        buildChildReferenceKey(
          ownerUserId,
          childId
        );
  
      merged.set(
        key,
        {
          ...child,
  
          ownerUserId,
  
          childId,
        }
      );
    }
  
    /*
     * Owner access second so it takes precedence.
     */
  
    for (
      const child
      of ownedChildren
    ) {
      const ownerUserId =
        normalizeId(
          child.ownerUserId
        );
  
      const childId =
        normalizeId(
          child.childId
        );
  
      if (
        !ownerUserId ||
        !childId
      ) {
        continue;
      }
  
      const key =
        buildChildReferenceKey(
          ownerUserId,
          childId
        );
  
      merged.set(
        key,
        {
          ownerUserId,
  
          childId,
  
          role:
            "owner",
        }
      );
    }
  
    return Array.from(
      merged.values()
    );
  }
  
  /*
   * ============================================================
   * RESOLVE ALL CHILD ACCESS
   * ============================================================
   *
   * Convenience helper for combining owned and shared child
   * references for the authenticated user.
   *
   * This remains a pure function.
   *
   * Firestore reads stay in the repository layer.
   * ============================================================
   */
  
  export interface ResolveFamilyOrganizerChildrenInput {
    currentUserId: string;
  
    ownedChildIds: string[];
  
    memberships:
      FamilyOrganizerMembership[];
  }
  
  export function resolveFamilyOrganizerChildren(
    input:
      ResolveFamilyOrganizerChildrenInput
  ): FamilyOrganizerSharedChildAccess[] {
    const currentUserId =
      normalizeId(
        input.currentUserId
      );
  
    if (!currentUserId) {
      return [];
    }
  
    const ownedChildren =
      buildOwnedChildAccess(
        currentUserId,
        input.ownedChildIds
      );
  
    const sharedChildren =
      buildSharedChildAccessFromMemberships(
        input.memberships,
        currentUserId
      );
  
    return mergeFamilyOrganizerChildAccess(
      ownedChildren,
      sharedChildren
    );
  }
  
  /*
   * ============================================================
   * ACCESS HELPERS
   * ============================================================
   */
  
  export function isOwnedFamilyOrganizerChild(
    child:
      FamilyOrganizerSharedChildAccess
  ): boolean {
    return child.role ===
      "owner";
  }
  
  export function isSharedFamilyOrganizerChild(
    child:
      FamilyOrganizerSharedChildAccess
  ): boolean {
    return child.role ===
      "family_member";
  }
  
  /*
   * ============================================================
   * FIND CHILD ACCESS
   * ============================================================
   */
  
  export function findFamilyOrganizerChildAccess(
    children:
      FamilyOrganizerSharedChildAccess[],
    reference:
      FamilyOrganizerChildReference
  ): FamilyOrganizerSharedChildAccess | null {
    const ownerUserId =
      normalizeId(
        reference.ownerUserId
      );
  
    const childId =
      normalizeId(
        reference.childId
      );
  
    if (
      !ownerUserId ||
      !childId
    ) {
      return null;
    }
  
    return (
      children.find(
        (child) =>
          normalizeId(
            child.ownerUserId
          ) ===
            ownerUserId &&
          normalizeId(
            child.childId
          ) ===
            childId
      ) ?? null
    );
  }
  
  /*
   * ============================================================
   * ACCESS CHECK
   * ============================================================
   */
  
  export function hasFamilyOrganizerChildAccess(
    children:
      FamilyOrganizerSharedChildAccess[],
    reference:
      FamilyOrganizerChildReference
  ): boolean {
    return (
      findFamilyOrganizerChildAccess(
        children,
        reference
      ) !== null
    );
  }