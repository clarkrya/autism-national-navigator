import {
    getFamilyOrganizerOwnerChildren,
  } from "./familyOrganizerChildren";
  
  import {
    getActiveFamilyOrganizerMembershipsForUser,
  } from "./familyOrganizerRepository";
  
  import {
    getFamilyOrganizerSharedChild,
  } from "./familyOrganizerSharedChildRepository";
  
  import type {
    FamilyOrganizerMembershipRole,
  } from "./familyOrganizerTypes";
  
  /*
   * ============================================================
   * FAMILY ORGANIZER WORKSPACE
   * ============================================================
   *
   * Builds the child workspace list available to the currently
   * authenticated Myriad user.
   *
   * A workspace may represent:
   *
   * - a child owned by the current user
   * - a child shared with the current user through Family Team
   *
   * Shared children always point back to the canonical child
   * stored under the original owner's UID.
   * ============================================================
   */
  
  
  /*
   * ============================================================
   * WORKSPACE CHILD
   * ============================================================
   */
  
  export interface FamilyOrganizerWorkspaceChild {
    ownerUserId: string;
  
    childId: string;
  
    childName: string;
  
    role:
      FamilyOrganizerMembershipRole;
  
    membershipId?: string;
  
    invitationId?: string;
  }
  
  
  /*
   * ============================================================
   * WORKSPACE KEY
   * ============================================================
   */
  
  function buildWorkspaceKey(
    ownerUserId: string,
    childId: string
  ): string {
    return [
      ownerUserId.trim(),
      childId.trim(),
    ].join("::");
  }
  
  
  /*
   * ============================================================
   * GET FAMILY ORGANIZER WORKSPACES
   * ============================================================
   */
  
  export async function getFamilyOrganizerWorkspaces(
    currentUserId: string
  ): Promise<
    FamilyOrganizerWorkspaceChild[]
  > {
    const normalizedUserId =
      currentUserId.trim();
  
    if (!normalizedUserId) {
      return [];
    }
  
    const workspaces =
      new Map<
        string,
        FamilyOrganizerWorkspaceChild
      >();
  
    /*
     * ----------------------------------------------------------
     * OWNED CHILDREN
     * ----------------------------------------------------------
     */
  
    const ownedChildren =
      await getFamilyOrganizerOwnerChildren(
        normalizedUserId
      );
  
    for (
      const child
      of ownedChildren
    ) {
      const key =
        buildWorkspaceKey(
          child.ownerUserId,
          child.childId
        );
  
      workspaces.set(
        key,
        {
          ownerUserId:
            child.ownerUserId,
  
          childId:
            child.childId,
  
          childName:
            child.childName,
  
          role:
            "owner",
        }
      );
    }
  
    /*
     * ----------------------------------------------------------
     * SHARED CHILDREN
     * ----------------------------------------------------------
     */
  
    const memberships =
      await getActiveFamilyOrganizerMembershipsForUser(
        normalizedUserId
      );
  
    for (
      const membership
      of memberships
    ) {
      /*
       * Ignore malformed or inactive records defensively.
       */
  
      if (
        membership.status !==
          "active" ||
        !membership.ownerUserId?.trim() ||
        !membership.childId?.trim()
      ) {
        continue;
      }
  
      const ownerUserId =
        membership.ownerUserId.trim();
  
      const childId =
        membership.childId.trim();
  
      const key =
        buildWorkspaceKey(
          ownerUserId,
          childId
        );
  
      /*
       * Owner access takes precedence if the same child somehow
       * appears in both sets.
       */
  
      if (
        workspaces.get(key)?.role ===
        "owner"
      ) {
        continue;
      }
  
      const sharedChild =
        await getFamilyOrganizerSharedChild(
          normalizedUserId,
          ownerUserId,
          childId
        );
  
      if (!sharedChild) {
        continue;
      }
  
      workspaces.set(
        key,
        {
          ownerUserId,
  
          childId,
  
          childName:
            sharedChild.childName,
  
          role:
            "family_member",
  
          membershipId:
            membership.id,
  
          invitationId:
            membership.invitationId,
        }
      );
    }
  
    return Array.from(
      workspaces.values()
    );
  }
  
  
  /*
   * ============================================================
   * GET ONE WORKSPACE
   * ============================================================
   */
  
  export async function getFamilyOrganizerWorkspace(
    currentUserId: string,
    ownerUserId: string,
    childId: string
  ): Promise<
    FamilyOrganizerWorkspaceChild | null
  > {
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
  
    const workspaces =
      await getFamilyOrganizerWorkspaces(
        normalizedUserId
      );
  
    return (
      workspaces.find(
        (workspace) =>
          workspace.ownerUserId ===
            normalizedOwnerUserId &&
          workspace.childId ===
            normalizedChildId
      ) ?? null
    );
  }
  
  
  /*
   * ============================================================
   * WORKSPACE LABEL
   * ============================================================
   */
  
  export function getFamilyOrganizerWorkspaceLabel(
    workspace:
      FamilyOrganizerWorkspaceChild
  ): string {
    if (
      workspace.role ===
      "owner"
    ) {
      return workspace.childName;
    }
  
    return `${workspace.childName} · Shared`;
  }