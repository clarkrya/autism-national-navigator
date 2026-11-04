import {
    getFamilyOrganizerOwnerChildren,
    type FamilyOrganizerChild,
  } from "./familyOrganizerChildren";
  
  import {
    getActiveFamilyOrganizerMembershipsForUser,
  } from "./familyOrganizerRepository";
  
  import {
    resolveFamilyOrganizerChildren,
    type FamilyOrganizerSharedChildAccess,
  } from "./familyOrganizerSharedChildren";
  
  /*
   * ============================================================
   * FAMILY ORGANIZER CHILD ACCESS
   * ============================================================
   *
   * Combines:
   *
   * - children owned by the signed-in user
   * - children shared with the signed-in user
   *
   * This creates one access list for Family Organizer without
   * duplicating canonical child records.
   *
   * Canonical child:
   *
   * users/{ownerUserId}/children/{childId}
   * ============================================================
   */
  
  
  /*
   * ============================================================
   * ACCESSIBLE CHILD
   * ============================================================
   */
  
  export interface FamilyOrganizerAccessibleChild
    extends FamilyOrganizerSharedChildAccess {
    childName: string;
  
    /*
     * Owner children can reuse the already-loaded SavedChild.
     *
     * Shared children intentionally do not duplicate that data
     * here. Their canonical child remains under the owner's UID.
     */
    savedChild?:
      FamilyOrganizerChild["savedChild"];
  }
  
  
  /*
   * ============================================================
   * FALLBACK CHILD NAME
   * ============================================================
   */
  
  function getSharedChildFallbackName(
    childId: string
  ): string {
    const normalizedChildId =
      childId.trim();
  
    if (!normalizedChildId) {
      return "Shared child";
    }
  
    return "Shared child";
  }
  
  
  /*
   * ============================================================
   * GET ACCESSIBLE CHILDREN
   * ============================================================
   *
   * Returns every child workspace the authenticated user may
   * access through Family Organizer.
   *
   * Owner children come from the existing Journey repository.
   *
   * Shared children come from ACTIVE Family Organizer
   * memberships tied to the authenticated user's Firebase UID.
   * ============================================================
   */
  
  export async function getFamilyOrganizerAccessibleChildren(
    currentUserId: string
  ): Promise<FamilyOrganizerAccessibleChild[]> {
    const normalizedUserId =
      currentUserId.trim();
  
    if (!normalizedUserId) {
      return [];
    }
  
    /*
     * ----------------------------------------------------------
     * OWNED CHILDREN
     * ----------------------------------------------------------
     */
  
    const ownerChildren =
      await getFamilyOrganizerOwnerChildren(
        normalizedUserId
      );
  
    /*
     * ----------------------------------------------------------
     * SHARED MEMBERSHIPS
     * ----------------------------------------------------------
     */
  
    const memberships =
      await getActiveFamilyOrganizerMembershipsForUser(
        normalizedUserId
      );
  
    /*
     * ----------------------------------------------------------
     * RESOLVE ACCESS
     * ----------------------------------------------------------
     */
  
    const access =
      resolveFamilyOrganizerChildren({
        currentUserId:
          normalizedUserId,
  
        ownedChildIds:
          ownerChildren.map(
            (child) =>
              child.childId
          ),
  
        memberships,
      });
  
    /*
     * ----------------------------------------------------------
     * OWNER CHILD LOOKUP
     * ----------------------------------------------------------
     */
  
    const ownerChildMap =
      new Map<
        string,
        FamilyOrganizerChild
      >();
  
    for (
      const child
      of ownerChildren
    ) {
      ownerChildMap.set(
        child.childId,
        child
      );
    }
  
    /*
     * ----------------------------------------------------------
     * BUILD FAMILY-FACING ACCESS LIST
     * ----------------------------------------------------------
     */
  
    return access.map(
      (
        child
      ): FamilyOrganizerAccessibleChild => {
        if (
          child.role ===
            "owner"
        ) {
          const ownerChild =
            ownerChildMap.get(
              child.childId
            );
  
          return {
            ...child,
  
            childName:
              ownerChild?.childName ??
              "Child",
  
            ...(ownerChild
              ? {
                  savedChild:
                    ownerChild.savedChild,
                }
              : {}),
          };
        }
  
        return {
          ...child,
  
          childName:
            getSharedChildFallbackName(
              child.childId
            ),
        };
      }
    );
  }
  
  
  /*
   * ============================================================
   * GET ACCESSIBLE CHILD
   * ============================================================
   */
  
  export async function getFamilyOrganizerAccessibleChild(
    currentUserId: string,
    ownerUserId: string,
    childId: string
  ): Promise<FamilyOrganizerAccessibleChild | null> {
    const normalizedUserId =
      currentUserId.trim();
  
    const normalizedOwnerUserId =
      ownerUserId.trim();
  
    const normalizedChildId =
      childId.trim();
  
    if (
      !normalizedUserId ||
      !normalizedOwnerUserId ||
      !normalizedChildId
    ) {
      return null;
    }
  
    const children =
      await getFamilyOrganizerAccessibleChildren(
        normalizedUserId
      );
  
    return (
      children.find(
        (child) =>
          child.ownerUserId ===
            normalizedOwnerUserId &&
          child.childId ===
            normalizedChildId
      ) ?? null
    );
  }
  
  
  /*
   * ============================================================
   * HAS CHILD ACCESS
   * ============================================================
   */
  
  export async function hasFamilyOrganizerAccessibleChild(
    currentUserId: string,
    ownerUserId: string,
    childId: string
  ): Promise<boolean> {
    const child =
      await getFamilyOrganizerAccessibleChild(
        currentUserId,
        ownerUserId,
        childId
      );
  
    return child !== null;
  }