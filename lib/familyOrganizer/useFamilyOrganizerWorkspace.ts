
"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import type { User } from "firebase/auth";

import {
  getCurrentUser,
  watchAuthState,
} from "../auth";

import {
  getFamilyOrganizerWorkspaces,
  type FamilyOrganizerWorkspaceChild,
} from "./familyOrganizerWorkspace";

import {
  buildFamilyOrganizerWorkspaceSelection,
  clearFamilyOrganizerWorkspaceSelection,
  getSavedFamilyOrganizerWorkspaceSelection,
  resolveDefaultFamilyOrganizerWorkspace,
  saveFamilyOrganizerWorkspaceSelection,
} from "./familyOrganizerWorkspaceSelection";

/*
 * ============================================================
 * AUTIVOYA — FAMILY ORGANIZER WORKSPACE HOOK
 * ============================================================
 *
 * Shared client-side workspace state for Family Organizer.
 *
 * Supports:
 * - Firebase authentication
 * - Owned and shared child workspaces
 * - Saved workspace selection
 * - Safe default workspace selection
 * - Selection by canonical owner and child IDs
 * - Membership change refreshes
 * - Automatic selection of newly accepted shared children
 *
 * Shared children remain under the original owner's UID.
 *
 * ============================================================
 */

export interface UseFamilyOrganizerWorkspaceResult {
  currentUser: User | null;

  authReady: boolean;

  loading: boolean;

  error: string;

  workspaces:
    FamilyOrganizerWorkspaceChild[];

  selectedWorkspace:
    FamilyOrganizerWorkspaceChild | null;

  selectWorkspace:
    (
      workspace:
        FamilyOrganizerWorkspaceChild
    ) => void;

  selectWorkspaceByReference:
    (
      ownerUserId: string,
      childId: string
    ) => boolean;

  refreshWorkspaces:
    () => Promise<void>;
}

/*
 * ============================================================
 * MEMBERSHIP CHANGE EVENT
 * ============================================================
 */

interface FamilyOrganizerMembershipChangeDetail {
  ownerUserId?: string;
  childId?: string;
  membershipId?: string;
}

/*
 * ============================================================
 * ERROR MESSAGE
 * ============================================================
 */

function getErrorMessage(
  error: unknown
): string {
  if (
    error instanceof Error &&
    error.message.trim()
  ) {
    return error.message;
  }

  return "We couldn't load your Family Organizer right now.";
}

/*
 * ============================================================
 * HOOK
 * ============================================================
 */

export function useFamilyOrganizerWorkspace():
  UseFamilyOrganizerWorkspaceResult {
  const [
    currentUser,
    setCurrentUser,
  ] = useState<User | null>(
    getCurrentUser()
  );

  const [
    authReady,
    setAuthReady,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    workspaces,
    setWorkspaces,
  ] = useState<
    FamilyOrganizerWorkspaceChild[]
  >([]);

  const [
    selectedWorkspace,
    setSelectedWorkspace,
  ] = useState<
    FamilyOrganizerWorkspaceChild | null
  >(null);

  /*
   * ==========================================================
   * REQUEST TRACKING
   * ==========================================================
   *
   * Prevent older asynchronous workspace requests
   * from overwriting newer results.
   *
   * ==========================================================
   */

  const requestIdRef = useRef(0);

  /*
   * ==========================================================
   * PENDING SHARED WORKSPACE SELECTION
   * ==========================================================
   *
   * When an invitation is accepted, preserve the
   * original owner and child IDs while workspaces
   * are refreshed.
   *
   * ==========================================================
   */

  const pendingSelectionRef = useRef<{
    ownerUserId: string;
    childId: string;
  } | null>(null);

  /*
   * ==========================================================
   * AUTH
   * ==========================================================
   */

  useEffect(() => {
    const unsubscribe =
      watchAuthState(
        (user) => {
          setCurrentUser(
            user
          );

          setAuthReady(
            true
          );
        }
      );

    return unsubscribe;
  }, []);

  /*
   * ==========================================================
   * LOAD WORKSPACES
   * ==========================================================
   */

  const refreshWorkspaces =
    useCallback(
      async () => {
        /*
         * Assign a unique ID to this request.
         */

        const requestId =
          ++requestIdRef.current;

        /*
         * Handle signed-out users.
         */

        if (!currentUser) {
          setWorkspaces(
            []
          );

          setSelectedWorkspace(
            null
          );

          setError(
            ""
          );

          setLoading(
            false
          );

          pendingSelectionRef.current =
            null;

          clearFamilyOrganizerWorkspaceSelection();

          return;
        }

        try {
          setLoading(
            true
          );

          setError(
            ""
          );

          /*
           * Load owned and shared child workspaces.
           */

          const loadedWorkspaces =
            await getFamilyOrganizerWorkspaces(
              currentUser.uid
            );

          /*
           * Ignore stale requests.
           */

          if (
            requestId !==
            requestIdRef.current
          ) {
            return;
          }

          setWorkspaces(
            loadedWorkspaces
          );

          /*
           * Check whether an accepted invitation
           * requested a specific shared child.
           */

          const pendingSelection =
            pendingSelectionRef.current;

          let nextWorkspace:
            FamilyOrganizerWorkspaceChild | null =
              null;

          if (pendingSelection) {
            nextWorkspace =
              loadedWorkspaces.find(
                (workspace) =>
                  workspace.ownerUserId ===
                    pendingSelection.ownerUserId &&
                  workspace.childId ===
                    pendingSelection.childId
              ) ?? null;
          }

          /*
           * Fall back to the saved selection or
           * another accessible workspace.
           */

          if (!nextWorkspace) {
            const savedSelection =
              getSavedFamilyOrganizerWorkspaceSelection();

            nextWorkspace =
              resolveDefaultFamilyOrganizerWorkspace(
                loadedWorkspaces,
                savedSelection
              );
          }

          setSelectedWorkspace(
            nextWorkspace
          );

          /*
           * Persist the selected workspace.
           */

          if (nextWorkspace) {
            saveFamilyOrganizerWorkspaceSelection(
              buildFamilyOrganizerWorkspaceSelection(
                nextWorkspace
              )
            );
          } else {
            clearFamilyOrganizerWorkspaceSelection();
          }

          /*
           * Clear the pending selection only after
           * the requested shared child is found.
           */

          if (
            pendingSelection &&
            nextWorkspace?.ownerUserId ===
              pendingSelection.ownerUserId &&
            nextWorkspace?.childId ===
              pendingSelection.childId
          ) {
            pendingSelectionRef.current =
              null;
          }
        } catch (loadError) {
          /*
           * Ignore errors from stale requests.
           */

          if (
            requestId !==
            requestIdRef.current
          ) {
            return;
          }

          console.error(
            "Unable to load Family Organizer workspaces:",
            loadError
          );

          setWorkspaces(
            []
          );

          setSelectedWorkspace(
            null
          );

          setError(
            getErrorMessage(
              loadError
            )
          );
        } finally {
          /*
           * Only the latest request can update
           * the loading state.
           */

          if (
            requestId ===
            requestIdRef.current
          ) {
            setLoading(
              false
            );
          }
        }
      },
      [currentUser]
    );

  /*
   * ==========================================================
   * LOAD AFTER AUTH
   * ==========================================================
   */

  useEffect(() => {
    if (!authReady) {
      return;
    }

    void refreshWorkspaces();
  }, [
    authReady,
    refreshWorkspaces,
  ]);

  /*
   * ==========================================================
   * MEMBERSHIP CHANGE LISTENER
   * ==========================================================
   *
   * Triggered after a Family Team invitation
   * is successfully accepted.
   *
   * Refresh the available workspaces and select
   * the newly shared child.
   *
   * ==========================================================
   */

  useEffect(() => {
    if (
      !authReady ||
      !currentUser
    ) {
      return;
    }

    function handleMembershipChanged(
      event: Event
    ) {
      const customEvent =
        event as CustomEvent<
          FamilyOrganizerMembershipChangeDetail
        >;

      const detail =
        customEvent.detail;

      /*
       * Preserve the canonical child reference.
       */

      if (
        detail &&
        typeof detail.ownerUserId ===
          "string" &&
        typeof detail.childId ===
          "string"
      ) {
        const ownerUserId =
          detail.ownerUserId.trim();

        const childId =
          detail.childId.trim();

        if (
          ownerUserId &&
          childId
        ) {
          pendingSelectionRef.current = {
            ownerUserId,
            childId,
          };
        }
      }

      /*
       * Reload owned and shared workspaces.
       */

      void refreshWorkspaces();
    }

    window.addEventListener(
      "family-organizer-membership-changed",
      handleMembershipChanged
    );

    return () => {
      window.removeEventListener(
        "family-organizer-membership-changed",
        handleMembershipChanged
      );
    };
  }, [
    authReady,
    currentUser,
    refreshWorkspaces,
  ]);

  /*
   * ==========================================================
   * SELECT WORKSPACE
   * ==========================================================
   */

  const selectWorkspace =
    useCallback(
      (
        workspace:
          FamilyOrganizerWorkspaceChild
      ) => {
        /*
         * Only allow selection of a workspace
         * present in the accessible workspace list.
         */

        const accessibleWorkspace =
          workspaces.find(
            (candidate) =>
              candidate.ownerUserId ===
                workspace.ownerUserId &&
              candidate.childId ===
                workspace.childId
          );

        if (!accessibleWorkspace) {
          return;
        }

        /*
         * Cancel any pending automatic selection
         * when the user explicitly chooses a child.
         */

        pendingSelectionRef.current =
          null;

        setSelectedWorkspace(
          accessibleWorkspace
        );

        saveFamilyOrganizerWorkspaceSelection(
          buildFamilyOrganizerWorkspaceSelection(
            accessibleWorkspace
          )
        );
      },
      [workspaces]
    );

  /*
   * ==========================================================
   * SELECT BY REFERENCE
   * ==========================================================
   */

  const selectWorkspaceByReference =
    useCallback(
      (
        ownerUserId: string,
        childId: string
      ): boolean => {
        const normalizedOwnerUserId =
          ownerUserId.trim();

        const normalizedChildId =
          childId.trim();

        if (
          !normalizedOwnerUserId ||
          !normalizedChildId
        ) {
          return false;
        }

        /*
         * Find the canonical child among accessible
         * workspaces.
         */

        const workspace =
          workspaces.find(
            (candidate) =>
              candidate.ownerUserId ===
                normalizedOwnerUserId &&
              candidate.childId ===
                normalizedChildId
          );

        if (!workspace) {
          return false;
        }

        pendingSelectionRef.current =
          null;

        setSelectedWorkspace(
          workspace
        );

        saveFamilyOrganizerWorkspaceSelection(
          buildFamilyOrganizerWorkspaceSelection(
            workspace
          )
        );

        return true;
      },
      [workspaces]
    );

  /*
   * ==========================================================
   * CLEANUP
   * ==========================================================
   *
   * Invalidate outstanding requests when
   * the component unmounts.
   *
   * ==========================================================
   */

  useEffect(() => {
    return () => {
      requestIdRef.current += 1;
    };
  }, []);

  /*
   * ==========================================================
   * RETURN
   * ==========================================================
   */

  return {
    currentUser,

    authReady,

    loading,

    error,

    workspaces,

    selectedWorkspace,

    selectWorkspace,

    selectWorkspaceByReference,

    refreshWorkspaces,
  };
}
