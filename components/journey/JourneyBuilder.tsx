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
import StartNewJourneyModal from "../journey-builder/StartNewJourneyModal";
import RemoveChildModal from "../journey-builder/RemoveChildModal";


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
 * PREVIOUS CHILD SNAPSHOT
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
   * ==========================================================
   * QUESTIONNAIRE / GENERATION STATE
   * ==========================================================
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
   * ==========================================================
   * START NEW JOURNEY STATE
   * ==========================================================
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
   * ==========================================================
   * REMOVE CHILD STATE
   * ==========================================================
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
   * ==========================================================
   * ADD ANOTHER CHILD STATE
   * ==========================================================
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
   * ==========================================================
   * JOURNEY / PROFILE STATE
   * ==========================================================
   */

  const [
    personalizedJourney,
    setPersonalizedJourney,
  ] = useState<
    PersonalizedJourney | null
  >(
    null
  );

  const [
    familyProfile,
    setFamilyProfile,
  ] = useState<FamilyProfile>(
    createBlankProfile()
  );


  /*
   * ==========================================================
   * SAVED JOURNEY STATE
   * ==========================================================
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
   * ==========================================================
   * LOAD ACCOUNT / SAVED JOURNEY
   * ==========================================================
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
               * --------------------------------------------------
               * CHILD-SPECIFIC CURRENT JOURNEYS
               * --------------------------------------------------
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
               * --------------------------------------------------
               * LEGACY JOURNEY MIGRATION
               * --------------------------------------------------
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


                /*
                 * ------------------------------------------------
                 * MIGRATE LEGACY HISTORY
                 * ------------------------------------------------
                 */

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
               * --------------------------------------------------
               * NO ACTIVE JOURNEY
               * --------------------------------------------------
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
   * ==========================================================
   * SCROLL — QUESTIONNAIRE
   * ==========================================================
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
   * ==========================================================
   * SCROLL — JOURNEY
   * ==========================================================
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
   * ==========================================================
   * UPDATE PROFILE
   * ==========================================================
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
   * ==========================================================
   * BEGIN QUESTIONNAIRE
   * ==========================================================
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
   * ==========================================================
   * LOAD SAVED CHILD
   * ==========================================================
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


    setShowRemoveChildConfirm(
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
      loadError
    ) {
      console.error(
        "Unable to switch child journeys:",
        loadError
      );


      setJourneyActionError(
        loadError instanceof Error
          ? loadError.message
          : "We couldn't load this child's saved journey."
      );

    } finally {
      setCheckingSavedJourney(
        false
      );
    }
  }


  /*
   * ==========================================================
   * GENERATE PERSONALIZED JOURNEY
   * ==========================================================
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
       * --------------------------------------------------------
       * SAFE API RESPONSE PARSING
       * --------------------------------------------------------
       */

      const responseText =
        await response.text();


      let data:
        any =
        null;


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
      generationError
    ) {
      console.error(
        "AI journey generation failed:",
        generationError
      );


      setError(
        generationError instanceof Error
          ? generationError.message
          : "We couldn't create your personalized journey. Please try again."
      );

    } finally {
      setIsGenerating(
        false
      );
    }
  }


  /*
   * ==========================================================
   * ADD ANOTHER CHILD
   * ==========================================================
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


    setShowRemoveChildConfirm(
      false
    );


    setJourneyActionError(
      null
    );


    setRemoveChildError(
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
   * ==========================================================
   * CANCEL ADDING CHILD
   * ==========================================================
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


    setRemoveChildError(
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
   * ==========================================================
   * JOURNEY SAVED
   * ==========================================================
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


      setRemoveChildError(
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
   * ==========================================================
   * REMOVE CHILD
   * ==========================================================
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


      /*
       * --------------------------------------------------------
       * SAFE DELETE API RESPONSE PARSING
       * --------------------------------------------------------
       */

      const responseText =
        await response.text();


      let data:
        any =
        null;


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
            "Delete child API returned a non-JSON response:",
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
              ? "The child removal service returned an invalid response."
              : `Unable to remove child (${response.status}).`
          );
        }
      }


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
       * --------------------------------------------------------
       * LOAD ANOTHER CHILD WITH AN ACTIVE CURRENT JOURNEY
       * --------------------------------------------------------
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


          setAddingChildDraft(
            false
          );


          setPreviousChildSnapshot(
            null
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
       * --------------------------------------------------------
       * NO REMAINING ACTIVE JOURNEY
       * --------------------------------------------------------
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
      removalError
    ) {
      console.error(
        "Unable to remove child:",
        removalError
      );


      setRemoveChildError(
        removalError instanceof Error
          ? removalError.message
          : "We couldn't remove this child right now."
      );

    } finally {
      setRemovingChild(
        false
      );
    }
  }


  /*
   * ==========================================================
   * START NEW JOURNEY — SAME CHILD
   * ==========================================================
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


      /*
       * --------------------------------------------------------
       * KEEP CHILD IDENTITY, RESET JOURNEY-SPECIFIC ANSWERS
       * --------------------------------------------------------
       */

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
      startError
    ) {
      console.error(
        "Unable to start a new journey:",
        startError
      );


      setJourneyActionError(
        startError instanceof Error
          ? startError.message
          : "We couldn't archive the current journey. Nothing was changed."
      );

    } finally {
      setStartingNewJourney(
        false
      );
    }
  }


  /*
   * ==========================================================
   * NEXT QUESTION
   * ==========================================================
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
   * ==========================================================
   * PREVIOUS QUESTION
   * ==========================================================
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
   * ==========================================================
   * CAN CONTINUE
   * ==========================================================
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
   * ==========================================================
   * CHILD CONTROLS
   * ==========================================================
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
   * ==========================================================
   * LOADING
   * ==========================================================
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
   * ==========================================================
   * GENERATING
   * ==========================================================
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
   * ==========================================================
   * GENERATION ERROR
   * ==========================================================
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


        <RemoveChildModal
          visible={
            showRemoveChildConfirm
          }

          childName={
            familyProfile
              .childName
          }

          removing={
            removingChild
          }

          error={
            removeChildError
          }

          onCancel={() =>
            setShowRemoveChildConfirm(
              false
            )
          }

          onConfirm={
            confirmRemoveChild
          }
        />
      </>
    );
  }


  /*
   * ==========================================================
   * SAVED JOURNEY
   * ==========================================================
   */

  if (
    personalizedJourney &&
    savedJourneyLoaded
  ) {
    return (
      <>
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


        {/* ===================================================
            JOURNEY ACTIONS
        ==================================================== */}

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


        {/* ===================================================
            CURRENT JOURNEY HISTORY
        ==================================================== */}

        <JourneyHistory
          childId={
            familyProfile
              .childId
          }
        />


        {/* ===================================================
            START NEW JOURNEY MODAL
        ==================================================== */}

        <StartNewJourneyModal
          visible={
            showStartNewJourneyConfirm
          }

          childName={
            familyProfile
              .childName
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


        {/* ===================================================
            REMOVE CHILD MODAL
        ==================================================== */}

        <RemoveChildModal
          visible={
            showRemoveChildConfirm
          }

          childName={
            familyProfile
              .childName
          }

          removing={
            removingChild
          }

          error={
            removeChildError
          }

          onCancel={() =>
            setShowRemoveChildConfirm(
              false
            )
          }

          onConfirm={
            confirmRemoveChild
          }
        />
      </>
    );
  }


  /*
   * ==========================================================
   * GENERATED JOURNEY — NOT YET SAVED
   * ==========================================================
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
   * ==========================================================
   * QUESTIONNAIRE / WELCOME
   * ==========================================================
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