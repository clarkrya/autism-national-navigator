
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
  FamilyOrganizerAccessLevel,
  FamilyOrganizerMembershipRole,
} from "./familyOrganizerTypes";

import {
  normalizeFamilyOrganizerAccessLevel,
} from "./familyOrganizerTypes";

/*
 * ============================================================
 * AUTIVOYA — FAMILY ORGANIZER WORKSPACE
 * ============================================================
 *
 * Builds the child workspace list available to the
 * currently authenticated user.
 *
 * Workspaces can represent:
 *
 * 1. Children owned by the signed-in user.
 * 2. Children shared through Family Team.
 *
 * Shared children always reference the canonical child:
 *
 * users/{ownerUserId}/children/{childId}
 *
 * No duplicate child records are created.
 *
 * Family Team access levels:
 *
 * - Viewer
 * - Contributor
 * - Administrator
 *
 * The primary owner retains full ownership.
 *
 * Legacy memberships without accessLevel default
 * to Viewer.
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

  role: FamilyOrganizerMembershipRole;

  accessLevel?: FamilyOrganizerAccessLevel;

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
 * ACCESS HELPERS
 * ============================================================
 */

export function isFamilyOrganizerWorkspaceOwner(
  workspace: FamilyOrganizerWorkspaceChild
): boolean {
  return workspace.role === "owner";
}

export function getFamilyOrganizerWorkspaceAccessLevel(
  workspace: FamilyOrganizerWorkspaceChild
): FamilyOrganizerAccessLevel | "owner" {
  if (isFamilyOrganizerWorkspaceOwner(workspace)) {
    return "owner";
  }

  return normalizeFamilyOrganizerAccessLevel(
    workspace.accessLevel
  );
}

export function canViewFamilyOrganizerWorkspace(
  workspace: FamilyOrganizerWorkspaceChild
): boolean {
  return (
    workspace.role === "owner" ||
    workspace.role === "family_member"
  );
}

export function canContributeToFamilyOrganizerWorkspace(
  workspace: FamilyOrganizerWorkspaceChild
): boolean {
  const accessLevel =
    getFamilyOrganizerWorkspaceAccessLevel(workspace);

  return (
    accessLevel === "owner" ||
    accessLevel === "contributor" ||
    accessLevel === "administrator"
  );
}

export function canAdministerFamilyOrganizerWorkspace(
  workspace: FamilyOrganizerWorkspaceChild
): boolean {
  const accessLevel =
    getFamilyOrganizerWorkspaceAccessLevel(workspace);

  return (
    accessLevel === "owner" ||
    accessLevel === "administrator"
  );
}

/*
 * ============================================================
 * GET FAMILY ORGANIZER WORKSPACES
 * ============================================================
 */

export async function getFamilyOrganizerWorkspaces(
  currentUserId: string
): Promise<FamilyOrganizerWorkspaceChild[]> {
  const normalizedUserId = currentUserId.trim();

  if (!normalizedUserId) {
    return [];
  }

  const workspaces = new Map<
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

  for (const child of ownedChildren) {
    const key = buildWorkspaceKey(
      child.ownerUserId,
      child.childId
    );

    workspaces.set(key, {
      ownerUserId: child.ownerUserId,
      childId: child.childId,
      childName: child.childName,
      role: "owner",
    });
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

  for (const membership of memberships) {
    /*
     * Ignore malformed or inactive membership records.
     */

    if (
      membership.status !== "active" ||
      membership.role !== "family_member" ||
      membership.memberUserId !== normalizedUserId ||
      !membership.ownerUserId?.trim() ||
      !membership.childId?.trim()
    ) {
      continue;
    }

    const ownerUserId =
      membership.ownerUserId.trim();

    const childId =
      membership.childId.trim();

    const key = buildWorkspaceKey(
      ownerUserId,
      childId
    );

    /*
     * Owner access always takes precedence.
     */

    if (workspaces.get(key)?.role === "owner") {
      continue;
    }

    /*
     * Retrieve the canonical shared child.
     */

    const sharedChild =
      await getFamilyOrganizerSharedChild(
        normalizedUserId,
        ownerUserId,
        childId
      );

    if (!sharedChild) {
      continue;
    }

    /*
     * Determine effective permissions.
     *
     * Existing memberships without accessLevel
     * receive Viewer permissions.
     */

    const accessLevel =
      normalizeFamilyOrganizerAccessLevel(
        membership.accessLevel
      );

    workspaces.set(key, {
      ownerUserId,
      childId,
      childName: sharedChild.childName,
      role: "family_member",
      accessLevel,
      membershipId: membership.id,
      invitationId: membership.invitationId,
    });
  }

  return Array.from(workspaces.values());
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
): Promise<FamilyOrganizerWorkspaceChild | null> {
  const normalizedUserId = currentUserId.trim();

  const normalizedOwnerUserId =
    ownerUserId.trim();

  const normalizedChildId = childId.trim();

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
  workspace: FamilyOrganizerWorkspaceChild
): string {
  if (workspace.role === "owner") {
    return workspace.childName;
  }

  return `${workspace.childName} · Shared`;
}
