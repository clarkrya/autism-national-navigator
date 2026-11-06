
"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import type { FamilyProfile } from "../../types/familyProfile";
import type { PersonalizedJourney } from "../../lib/ai/journeyTypes";

import { auth } from "../../lib/firebase";
import { watchAuthState } from "../../lib/auth";

import {
  archiveCurrentJourney,
  deleteChildJourneyData,
  getCurrentJourney,
  getLegacyCurrentJourney,
  getSavedChildren,
  saveCurrentJourney,
  type SavedChild,
} from "../../lib/journeyRepository";

import {
  getLegacyJourneyHistory,
  saveJourneyStage,
} from "../../lib/journeyHistory";

import {
  getFamilyOrganizerWorkspaces,
} from "../../lib/familyOrganizer/familyOrganizerWorkspace";

import Welcome from "./Welcome";
import GeneratingJourney from "./GeneratingJourney";
import JourneyDashboard from "./JourneyDashboard";
import JourneyHistory from "./JourneyHistory";
import PastJourneys from "./PastJourneys";

import JourneyQuestionnaire from "../journey-builder/JourneyQuestionnaire";
import AddingChildBanner from "../journey-builder/AddingChildBanner";
import ChildJourneyControls from "../journey-builder/ChildJourneyControls";
import StartNewJourneyModal from "../journey-builder/StartNewJourneyModal";
import RemoveChildModal from "../journey-builder/RemoveChildModal";

type AccessLevel =
  | "owner"
  | "viewer"
  | "contributor"
  | "administrator";

type ChildWorkspace = {
  ownerUserId: string;
  childId: string;
  childName: string;
  role: "owner" | "family_member";
  accessLevel: AccessLevel;
  familyProfile: FamilyProfile;
  savedChild?: SavedChild;
};

type PreviousChildSnapshot = {
  ownerUserId: string;
  childId: string;
  familyProfile: FamilyProfile;
  journey: PersonalizedJourney | null;
  journeyId?: string;
  savedJourneyLoaded: boolean;
};

type JourneyRecord = NonNullable<
  Awaited<ReturnType<typeof getCurrentJourney>>
>;

function createChildId(): string {
  if (
    typeof window !== "undefined" &&
    window.crypto?.randomUUID
  ) {
    return window.crypto.randomUUID();
  }

  return `child-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function createBlankProfile(
  childId = ""
): FamilyProfile {
  return {
    childId,
    childName: "",
    childAge: "",
    state: "",
    journeyStage: "",
    supports: [],
    priority: "",
    insurance: "",
    notes: "",
  };
}

function normalizeProfile(
  value: unknown,
  childId: string,
  childName = ""
): FamilyProfile {
  const source =
    value &&
    typeof value === "object"
      ? (value as Partial<FamilyProfile>)
      : {};

  return {
    ...createBlankProfile(childId),
    ...source,
    childId,
    childName:
      source.childName || childName || "",
    supports: Array.isArray(source.supports)
      ? source.supports
      : [],
  };
}

function workspaceKey(
  ownerUserId: string,
  childId: string
): string {
  return `${ownerUserId}__${childId}`;
}

function normalizeAccessLevel(
  value: unknown
): AccessLevel {
  if (
    value === "contributor" ||
    value === "administrator"
  ) {
    return value;
  }

  return "viewer";
}

function makeSavedChild(
  workspace: ChildWorkspace
): SavedChild {
  return {
    childId: workspace.childId,
    familyProfile: workspace.familyProfile,
  } as SavedChild;
}

function toWorkspace(
  source: Record<string, unknown>,
  currentUserId: string
): ChildWorkspace | null {
  const childId =
    typeof source.childId === "string"
      ? source.childId.trim()
      : "";

  const ownerUserId =
    typeof source.ownerUserId === "string"
      ? source.ownerUserId.trim()
      : currentUserId;

  if (!childId || !ownerUserId) {
    return null;
  }

  const isOwner =
    ownerUserId === currentUserId;

  const childName =
    typeof source.childName === "string"
      ? source.childName
      : "";

  const profile = normalizeProfile(
    source.familyProfile,
    childId,
    childName
  );

  return {
    ownerUserId,
    childId,
    childName:
      profile.childName || childName,
    role: isOwner
      ? "owner"
      : "family_member",
    accessLevel: isOwner
      ? "owner"
      : normalizeAccessLevel(
          source.accessLevel
        ),
    familyProfile: profile,
  };
}

const actionButton: React.CSSProperties = {
  padding: "11px 18px",
  borderRadius: 9,
  border: "1px solid #CBD5E1",
  background: "#FFFFFF",
  color: "#475569",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};

const noticeStyle: React.CSSProperties = {
  maxWidth: 900,
  margin: "18px auto",
  padding: "14px 18px",
  border: "1px solid #FCA5A5",
  background: "#FEF2F2",
  borderRadius: 10,
  color: "#991B1B",
  fontSize: 14,
  lineHeight: 1.6,
};

export default function JourneyBuilder() {
  const totalQuestions = 7;

  const [step, setStep] = useState(0);
  const [isGenerating, setIsGenerating] =
    useState(false);
  const [error, setError] =
    useState<string | null>(null);

  const [
    showStartNewJourneyConfirm,
    setShowStartNewJourneyConfirm,
  ] = useState(false);

  const [
    startingNewJourney,
    setStartingNewJourney,
  ] = useState(false);

  const [
    journeyActionError,
    setJourneyActionError,
  ] = useState<string | null>(null);

  const [
    showRemoveChildConfirm,
    setShowRemoveChildConfirm,
  ] = useState(false);

  const [removingChild, setRemovingChild] =
    useState(false);

  const [
    removeChildError,
    setRemoveChildError,
  ] = useState<string | null>(null);

  const [
    addingChildDraft,
    setAddingChildDraft,
  ] = useState(false);

  const [
    previousChildSnapshot,
    setPreviousChildSnapshot,
  ] = useState<PreviousChildSnapshot | null>(
    null
  );

  const [
    personalizedJourney,
    setPersonalizedJourney,
  ] = useState<PersonalizedJourney | null>(
    null
  );

  const [familyProfile, setFamilyProfile] =
    useState<FamilyProfile>(
      createBlankProfile()
    );

  const [
    checkingSavedJourney,
    setCheckingSavedJourney,
  ] = useState(true);

  const [
    savedJourneyLoaded,
    setSavedJourneyLoaded,
  ] = useState(false);

  const [savedChildren, setSavedChildren] =
    useState<SavedChild[]>([]);

  const [
    childWorkspaces,
    setChildWorkspaces,
  ] = useState<ChildWorkspace[]>([]);

  const [
    selectedChildId,
    setSelectedChildId,
  ] = useState("");

  const [
    selectedOwnerUserId,
    setSelectedOwnerUserId,
  ] = useState("");

  const [
    currentJourneyId,
    setCurrentJourneyId,
  ] = useState<string | undefined>(
    undefined
  );

  const [
    journeyHistoryRefreshKey,
    setJourneyHistoryRefreshKey,
  ] = useState(0);

  const [signedInUserId, setSignedInUserId] =
    useState("");

  const requestIdRef = useRef(0);

  const selectedWorkspaceRef =
    useRef<string>("");

  const selectedWorkspace =
    childWorkspaces.find(
      (workspace) =>
        workspace.childId === selectedChildId &&
        workspace.ownerUserId ===
          selectedOwnerUserId
    );

  const isSharedJourney =
    Boolean(
      selectedWorkspace &&
      selectedWorkspace.ownerUserId !==
        signedInUserId
    );

  const currentAccessLevel: AccessLevel =
    selectedWorkspace?.accessLevel ||
    "owner";

  const isOwner =
    !isSharedJourney;

  const canEditJourney =
    !isSharedJourney ||
    currentAccessLevel === "contributor" ||
    currentAccessLevel === "administrator";

  const canManageChild =
    isOwner;

  const canonicalOwnerUserId =
    selectedWorkspace?.ownerUserId ||
    selectedOwnerUserId ||
    signedInUserId;

  const workspaceKeyValue =
    selectedWorkspace
      ? workspaceKey(
          selectedWorkspace.ownerUserId,
          selectedWorkspace.childId
        )
      : "";

  useEffect(() => {
    selectedWorkspaceRef.current =
      workspaceKeyValue;
  }, [workspaceKeyValue]);

  const selectWorkspace = useCallback(
    async (
      workspace: ChildWorkspace,
      requestId?: number
    ) => {
      const currentRequest =
        requestId ?? ++requestIdRef.current;

      setCheckingSavedJourney(true);
      setError(null);
      setJourneyActionError(null);
      setRemoveChildError(null);
      setShowStartNewJourneyConfirm(false);
      setShowRemoveChildConfirm(false);

      try {
        const savedJourney =
          await getCurrentJourney(
            workspace.ownerUserId,
            workspace.childId
          );

        if (
          currentRequest !== requestIdRef.current
        ) {
          return;
        }

        const profile = savedJourney
          ? normalizeProfile(
              savedJourney.familyProfile,
              workspace.childId,
              workspace.childName
            )
          : workspace.familyProfile;

        setSelectedChildId(
          workspace.childId
        );

        setSelectedOwnerUserId(
          workspace.ownerUserId
        );

        selectedWorkspaceRef.current =
          workspaceKey(
            workspace.ownerUserId,
            workspace.childId
          );

        setFamilyProfile(profile);

        setPersonalizedJourney(
          savedJourney?.journey || null
        );

        setCurrentJourneyId(
          savedJourney?.journeyId
        );

        setSavedJourneyLoaded(
          Boolean(savedJourney)
        );

        setAddingChildDraft(false);
        setPreviousChildSnapshot(null);
        setStep(0);

        setJourneyHistoryRefreshKey(
          (value) => value + 1
        );
      } catch (loadError) {
        if (
          currentRequest !== requestIdRef.current
        ) {
          return;
        }

        console.error(
          "Unable to load child journey:",
          loadError
        );

        setJourneyActionError(
          loadError instanceof Error
            ? loadError.message
            : "We couldn't load this child's Journey."
        );
      } finally {
        if (
          currentRequest === requestIdRef.current
        ) {
          setCheckingSavedJourney(false);
        }
      }
    },
    []
  );

  const loadWorkspaces = useCallback(
    async (
      userId: string,
      preferredKey?: string
    ) => {
      const requestId =
        ++requestIdRef.current;

      setCheckingSavedJourney(true);

      try {
        const ownChildren =
          await getSavedChildren(userId);

        const ownedWorkspaces: ChildWorkspace[] =
          ownChildren.map((child) => ({
            ownerUserId: userId,
            childId: child.childId,
            childName:
              child.familyProfile?.childName ||
              "",
            role: "owner",
            accessLevel: "owner",
            familyProfile: normalizeProfile(
              child.familyProfile,
              child.childId
            ),
            savedChild: child,
          }));

        let sharedWorkspaces:
          ChildWorkspace[] = [];

        try {
          const organizerWorkspaces =
            await getFamilyOrganizerWorkspaces(
              userId
            );

          const workspaceRecords =
            Array.isArray(organizerWorkspaces)
              ? organizerWorkspaces
              : [];

          sharedWorkspaces =
            workspaceRecords
              .map((entry) =>
                toWorkspace(
                  entry as unknown as Record<
                    string,
                    unknown
                  >,
                  userId
                )
              )
              .filter(
                (
                  entry
                ): entry is ChildWorkspace =>
                  entry !== null &&
                  entry.ownerUserId !== userId
              );
        } catch (workspaceError) {
          console.error(
            "Unable to load Family Team workspaces:",
            workspaceError
          );
        }

        const unique = new Map<
          string,
          ChildWorkspace
        >();

        for (const workspace of [
          ...ownedWorkspaces,
          ...sharedWorkspaces,
        ]) {
          unique.set(
            workspaceKey(
              workspace.ownerUserId,
              workspace.childId
            ),
            workspace
          );
        }

        const workspaces = [
          ...Array.from(unique.values()),        ];

        if (
          requestId !== requestIdRef.current
        ) {
          return;
        }

        setChildWorkspaces(workspaces);

        setSavedChildren(
          workspaces.map((workspace) =>
            workspace.savedChild ||
            makeSavedChild(workspace)
          )
        );

        const keyToSelect =
          preferredKey ||
          selectedWorkspaceRef.current;

        let chosen =
          workspaces.find(
            (workspace) =>
              workspaceKey(
                workspace.ownerUserId,
                workspace.childId
              ) === keyToSelect
          );

        if (!chosen) {
          for (const workspace of workspaces) {
            const savedJourney =
              await getCurrentJourney(
                workspace.ownerUserId,
                workspace.childId
              );

            if (
              requestId !==
              requestIdRef.current
            ) {
              return;
            }

            if (savedJourney) {
              chosen = workspace;
              break;
            }
          }
        }

        if (!chosen) {
          chosen = workspaces[0];
        }

        if (chosen) {
          await selectWorkspace(
            chosen,
            requestId
          );
          return;
        }

        /*
         * Legacy migration is restricted to
         * the signed-in account owner.
         */
        const legacyJourney =
          await getLegacyCurrentJourney(
            userId
          );

        if (
          requestId !== requestIdRef.current
        ) {
          return;
        }

        if (legacyJourney) {
          const childId =
            legacyJourney.familyProfile
              .childId || createChildId();

          const migratedProfile =
            normalizeProfile(
              legacyJourney.familyProfile,
              childId
            );

          const migratedJourney =
            await saveCurrentJourney(
              userId,
              migratedProfile,
              legacyJourney.journey,
              {
                stageNumber:
                  legacyJourney.stageNumber,
                previousCompletedTaskIds:
                  legacyJourney
                    .previousCompletedTaskIds,
                journeyReason:
                  legacyJourney.journeyReason,
              }
            );

          const legacyHistory =
            await getLegacyJourneyHistory(
              userId
            );

          for (const stage of legacyHistory) {
            await saveJourneyStage(
              userId,
              stage.stageNumber,
              normalizeProfile(
                stage.familyProfile,
                childId
              ),
              stage.journey,
              stage.completedTaskIds,
              {
                journeyId:
                  migratedJourney.journeyId,
                createdAt: stage.createdAt,
                completedAt:
                  stage.completedAt,
                reason: stage.reason,
              }
            );
          }

          if (
            requestId !== requestIdRef.current
          ) {
            return;
          }

          const migratedWorkspace:
            ChildWorkspace = {
            ownerUserId: userId,
            childId,
            childName:
              migratedProfile.childName,
            role: "owner",
            accessLevel: "owner",
            familyProfile:
              migratedProfile,
          };

          setChildWorkspaces([
            migratedWorkspace,
          ]);

          setSavedChildren([
            makeSavedChild(
              migratedWorkspace
            ),
          ]);

          setSelectedChildId(childId);
          setSelectedOwnerUserId(userId);

          selectedWorkspaceRef.current =
            workspaceKey(
              userId,
              childId
            );

          setFamilyProfile(
            migratedProfile
          );

          setPersonalizedJourney(
            legacyJourney.journey
          );

          setCurrentJourneyId(
            migratedJourney.journeyId
          );

          setSavedJourneyLoaded(true);
          setAddingChildDraft(false);
          setPreviousChildSnapshot(null);
          setStep(0);
          return;
        }

        setSelectedChildId("");
        setSelectedOwnerUserId(userId);
        setCurrentJourneyId(undefined);
        setPersonalizedJourney(null);
        setFamilyProfile(
          createBlankProfile()
        );
        setSavedJourneyLoaded(false);
        setAddingChildDraft(false);
        setPreviousChildSnapshot(null);
        setStep(0);
      } catch (loadError) {
        if (
          requestId !== requestIdRef.current
        ) {
          return;
        }

        console.error(
          "Unable to load saved Journeys:",
          loadError
        );

        setJourneyActionError(
          "We couldn't load your saved Journeys. Please try again."
        );
      } finally {
        if (
          requestId === requestIdRef.current
        ) {
          setCheckingSavedJourney(false);
        }
      }
    },
    [selectWorkspace]
  );

  useEffect(() => {
    let active = true;

    const unsubscribe = watchAuthState(
      async (user) => {
        if (!active) return;

        if (!user) {
          ++requestIdRef.current;

          setSignedInUserId("");
          setSavedChildren([]);
          setChildWorkspaces([]);
          setSelectedChildId("");
          setSelectedOwnerUserId("");
          setCurrentJourneyId(undefined);
          setSavedJourneyLoaded(false);
          setPersonalizedJourney(null);
          setFamilyProfile(
            createBlankProfile()
          );
          setAddingChildDraft(false);
          setPreviousChildSnapshot(null);
          setCheckingSavedJourney(false);
          return;
        }

        setSignedInUserId(user.uid);

        await loadWorkspaces(user.uid);
      }
    );

    return () => {
      active = false;
      ++requestIdRef.current;
      unsubscribe();
    };
  }, [loadWorkspaces]);

  useEffect(() => {
    function handleMembershipChanged() {
      const user = auth.currentUser;

      if (user) {
        void loadWorkspaces(user.uid);
      }
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
  }, [loadWorkspaces]);

  useEffect(() => {
    if (step > 0) {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  }, [step]);

  useEffect(() => {
    if (personalizedJourney) {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  }, [personalizedJourney]);

  function updateProfile<
    K extends keyof FamilyProfile
  >(
    field: K,
    value: FamilyProfile[K]
  ) {
    if (!canEditJourney) return;

    setFamilyProfile((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function beginQuestionnaire() {
    if (!canEditJourney) {
      setJourneyActionError(
        "You have read-only access to this Journey."
      );
      return;
    }

    if (
      isSharedJourney &&
      !personalizedJourney
    ) {
      setJourneyActionError(
        "Only the Journey owner can create the initial Journey."
      );
      return;
    }

    if (!familyProfile.childId) {
      const childId = createChildId();

      setFamilyProfile((current) => ({
        ...current,
        childId,
      }));

      setSelectedChildId(childId);
      setSelectedOwnerUserId(
        auth.currentUser?.uid || ""
      );
    }

    setStep(1);
  }

  async function loadSavedChild(
    childId: string
  ) {
    const matches =
      childWorkspaces.filter(
        (workspace) =>
          workspace.childId === childId
      );

    const chosen =
      matches.find(
        (workspace) =>
          workspace.ownerUserId ===
          selectedOwnerUserId
      ) || matches[0];

    if (!chosen) {
      setJourneyActionError(
        "We couldn't find this child's saved profile."
      );
      return;
    }

    await selectWorkspace(chosen);
  }

  async function generatePersonalizedJourney() {
    if (
      !canEditJourney ||
      isSharedJourney
    ) {
      setError(
        "Only the Journey owner can generate a new Journey."
      );
      return;
    }

    const profileForGeneration =
      familyProfile.childId
        ? familyProfile
        : {
            ...familyProfile,
            childId: createChildId(),
          };

    if (!familyProfile.childId) {
      setFamilyProfile(
        profileForGeneration
      );

      setSelectedChildId(
        profileForGeneration.childId || ""
      );
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch(
        "/api/journey/generate",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            familyProfile:
              profileForGeneration,
          }),
        }
      );

      const responseText =
        await response.text();

      let data: {
        journey?: PersonalizedJourney;
        error?: string;
      } | null = null;

      if (responseText) {
        try {
          data = JSON.parse(
            responseText
          );
        } catch (parseError) {
          console.error(
            "Journey API returned invalid JSON:",
            parseError
          );

          throw new Error(
            response.ok
              ? "The Journey service returned an invalid response."
              : `The Journey service encountered a server error (${response.status}).`
          );
        }
      }

      if (!response.ok) {
        throw new Error(
          data?.error ||
            `Unable to generate your Journey (${response.status}).`
        );
      }

      if (!data?.journey) {
        throw new Error(
          "The AI did not return a personalized Journey."
        );
      }

      setPersonalizedJourney(
        data.journey
      );

      setSavedJourneyLoaded(false);
      setCurrentJourneyId(undefined);
    } catch (generationError) {
      console.error(
        "AI Journey generation failed:",
        generationError
      );

      setError(
        generationError instanceof Error
          ? generationError.message
          : "We couldn't create your Journey. Please try again."
      );
    } finally {
      setIsGenerating(false);
    }
  }

  function addAnotherChild() {
    const user = auth.currentUser;

    if (!user) {
      setJourneyActionError("Please sign in to add your own child.");
      return;
    }

    // Adding a personal child is an account-level action, not a
    // permission on whichever shared child is currently selected.
    if (!addingChildDraft && selectedChildId) {
      setPreviousChildSnapshot({
        ownerUserId: canonicalOwnerUserId,
        childId: selectedChildId,
        familyProfile,
        journey: personalizedJourney,
        journeyId: currentJourneyId,
        savedJourneyLoaded,
      });
    } else {
      setPreviousChildSnapshot(null);
    }

    const newChildId = createChildId();

    // Invalidate pending workspace loads so they cannot overwrite
    // the new personal-child draft.
    ++requestIdRef.current;
    selectedWorkspaceRef.current = "";

    setAddingChildDraft(true);
    setShowStartNewJourneyConfirm(false);
    setShowRemoveChildConfirm(false);
    setJourneyActionError(null);
    setRemoveChildError(null);
    setPersonalizedJourney(null);
    setCurrentJourneyId(undefined);
    setFamilyProfile(createBlankProfile(newChildId));
    setSelectedChildId(newChildId);
    setSelectedOwnerUserId(user.uid);
    setStep(0);
    setError(null);
    setSavedJourneyLoaded(false);
    setCheckingSavedJourney(false);

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelAddingChild() {
    const previous = previousChildSnapshot;
    if (!previous) return;

    setAddingChildDraft(false);
    setPreviousChildSnapshot(null);
    setStep(0);
    setError(null);
    setJourneyActionError(null);
    setRemoveChildError(null);

    // Restore the actual previous workspace, including its owner.
    // A shared child must never be treated as belonging to this user.
    const previousWorkspace = childWorkspaces.find(
      (workspace) =>
        workspace.ownerUserId === previous.ownerUserId &&
        workspace.childId === previous.childId
    );

    if (previousWorkspace) {
      void selectWorkspace(previousWorkspace);
      return;
    }

    // If the workspace list changed, reload before selecting it.
    const user = auth.currentUser;
    if (user) {
      void loadWorkspaces(
        user.uid,
        workspaceKey(previous.ownerUserId, previous.childId)
      );
    }
  }

  async function handleJourneySaved(
    childId: string
  ) {
    const user = auth.currentUser;

    if (!user) return;

    const targetOwnerUserId =
      canonicalOwnerUserId || user.uid;

    try {
      const savedJourney =
        await getCurrentJourney(
          targetOwnerUserId,
          childId
        );

      if (savedJourney) {
        setCurrentJourneyId(
          savedJourney.journeyId
        );

        setFamilyProfile(
          normalizeProfile(
            savedJourney.familyProfile,
            childId
          )
        );

        setPersonalizedJourney(
          savedJourney.journey
        );
      }

      setSelectedChildId(childId);
      setSelectedOwnerUserId(
        targetOwnerUserId
      );

      setSavedJourneyLoaded(true);
      setAddingChildDraft(false);
      setPreviousChildSnapshot(null);
      setJourneyActionError(null);
      setRemoveChildError(null);

      setJourneyHistoryRefreshKey(
        (value) => value + 1
      );

      await loadWorkspaces(
        user.uid,
        workspaceKey(
          targetOwnerUserId,
          childId
        )
      );
    } catch (refreshError) {
      console.error(
        "Journey saved, but refresh failed:",
        refreshError
      );
    }
  }

  async function confirmRemoveChild() {
    if (removingChild) return;

    if (!canManageChild) {
      setRemoveChildError(
        "Only the child owner can remove this child."
      );
      return;
    }

    const user = auth.currentUser;

    const childId =
      familyProfile.childId ||
      selectedChildId;

    if (!user || !childId) {
      setRemoveChildError(
        "We couldn't determine which child to remove."
      );
      return;
    }

    if (
      selectedWorkspace &&
      selectedWorkspace.ownerUserId !==
        user.uid
    ) {
      setRemoveChildError(
        "You cannot remove another family's child."
      );
      return;
    }

    setRemovingChild(true);
    setRemoveChildError(null);
    setJourneyActionError(null);

    try {
      await deleteChildJourneyData(
        user.uid,
        childId
      );

      setShowRemoveChildConfirm(false);

      selectedWorkspaceRef.current = "";

      await loadWorkspaces(
        user.uid,
        ""
      );

      setJourneyHistoryRefreshKey(
        (value) => value + 1
      );
    } catch (removalError) {
      console.error(
        "Unable to remove child:",
        removalError
      );

      setRemoveChildError(
        removalError instanceof Error
          ? removalError.message
          : "We couldn't remove this child."
      );
    } finally {
      setRemovingChild(false);
    }
  }

  async function confirmStartNewJourney() {
    if (startingNewJourney) return;

    if (!canManageChild) {
      setJourneyActionError(
        "Only the Journey owner can start a new Journey."
      );
      return;
    }

    const childId =
      familyProfile.childId ||
      selectedChildId;

    const user = auth.currentUser;

    if (!user || !childId) {
      setJourneyActionError(
        "Please sign in and select a child."
      );
      return;
    }

    if (
      selectedWorkspace &&
      selectedWorkspace.ownerUserId !==
        user.uid
    ) {
      setJourneyActionError(
        "You cannot archive another family's Journey."
      );
      return;
    }

    setStartingNewJourney(true);
    setJourneyActionError(null);

    try {
      await archiveCurrentJourney(
        user.uid,
        childId
      );

      setFamilyProfile({
        childId,
        childName:
          familyProfile.childName,
        childAge:
          familyProfile.childAge,
        state: familyProfile.state,
        journeyStage: "",
        supports: [],
        priority: "",
        insurance:
          familyProfile.insurance,
        notes: "",
      });

      setSelectedChildId(childId);
      setSelectedOwnerUserId(user.uid);
      setPersonalizedJourney(null);
      setCurrentJourneyId(undefined);
      setSavedJourneyLoaded(false);
      setAddingChildDraft(false);
      setPreviousChildSnapshot(null);
      setStep(0);
      setError(null);
      setShowStartNewJourneyConfirm(false);

      setJourneyHistoryRefreshKey(
        (value) => value + 1
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (startError) {
      console.error(
        "Unable to start new Journey:",
        startError
      );

      setJourneyActionError(
        startError instanceof Error
          ? startError.message
          : "We couldn't archive the current Journey."
      );
    } finally {
      setStartingNewJourney(false);
    }
  }

  function nextStep() {
    if (!canEditJourney) return;

    if (step < totalQuestions) {
      setStep(
        (current) => current + 1
      );
      return;
    }

    void generatePersonalizedJourney();
  }

  function previousStep() {
    if (step > 1) {
      setStep(
        (current) => current - 1
      );
    }
  }

  function canContinue(): boolean {
    switch (step) {
      case 1:
        return (
          familyProfile.childName.trim() !==
          ""
        );
      case 2:
        return (
          familyProfile.childAge !== ""
        );
      case 3:
        return (
          familyProfile.state !== ""
        );
      case 4:
        return (
          familyProfile.journeyStage !== ""
        );
      case 5:
        return (
          familyProfile.supports.length >
          0
        );
      case 6:
        return (
          familyProfile.priority !== ""
        );
      case 7:
        return (
          familyProfile.insurance !== ""
        );
      default:
        return true;
    }
  }

  function renderWorkspaceSelector() {
    if (
      childWorkspaces.length === 0 ||
      addingChildDraft
    ) {
      return null;
    }

    return (
      <div
        style={{
          maxWidth: 1050,
          margin: "24px auto 0",
          padding: "0 24px",
        }}
      >
        <div
          style={{
            padding: 20,
            borderRadius: 16,
            background: "#F8FAFC",
            border:
              "1px solid #E2E8F0",
          }}
        >
          <label
            htmlFor="journey-child-workspace"
            style={{
              display: "block",
              fontWeight: 800,
              fontSize: 13,
              color: "#334155",
              marginBottom: 9,
            }}
          >
            Select a Child's Journey
          </label>

          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <select
              id="journey-child-workspace"
              value={
                workspaceKeyValue ||
                (childWorkspaces[0]
                  ? workspaceKey(
                      childWorkspaces[0]
                        .ownerUserId,
                      childWorkspaces[0]
                        .childId
                    )
                  : "")
              }
              onChange={(event) => {
                const workspace =
                  childWorkspaces.find(
                    (item) =>
                      workspaceKey(
                        item.ownerUserId,
                        item.childId
                      ) ===
                      event.target.value
                  );

                if (workspace) {
                  void selectWorkspace(
                    workspace
                  );
                }
              }}
              style={{
                flex: 1,
                minWidth: 200,
                padding: "11px 13px",
                borderRadius: 9,
                border:
                  "1px solid #CBD5E1",
                background: "#FFFFFF",
                color: "#0F172A",
                fontSize: 14,
              }}
            >
              {childWorkspaces.map(
                (workspace) => (
                  <option
                    key={workspaceKey(
                      workspace.ownerUserId,
                      workspace.childId
                    )}
                    value={workspaceKey(
                      workspace.ownerUserId,
                      workspace.childId
                    )}
                  >
                    {workspace.childName ||
                      "Unnamed Child"}
                    {workspace.role ===
                    "family_member"
                      ? " (Shared)"
                      : ""}
                  </option>
                )
              )}
            </select>

            <button
              type="button"
              onClick={addAnotherChild}
              style={actionButton}
            >
              + Add Child
            </button>

            {selectedWorkspace &&
              canManageChild && (
                <button
                  type="button"
                  onClick={() => {
                    setRemoveChildError(null);
                    setShowRemoveChildConfirm(
                      true
                    );
                  }}
                  style={{
                    ...actionButton,
                    color: "#B91C1C",
                  }}
                >
                  Remove Child
                </button>
              )}
          </div>

          {isSharedJourney && (
            <p
              style={{
                margin:
                  "12px 0 0",
                fontSize: 13,
                color: "#475569",
              }}
            >
              Family Team Access:{" "}
              <strong>
                {currentAccessLevel ===
                "viewer"
                  ? "Viewer — Read Only"
                  : currentAccessLevel ===
                      "contributor"
                    ? "Contributor"
                    : "Administrator"}
              </strong>
            </p>
          )}
        </div>
      </div>
    );
  }

  function renderChildJourneyControls() {
    if (
      childWorkspaces.length === 0 ||
      addingChildDraft
    ) {
      return null;
    }

    const allOwned =
      childWorkspaces.every(
        (workspace) =>
          workspace.ownerUserId ===
          signedInUserId
      );

    if (!allOwned) {
      return renderWorkspaceSelector();
    }

    return (
      <ChildJourneyControls
        savedChildren={savedChildren}
        selectedChildId={
          selectedChildId
        }
        onSelectChild={loadSavedChild}
        onAddChild={addAnotherChild}
        onRemoveChild={() => {
          if (!canManageChild) return;

          setRemoveChildError(null);
          setShowRemoveChildConfirm(true);
        }}
      />
    );
  }

  function renderErrorNotice(
    message: string | null
  ) {
    if (!message) return null;

    return (
      <div
        role="alert"
        style={noticeStyle}
      >
        {message}
      </div>
    );
  }

  function renderRemoveChildModal() {
    if (!canManageChild) return null;

    return (
      <RemoveChildModal
        visible={
          showRemoveChildConfirm
        }
        childName={
          familyProfile.childName
        }
        removing={removingChild}
        error={removeChildError}
        onCancel={() =>
          setShowRemoveChildConfirm(
            false
          )
        }
        onConfirm={
          confirmRemoveChild
        }
      />
    );
  }

  function renderAddingChildBanner() {
    return (
      <AddingChildBanner
        visible={addingChildDraft}
        previousChildName={
          previousChildSnapshot
            ?.familyProfile.childName
        }
        canCancel={Boolean(
          previousChildSnapshot
        )}
        onCancel={cancelAddingChild}
      />
    );
  }

  if (checkingSavedJourney) {
    return (
      <div
        style={{
          minHeight: 500,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "60px 20px",
        }}
      >
        <div
          style={{
            maxWidth: 520,
            width: "100%",
            padding: 40,
            textAlign: "center",
            background: "#FFFFFF",
            borderRadius: 22,
            border:
              "1px solid #E2E8F0",
            boxShadow:
              "0 10px 30px rgba(15,23,42,.06)",
          }}
        >
          <div
            style={{
              fontSize: 38,
              marginBottom: 16,
            }}
          >
            🧭
          </div>

          <h2
            style={{
              margin: "0 0 10px",
              color: "#0F172A",
              fontSize: 26,
              fontWeight: 800,
            }}
          >
            Loading Your Journey
          </h2>

          <p
            style={{
              margin: 0,
              color: "#64748B",
              fontSize: 15,
              lineHeight: 1.6,
            }}
          >
            We're checking your saved
            Journeys and Family Team
            access.
          </p>
        </div>
      </div>
    );
  }

  if (isGenerating) {
    return (
      <>
        {renderChildJourneyControls()}
        <GeneratingJourney />
      </>
    );
  }

  if (error) {
    return (
      <>
        {renderChildJourneyControls()}
        {renderAddingChildBanner()}

        <div
          style={{
            maxWidth: 700,
            margin: "60px auto",
            padding: "0 20px",
          }}
        >
          <div
            style={{
              padding: 40,
              textAlign: "center",
              background: "#FFFFFF",
              borderRadius: 24,
              border:
                "1px solid #E2E8F0",
            }}
          >
            <h2
              style={{
                fontSize: 30,
                fontWeight: 800,
                color: "#0F172A",
                margin: "0 0 16px",
              }}
            >
              We Couldn't Build Your Journey
            </h2>

            <p
              style={{
                color: "#64748B",
                lineHeight: 1.7,
                margin: "0 0 28px",
              }}
            >
              {error}
            </p>

            {canManageChild && (
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  void generatePersonalizedJourney();
                }}
                style={{
                  ...actionButton,
                  background: "#2563EB",
                  color: "#FFFFFF",
                }}
              >
                Try Again
              </button>
            )}
          </div>
        </div>

        {renderRemoveChildModal()}
      </>
    );
  }

  if (
    personalizedJourney &&
    savedJourneyLoaded
  ) {
    return (
      <>
        {renderChildJourneyControls()}

        <JourneyDashboard
          key={[
            canonicalOwnerUserId,
            familyProfile.childId,
            currentJourneyId || "",
          ].join("__")}
          personalizedJourney={
            personalizedJourney
          }
          familyProfile={
            familyProfile
          }
          onJourneySaved={
            handleJourneySaved
          }
          ownerUserId={
            canonicalOwnerUserId
          }
          accessLevel={
            currentAccessLevel
          }
          journeyId={
            currentJourneyId
          }
        />

        {canManageChild && (
          <div
            style={{
              maxWidth: 1050,
              margin:
                "-45px auto 60px",
              padding: "0 24px",
              textAlign: "center",
            }}
          >
            {renderErrorNotice(
              journeyActionError
            )}

            <button
              type="button"
              onClick={() => {
                setJourneyActionError(
                  null
                );
                setShowStartNewJourneyConfirm(
                  true
                );
              }}
              style={actionButton}
            >
              Start a New Journey
            </button>
          </div>
        )}

        {!canManageChild &&
          renderErrorNotice(
            journeyActionError
          )}

        <JourneyHistory
          childId={
            familyProfile.childId
          }
          ownerUserId={
            canonicalOwnerUserId
          }
          journeyId={
            currentJourneyId
          }
          refreshKey={
            journeyHistoryRefreshKey
          }
        />

{familyProfile.childId && (
  <PastJourneys
    childId={familyProfile.childId}
    ownerUserId={canonicalOwnerUserId}
    refreshKey={journeyHistoryRefreshKey}
  />
)}

        {canManageChild && (
          <StartNewJourneyModal
            visible={
              showStartNewJourneyConfirm
            }
            childName={
              familyProfile.childName
            }
            starting={
              startingNewJourney
            }
            onCancel={() =>
              setShowStartNewJourneyConfirm(
                false
              )
            }
            onConfirm={
              confirmStartNewJourney
            }
          />
        )}

        {renderRemoveChildModal()}
      </>
    );
  }

  if (personalizedJourney) {
    return (
      <>
        {renderAddingChildBanner()}

        <JourneyDashboard
          key={[
            canonicalOwnerUserId,
            familyProfile.childId,
            "unsaved",
          ].join("__")}
          personalizedJourney={
            personalizedJourney
          }
          familyProfile={
            familyProfile
          }
          onJourneySaved={
            handleJourneySaved
          }
          ownerUserId={
            canonicalOwnerUserId
          }
          accessLevel={
            currentAccessLevel
          }
          journeyId={
            currentJourneyId
          }
        />
      </>
    );
  }

  if (
    isSharedJourney &&
    !personalizedJourney
  ) {
    return (
      <>
        {renderChildJourneyControls()}

        {renderErrorNotice(
          journeyActionError
        )}

        <div
          style={{
            maxWidth: 760,
            margin: "50px auto",
            padding: "0 24px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              padding: 35,
              borderRadius: 20,
              border:
                "1px solid #E2E8F0",
              background: "#FFFFFF",
            }}
          >
            <h2
              style={{
                margin: "0 0 12px",
                color: "#0F172A",
              }}
            >
              Journey Not Yet Started
            </h2>

            <p
              style={{
                color: "#64748B",
                lineHeight: 1.7,
              }}
            >
              This child has been shared
              with you through the Family
              Team. The Journey owner
              hasn't created an active
              Journey yet.
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {renderChildJourneyControls()}
      {renderAddingChildBanner()}

      {renderErrorNotice(
        journeyActionError
      )}

      <div
        style={{
          maxWidth: 900,
          margin: "0 auto",
          padding: "40px 20px",
        }}
      >
        {step === 0 && (
          <Welcome
            onBegin={
              beginQuestionnaire
            }
          />
        )}

        {step > 0 && (
          <JourneyQuestionnaire
            step={step}
            totalQuestions={
              totalQuestions
            }
            familyProfile={
              familyProfile
            }
            onUpdateProfile={
              updateProfile
            }
            onPrevious={
              previousStep
            }
            onNext={nextStep}
            canContinue={
              canContinue()
            }
          />
        )}
      </div>

      {renderRemoveChildModal()}
    </>
  );
}
