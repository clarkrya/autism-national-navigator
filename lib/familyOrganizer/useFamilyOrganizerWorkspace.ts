"use client";

import {
  useCallback,
  useEffect,
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
 * FAMILY ORGANIZER WORKSPACE HOOK
 * ============================================================
 *
 * Shared client-side workspace state for Family Organizer.
 *
 * This hook:
 *
 * - waits for Firebase authentication
 * - loads owned + shared child workspaces
 * - restores the last accessible workspace
 * - selects a safe default when needed
 * - persists workspace selection
 *
 * Shared children remain canonical under the owner's UID.
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
        if (!currentUser) {
          setWorkspaces(
            []
          );

          setSelectedWorkspace(
            null
          );

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

          const loadedWorkspaces =
            await getFamilyOrganizerWorkspaces(
              currentUser.uid
            );

          setWorkspaces(
            loadedWorkspaces
          );

          const savedSelection =
            getSavedFamilyOrganizerWorkspaceSelection();

          const nextWorkspace =
            resolveDefaultFamilyOrganizerWorkspace(
              loadedWorkspaces,
              savedSelection
            );

          setSelectedWorkspace(
            nextWorkspace
          );

          if (nextWorkspace) {
            saveFamilyOrganizerWorkspaceSelection(
              buildFamilyOrganizerWorkspaceSelection(
                nextWorkspace
              )
            );
          } else {
            clearFamilyOrganizerWorkspaceSelection();
          }
        } catch (loadError) {
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
          setLoading(
            false
          );
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
   * SELECT WORKSPACE
   * ==========================================================
   */

  const selectWorkspace =
    useCallback(
      (
        workspace:
          FamilyOrganizerWorkspaceChild
      ) => {
        const accessible =
          workspaces.some(
            (candidate) =>
              candidate.ownerUserId ===
                workspace.ownerUserId &&
              candidate.childId ===
                workspace.childId
          );

        if (!accessible) {
          return;
        }

        setSelectedWorkspace(
          workspace
        );

        saveFamilyOrganizerWorkspaceSelection(
          buildFamilyOrganizerWorkspaceSelection(
            workspace
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