"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";

import {
  signOut,
} from "firebase/auth";

import type {
  FamilyProfile,
} from "../../types/familyProfile";

import type {
  AITask,
  PersonalizedJourney,
} from "../../lib/ai/journeyTypes";

import {
  auth,
} from "../../lib/firebase";

import {
  getCurrentUser,
  watchAuthState,
} from "../../lib/auth";

import {
  savePendingJourney,
} from "../../lib/pendingJourney";

import {
  useAccountEntitlements,
} from "../../lib/useAccountEntitlements";

import {
  getCurrentJourney,
  saveCurrentJourney,
  saveTaskProgress,
} from "../../lib/journeyRepository";

import {
  getCurrentStageNumber,
  saveJourneyStage,
} from "../../lib/journeyHistory";

import FamilySnapshot from "../journey-dashboard/FamilySnapshot";
import CurrentFocusCard from "../journey-dashboard/CurrentFocusCard";
import ActionGuidanceSection from "../journey-dashboard/ActionGuidanceSection";
import JourneyResourcesSection from "../journey-dashboard/JourneyResourcesSection";
import SaveJourneyCard from "../journey-dashboard/SaveJourneyCard";
import AccountCard from "../journey-dashboard/AccountCard";
import JourneyProgressSection from "../journey-dashboard/JourneyProgressSection";


/*
 * ============================================================
 * PROPS
 * ============================================================
 */

interface JourneyDashboardProps {
  personalizedJourney:
    PersonalizedJourney;

  familyProfile:
    FamilyProfile;

  onJourneySaved?: (
    childId: string
  ) => void | Promise<void>;
}


/*
 * ============================================================
 * SHARED STYLES
 * ============================================================
 */

const styles: Record<
  string,
  CSSProperties
> = {

  main: {
    maxWidth:
      "1050px",

    margin:
      "0 auto",

    padding:
      "56px 24px 90px",
  },


  eyebrow: {
    color:
      "#2563EB",

    fontSize:
      "12px",

    fontWeight:
      800,

    letterSpacing:
      "0.08em",

    textTransform:
      "uppercase",
  },


  muted: {
    color:
      "#64748B",

    lineHeight:
      1.6,
  },

};


/*
 * ============================================================
 * JOURNEY DASHBOARD
 * ============================================================
 */

export default function JourneyDashboard({
  personalizedJourney:
    initialJourney,

  familyProfile,

  onJourneySaved,
}: JourneyDashboardProps) {

  /*
   * ----------------------------------------------------------
   * ENTITLEMENTS
   * ----------------------------------------------------------
   */

  const {
    canUse,

    loading:
      entitlementsLoading,
  } =
    useAccountEntitlements();


  /*
   * ----------------------------------------------------------
   * JOURNEY
   * ----------------------------------------------------------
   */

  const [
    personalizedJourney,
    setPersonalizedJourney,
  ] =
    useState<PersonalizedJourney>(
      initialJourney
    );


  const [
    tasks,
    setTasks,
  ] =
    useState<AITask[]>(
      initialJourney.tasks ||
      []
    );


  /*
   * ----------------------------------------------------------
   * ACTIVE JOURNEY ID
   * ----------------------------------------------------------
   */

  const [
    activeJourneyId,
    setActiveJourneyId,
  ] =
    useState<
      string | null
    >(
      null
    );


  /*
   * ----------------------------------------------------------
   * STAGE
   * ----------------------------------------------------------
   */

  const [
    journeyStageNumber,
    setJourneyStageNumber,
  ] =
    useState(
      1
    );


  const [
    loadingStageNumber,
    setLoadingStageNumber,
  ] =
    useState(
      true
    );


  /*
   * ----------------------------------------------------------
   * SAVE STATE
   * ----------------------------------------------------------
   */

  const [
    savingJourney,
    setSavingJourney,
  ] =
    useState(
      false
    );


  const [
    saveMessage,
    setSaveMessage,
  ] =
    useState(
      ""
    );


  const [
    saveError,
    setSaveError,
  ] =
    useState(
      ""
    );


  const [
    showSaveAccountPrompt,
    setShowSaveAccountPrompt,
  ] =
    useState(
      false
    );


  /*
   * ----------------------------------------------------------
   * NEXT JOURNEY
   * ----------------------------------------------------------
   */

  const [
    showNextAccountPrompt,
    setShowNextAccountPrompt,
  ] =
    useState(
      false
    );


  const [
    generatingNextJourney,
    setGeneratingNextJourney,
  ] =
    useState(
      false
    );


  const [
    nextJourneyError,
    setNextJourneyError,
  ] =
    useState(
      ""
    );


  /*
   * ----------------------------------------------------------
   * ACCOUNT
   * ----------------------------------------------------------
   */

  const [
    currentUserEmail,
    setCurrentUserEmail,
  ] =
    useState<
      string | null
    >(
      null
    );


  const [
    loggingOut,
    setLoggingOut,
  ] =
    useState(
      false
    );


  /*
   * ----------------------------------------------------------
   * TASK SAVE
   * ----------------------------------------------------------
   */

  const [
    taskSaveStatus,
    setTaskSaveStatus,
  ] =
    useState<
      | "idle"
      | "saving"
      | "error"
    >(
      "idle"
    );


  const taskSaveQueueRef =
    useRef<
      Promise<void>
    >(
      Promise.resolve()
    );


  /*
   * ==========================================================
   * RECEIVE UPDATED JOURNEY PROPS
   * ==========================================================
   */

  useEffect(
    () => {

      setPersonalizedJourney(
        initialJourney
      );


      setTasks(
        initialJourney.tasks ||
        []
      );

    },

    [
      initialJourney,
    ]
  );


  /*
   * ==========================================================
   * LOAD CHILD'S ACTIVE JOURNEY
   * ==========================================================
   */

  useEffect(
    () => {

      let active =
        true;


      const unsubscribe =
        watchAuthState(
          async (
            user
          ) => {

            if (
              !active
            ) {

              return;

            }


            setCurrentUserEmail(
              user?.email ??
              null
            );


            /*
             * ----------------------------------------------------
             * GUEST
             * ----------------------------------------------------
             */

            if (
              !user
            ) {

              setActiveJourneyId(
                null
              );


              setJourneyStageNumber(
                1
              );


              setLoadingStageNumber(
                false
              );


              return;

            }


            setLoadingStageNumber(
              true
            );


            try {

              /*
               * --------------------------------------------------
               * IMPORTANT
               *
               * Current Journey is CHILD-SPECIFIC.
               * --------------------------------------------------
               */

              const savedJourney =
                await getCurrentJourney(
                  user.uid,
                  familyProfile.childId
                );


              if (
                !active
              ) {

                return;

              }


              /*
               * --------------------------------------------------
               * EXISTING ACTIVE JOURNEY
               * --------------------------------------------------
               */

              if (
                savedJourney
              ) {

                setActiveJourneyId(
                  savedJourney.journeyId
                );


                setJourneyStageNumber(
                  Math.max(
                    1,
                    savedJourney.stageNumber
                  )
                );


                return;

              }


              /*
               * --------------------------------------------------
               * NO CURRENT JOURNEY
               *
               * This is a NEW Journey.
               *
               * It must start at Stage 1 regardless of old
               * Journey History or archived Journeys.
               * --------------------------------------------------
               */

              setActiveJourneyId(
                null
              );


              setJourneyStageNumber(
                1
              );

            } catch (
              error
            ) {

              console.error(
                "Unable to determine active journey:",
                error
              );


              if (
                active
              ) {

                setActiveJourneyId(
                  null
                );


                setJourneyStageNumber(
                  1
                );

              }

            } finally {

              if (
                active
              ) {

                setLoadingStageNumber(
                  false
                );

              }

            }

          }
        );


      return () => {

        active =
          false;


        unsubscribe();

      };

    },

    [
      familyProfile.childId,
    ]
  );


  /*
   * ==========================================================
   * PROGRESS
   * ==========================================================
   */

  const completedTasks =
    useMemo(
      () => {

        return tasks.filter(
          (
            task
          ) =>
            task.completed
        ).length;

      },

      [
        tasks,
      ]
    );


  const totalTasks =
    tasks.length;


  const taskPercent =
    totalTasks > 0

      ? Math.round(
          (
            completedTasks /
            totalTasks
          ) *
            100
        )

      : 0;


  const allTasksCompleted =
    tasks.length >
      0 &&

    tasks.every(
      (
        task
      ) =>
        task.completed
    );


  /*
   * ==========================================================
   * CURRENT ACTION
   * ==========================================================
   */

  const actions =
    personalizedJourney.actions ||
    [];


  const primaryAction =
    actions.length >
      0

      ? actions[0]

      : null;


  /*
   * ==========================================================
   * TOGGLE TASK
   * ==========================================================
   */

  function toggleTask(
    taskId:
      string
  ) {

    const currentUser =
      getCurrentUser();


    setTasks(
      (
        currentTasks
      ) => {

        const nextTasks =
          currentTasks.map(
            (
              task
            ) =>

              task.id ===
                taskId

                ? {
                    ...task,

                    completed:
                      !task.completed,
                  }

                : task
          );


        setNextJourneyError(
          ""
        );


        /*
         * --------------------------------------------------------
         * GUEST
         * --------------------------------------------------------
         */

        if (
          !currentUser
        ) {

          setTaskSaveStatus(
            "idle"
          );


          return nextTasks;

        }


        /*
         * --------------------------------------------------------
         * SAVE PROGRESS
         * --------------------------------------------------------
         */

        setTaskSaveStatus(
          "saving"
        );


        taskSaveQueueRef.current =

          taskSaveQueueRef.current

            .catch(
              () =>
                undefined
            )

            .then(
              async () => {

                try {

                  await saveTaskProgress(
                    currentUser.uid,

                    familyProfile,

                    {
                      ...personalizedJourney,

                      tasks:
                        nextTasks,
                    },

                    {
                      stageNumber:
                        journeyStageNumber,

                      journeyReason:
                        journeyStageNumber ===
                          1

                          ? "initial"

                          : "tasks_completed",
                    }
                  );


                  setTaskSaveStatus(
                    "idle"
                  );

                } catch (
                  error
                ) {

                  console.error(
                    "Unable to save task progress:",
                    error
                  );


                  setTaskSaveStatus(
                    "error"
                  );


                  setSaveError(
                    "Your task change is visible, but we couldn't save it right now. Please try again."
                  );

                }

              }
            );


        return nextTasks;

      }
    );

  }


  /*
   * ==========================================================
   * ENSURE ACTIVE JOURNEY
   * ==========================================================
   */

  async function ensureActiveJourney():
    Promise<
      string | null
    > {

    const currentUser =
      getCurrentUser();


    if (
      !currentUser
    ) {

      return null;

    }


    /*
     * ----------------------------------------------------------
     * ALREADY KNOWN
     * ----------------------------------------------------------
     */

    if (
      activeJourneyId
    ) {

      return activeJourneyId;

    }


    /*
     * ----------------------------------------------------------
     * CHECK FIRESTORE
     * ----------------------------------------------------------
     */

    const existingJourney =
      await getCurrentJourney(
        currentUser.uid,
        familyProfile.childId
      );


    if (
      existingJourney
    ) {

      setActiveJourneyId(
        existingJourney.journeyId
      );


      return existingJourney.journeyId;

    }


    /*
     * ----------------------------------------------------------
     * CREATE ACTIVE JOURNEY
     * ----------------------------------------------------------
     */

    const savedJourney =
      await saveCurrentJourney(
        currentUser.uid,

        familyProfile,

        {
          ...personalizedJourney,

          tasks,
        },

        {
          stageNumber:
            journeyStageNumber,

          journeyReason:
            journeyStageNumber ===
              1

              ? "initial"

              : "tasks_completed",
        }
      );


    setActiveJourneyId(
      savedJourney.journeyId
    );


    return savedJourney.journeyId;

  }


  /*
   * ==========================================================
   * SAVE JOURNEY
   * ==========================================================
   */

  async function handleSaveJourney() {

    setSaveMessage(
      ""
    );


    setSaveError(
      ""
    );


    const currentUser =
      getCurrentUser();


    /*
     * ----------------------------------------------------------
     * GUEST
     * ----------------------------------------------------------
     */

    if (
      !currentUser
    ) {

      savePendingJourney(
        familyProfile,

        {
          ...personalizedJourney,

          tasks,
        }
      );


      setShowSaveAccountPrompt(
        true
      );


      return;

    }


    setSavingJourney(
      true
    );


    try {

      const savedJourney =
        await saveCurrentJourney(
          currentUser.uid,

          familyProfile,

          {
            ...personalizedJourney,

            tasks,
          },

          {
            stageNumber:
              journeyStageNumber,

            journeyReason:
              journeyStageNumber ===
                1

                ? "initial"

                : "tasks_completed",

            ...(
              activeJourneyId

                ? {
                    journeyId:
                      activeJourneyId,
                  }

                : {}
            ),
          }
        );


      /*
       * --------------------------------------------------------
       * CRITICAL
       *
       * Keep the permanent Journey identity.
       * --------------------------------------------------------
       */

      setActiveJourneyId(
        savedJourney.journeyId
      );


      setSaveMessage(
        "Your journey has been saved."
      );


      setShowSaveAccountPrompt(
        false
      );


      /*
       * --------------------------------------------------------
       * INFORM JOURNEY BUILDER
       * --------------------------------------------------------
       */

      if (
        onJourneySaved
      ) {

        await onJourneySaved(
          familyProfile.childId
        );

      }

    } catch (
      error
    ) {

      console.error(
        "Unable to save journey:",
        error
      );


      setSaveError(
        "We couldn't save your journey right now. Please try again."
      );

    } finally {

      setSavingJourney(
        false
      );

    }

  }


  /*
   * ==========================================================
   * SHOW WHAT'S NEXT
   * ==========================================================
   */

  async function handleShowNextJourney() {

    if (
      !allTasksCompleted ||
      generatingNextJourney
    ) {

      return;

    }


    const currentUser =
      getCurrentUser();


    /*
     * ----------------------------------------------------------
     * GUEST
     * ----------------------------------------------------------
     */

    if (
      !currentUser
    ) {

      savePendingJourney(
        familyProfile,

        {
          ...personalizedJourney,

          tasks,
        }
      );


      setShowNextAccountPrompt(
        true
      );


      return;

    }


    /*
     * ----------------------------------------------------------
     * ENTITLEMENTS
     * ----------------------------------------------------------
     */

    if (
      entitlementsLoading
    ) {

      return;

    }


    if (
      !canUse(
        "next_journey"
      )
    ) {

      setNextJourneyError(
        "Your account does not currently have access to create the next Journey stage."
      );


      return;

    }


    setShowNextAccountPrompt(
      false
    );


    setNextJourneyError(
      ""
    );


    setSaveMessage(
      ""
    );


    setGeneratingNextJourney(
      true
    );


    try {

      /*
       * --------------------------------------------------------
       * AUTH TOKEN
       * --------------------------------------------------------
       */

      const idToken =
        await currentUser.getIdToken();


      /*
       * --------------------------------------------------------
       * MAKE SURE JOURNEY HAS A PERMANENT ID
       * --------------------------------------------------------
       */

      const journeyId =
        await ensureActiveJourney();


      if (
        !journeyId
      ) {

        throw new Error(
          "We couldn't identify the active Journey. Please save your Journey and try again."
        );

      }


      /*
       * --------------------------------------------------------
       * COMPLETED TASKS
       * --------------------------------------------------------
       */

      const completedTaskIds =
        tasks

          .filter(
            (
              task
            ) =>
              task.completed
          )

          .map(
            (
              task
            ) =>
              task.id
          );


      const completedTaskDetails =
        tasks.filter(
          (
            task
          ) =>
            task.completed
        );


      /*
       * --------------------------------------------------------
       * CURRENT STAGE SNAPSHOT
       * --------------------------------------------------------
       */

      const currentJourney:
        PersonalizedJourney = {

        ...personalizedJourney,

        tasks,

      };


      /*
       * --------------------------------------------------------
       * CURRENT JOURNEY HISTORY ONLY
       * --------------------------------------------------------
       */

      const lastCompletedStageNumber =
        await getCurrentStageNumber(
          currentUser.uid,
          familyProfile.childId,
          journeyId
        );


      let completedStageNumber =
        Math.max(
          1,
          journeyStageNumber
        );


      /*
       * --------------------------------------------------------
       * RETRY PROTECTION
       * --------------------------------------------------------
       */

      if (
        lastCompletedStageNumber >=
        completedStageNumber
      ) {

        completedStageNumber =
          lastCompletedStageNumber +
          1;

      }


      /*
       * --------------------------------------------------------
       * SAVE COMPLETED STAGE TO THIS JOURNEY'S HISTORY
       * --------------------------------------------------------
       */

      await saveJourneyStage(
        currentUser.uid,

        completedStageNumber,

        familyProfile,

        currentJourney,

        completedTaskIds,

        {
          journeyId,

          reason:
            completedStageNumber ===
              1

              ? "initial"

              : "tasks_completed",
        }
      );


      /*
       * --------------------------------------------------------
       * GENERATE NEXT STAGE
       * --------------------------------------------------------
       */

      const response =
        await fetch(
          "/api/journey/next",

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
              JSON.stringify(
                {
                  familyProfile,

                  currentJourney,

                  completedTaskIds,

                  completedTasks:
                    completedTaskDetails,

                  journeyId,
                }
              ),
          }
        );


      /*
       * --------------------------------------------------------
       * SAFE RESPONSE PARSING
       *
       * Prevent:
       *
       * Unexpected token '<'
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

        } catch {

          throw new Error(
            response.ok

              ? "The server returned an unexpected response."

              : "We couldn't create the next stage because the server returned an unexpected response."
          );

        }

      }


      /*
       * --------------------------------------------------------
       * AUTH ERROR
       * --------------------------------------------------------
       */

      if (
        response.status ===
        401
      ) {

        savePendingJourney(
          familyProfile,

          {
            ...personalizedJourney,

            tasks,
          }
        );


        setShowNextAccountPrompt(
          true
        );


        throw new Error(
          "Your login session has expired. Please log in again to continue your journey."
        );

      }


      /*
       * --------------------------------------------------------
       * API ERROR
       * --------------------------------------------------------
       */

      if (
        !response.ok
      ) {

        throw new Error(
          data?.error ||
          "Unable to create the next stage of your journey."
        );

      }


      if (
        !data?.journey
      ) {

        throw new Error(
          "The next stage of your journey was not returned."
        );

      }


      /*
       * --------------------------------------------------------
       * NEXT JOURNEY
       * --------------------------------------------------------
       */

      const nextJourney =
        data.journey as
          PersonalizedJourney;


      const nextStageNumber =
        completedStageNumber +
        1;


      /*
       * --------------------------------------------------------
       * SAVE NEW ACTIVE STAGE
       *
       * IMPORTANT:
       *
       * Same journeyId.
       *
       * A new Stage is NOT a new Journey.
       * --------------------------------------------------------
       */

      const savedJourney =
        await saveCurrentJourney(
          currentUser.uid,

          familyProfile,

          {
            ...nextJourney,

            tasks:
              nextJourney.tasks ||
              [],
          },

          {
            journeyId,

            stageNumber:
              nextStageNumber,

            previousCompletedTaskIds:
              completedTaskIds,

            journeyReason:
              "tasks_completed",
          }
        );


      setActiveJourneyId(
        savedJourney.journeyId
      );


      /*
       * --------------------------------------------------------
       * UPDATE UI
       * --------------------------------------------------------
       */

      setPersonalizedJourney(
        nextJourney
      );


      setTasks(
        nextJourney.tasks ||
        []
      );


      setJourneyStageNumber(
        nextStageNumber
      );


      setSaveMessage(
        `Journey Stage ${nextStageNumber} has been created and saved.`
      );


      /*
       * --------------------------------------------------------
       * INFORM BUILDER
       * --------------------------------------------------------
       */

      if (
        onJourneySaved
      ) {

        await onJourneySaved(
          familyProfile.childId
        );

      }


      /*
       * --------------------------------------------------------
       * SCROLL TO TOP AFTER NEW STAGE RENDERS
       * --------------------------------------------------------
       */

      window.requestAnimationFrame(
        () => {

          window.requestAnimationFrame(
            () => {

              window.scrollTo(
                {
                  top:
                    0,

                  behavior:
                    "smooth",
                }
              );

            }
          );

        }
      );

    } catch (
      error
    ) {

      console.error(
        "Unable to generate next journey:",
        error
      );


      setNextJourneyError(

        error instanceof Error

          ? error.message

          : "We couldn't create the next stage of your journey. Please try again."
      );

    } finally {

      setGeneratingNextJourney(
        false
      );

    }

  }


  /*
   * ==========================================================
   * LOG OUT
   * ==========================================================
   */

  async function handleLogout() {

    setLoggingOut(
      true
    );


    try {

      await signOut(
        auth
      );


      window.location.href =
        "/";

    } catch (
      error
    ) {

      console.error(
        "Logout error:",
        error
      );


      setLoggingOut(
        false
      );

    }

  }


  /*
 * ==========================================================
 * RENDER
 * ==========================================================
 */



return (

    <main
      style={
        styles.main
      }
    >

      {/* =====================================================
          HEADER
      ====================================================== */}

      <section
        style={{
          marginBottom:
            "34px",
        }}
      >

        <div
          style={{
            display:
              "flex",

            justifyContent:
              "space-between",

            alignItems:
              "center",

            gap:
              "20px",

            flexWrap:
              "wrap",

            marginBottom:
              "14px",
          }}
        >

          <div
            style={
              styles.eyebrow
            }
          >
            Your Personalized Journey
          </div>


          {!loadingStageNumber && (

            <div
              style={{
                display:
                  "inline-flex",

                alignItems:
                  "center",

                padding:
                  "8px 13px",

                borderRadius:
                  "999px",

                background:
                  "#EFF6FF",

                border:
                  "1px solid #BFDBFE",

                color:
                  "#2563EB",

                fontSize:
                  "12px",

                fontWeight:
                  800,
              }}
            >
              Journey Stage{" "}
              {journeyStageNumber}
            </div>

          )}

        </div>


        <h1
          style={{
            margin:
              0,

            maxWidth:
              "850px",

            fontSize:
              "46px",

            lineHeight:
              1.1,

            fontWeight:
              800,

            color:
              "#0F172A",
          }}
        >

          {
            familyProfile.childName

              ? `${familyProfile.childName}'s Personalized Journey`

              : "Your Personalized Journey"
          }

        </h1>


        <p
          style={{
            ...styles.muted,

            marginTop:
              "16px",

            marginBottom:
              0,

            maxWidth:
              "760px",

            fontSize:
              "18px",
          }}
        >
          Based on what you shared,
          we've identified where we'd
          recommend starting.
        </p>

      </section>


      <FamilySnapshot
        familyProfile={familyProfile}
      />


      <CurrentFocusCard
        personalizedJourney={personalizedJourney}
        journeyStageNumber={journeyStageNumber}
      />


      <ActionGuidanceSection
        primaryAction={primaryAction}
        familyProfile={familyProfile}
      />


      <JourneyResourcesSection
        resources={personalizedJourney.resources}
      />


      <SaveJourneyCard
        savingJourney={savingJourney}
        saveMessage={saveMessage}
        saveError={saveError}
        showSaveAccountPrompt={showSaveAccountPrompt}
        onSave={handleSaveJourney}
      />


      <AccountCard
        currentUserEmail={currentUserEmail}
        loggingOut={loggingOut}
        onLogout={handleLogout}
      />


      <JourneyProgressSection
        journeyStageNumber={journeyStageNumber}
        tasks={tasks}
        completedTasks={completedTasks}
        totalTasks={totalTasks}
        taskPercent={taskPercent}
        taskSaveStatus={taskSaveStatus}
        allTasksCompleted={allTasksCompleted}
        nextJourneyError={nextJourneyError}
        showNextAccountPrompt={showNextAccountPrompt}
        generatingNextJourney={generatingNextJourney}
        entitlementsLoading={entitlementsLoading}
        onToggleTask={toggleTask}
        onShowNextJourney={handleShowNextJourney}
      />


      <p
        style={{
          textAlign:
            "center",

          color:
            "#94A3B8",

          fontSize:
            "12px",

          lineHeight:
            1.5,

          marginTop:
            "50px",
        }}
      >
        Your recommendations are based on
        the information you provided and are
        intended to help you identify possible
        next steps.
      </p>

    </main>

  );

}