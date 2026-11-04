import type {
    FamilyOrganizerWorkspaceChild,
  } from "./familyOrganizerWorkspace";
  
  /*
   * ============================================================
   * FAMILY ORGANIZER WORKSPACE SELECTION
   * ============================================================
   *
   * Handles the selected Family Organizer child workspace.
   *
   * IMPORTANT:
   *
   * A child ID alone is not enough because shared children remain
   * stored under the canonical owner's UID.
   *
   * Selection therefore preserves BOTH:
   *
   * - ownerUserId
   * - childId
   *
   * This prevents shared children from being mistaken for children
   * owned by the currently authenticated user.
   * ============================================================
   */
  
  export interface FamilyOrganizerWorkspaceSelection {
    ownerUserId: string;
    childId: string;
  }
  
  /*
   * ============================================================
   * STORAGE KEY
   * ============================================================
   */
  
  const FAMILY_ORGANIZER_WORKSPACE_STORAGE_KEY =
    "myriad_family_organizer_workspace";
  
  /*
   * ============================================================
   * NORMALIZE
   * ============================================================
   */
  
  function normalizeValue(
    value: string | null | undefined
  ): string {
    if (typeof value !== "string") {
      return "";
    }
  
    return value.trim();
  }
  
  /*
   * ============================================================
   * VALID SELECTION
   * ============================================================
   */
  
  export function isValidFamilyOrganizerWorkspaceSelection(
    value: unknown
  ): value is FamilyOrganizerWorkspaceSelection {
    if (
      !value ||
      typeof value !== "object"
    ) {
      return false;
    }
  
    const candidate =
      value as Partial<FamilyOrganizerWorkspaceSelection>;
  
    return Boolean(
      normalizeValue(
        candidate.ownerUserId
      ) &&
        normalizeValue(
          candidate.childId
        )
    );
  }
  
  /*
   * ============================================================
   * BUILD SELECTION
   * ============================================================
   */
  
  export function buildFamilyOrganizerWorkspaceSelection(
    workspace: FamilyOrganizerWorkspaceChild
  ): FamilyOrganizerWorkspaceSelection {
    return {
      ownerUserId:
        workspace.ownerUserId.trim(),
  
      childId:
        workspace.childId.trim(),
    };
  }
  
  /*
   * ============================================================
   * SAVE SELECTION
   * ============================================================
   */
  
  export function saveFamilyOrganizerWorkspaceSelection(
    selection: FamilyOrganizerWorkspaceSelection
  ): void {
    if (
      typeof window ===
      "undefined"
    ) {
      return;
    }
  
    const ownerUserId =
      normalizeValue(
        selection.ownerUserId
      );
  
    const childId =
      normalizeValue(
        selection.childId
      );
  
    if (
      !ownerUserId ||
      !childId
    ) {
      return;
    }
  
    window.localStorage.setItem(
      FAMILY_ORGANIZER_WORKSPACE_STORAGE_KEY,
      JSON.stringify({
        ownerUserId,
        childId,
      })
    );
  }
  
  /*
   * ============================================================
   * GET SAVED SELECTION
   * ============================================================
   */
  
  export function getSavedFamilyOrganizerWorkspaceSelection():
    FamilyOrganizerWorkspaceSelection | null {
    if (
      typeof window ===
      "undefined"
    ) {
      return null;
    }
  
    try {
      const stored =
        window.localStorage.getItem(
          FAMILY_ORGANIZER_WORKSPACE_STORAGE_KEY
        );
  
      if (!stored) {
        return null;
      }
  
      const parsed: unknown =
        JSON.parse(stored);
  
      if (
        !isValidFamilyOrganizerWorkspaceSelection(
          parsed
        )
      ) {
        return null;
      }
  
      return {
        ownerUserId:
          parsed.ownerUserId.trim(),
  
        childId:
          parsed.childId.trim(),
      };
    } catch {
      return null;
    }
  }
  
  /*
   * ============================================================
   * CLEAR SELECTION
   * ============================================================
   */
  
  export function clearFamilyOrganizerWorkspaceSelection(): void {
    if (
      typeof window ===
      "undefined"
    ) {
      return;
    }
  
    window.localStorage.removeItem(
      FAMILY_ORGANIZER_WORKSPACE_STORAGE_KEY
    );
  }
  
  /*
   * ============================================================
   * FIND SAVED WORKSPACE
   * ============================================================
   */
  
  export function findSavedFamilyOrganizerWorkspace(
    workspaces:
      FamilyOrganizerWorkspaceChild[],
    selection:
      FamilyOrganizerWorkspaceSelection | null
  ): FamilyOrganizerWorkspaceChild | null {
    if (!selection) {
      return null;
    }
  
    const ownerUserId =
      normalizeValue(
        selection.ownerUserId
      );
  
    const childId =
      normalizeValue(
        selection.childId
      );
  
    if (
      !ownerUserId ||
      !childId
    ) {
      return null;
    }
  
    return (
      workspaces.find(
        (workspace) =>
          workspace.ownerUserId ===
            ownerUserId &&
          workspace.childId ===
            childId
      ) ?? null
    );
  }
  
  /*
   * ============================================================
   * DEFAULT WORKSPACE
   * ============================================================
   *
   * Selection order:
   *
   * 1. Previously selected accessible workspace
   * 2. First owned child
   * 3. First shared child
   * 4. null
   * ============================================================
   */
  
  export function resolveDefaultFamilyOrganizerWorkspace(
    workspaces:
      FamilyOrganizerWorkspaceChild[],
    savedSelection:
      FamilyOrganizerWorkspaceSelection | null
  ): FamilyOrganizerWorkspaceChild | null {
    const savedWorkspace =
      findSavedFamilyOrganizerWorkspace(
        workspaces,
        savedSelection
      );
  
    if (savedWorkspace) {
      return savedWorkspace;
    }
  
    const ownedWorkspace =
      workspaces.find(
        (workspace) =>
          workspace.role ===
          "owner"
      );
  
    if (ownedWorkspace) {
      return ownedWorkspace;
    }
  
    return workspaces[0] ?? null;
  }
  
  /*
   * ============================================================
   * SELECTION MATCH
   * ============================================================
   */
  
  export function isFamilyOrganizerWorkspaceSelected(
    workspace:
      FamilyOrganizerWorkspaceChild,
    selection:
      FamilyOrganizerWorkspaceSelection | null
  ): boolean {
    if (!selection) {
      return false;
    }
  
    return (
      workspace.ownerUserId ===
        selection.ownerUserId &&
      workspace.childId ===
        selection.childId
    );
  }