"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";

import Link from "next/link";

import {
  signOut,
} from "firebase/auth";

import type {
  FamilyProfile,
} from "../../types/familyProfile";

import type {
  AIAction,
  AIResource,
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
 * ACTION TEMPLATE
 * ============================================================
 */

type ActionTemplate = {
  id: string;

  title: string;

  description: string;

  content: string;
};


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


  card: {
    padding:
      "24px",

    borderRadius:
      "20px",

    border:
      "1px solid #E2E8F0",

    background:
      "#FFFFFF",
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


  button: {
    padding:
      "13px 22px",

    borderRadius:
      "10px",

    border:
      "none",

    color:
      "#FFFFFF",

    fontSize:
      "15px",

    fontWeight:
      800,

    cursor:
      "pointer",
  },

};


/*
 * ============================================================
 * HELPERS
 * ============================================================
 */

function formatDisplayValue(
  value: string
) {

  if (!value) {
    return "";
  }


  return value

    .replace(
      /[-_]/g,
      " "
    )

    .replace(
      /\b\w/g,
      (
        letter
      ) =>
        letter.toUpperCase()
    );

}


function formatResourceType(
  type:
    AIResource["type"]
) {

  switch (
    type
  ) {

    case "grant":
      return "Grant";

    case "government":
      return "Government";

    case "insurance":
      return "Insurance";

    case "therapy":
      return "Therapy";

    case "school":
      return "School";

    case "financial":
      return "Financial Support";

    case "support":
      return "Support";

    default:
      return "Resource";

  }

}


/*
 * ============================================================
 * SAFE EXTERNAL URL
 * ============================================================
 */

function isSafeExternalUrl(
  value?: string
) {

  if (
    !value
  ) {

    return false;

  }


  try {

    const url =
      new URL(
        value
      );


    return (
      url.protocol ===
        "https:" ||

      url.protocol ===
        "http:"
    );

  } catch {

    return false;

  }

}


/*
 * ============================================================
 * ACTION STARTER TEMPLATES
 * ============================================================
 */

function buildActionTemplates(
  action:
    AIAction,

  familyProfile:
    FamilyProfile
): ActionTemplate[] {

  const childName =
    familyProfile.childName ||
    "my child";


  return [

    {
      id:
        "email",

      title:
        "Email Starter",

      description:
        "A simple message you can personalize and send.",

      content:
`Subject: Support for ${childName}

Hello,

I'm reaching out regarding ${childName}.

Our current priority is to ${action.action.toLowerCase()}.

Could you please let me know:

• What the next steps are
• What forms or records you need from me
• Whether there are any deadlines
• Who I should contact with questions

Thank you for your help.

Best,
[Your Name]`,
    },


    {
      id:
        "checklist",

      title:
        "Quick Checklist",

      description:
        "Use this before a call, appointment, or meeting.",

      content:
`Checklist for: ${action.title}

☐ Write down the main goal
☐ Gather relevant records or forms
☐ Gather insurance information if needed
☐ Write down important names and contacts
☐ Ask what the next step is
☐ Ask when you should follow up
☐ Write down any deadlines
☐ Save copies of anything submitted`,
    },


    {
      id:
        "questions",

      title:
        "Questions to Ask",

      description:
        "Starter questions to help you feel prepared.",

      content:
`Questions for: ${action.title}

1. What should I do first?

2. What documents or information do you need?

3. Are there eligibility requirements?

4. Are there deadlines I should know about?

5. How long does this process usually take?

6. Who should I contact with follow-up questions?

7. Are there other supports or programs I should know about?

8. What should I do if I don't hear back?`,
    },

  ];

}


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


  const actionTemplates =
    useMemo(
      () => {

        if (
          !primaryAction
        ) {

          return [];

        }


        return buildActionTemplates(
          primaryAction,
          familyProfile
        );

      },

      [
        primaryAction,
        familyProfile,
      ]
    );


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


      {/* =====================================================
          FAMILY SNAPSHOT
      ====================================================== */}

      <section
        style={{
          ...styles.card,

          background:
            "#F8FAFC",

          marginBottom:
            "30px",
        }}
      >

        <div
          style={{
            ...styles.eyebrow,

            marginBottom:
              "18px",
          }}
        >
          Your Family Snapshot
        </div>


        <div
          style={{
            display:
              "grid",

            gridTemplateColumns:
              "repeat(auto-fit, minmax(170px, 1fr))",

            gap:
              "20px",
          }}
        >

          <SnapshotItem
            label="Age"

            value={
              familyProfile.childAge

                ? `${familyProfile.childAge} years`

                : "Not provided"
            }
          />


          <SnapshotItem
            label="Location"

            value={
              familyProfile.state

                ? formatDisplayValue(
                    familyProfile.state
                  )

                : "Not provided"
            }
          />


          <SnapshotItem
            label="Journey Stage"

            value={
              familyProfile.journeyStage

                ? formatDisplayValue(
                    familyProfile.journeyStage
                  )

                : "Not provided"
            }
          />


          <SnapshotItem
            label="Insurance"

            value={
              familyProfile.insurance

                ? formatDisplayValue(
                    familyProfile.insurance
                  )

                : "Not provided"
            }
          />

        </div>


        {
          familyProfile.supports?.length >
            0 && (

            <div
              style={{
                marginTop:
                  "22px",

                paddingTop:
                  "20px",

                borderTop:
                  "1px solid #E2E8F0",
              }}
            >

              <div
                style={{
                  fontSize:
                    "13px",

                  fontWeight:
                    700,

                  color:
                    "#475569",

                  marginBottom:
                    "9px",
                }}
              >
                Current Supports
              </div>


              <div
                style={{
                  display:
                    "flex",

                  flexWrap:
                    "wrap",

                  gap:
                    "7px",
                }}
              >

                {
                  familyProfile.supports.map(
                    (
                      support
                    ) => (

                      <span
                        key={
                          support
                        }

                        style={{
                          padding:
                            "7px 12px",

                          borderRadius:
                            "999px",

                          background:
                            "#FFFFFF",

                          border:
                            "1px solid #CBD5E1",

                          color:
                            "#334155",

                          fontSize:
                            "13px",

                          fontWeight:
                            600,
                        }}
                      >

                        {
                          formatDisplayValue(
                            support
                          )
                        }

                      </span>

                    )
                  )
                }

              </div>

            </div>

          )
        }


        {
          familyProfile.priority && (

            <div
              style={{
                marginTop:
                  "20px",
              }}
            >

              <div
                style={{
                  fontSize:
                    "13px",

                  fontWeight:
                    700,

                  color:
                    "#475569",

                  marginBottom:
                    "5px",
                }}
              >
                Top Priority
              </div>


              <div
                style={{
                  fontSize:
                    "17px",

                  fontWeight:
                    700,

                  color:
                    "#0F172A",
                }}
              >

                {
                  formatDisplayValue(
                    familyProfile.priority
                  )
                }

              </div>

            </div>

          )
        }

      </section>


      {/* =====================================================
          CURRENT FOCUS
      ====================================================== */}

      <section
        style={{
          marginBottom:
            "32px",
        }}
      >

        <div
          style={{
            borderRadius:
              "22px",

            border:
              "1px solid #BFDBFE",

            background:
              "linear-gradient(135deg, #EFF6FF, #F0FDFA)",

            padding:
              "32px",

            boxShadow:
              "0 10px 26px rgba(15, 23, 42, 0.06)",
          }}
        >

          <div
            style={{
              display:
                "flex",

              alignItems:
                "center",

              gap:
                "10px",

              marginBottom:
                "12px",
            }}
          >

            <span
              style={{
                display:
                  "inline-flex",

                alignItems:
                  "center",

                justifyContent:
                  "center",

                width:
                  "30px",

                height:
                  "30px",

                borderRadius:
                  "50%",

                background:
                  "#2563EB",

                color:
                  "#FFFFFF",

                fontWeight:
                  800,
              }}
            >
              {journeyStageNumber}
            </span>


            <span
              style={
                styles.eyebrow
              }
            >
              Current Focus
            </span>

          </div>


          <h2
            style={{
              margin:
                0,

              fontSize:
                "32px",

              lineHeight:
                1.2,

              color:
                "#0F172A",

              fontWeight:
                800,
            }}
          >

            {
              personalizedJourney
                .currentFocus
                .title
            }

          </h2>


          <p
            style={{
              ...styles.muted,

              marginTop:
                "13px",

              marginBottom:
                0,

              maxWidth:
                "800px",

              fontSize:
                "17px",
            }}
          >

            {
              personalizedJourney
                .currentFocus
                .explanation
            }

          </p>


          {
            personalizedJourney.nextStep && (

              <div
                style={{
                  marginTop:
                    "24px",

                  paddingTop:
                    "22px",

                  borderTop:
                    "1px solid #BFDBFE",
                }}
              >

                <div
                  style={{
                    ...styles.eyebrow,

                    marginBottom:
                      "7px",
                  }}
                >
                  Your Next Best Step
                </div>


                <div
                  style={{
                    fontSize:
                      "19px",

                    fontWeight:
                      750,

                    color:
                      "#0F172A",
                  }}
                >

                  {
                    personalizedJourney
                      .nextStep
                      .title
                  }

                </div>


                <p
                  style={{
                    ...styles.muted,

                    margin:
                      "7px 0 0",

                    fontSize:
                      "15px",

                    maxWidth:
                      "780px",
                  }}
                >

                  {
                    personalizedJourney
                      .nextStep
                      .description
                  }

                </p>

              </div>

            )
          }

        </div>

      </section>


      {/* =====================================================
          HOW TO DO IT
      ====================================================== */}

      {
        primaryAction && (

          <section
            style={{
              marginBottom:
                "40px",
            }}
          >

            <SectionHeading
              eyebrow="How to Do It"

              title="Your first action"

              description="Here's a practical way to get started."
            />


            <div
              style={{
                ...styles.card,

                marginTop:
                  "22px",
              }}
            >

              <div
                style={{
                  display:
                    "inline-flex",

                  padding:
                    "5px 10px",

                  borderRadius:
                    "999px",

                  background:
                    "#EFF6FF",

                  color:
                    "#2563EB",

                  fontSize:
                    "11px",

                  fontWeight:
                    800,

                  textTransform:
                    "uppercase",

                  marginBottom:
                    "13px",
                }}
              >
                {primaryAction.priority}{" "}
                Priority
              </div>


              <h3
                style={{
                  margin:
                    0,

                  color:
                    "#0F172A",

                  fontSize:
                    "23px",

                  lineHeight:
                    1.3,
                }}
              >
                {primaryAction.title}
              </h3>


              <div
                style={{
                  display:
                    "grid",

                  gap:
                    "18px",

                  marginTop:
                    "20px",
                }}
              >

                <GuidanceBlock
                  label="Why it matters"

                  text={
                    primaryAction.whyItMatters
                  }
                />


                <GuidanceBlock
                  label="What to do"

                  text={
                    primaryAction.action
                  }
                />


                <GuidanceBlock
                  label="How to do it"

                  text={
                    primaryAction.howTo
                  }
                />


                {
                  primaryAction.nextStep && (

                    <GuidanceBlock
                      label="Then"

                      text={
                        primaryAction.nextStep
                      }
                    />

                  )
                }

              </div>


              <div
                style={{
                  marginTop:
                    "20px",

                  paddingTop:
                    "16px",

                  borderTop:
                    "1px solid #E2E8F0",

                  color:
                    "#94A3B8",

                  fontSize:
                    "13px",
                }}
              >
                Estimated time:{" "}
                {
                  primaryAction
                    .estimatedTime
                }
              </div>

            </div>


            {/* =================================================
                STARTER TEMPLATES
            ================================================== */}

            {
              actionTemplates.length >
                0 && (

                <div
                  style={{
                    marginTop:
                      "28px",
                  }}
                >

                  <SectionHeading
                    eyebrow="Starter Templates"

                    title="Ready-to-use starting points"

                    description="Copy a starter and personalize it for your family."
                  />


                  <div
                    style={{
                      display:
                        "grid",

                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(260px, 1fr))",

                      gap:
                        "16px",

                      marginTop:
                        "18px",
                    }}
                  >

                    {
                      actionTemplates.map(
                        (
                          template
                        ) => (

                          <TemplateCard
                            key={
                              template.id
                            }

                            template={
                              template
                            }
                          />

                        )
                      )
                    }

                  </div>

                </div>

              )
            }

          </section>

        )
      }


      {/* =====================================================
          RESOURCES
      ====================================================== */}

      {
        personalizedJourney.resources?.length >
          0 && (

          <section
            style={{
              marginBottom:
                "48px",
            }}
          >

            <SectionHeading
              eyebrow="Resources"

              title="Resources selected for you"

              description="These resources were selected based on your family's situation and priorities."
            />


            <div
              style={{
                display:
                  "grid",

                gridTemplateColumns:
                  "repeat(auto-fit, minmax(290px, 1fr))",

                gap:
                  "18px",

                marginTop:
                  "22px",
              }}
            >

              {
                personalizedJourney
                  .resources
                  .map(
                    (
                      resource
                    ) => (

                      <ResourceCard
                        key={
                          resource.id
                        }

                        resource={
                          resource
                        }
                      />

                    )
                  )
              }

            </div>

          </section>

        )
      }


      {/* =====================================================
          SAVE JOURNEY
      ====================================================== */}

      <section
        style={{
          marginBottom:
            "35px",
        }}
      >

        <div
          style={{
            ...styles.card,

            border:
              "1px solid #BFDBFE",

            background:
              "#EFF6FF",

            textAlign:
              "center",
          }}
        >

          <h2
            style={{
              margin:
                0,

              color:
                "#0F172A",

              fontSize:
                "23px",

              fontWeight:
                800,
            }}
          >
            Want to keep your journey?
          </h2>


          <p
            style={{
              ...styles.muted,

              margin:
                "9px auto 18px",

              maxWidth:
                "620px",

              fontSize:
                "15px",
            }}
          >
            Save your personalized journey so
            you can come back to it and keep
            moving forward.
          </p>


          <button
            type="button"

            onClick={
              handleSaveJourney
            }

            disabled={
              savingJourney
            }

            style={{
              ...styles.button,

              background:
                savingJourney

                  ? "#93C5FD"

                  : "#2563EB",

              cursor:
                savingJourney

                  ? "default"

                  : "pointer",
            }}
          >

            {
              savingJourney

                ? "Saving..."

                : "💾 Save My Journey"
            }

          </button>


          {
            saveMessage && (

              <div
                style={{
                  marginTop:
                    "15px",

                  color:
                    "#047857",

                  fontSize:
                    "14px",

                  fontWeight:
                    700,
                }}
              >
                ✓ {saveMessage}
              </div>

            )
          }


          {
            saveError && (

              <div
                style={{
                  marginTop:
                    "15px",

                  color:
                    "#B91C1C",

                  fontSize:
                    "14px",

                  lineHeight:
                    1.5,
                }}
              >
                {saveError}
              </div>

            )
          }


          {
            showSaveAccountPrompt && (

              <AccountLinks
                message="Create a free account or log in to save your journey."
              />

            )
          }

        </div>

      </section>


      {/* =====================================================
          ACCOUNT
      ====================================================== */}

      {
        currentUserEmail && (

          <section
            style={{
              marginBottom:
                "35px",
            }}
          >

            <div
              style={{
                ...styles.card,

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
              }}
            >

              <div>

                <div
                  style={{
                    ...styles.eyebrow,

                    color:
                      "#64748B",

                    marginBottom:
                      "5px",
                  }}
                >
                  Your Account
                </div>


                <div
                  style={{
                    color:
                      "#0F172A",

                    fontSize:
                      "15px",

                    fontWeight:
                      700,
                  }}
                >
                  {currentUserEmail}
                </div>

              </div>


              <button
                type="button"

                onClick={
                  handleLogout
                }

                disabled={
                  loggingOut
                }

                style={{
                  padding:
                    "10px 18px",

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
                    loggingOut

                      ? "default"

                      : "pointer",
                }}
              >

                {
                  loggingOut

                    ? "Logging Out..."

                    : "Log Out"
                }

              </button>

            </div>

          </section>

        )
      }


      {/* =====================================================
          PROGRESS
      ====================================================== */}

      <section
        style={{
          marginBottom:
            "35px",
        }}
      >

        <SectionHeading
          eyebrow={`Journey Stage ${journeyStageNumber}`}

          title="Keep moving at your own pace"

          description="Complete the suggested tasks to unlock your next stage."
        />


        <div
          style={{
            ...styles.card,

            marginTop:
              "22px",

            background:
              "#F8FAFC",
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
                "12px",

              marginBottom:
                "10px",
            }}
          >

            <strong
              style={{
                color:
                  "#0F172A",
              }}
            >
              Journey Progress
            </strong>


            <span
              style={{
                color:
                  "#475569",

                fontSize:
                  "13px",
              }}
            >
              {completedTasks} of{" "}
              {totalTasks} completed
            </span>

          </div>


          <div
            style={{
              height:
                "9px",

              background:
                "#E2E8F0",

              borderRadius:
                "999px",

              overflow:
                "hidden",
            }}
          >

            <div
              style={{
                width:
                  `${taskPercent}%`,

                height:
                  "100%",

                background:
                  "linear-gradient(90deg, #2563EB, #14B8A6)",

                transition:
                  "width .3s ease",
              }}
            />

          </div>


          {
            taskSaveStatus ===
              "saving" && (

              <div
                style={{
                  marginTop:
                    "8px",

                  color:
                    "#64748B",

                  fontSize:
                    "12px",

                  textAlign:
                    "right",
                }}
              >
                Saving your progress...
              </div>

            )
          }


          {
            taskSaveStatus ===
              "error" && (

              <div
                style={{
                  marginTop:
                    "8px",

                  color:
                    "#B91C1C",

                  fontSize:
                    "12px",

                  textAlign:
                    "right",
                }}
              >
                We couldn't save your latest task change.
              </div>

            )
          }

        </div>


        <div
          style={{
            display:
              "grid",

            gap:
              "12px",

            marginTop:
              "16px",
          }}
        >

          {
            tasks.map(
              (
                task
              ) => (

                <TaskCard
                  key={
                    task.id
                  }

                  task={
                    task
                  }

                  onToggle={
                    () =>
                      toggleTask(
                        task.id
                      )
                  }
                />

              )
            )
          }

        </div>


        {/* ===================================================
            NEXT STAGE
        ==================================================== */}

        {
          allTasksCompleted && (

            <div
              style={{
                marginTop:
                  "22px",

                padding:
                  "26px",

                borderRadius:
                  "18px",

                background:
                  "#ECFDF5",

                border:
                  "1px solid #A7F3D0",

                textAlign:
                  "center",
              }}
            >

              <div
                style={{
                  fontSize:
                    "28px",

                  marginBottom:
                    "8px",
                }}
              >
                🎉
              </div>


              <h3
                style={{
                  margin:
                    0,

                  color:
                    "#065F46",

                  fontSize:
                    "22px",
                }}
              >
                You've completed Journey Stage{" "}
                {journeyStageNumber}.
              </h3>


              <p
                style={{
                  color:
                    "#047857",

                  lineHeight:
                    1.6,

                  margin:
                    "9px auto 18px",

                  maxWidth:
                    "650px",
                }}
              >
                Great work. We'll build on what
                you've accomplished to determine
                what should come next.
              </p>


              {
                nextJourneyError && (

                  <div
                    role="alert"

                    style={{
                      margin:
                        "0 auto 16px",

                      maxWidth:
                        "650px",

                      padding:
                        "12px 14px",

                      borderRadius:
                        "10px",

                      background:
                        "#FEF2F2",

                      border:
                        "1px solid #FECACA",

                      color:
                        "#B91C1C",

                      fontSize:
                        "14px",

                      lineHeight:
                        1.5,

                      textAlign:
                        "left",
                    }}
                  >
                    {nextJourneyError}
                  </div>

                )
              }


              {
                showNextAccountPrompt && (

                  <AccountLinks
                    message="Create a free account or log in to continue your personalized journey and unlock your next steps."
                  />

                )
              }


              <button
                type="button"

                onClick={
                  handleShowNextJourney
                }

                disabled={
                  generatingNextJourney ||
                  entitlementsLoading
                }

                style={{
                  ...styles.button,

                  background:
                    generatingNextJourney ||
                    entitlementsLoading

                      ? "#6EE7B7"

                      : "#059669",

                  cursor:
                    generatingNextJourney ||
                    entitlementsLoading

                      ? "default"

                      : "pointer",

                  minWidth:
                    "210px",
                }}
              >

                {
                  generatingNextJourney

                    ? "Building What's Next..."

                    : entitlementsLoading

                    ? "Checking Access..."

                    : "Show Me What's Next →"
                }

              </button>

            </div>

          )
        }

      </section>


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


/*
 * ============================================================
 * SNAPSHOT ITEM
 * ============================================================
 */

function SnapshotItem({
  label,
  value,
}: {
  label:
    string;

  value:
    string;
}) {

  return (

    <div>

      <div
        style={{
          fontSize:
            "12px",

          fontWeight:
            700,

          color:
            "#64748B",

          marginBottom:
            "5px",

          textTransform:
            "uppercase",

          letterSpacing:
            "0.04em",
        }}
      >
        {label}
      </div>


      <div
        style={{
          fontSize:
            "16px",

          fontWeight:
            700,

          color:
            "#0F172A",
        }}
      >
        {value}
      </div>

    </div>

  );

}


/*
 * ============================================================
 * SECTION HEADING
 * ============================================================
 */

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow:
    string;

  title:
    string;

  description:
    string;
}) {

  return (

    <div>

      <div
        style={{
          ...styles.eyebrow,

          marginBottom:
            "7px",
        }}
      >
        {eyebrow}
      </div>


      <h2
        style={{
          margin:
            0,

          color:
            "#0F172A",

          fontSize:
            "29px",

          fontWeight:
            800,

          lineHeight:
            1.2,
        }}
      >
        {title}
      </h2>


      <p
        style={{
          ...styles.muted,

          maxWidth:
            "720px",

          fontSize:
            "15px",

          marginTop:
            "8px",

          marginBottom:
            0,
        }}
      >
        {description}
      </p>

    </div>

  );

}


/*
 * ============================================================
 * GUIDANCE BLOCK
 * ============================================================
 */

function GuidanceBlock({
  label,
  text,
}: {
  label:
    string;

  text:
    string;
}) {

  return (

    <div>

      <div
        style={{
          color:
            "#334155",

          fontSize:
            "13px",

          fontWeight:
            800,

          marginBottom:
            "5px",
        }}
      >
        {label}
      </div>


      <div
        style={{
          color:
            "#64748B",

          fontSize:
            "15px",

          lineHeight:
            1.6,
        }}
      >
        {text}
      </div>

    </div>

  );

}


/*
 * ============================================================
 * RESOURCE CARD
 * ============================================================
 */

function ResourceCard({
  resource,
}: {
  resource:
    AIResource;
}) {

  const safeUrl =
    isSafeExternalUrl(
      resource.url
    );


  return (

    <div
      style={
        styles.card
      }
    >

      <div
        style={{
          display:
            "inline-flex",

          padding:
            "5px 9px",

          borderRadius:
            "999px",

          background:
            "#F8FAFC",

          color:
            "#475569",

          fontSize:
            "10px",

          fontWeight:
            800,

          textTransform:
            "uppercase",

          marginBottom:
            "11px",
        }}
      >

        {
          formatResourceType(
            resource.type
          )
        }

      </div>


      <h3
        style={{
          margin:
            0,

          color:
            "#0F172A",

          fontSize:
            "19px",

          lineHeight:
            1.3,
        }}
      >
        {resource.title}
      </h3>


      <p
        style={{
          ...styles.muted,

          fontSize:
            "14px",

          margin:
            "9px 0 14px",
        }}
      >
        {resource.description}
      </p>


      {
        resource.whyItMayHelp && (

          <div
            style={{
              marginBottom:
                "14px",

              padding:
                "12px 13px",

              borderRadius:
                "11px",

              background:
                "#F8FAFC",

              color:
                "#475569",

              fontSize:
                "13px",

              lineHeight:
                1.5,
            }}
          >

            <strong>
              Why it may help:
            </strong>{" "}

            {
              resource
                .whyItMayHelp
            }

          </div>

        )
      }


      {
        resource.sourceName && (

          <div
            style={{
              color:
                "#94A3B8",

              fontSize:
                "12px",

              marginBottom:
                "12px",
            }}
          >

            Source:{" "}

            {
              resource
                .sourceName
            }

          </div>

        )
      }


      {
        safeUrl && (

          <a
            href={
              resource.url
            }

            target="_blank"

            rel="noopener noreferrer"

            style={{
              display:
                "inline-block",

              color:
                "#2563EB",

              fontSize:
                "14px",

              fontWeight:
                700,

              textDecoration:
                "none",
            }}
          >
            View Resource →
          </a>

        )
      }

    </div>

  );

}


/*
 * ============================================================
 * TASK CARD
 * ============================================================
 */

function TaskCard({
  task,
  onToggle,
}: {
  task:
    AITask;

  onToggle:
    () => void;
}) {

  const safeResourceLink =
    isSafeExternalUrl(
      task.resourceLink
    );


  return (

    <div
      style={{
        display:
          "flex",

        alignItems:
          "flex-start",

        gap:
          "15px",

        padding:
          "18px",

        borderRadius:
          "16px",

        border:
          task.completed

            ? "1px solid #A7F3D0"

            : "1px solid #E2E8F0",

        background:
          task.completed

            ? "#F0FDF4"

            : "#FFFFFF",
      }}
    >

      <button
        type="button"

        onClick={
          onToggle
        }

        aria-label={
          task.completed

            ? `Mark ${task.title} incomplete`

            : `Mark ${task.title} complete`
        }

        style={{
          flexShrink:
            0,

          width:
            "27px",

          height:
            "27px",

          borderRadius:
            "8px",

          border:
            task.completed

              ? "none"

              : "2px solid #CBD5E1",

          background:
            task.completed

              ? "#059669"

              : "#FFFFFF",

          color:
            "#FFFFFF",

          cursor:
            "pointer",

          fontWeight:
            800,

          fontSize:
            "15px",
        }}
      >

        {
          task.completed

            ? "✓"

            : ""
        }

      </button>


      <div
        style={{
          flex:
            1,
        }}
      >

        <div
          style={{
            display:
              "flex",

            flexWrap:
              "wrap",

            alignItems:
              "center",

            gap:
              "8px",
          }}
        >

          <h3
            style={{
              margin:
                0,

              color:
                task.completed

                  ? "#64748B"

                  : "#0F172A",

              fontSize:
                "17px",

              lineHeight:
                1.3,

              textDecoration:
                task.completed

                  ? "line-through"

                  : "none",
            }}
          >
            {task.title}
          </h3>


          <span
            style={{
              padding:
                "3px 7px",

              borderRadius:
                "999px",

              background:
                task.priority ===
                  "High"

                  ? "#FEF2F2"

                  : task.priority ===
                    "Medium"

                  ? "#FFFBEB"

                  : "#F8FAFC",

              color:
                task.priority ===
                  "High"

                  ? "#DC2626"

                  : task.priority ===
                    "Medium"

                  ? "#D97706"

                  : "#64748B",

              fontSize:
                "10px",

              fontWeight:
                800,

              textTransform:
                "uppercase",
            }}
          >
            {task.priority}
          </span>

        </div>


        <p
          style={{
            ...styles.muted,

            marginTop:
              "6px",

            marginBottom:
              "6px",

            fontSize:
              "14px",
          }}
        >
          {task.description}
        </p>


        <span
          style={{
            color:
              "#94A3B8",

            fontSize:
              "12px",
          }}
        >

          Estimated time:{" "}

          {
            task.estimatedTime
          }

        </span>


        {
          safeResourceLink && (

            <div
              style={{
                marginTop:
                  "8px",
              }}
            >

              <a
                href={
                  task.resourceLink
                }

                target="_blank"

                rel="noopener noreferrer"

                style={{
                  color:
                    "#2563EB",

                  fontSize:
                    "13px",

                  fontWeight:
                    700,

                  textDecoration:
                    "none",
                }}
              >
                Open Resource →
              </a>

            </div>

          )
        }

      </div>

    </div>

  );

}


/*
 * ============================================================
 * TEMPLATE CARD
 * ============================================================
 */

function TemplateCard({
  template,
}: {
  template:
    ActionTemplate;
}) {

  const [
    copied,
    setCopied,
  ] =
    useState(
      false
    );


  async function copyTemplate() {

    try {

      await navigator.clipboard.writeText(
        template.content
      );


      setCopied(
        true
      );


      window.setTimeout(
        () => {

          setCopied(
            false
          );

        },

        1800
      );

    } catch {

      setCopied(
        false
      );

    }

  }


  return (

    <div
      style={{
        ...styles.card,

        display:
          "flex",

        flexDirection:
          "column",

        minHeight:
          "220px",
      }}
    >

      <h3
        style={{
          margin:
            0,

          color:
            "#0F172A",

          fontSize:
            "18px",
        }}
      >
        {template.title}
      </h3>


      <p
        style={{
          ...styles.muted,

          margin:
            "8px 0 14px",

          fontSize:
            "14px",
        }}
      >
        {template.description}
      </p>


      <pre
        style={{
          whiteSpace:
            "pre-wrap",

          wordBreak:
            "break-word",

          background:
            "#F8FAFC",

          border:
            "1px solid #E2E8F0",

          borderRadius:
            "12px",

          padding:
            "14px",

          color:
            "#475569",

          fontFamily:
            "inherit",

          fontSize:
            "13px",

          lineHeight:
            1.5,

          flex:
            1,
        }}
      >
        {template.content}
      </pre>


      <button
        type="button"

        onClick={
          copyTemplate
        }

        style={{
          marginTop:
            "12px",

          padding:
            "10px 14px",

          borderRadius:
            "9px",

          border:
            "1px solid #2563EB",

          background:
            copied

              ? "#EFF6FF"

              : "#FFFFFF",

          color:
            "#2563EB",

          fontWeight:
            700,

          cursor:
            "pointer",
        }}
      >

        {
          copied

            ? "Copied ✓"

            : "Copy Template"
        }

      </button>

    </div>

  );

}


/*
 * ============================================================
 * ACCOUNT LINKS
 * ============================================================
 */

function AccountLinks({
  message,
}: {
  message:
    string;
}) {

  return (

    <div
      style={{
        marginTop:
          "22px",

        paddingTop:
          "20px",

        borderTop:
          "1px solid #BFDBFE",
      }}
    >

      <div
        style={{
          color:
            "#0F172A",

          fontSize:
            "15px",

          fontWeight:
            700,

          marginBottom:
            "12px",
        }}
      >
        {message}
      </div>


      <div
        style={{
          display:
            "flex",

          justifyContent:
            "center",

          gap:
            "10px",

          flexWrap:
            "wrap",
        }}
      >

        <Link
          href="/login"

          style={{
            padding:
              "10px 18px",

            borderRadius:
              "9px",

            background:
              "#2563EB",

            color:
              "#FFFFFF",

            fontSize:
              "14px",

            fontWeight:
              700,

            textDecoration:
              "none",
          }}
        >
          Log In
        </Link>


        <Link
          href="/signup"

          style={{
            padding:
              "10px 18px",

            borderRadius:
              "9px",

            border:
              "1px solid #2563EB",

            background:
              "#FFFFFF",

            color:
              "#2563EB",

            fontSize:
              "14px",

            fontWeight:
              700,

            textDecoration:
              "none",
          }}
        >
          Create Free Account
        </Link>

      </div>

    </div>

  );

}