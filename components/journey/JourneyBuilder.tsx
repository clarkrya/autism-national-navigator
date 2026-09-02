"use client";

import {
  useEffect,
  useState,
} from "react";

import type {
  FamilyProfile,
} from "../../types/familyProfile";

import type {
  PersonalizedJourney,
} from "../../lib/ai/journeyTypes";

import {
  auth,
} from "../../lib/firebase";

import {
  watchAuthState,
} from "../../lib/auth";

import {
  archiveCurrentJourney,
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

import Welcome from "./Welcome";
import GeneratingJourney from "./GeneratingJourney";
import JourneyDashboard from "./JourneyDashboard";
import JourneyHistory from "./JourneyHistory";

import JourneyQuestionnaire from "../journey-builder/JourneyQuestionnaire";
import AddingChildBanner from "../journey-builder/AddingChildBanner";
import ChildJourneyControls from "../journey-builder/ChildJourneyControls";


/*
 * ============================================================
 * CHILD ID
 * ============================================================
 */

function createChildId() {
  if (
    typeof window !== "undefined" &&
    typeof window.crypto !== "undefined" &&
    typeof window.crypto.randomUUID === "function"
  ) {
    return window.crypto.randomUUID();
  }

  return `child-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}


/*
 * ============================================================
 * BLANK PROFILE
 * ============================================================
 */

function createBlankProfile(
  childId: string = ""
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


/*
 * ============================================================
 * ADD CHILD SNAPSHOT
 * ============================================================
 */

type PreviousChildSnapshot = {
  childId: string;
  familyProfile: FamilyProfile;
  journey: PersonalizedJourney;
};


/*
 * ============================================================
 * COMPONENT
 * ============================================================
 */

export default function JourneyBuilder() {
  const totalQuestions =
    7;


  /*
   * ============================================================
   * BASIC STATE
   * ============================================================
   */

  const [
    step,
    setStep,
  ] = useState(
    0
  );

  const [
    isGenerating,
    setIsGenerating,
  ] = useState(
    false
  );

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(
    null
  );


  /*
   * ============================================================
   * JOURNEY ACTION STATE
   * ============================================================
   */

  const [
    showStartNewJourneyConfirm,
    setShowStartNewJourneyConfirm,
  ] = useState(
    false
  );

  const [
    startingNewJourney,
    setStartingNewJourney,
  ] = useState(
    false
  );

  const [
    journeyActionError,
    setJourneyActionError,
  ] = useState<
    string | null
  >(
    null
  );


  /*
   * ============================================================
   * REMOVE CHILD STATE
   * ============================================================
   */

  const [
    showRemoveChildConfirm,
    setShowRemoveChildConfirm,
  ] = useState(
    false
  );

  const [
    removingChild,
    setRemovingChild,
  ] = useState(
    false
  );

  const [
    removeChildError,
    setRemoveChildError,
  ] = useState<
    string | null
  >(
    null
  );


  /*
   * ============================================================
   * ADD ANOTHER CHILD DRAFT STATE
   * ============================================================
   */

  const [
    addingChildDraft,
    setAddingChildDraft,
  ] = useState(
    false
  );

  const [
    previousChildSnapshot,
    setPreviousChildSnapshot,
  ] = useState<
    PreviousChildSnapshot | null
  >(
    null
  );


  /*
   * ============================================================
   * PERSONALIZED JOURNEY
   * ============================================================
   */

  const [
    personalizedJourney,
    setPersonalizedJourney,
  ] = useState<
    PersonalizedJourney | null
  >(
    null
  );


  /*
   * ============================================================
   * FAMILY PROFILE
   * ============================================================
   */

  const [
    familyProfile,
    setFamilyProfile,
  ] = useState<FamilyProfile>(
    createBlankProfile()
  );


  /*
   * ============================================================
   * SAVED JOURNEY STATE
   * ============================================================
   */

  const [
    checkingSavedJourney,
    setCheckingSavedJourney,
  ] = useState(
    true
  );

  const [
    savedJourneyLoaded,
    setSavedJourneyLoaded,
  ] = useState(
    false
  );

  const [
    savedChildren,
    setSavedChildren,
  ] = useState<
    SavedChild[]
  >(
    []
  );

  const [
    selectedChildId,
    setSelectedChildId,
  ] = useState(
    ""
  );


  /*
   * ============================================================
   * LOAD ACCOUNT / SAVED JOURNEY
   * ============================================================
   */

  useEffect(
    () => {
      const unsubscribe =
        watchAuthState(
          async (
            user
          ) => {
            if (
              !user
            ) {
              setSavedChildren(
                []
              );

              setSelectedChildId(
                ""
              );

              setSavedJourneyLoaded(
                false
              );

              setAddingChildDraft(
                false
              );

              setPreviousChildSnapshot(
                null
              );

              setCheckingSavedJourney(
                false
              );

              return;
            }


            setCheckingSavedJourney(
              true
            );


            try {
              let children =
                await getSavedChildren(
                  user.uid
                );


              /*
               * ==================================================
               * CHILD-SPECIFIC JOURNEYS
               * ==================================================
               */

              if (
                children.length >
                0
              ) {
                for (
                  const child
                  of children
                ) {
                  const savedJourney =
                    await getCurrentJourney(
                      user.uid,
                      child.childId
                    );

                  if (
                    !savedJourney
                  ) {
                    continue;
                  }

                  setSavedChildren(
                    children
                  );

                  setSelectedChildId(
                    child.childId
                  );

                  setFamilyProfile({
                    ...savedJourney
                      .familyProfile,

                    childId:
                      savedJourney
                        .familyProfile
                        .childId ||
                      child.childId,
                  });

                  setPersonalizedJourney(
                    savedJourney
                      .journey
                  );

                  setSavedJourneyLoaded(
                    true
                  );

                  setAddingChildDraft(
                    false
                  );

                  setPreviousChildSnapshot(
                    null
                  );

                  return;
                }
              }


              /*
               * ==================================================
               * LEGACY JOURNEY MIGRATION
               * ==================================================
               */

              const legacyJourney =
                await getLegacyCurrentJourney(
                  user.uid
                );


              if (
                legacyJourney
              ) {
                const childId =
                  legacyJourney
                    .familyProfile
                    .childId ||
                  createChildId();


                const migratedProfile:
                  FamilyProfile = {
                  ...legacyJourney
                    .familyProfile,

                  childId,
                };


                const migratedJourney =
                  await saveCurrentJourney(
                    user.uid,
                    migratedProfile,
                    legacyJourney
                      .journey,
                    {
                      stageNumber:
                        legacyJourney
                          .stageNumber,

                      previousCompletedTaskIds:
                        legacyJourney
                          .previousCompletedTaskIds,

                      journeyReason:
                        legacyJourney
                          .journeyReason,
                    }
                  );


                const legacyHistory =
                  await getLegacyJourneyHistory(
                    user.uid
                  );


                for (
                  const stage
                  of legacyHistory
                ) {
                  await saveJourneyStage(
                    user.uid,
                    stage.stageNumber,
                    {
                      ...stage
                        .familyProfile,

                      childId,
                    },
                    stage.journey,
                    stage.completedTaskIds,
                    {
                      journeyId:
                        migratedJourney
                          .journeyId,

                      createdAt:
                        stage.createdAt,

                      completedAt:
                        stage.completedAt,

                      reason:
                        stage.reason,
                    }
                  );
                }


                children =
                  await getSavedChildren(
                    user.uid
                  );


                setSavedChildren(
                  children
                );

                setSelectedChildId(
                  childId
                );

                setFamilyProfile(
                  migratedProfile
                );

                setPersonalizedJourney(
                  legacyJourney
                    .journey
                );

                setSavedJourneyLoaded(
                  true
                );

                setAddingChildDraft(
                  false
                );

                setPreviousChildSnapshot(
                  null
                );

                return;
              }


              /*
               * ==================================================
               * NEW ACCOUNT / NO CURRENT JOURNEY
               * ==================================================
               */

              setSavedChildren(
                children
              );

              setSelectedChildId(
                ""
              );

              setSavedJourneyLoaded(
                false
              );

            } catch (
              loadError
            ) {
              console.error(
                "Unable to load saved journey:",
                loadError
              );

              setSavedJourneyLoaded(
                false
              );

            } finally {
              setCheckingSavedJourney(
                false
              );
            }
          }
        );


      return () => {
        unsubscribe();
      };
    },
    []
  );


  /*
   * ============================================================
   * SCROLL TO TOP — QUESTIONNAIRE
   * ============================================================
   */

  useEffect(
    () => {
      if (
        step >
        0
      ) {
        window.scrollTo({
          top:
            0,

          behavior:
            "smooth",
        });
      }
    },
    [
      step,
    ]
  );


  /*
   * ============================================================
   * SCROLL TO TOP — JOURNEY
   * ============================================================
   */

  useEffect(
    () => {
      if (
        personalizedJourney
      ) {
        window.scrollTo({
          top:
            0,

          behavior:
            "smooth",
        });
      }
    },
    [
      personalizedJourney,
    ]
  );


  /*
   * ============================================================
   * UPDATE PROFILE
   * ============================================================
   */

  function updateProfile<
    K extends keyof FamilyProfile
  >(
    field: K,
    value: FamilyProfile[K]
  ) {
    setFamilyProfile(
      (
        current
      ) => ({
        ...current,

        [field]:
          value,
      })
    );
  }


  /*
   * ============================================================
   * BEGIN QUESTIONNAIRE
   * ============================================================
   */

  function beginQuestionnaire() {
    if (
      !familyProfile
        .childId
    ) {
      const childId =
        createChildId();

      setFamilyProfile(
        (
          current
        ) => ({
          ...current,

          childId,
        })
      );

      setSelectedChildId(
        childId
      );
    }

    setStep(
      1
    );
  }


  /*
   * ============================================================
   * LOAD SAVED CHILD
   * ============================================================
   */

  async function loadSavedChild(
    childId: string
  ) {
    const user =
      auth.currentUser;


    if (
      !user
    ) {
      return;
    }


    setCheckingSavedJourney(
      true
    );

    setError(
      null
    );

    setJourneyActionError(
      null
    );

    setShowStartNewJourneyConfirm(
      false
    );


    try {
      const savedJourney =
        await getCurrentJourney(
          user.uid,
          childId
        );


      if (
        !savedJourney
      ) {
        throw new Error(
          "This child does not currently have an active journey."
        );
      }


      setSelectedChildId(
        childId
      );

      setFamilyProfile({
        ...savedJourney
          .familyProfile,

        childId,
      });

      setPersonalizedJourney(
        savedJourney
          .journey
      );

      setSavedJourneyLoaded(
        true
      );

      setAddingChildDraft(
        false
      );

      setPreviousChildSnapshot(
        null
      );

      setStep(
        0
      );

      window.scrollTo({
        top:
          0,

        behavior:
          "smooth",
      });

    } catch (
      err
    ) {
      console.error(
        "Unable to switch child journeys:",
        err
      );

      setJourneyActionError(
        err instanceof Error
          ? err.message
          : "We couldn't load this child's saved journey."
      );

    } finally {
      setCheckingSavedJourney(
        false
      );
    }
  }


  /*
   * ============================================================
   * GENERATE PERSONALIZED JOURNEY
   * ============================================================
   */

  async function generatePersonalizedJourney() {
    const profileForGeneration:
      FamilyProfile =

      familyProfile
        .childId

        ? familyProfile

        : {
            ...familyProfile,

            childId:
              createChildId(),
          };


    if (
      !familyProfile
        .childId
    ) {
      setFamilyProfile(
        profileForGeneration
      );

      setSelectedChildId(
        profileForGeneration
          .childId
      );
    }


    setIsGenerating(
      true
    );

    setError(
      null
    );


    try {
      const response =
        await fetch(
          "/api/journey/generate",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                familyProfile:
                  profileForGeneration,
              }),
          }
        );


      /*
       * ========================================================
       * SAFE API RESPONSE PARSING
       * ========================================================
       *
       * Next.js may return an HTML error page when a server route
       * crashes. Calling response.json() directly on that HTML
       * produces:
       *
       * Unexpected token '<'
       *
       * Read text first so we can show a useful error instead.
       */

      const responseText =
        await response.text();


      let data:
        any = null;


      if (
        responseText
      ) {
        try {
          data =
            JSON.parse(
              responseText
            );
        } catch (
          parseError
        ) {
          console.error(
            "Journey API returned a non-JSON response:",
            {
              status:
                response.status,

              statusText:
                response.statusText,

              responsePreview:
                responseText.slice(
                  0,
                  300
                ),

              parseError,
            }
          );


          throw new Error(
            response.ok
              ? "The Journey service returned an invalid response. Please try again."
              : `The Journey service encountered a server error (${response.status}). Please try again.`
          );
        }
      }


      if (
        !response.ok
      ) {
        throw new Error(
          data?.error ||
          `Unable to generate your personalized journey (${response.status}).`
        );
      }


      if (
        !data?.journey
      ) {
        throw new Error(
          "The AI did not return a personalized journey."
        );
      }


      setPersonalizedJourney(
        data.journey
      );


      /*
       * Generated does not equal saved.
       */

      setSavedJourneyLoaded(
        false
      );

    } catch (
      err
    ) {
      console.error(
        "AI journey generation failed:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "We couldn't create your personalized journey. Please try again."
      );

    } finally {
      setIsGenerating(
        false
      );
    }
  }


  /*
   * ============================================================
   * ADD ANOTHER CHILD
   * ============================================================
   */

  function addAnotherChild() {
    if (
      personalizedJourney &&
      familyProfile
        .childId
    ) {
      setPreviousChildSnapshot({
        childId:
          familyProfile
            .childId,

        familyProfile:
          familyProfile,

        journey:
          personalizedJourney,
      });
    }


    const newChildId =
      createChildId();


    setAddingChildDraft(
      true
    );

    setShowStartNewJourneyConfirm(
      false
    );

    setJourneyActionError(
      null
    );

    setPersonalizedJourney(
      null
    );

    setFamilyProfile(
      createBlankProfile(
        newChildId
      )
    );

    setSelectedChildId(
      newChildId
    );

    setStep(
      0
    );

    setError(
      null
    );

    setSavedJourneyLoaded(
      false
    );

    window.scrollTo({
      top:
        0,

      behavior:
        "smooth",
    });
  }


  /*
   * ============================================================
   * CANCEL ADDING CHILD
   * ============================================================
   */

  function cancelAddingChild() {
    if (
      !previousChildSnapshot
    ) {
      return;
    }


    setFamilyProfile(
      previousChildSnapshot
        .familyProfile
    );

    setSelectedChildId(
      previousChildSnapshot
        .childId
    );

    setPersonalizedJourney(
      previousChildSnapshot
        .journey
    );

    setSavedJourneyLoaded(
      true
    );

    setAddingChildDraft(
      false
    );

    setPreviousChildSnapshot(
      null
    );

    setStep(
      0
    );

    setError(
      null
    );

    setJourneyActionError(
      null
    );

    window.scrollTo({
      top:
        0,

      behavior:
        "smooth",
    });
  }


  /*
   * ============================================================
   * JOURNEY SAVED
   * ============================================================
   */

  async function handleJourneySaved(
    childId: string
  ) {
    const user =
      auth.currentUser;


    if (
      !user
    ) {
      return;
    }


    try {
      const children =
        await getSavedChildren(
          user.uid
        );


      setSavedChildren(
        children
      );

      setSelectedChildId(
        childId
      );

      setSavedJourneyLoaded(
        true
      );

      setAddingChildDraft(
        false
      );

      setPreviousChildSnapshot(
        null
      );

      setJourneyActionError(
        null
      );

    } catch (
      refreshError
    ) {
      console.error(
        "Journey saved, but unable to refresh child list:",
        refreshError
      );
    }
  }


  /*
   * ============================================================
   * REMOVE CHILD
   * ============================================================
   */

  async function confirmRemoveChild() {
    if (
      removingChild
    ) {
      return;
    }


    const user =
      auth.currentUser;


    const childId =
      familyProfile
        .childId ||
      selectedChildId;


    if (
      !user ||
      !childId
    ) {
      setRemoveChildError(
        "We couldn't determine which child to remove."
      );

      return;
    }


    setRemovingChild(
      true
    );

    setRemoveChildError(
      null
    );


    try {
      const idToken =
        await user
          .getIdToken();


      const response =
        await fetch(
          "/api/children/delete",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${idToken}`,
            },

            body:
              JSON.stringify({
                childId,
              }),
          }
        );


      const data =
        await response
          .json();


      if (
        !response.ok
      ) {
        throw new Error(
          data?.error ||
          "Unable to remove child."
        );
      }


      const remainingChildren =
        await getSavedChildren(
          user.uid
        );


      setSavedChildren(
        remainingChildren
      );

      setShowRemoveChildConfirm(
        false
      );


      /*
       * Find another child with an active current Journey.
       */

      if (
        remainingChildren.length >
        0
      ) {
        let nextChildLoaded =
          false;


        for (
          const child
          of remainingChildren
        ) {
          const currentJourney =
            await getCurrentJourney(
              user.uid,
              child.childId
            );


          if (
            !currentJourney
          ) {
            continue;
          }


          setSelectedChildId(
            child.childId
          );

          setFamilyProfile({
            ...currentJourney
              .familyProfile,

            childId:
              child.childId,
          });

          setPersonalizedJourney(
            currentJourney
              .journey
          );

          setSavedJourneyLoaded(
            true
          );

          setStep(
            0
          );

          nextChildLoaded =
            true;

          break;
        }


        if (
          nextChildLoaded
        ) {
          window.scrollTo({
            top:
              0,

            behavior:
              "smooth",
          });

          return;
        }
      }


      /*
       * No remaining active Journey.
       */

      setSelectedChildId(
        ""
      );

      setFamilyProfile(
        createBlankProfile()
      );

      setPersonalizedJourney(
        null
      );

      setSavedJourneyLoaded(
        false
      );

      setAddingChildDraft(
        false
      );

      setPreviousChildSnapshot(
        null
      );

      setStep(
        0
      );

      window.scrollTo({
        top:
          0,

        behavior:
          "smooth",
      });

    } catch (
      removeError
    ) {
      console.error(
        "Unable to remove child:",
        removeError
      );

      setRemoveChildError(
        removeError instanceof Error
          ? removeError.message
          : "We couldn't remove this child right now."
      );

    } finally {
      setRemovingChild(
        false
      );
    }
  }


  /*
   * ============================================================
   * START A NEW JOURNEY — SAME CHILD
   * ============================================================
   */

  async function confirmStartNewJourney() {
    if (
      startingNewJourney
    ) {
      return;
    }


    const childId =
      familyProfile
        .childId ||
      selectedChildId;


    if (
      !childId
    ) {
      setJourneyActionError(
        "We couldn't determine which child this journey belongs to."
      );

      return;
    }


    const user =
      auth.currentUser;


    if (
      !user
    ) {
      setJourneyActionError(
        "Please sign in before starting a new saved journey."
      );

      return;
    }


    setStartingNewJourney(
      true
    );

    setJourneyActionError(
      null
    );


    try {
      await archiveCurrentJourney(
        user.uid,
        childId
      );


      setFamilyProfile({
        childId,

        childName:
          familyProfile
            .childName,

        childAge:
          familyProfile
            .childAge,

        state:
          familyProfile
            .state,

        journeyStage:
          "",

        supports:
          [],

        priority:
          "",

        insurance:
          familyProfile
            .insurance,

        notes:
          "",
      });


      setSelectedChildId(
        childId
      );

      setPersonalizedJourney(
        null
      );

      setSavedJourneyLoaded(
        false
      );

      setAddingChildDraft(
        false
      );

      setPreviousChildSnapshot(
        null
      );

      setStep(
        0
      );

      setError(
        null
      );

      setShowStartNewJourneyConfirm(
        false
      );

      window.scrollTo({
        top:
          0,

        behavior:
          "smooth",
      });

    } catch (
      err
    ) {
      console.error(
        "Unable to start a new journey:",
        err
      );

      setJourneyActionError(
        err instanceof Error
          ? err.message
          : "We couldn't archive the current journey. Nothing was changed."
      );

    } finally {
      setStartingNewJourney(
        false
      );
    }
  }


  /*
   * ============================================================
   * NEXT QUESTION
   * ============================================================
   */

  function nextStep() {
    if (
      step <
      totalQuestions
    ) {
      setStep(
        (
          current
        ) =>
          current +
          1
      );

      return;
    }


    generatePersonalizedJourney();
  }


  /*
   * ============================================================
   * PREVIOUS QUESTION
   * ============================================================
   */

  function previousStep() {
    if (
      step >
      1
    ) {
      setStep(
        (
          current
        ) =>
          current -
          1
      );
    }
  }


  /*
   * ============================================================
   * CAN CONTINUE
   * ============================================================
   */

  function canContinue() {
    switch (
      step
    ) {
      case 1:
        return (
          familyProfile
            .childName
            .trim() !==
          ""
        );

      case 2:
        return (
          familyProfile
            .childAge !==
          ""
        );

      case 3:
        return (
          familyProfile
            .state !==
          ""
        );

      case 4:
        return (
          familyProfile
            .journeyStage !==
          ""
        );

      case 5:
        return (
          familyProfile
            .supports
            .length >
          0
        );

      case 6:
        return (
          familyProfile
            .priority !==
          ""
        );

      case 7:
        return (
          familyProfile
            .insurance !==
          ""
        );

      default:
        return true;
    }
  }


  /*
   * ============================================================
   * CHILD CONTROLS
   * ============================================================
   */

  function renderChildJourneyControls() {
    if (
      savedChildren.length ===
      0
    ) {
      return null;
    }


    if (
      addingChildDraft
    ) {
      return null;
    }


    return (
      <ChildJourneyControls
        savedChildren={
          savedChildren
        }

        selectedChildId={
          selectedChildId
        }

        onSelectChild={
          loadSavedChild
        }

        onAddChild={
          addAnotherChild
        }

        onRemoveChild={() => {
          setRemoveChildError(
            null
          );

          setShowRemoveChildConfirm(
            true
          );
        }}
      />
    );
  }


  /*
   * ============================================================
   * REMOVE CHILD MODAL
   * ============================================================
   */

  function renderRemoveChildModal() {
    if (
      !showRemoveChildConfirm
    ) {
      return null;
    }


    return (
      <div
        role="dialog"

        aria-modal="true"

        aria-labelledby="remove-child-title"

        style={{
          position:
            "fixed",

          inset:
            0,

          zIndex:
            1100,

          display:
            "flex",

          alignItems:
            "center",

          justifyContent:
            "center",

          padding:
            "24px",

          background:
            "rgba(15, 23, 42, 0.55)",
        }}
      >
        <div
          style={{
            width:
              "100%",

            maxWidth:
              "520px",

            padding:
              "30px",

            background:
              "#FFFFFF",

            borderRadius:
              "20px",

            border:
              "1px solid #E2E8F0",

            boxShadow:
              "0 24px 60px rgba(15,23,42,.20)",
          }}
        >
          <div
            style={{
              width:
                "46px",

              height:
                "46px",

              display:
                "flex",

              alignItems:
                "center",

              justifyContent:
                "center",

              borderRadius:
                "50%",

              background:
                "#FEF2F2",

              color:
                "#B91C1C",

              fontSize:
                "20px",

              fontWeight:
                800,

              marginBottom:
                "18px",
            }}
          >
            !
          </div>


          <h2
            id="remove-child-title"

            style={{
              margin:
                "0 0 12px",

              color:
                "#0F172A",

              fontSize:
                "24px",

              fontWeight:
                800,
            }}
          >
            Remove{" "}
            {
              familyProfile
                .childName ||
              "this child"
            }?
          </h2>


          <p
            style={{
              margin:
                "0 0 18px",

              color:
                "#64748B",

              fontSize:
                "15px",

              lineHeight:
                1.7,
            }}
          >
            This will permanently remove this child and all of their
            saved Journey information from your account.
          </p>


          <div
            style={{
              padding:
                "14px 16px",

              marginBottom:
                "22px",

              borderRadius:
                "12px",

              background:
                "#FEF2F2",

              border:
                "1px solid #FECACA",

              color:
                "#991B1B",

              fontSize:
                "13px",

              lineHeight:
                1.6,

              fontWeight:
                700,
            }}
          >
            This includes the current Journey, Journey History, and
            Past Journeys. This action cannot be undone.
          </div>


          {
            removeChildError && (
              <div
                style={{
                  marginBottom:
                    "18px",

                  color:
                    "#B91C1C",

                  fontSize:
                    "13px",

                  lineHeight:
                    1.5,
                }}
              >
                {removeChildError}
              </div>
            )
          }


          <div
            style={{
              display:
                "flex",

              justifyContent:
                "flex-end",

              gap:
                "10px",

              flexWrap:
                "wrap",
            }}
          >
            <button
              type="button"

              disabled={
                removingChild
              }

              onClick={() =>
                setShowRemoveChildConfirm(
                  false
                )
              }

              style={{
                padding:
                  "11px 17px",

                borderRadius:
                  "9px",

                border:
                  "1px solid #CBD5E1",

                background:
                  "#FFFFFF",

                color:
                  "#475569",

                fontSize:
                  "14px",

                fontWeight:
                  700,

                cursor:
                  removingChild
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              Cancel
            </button>


            <button
              type="button"

              disabled={
                removingChild
              }

              onClick={
                confirmRemoveChild
              }

              style={{
                padding:
                  "11px 17px",

                borderRadius:
                  "9px",

                border:
                  "none",

                background:
                  "#DC2626",

                color:
                  "#FFFFFF",

                fontSize:
                  "14px",

                fontWeight:
                  800,

                cursor:
                  removingChild
                    ? "not-allowed"
                    : "pointer",

                opacity:
                  removingChild
                    ? 0.7
                    : 1,
              }}
            >
              {
                removingChild
                  ? "Removing..."
                  : "Remove Child Permanently"
              }
            </button>
          </div>
        </div>
      </div>
    );
  }


  /*
   * ============================================================
   * LOADING
   * ============================================================
   */

  if (
    checkingSavedJourney
  ) {
    return (
      <div
        style={{
          minHeight:
            "500px",

          display:
            "flex",

          alignItems:
            "center",

          justifyContent:
            "center",

          padding:
            "60px 20px",
        }}
      >
        <div
          style={{
            maxWidth:
              "520px",

            width:
              "100%",

            padding:
              "40px",

            textAlign:
              "center",

            background:
              "#FFFFFF",

            borderRadius:
              "22px",

            border:
              "1px solid #E2E8F0",

            boxShadow:
              "0 10px 30px rgba(15,23,42,.06)",
          }}
        >
          <div
            style={{
              fontSize:
                "38px",

              marginBottom:
                "16px",
            }}
          >
            🧭
          </div>


          <h2
            style={{
              margin:
                "0 0 10px",

              color:
                "#0F172A",

              fontSize:
                "26px",

              fontWeight:
                800,
            }}
          >
            Loading Your Journey
          </h2>


          <p
            style={{
              margin:
                0,

              color:
                "#64748B",

              fontSize:
                "15px",

              lineHeight:
                1.6,
            }}
          >
            We're checking whether you have a saved journey.
          </p>
        </div>
      </div>
    );
  }


  /*
   * ============================================================
   * GENERATING
   * ============================================================
   */

  if (
    isGenerating
  ) {
    return (
      <>
        {
          renderChildJourneyControls()
        }

        <GeneratingJourney />
      </>
    );
  }


  /*
   * ============================================================
   * GENERATION ERROR
   * ============================================================
   *
   * IMPORTANT:
   * Child controls remain visible here.
   * ============================================================
   */

  if (
    error
  ) {
    return (
      <>

        {
          renderChildJourneyControls()
        }


        <AddingChildBanner
          visible={
            addingChildDraft
          }

          previousChildName={
            previousChildSnapshot
              ?.familyProfile
              .childName
          }

          canCancel={
            Boolean(
              previousChildSnapshot
            )
          }

          onCancel={
            cancelAddingChild
          }
        />


        <div
          style={{
            maxWidth:
              "700px",

            margin:
              "60px auto",

            padding:
              "0 20px",
          }}
        >
          <div
            style={{
              padding:
                "40px",

              textAlign:
                "center",

              background:
                "#FFFFFF",

              borderRadius:
                "24px",

              border:
                "1px solid #E2E8F0",

              boxShadow:
                "0 10px 30px rgba(15,23,42,.06)",
            }}
          >
            <h2
              style={{
                fontSize:
                  "30px",

                fontWeight:
                  800,

                color:
                  "#0F172A",

                margin:
                  "0 0 16px",
              }}
            >
              We Couldn't Build Your Journey
            </h2>


            <p
              style={{
                color:
                  "#64748B",

                lineHeight:
                  1.7,

                margin:
                  "0 0 28px",
              }}
            >
              {error}
            </p>


            <button
              type="button"

              onClick={() => {
                setError(
                  null
                );

                generatePersonalizedJourney();
              }}

              style={{
                padding:
                  "14px 28px",

                borderRadius:
                  "10px",

                border:
                  "none",

                background:
                  "#2563EB",

                color:
                  "#FFFFFF",

                fontWeight:
                  700,

                fontSize:
                  "16px",

                cursor:
                  "pointer",
              }}
            >
              Try Again
            </button>
          </div>
        </div>


        {
          renderRemoveChildModal()
        }

      </>
    );
  }


  /*
   * ============================================================
   * SAVED JOURNEY
   * ============================================================
   */

  if (
    personalizedJourney &&
    savedJourneyLoaded
  ) {
    const childName =
      familyProfile
        .childName ||
      "this child";


    return (
      <>

        {/*
         * ========================================================
         * CHILD JOURNEY CONTROLS
         * ========================================================
         */}

        {
          renderChildJourneyControls()
        }


        <JourneyDashboard
          personalizedJourney={
            personalizedJourney
          }

          familyProfile={
            familyProfile
          }

          onJourneySaved={
            handleJourneySaved
          }
        />


        {/*
         * ========================================================
         * JOURNEY ACTIONS
         * ========================================================
         */}

        <div
          style={{
            maxWidth:
              "1050px",

            margin:
              "-45px auto 60px",

            padding:
              "0 24px",

            textAlign:
              "center",
          }}
        >
          {
            journeyActionError && (
              <div
                style={{
                  maxWidth:
                    "620px",

                  margin:
                    "0 auto 18px",

                  padding:
                    "12px 16px",

                  border:
                    "1px solid #FCA5A5",

                  background:
                    "#FEF2F2",

                  borderRadius:
                    "10px",

                  color:
                    "#991B1B",

                  fontSize:
                    "14px",

                  lineHeight:
                    1.5,
                }}
              >
                {journeyActionError}
              </div>
            )
          }


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

            style={{
              padding:
                "11px 18px",

              borderRadius:
                "9px",

              border:
                "1px solid #CBD5E1",

              background:
                "#FFFFFF",

              color:
                "#475569",

              fontSize:
                "13px",

              fontWeight:
                700,

              cursor:
                "pointer",
            }}
          >
            Start a New Journey
          </button>
        </div>


        {/*
         * ========================================================
         * CURRENT JOURNEY HISTORY
         * ========================================================
         */}

        <JourneyHistory
          childId={
            familyProfile
              .childId
          }
        />


        {/*
         * ========================================================
         * START NEW JOURNEY MODAL
         * ========================================================
         */}

        {
          showStartNewJourneyConfirm && (
            <div
              role="dialog"

              aria-modal="true"

              aria-labelledby="start-new-journey-title"

              style={{
                position:
                  "fixed",

                inset:
                  0,

                zIndex:
                  1000,

                display:
                  "flex",

                alignItems:
                  "center",

                justifyContent:
                  "center",

                padding:
                  "24px",

                background:
                  "rgba(15, 23, 42, 0.48)",
              }}
            >
              <div
                style={{
                  width:
                    "100%",

                  maxWidth:
                    "520px",

                  padding:
                    "30px",

                  background:
                    "#FFFFFF",

                  borderRadius:
                    "20px",

                  border:
                    "1px solid #E2E8F0",

                  boxShadow:
                    "0 24px 60px rgba(15,23,42,.20)",

                  textAlign:
                    "left",
                }}
              >
                <div
                  style={{
                    width:
                      "46px",

                    height:
                      "46px",

                    display:
                      "flex",

                    alignItems:
                      "center",

                    justifyContent:
                      "center",

                    borderRadius:
                      "50%",

                    background:
                      "#EFF6FF",

                    fontSize:
                      "22px",

                    marginBottom:
                      "18px",
                  }}
                >
                  🧭
                </div>


                <h2
                  id="start-new-journey-title"

                  style={{
                    margin:
                      "0 0 12px",

                    color:
                      "#0F172A",

                    fontSize:
                      "24px",

                    fontWeight:
                      800,
                  }}
                >
                  Start a new journey for{" "}
                  {childName}?
                </h2>


                <p
                  style={{
                    margin:
                      "0 0 22px",

                    color:
                      "#64748B",

                    fontSize:
                      "15px",

                    lineHeight:
                      1.7,
                  }}
                >
                  This will restart{" "}
                  {childName}'s personalized
                  journey from the beginning.
                  The previous journey will be
                  moved to Past Journeys so you
                  can still reference it later.
                </p>


                <div
                  style={{
                    padding:
                      "14px 16px",

                    marginBottom:
                      "24px",

                    borderRadius:
                      "12px",

                    background:
                      "#F8FAFC",

                    border:
                      "1px solid #E2E8F0",

                    color:
                      "#475569",

                    fontSize:
                      "13px",

                    lineHeight:
                      1.6,
                  }}
                >
                  This does not create another
                  child. {childName} will keep
                  the same child profile.
                </div>


                <div
                  style={{
                    display:
                      "flex",

                    justifyContent:
                      "flex-end",

                    gap:
                      "10px",

                    flexWrap:
                      "wrap",
                  }}
                >
                  <button
                    type="button"

                    disabled={
                      startingNewJourney
                    }

                    onClick={() =>
                      setShowStartNewJourneyConfirm(
                        false
                      )
                    }

                    style={{
                      padding:
                        "11px 17px",

                      borderRadius:
                        "9px",

                      border:
                        "1px solid #CBD5E1",

                      background:
                        "#FFFFFF",

                      color:
                        "#475569",

                      fontSize:
                        "14px",

                      fontWeight:
                        700,

                      cursor:
                        startingNewJourney
                          ? "not-allowed"
                          : "pointer",

                      opacity:
                        startingNewJourney
                          ? 0.6
                          : 1,
                    }}
                  >
                    Cancel
                  </button>


                  <button
                    type="button"

                    disabled={
                      startingNewJourney
                    }

                    onClick={
                      confirmStartNewJourney
                    }

                    style={{
                      padding:
                        "11px 17px",

                      borderRadius:
                        "9px",

                      border:
                        "none",

                      background:
                        "#2563EB",

                      color:
                        "#FFFFFF",

                      fontSize:
                        "14px",

                      fontWeight:
                        800,

                      cursor:
                        startingNewJourney
                          ? "not-allowed"
                          : "pointer",

                      opacity:
                        startingNewJourney
                          ? 0.7
                          : 1,
                    }}
                  >
                    {
                      startingNewJourney
                        ? "Starting..."
                        : "Start New Journey"
                    }
                  </button>
                </div>
              </div>
            </div>
          )
        }


        {
          renderRemoveChildModal()
        }

      </>
    );
  }


  /*
   * ============================================================
   * NEWLY GENERATED JOURNEY — NOT YET SAVED
   * ============================================================
   */

  if (
    personalizedJourney
  ) {
    return (
      <>

        <AddingChildBanner
          visible={
            addingChildDraft
          }

          previousChildName={
            previousChildSnapshot
              ?.familyProfile
              .childName
          }

          canCancel={
            Boolean(
              previousChildSnapshot
            )
          }

          onCancel={
            cancelAddingChild
          }
        />


        <JourneyDashboard
          personalizedJourney={
            personalizedJourney
          }

          familyProfile={
            familyProfile
          }

          onJourneySaved={
            handleJourneySaved
          }
        />

      </>
    );
  }


  /*
   * ============================================================
   * QUESTIONNAIRE / WELCOME
   * ============================================================
   */

  return (
    <>

      <AddingChildBanner
        visible={
          addingChildDraft
        }

        previousChildName={
          previousChildSnapshot
            ?.familyProfile
            .childName
        }

        canCancel={
          Boolean(
            previousChildSnapshot
          )
        }

        onCancel={
          cancelAddingChild
        }
      />


      <div
        style={{
          maxWidth:
            "900px",

          margin:
            "0 auto",

          padding:
            "40px 20px",
        }}
      >

        {
          step ===
          0 && (
            <Welcome
              onBegin={
                beginQuestionnaire
              }
            />
          )
        }


        {
          step >
          0 && (
            <JourneyQuestionnaire
              step={
                step
              }

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

              onNext={
                nextStep
              }

              canContinue={
                canContinue()
              }
            />
          )
        }

      </div>

    </>
  );
}