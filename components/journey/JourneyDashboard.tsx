"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import {
  doc,
  setDoc,
} from "firebase/firestore";

import {
  signOut,
} from "firebase/auth";

import type { FamilyProfile } from "../../types/familyProfile";

import type {
  PersonalizedJourney,
  AIResource,
} from "../../lib/ai/journeyTypes";

import type { Task } from "../../lib/journeyEngine";

import {
  auth,
  db,
} from "../../lib/firebase";

import {
  getCurrentUser,
  watchAuthState,
} from "../../lib/auth";

import {
  savePendingJourney,
} from "../../lib/journeyStorage";

import {
  canContinueToNextJourney,
} from "../../lib/accountEntitlements";

interface JourneyDashboardProps {
  personalizedJourney: PersonalizedJourney;
  familyProfile: FamilyProfile;
}


/*
 * ============================================================
 * FORMAT QUESTIONNAIRE VALUES
 * ============================================================
 */

function formatDisplayValue(
  value: string
) {
  if (!value) return "";

  return value
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}


/*
 * ============================================================
 * FORMAT RESOURCE TYPE
 * ============================================================
 */

function formatResourceType(
  type: AIResource["type"]
) {
  switch (type) {
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
 * JOURNEY DASHBOARD
 * ============================================================
 */

export default function JourneyDashboard({
  personalizedJourney: initialJourney,
  familyProfile,
}: JourneyDashboardProps) {

  /*
   * ----------------------------------------------------------
   * JOURNEY STATE
   * ----------------------------------------------------------
   *
   * This is the currently active journey stage.
   *
   * It begins with the AI's original journey.
   *
   * When What's Next is used, this state is replaced with
   * the newly generated next stage.
   */

  const [
    personalizedJourney,
    setPersonalizedJourney,
  ] = useState<PersonalizedJourney>(
    initialJourney
  );


  /*
   * ----------------------------------------------------------
   * TASK STATE
   * ----------------------------------------------------------
   */

  const [
    tasks,
    setTasks,
  ] = useState<Task[]>(
    initialJourney.tasks || []
  );


  /*
   * ----------------------------------------------------------
   * SAVE STATE
   * ----------------------------------------------------------
   */

  const [
    savingJourney,
    setSavingJourney,
  ] = useState(false);

  const [
    saveMessage,
    setSaveMessage,
  ] = useState("");

  const [
    saveError,
    setSaveError,
  ] = useState("");

  const [
    showSaveAccountPrompt,
    setShowSaveAccountPrompt,
  ] = useState(false);


  /*
   * ----------------------------------------------------------
   * ACCOUNT STATE
   * ----------------------------------------------------------
   */

  const [
    currentUserEmail,
    setCurrentUserEmail,
  ] = useState<string | null>(null);

  const [
    loggingOut,
    setLoggingOut,
  ] = useState(false);


  /*
   * ----------------------------------------------------------
   * NEXT JOURNEY STATE
   * ----------------------------------------------------------
   */

  const [
    generatingNextJourney,
    setGeneratingNextJourney,
  ] = useState(false);

  const [
    nextJourneyError,
    setNextJourneyError,
  ] = useState("");

  const [
    showNextAccountPrompt,
    setShowNextAccountPrompt,
  ] = useState(false);


  /*
   * ----------------------------------------------------------
   * AUTH STATE LISTENER
   * ----------------------------------------------------------
   */

  useEffect(() => {

    const unsubscribe =
      watchAuthState(
        (user) => {

          setCurrentUserEmail(
            user?.email ?? null
          );

        }
      );


    return () => {
      unsubscribe();
    };

  }, []);


  /*
   * ----------------------------------------------------------
   * TASK PROGRESS
   * ----------------------------------------------------------
   */

  const completedTasks =
    useMemo(() => {

      return tasks.filter(
        (task) =>
          task.completed
      ).length;

    }, [tasks]);


  const totalTasks =
    tasks.length;


  const taskPercent =
    totalTasks > 0
      ? Math.round(
          (completedTasks /
            totalTasks) *
            100
        )
      : 0;


  /*
   * ----------------------------------------------------------
   * ALL TASKS COMPLETED
   * ----------------------------------------------------------
   *
   * This is the only condition that unlocks the
   * What's Next button.
   */

  const allTasksCompleted =
    tasks.length > 0 &&
    tasks.every(
      (task) =>
        task.completed
    );


  /*
   * ==========================================================
   * TOGGLE TASK
   * ==========================================================
   */

  function toggleTask(
    taskId: string
  ) {

    setTasks(
      (currentTasks) =>
        currentTasks.map(
          (task) =>
            task.id === taskId
              ? {
                  ...task,
                  completed:
                    !task.completed,
                }
              : task
        )
    );

    /*
     * Clear any previous next-stage error if the family
     * changes task completion status again.
     */

    setNextJourneyError("");

  }


  /*
   * ==========================================================
   * SAVE JOURNEY
   * ==========================================================
   */

  async function handleSaveJourney() {

    setSaveMessage("");
    setSaveError("");


    const currentUser =
      getCurrentUser();


    /*
     * --------------------------------------------------------
     * GUEST USER
     * --------------------------------------------------------
     */

    if (!currentUser) {

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


    /*
     * --------------------------------------------------------
     * LOGGED-IN USER
     * --------------------------------------------------------
     */

    setSavingJourney(true);


    try {

      const journeyRef =
        doc(
          db,
          "users",
          currentUser.uid,
          "journeys",
          "current"
        );


      await setDoc(
        journeyRef,
        {
          familyProfile,

          journey: {
            ...personalizedJourney,
            tasks,
          },

          updatedAt:
            Date.now(),

          createdBy:
            currentUser.uid,
        },
        {
          merge: true,
        }
      );


      setSaveMessage(
        "Your journey has been saved."
      );


      setShowSaveAccountPrompt(
        false
      );

    } catch (error) {

      console.error(
        "Unable to save journey:",
        error
      );


      setSaveError(
        "We couldn't save your journey right now. Please try again."
      );

    } finally {

      setSavingJourney(false);

    }

  }


  /*
   * ==========================================================
   * GENERATE NEXT JOURNEY
   * ==========================================================
   *
   * This is the new progression engine.
   *
   * The AI receives:
   *
   * 1. Original family profile
   * 2. Current journey
   * 3. Completed task IDs
   * 4. Completed task details
   *
   * It then determines what should come next.
   */

  async function handleShowNextJourney() {

    if (
      !allTasksCompleted ||
      generatingNextJourney
    ) {
      return;
    }
  
  
    /*
     * ----------------------------------------------------------
     * VERIFY ACCOUNT
     * ----------------------------------------------------------
     *
     * Guests can complete the first journey, but an account
     * is required before the AI generates the next stage.
     */
  
    const currentUser =
      getCurrentUser();
  
  
    if (
      !currentUser ||
      !canContinueToNextJourney()
    ) {
  
      /*
       * Preserve the completed journey so the login/signup
       * flow can continue from this point.
       */
  
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
     * AUTHENTICATED USER
     * ----------------------------------------------------------
     */
  
    setShowNextAccountPrompt(
      false
    );
  
  
    setGeneratingNextJourney(
      true
    );
  
    setNextJourneyError("");
  
  
    try {
  
      /*
       * --------------------------------------------------------
       * FIREBASE ID TOKEN
       * --------------------------------------------------------
       *
       * This token is sent to the server so the API can verify
       * that the caller is actually authenticated.
       */
  
      const idToken =
        await currentUser.getIdToken();
  
  
      /*
       * --------------------------------------------------------
       * GET COMPLETED TASK INFORMATION
       * --------------------------------------------------------
       */
  
      const completedTaskIds =
        tasks
          .filter(
            (task) =>
              task.completed
          )
          .map(
            (task) =>
              task.id
          );
  
  
      const completedTaskDetails =
        tasks.filter(
          (task) =>
            task.completed
        );
  
  
      /*
       * --------------------------------------------------------
       * CURRENT JOURNEY SNAPSHOT
       * --------------------------------------------------------
       */
  
      const currentJourney = {
        ...personalizedJourney,
  
        tasks,
      };
  
  
      /*
       * --------------------------------------------------------
       * CALL NEXT-JOURNEY API
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
              JSON.stringify({
                familyProfile,
  
                currentJourney,
  
                completedTaskIds,
  
                completedTasks:
                  completedTaskDetails,
              }),
          }
        );
  
  
      const data =
        await response.json();
  
  
      /*
       * --------------------------------------------------------
       * API ERROR
       * --------------------------------------------------------
       */
  
      if (!response.ok) {
  
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
       * RECEIVE NEXT JOURNEY
       * --------------------------------------------------------
       */
  
      const nextJourney =
        data.journey as PersonalizedJourney;
  
  
      /*
       * --------------------------------------------------------
       * UPDATE ACTIVE JOURNEY
       * --------------------------------------------------------
       */
  
      setPersonalizedJourney(
        nextJourney
      );
  
  
      setTasks(
        nextJourney.tasks || []
      );
  
  
      /*
       * --------------------------------------------------------
       * SAVE NEXT JOURNEY
       * --------------------------------------------------------
       *
       * The user is authenticated, so save the new stage.
       */
  
      const journeyRef =
        doc(
          db,
          "users",
          currentUser.uid,
          "journeys",
          "current"
        );
  
  
      await setDoc(
        journeyRef,
        {
          familyProfile,
  
          journey: {
            ...nextJourney,
  
            tasks:
              nextJourney.tasks ||
              [],
          },
  
          updatedAt:
            Date.now(),
  
          createdBy:
            currentUser.uid,
  
          previousCompletedTaskIds:
            completedTaskIds,
  
          journeyReason:
            "tasks_completed",
        },
        {
          merge: true,
        }
      );
  
  
      setSaveMessage(
        "Your next journey stage has been saved."
      );
  
  
    } catch (error) {
  
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

    setLoggingOut(true);


    try {

      await signOut(auth);


      window.location.href =
        "/";

    } catch (error) {

      console.error(
        "Logout error:",
        error
      );


      setLoggingOut(false);

    }

  }


  /*
   * ==========================================================
   * CURRENT ACTION
   * ==========================================================
   *
   * We continue displaying the first AI action.
   *
   * IMPORTANT:
   *
   * The separate "What's Next" action cards are NOT shown
   * anymore. The next-stage AI engine controls what comes next.
   */

  const actions =
    personalizedJourney.actions ||
    [];


  const primaryAction =
    actions.length > 0
      ? actions[0]
      : null;


  return (

    <main
      style={{
        maxWidth:
          "1050px",

        margin:
          "0 auto",

        padding:
          "56px 24px 90px",
      }}
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
            color:
              "#2563EB",

            fontSize:
              "13px",

            fontWeight:
              800,

            letterSpacing:
              "0.08em",

            textTransform:
              "uppercase",

            marginBottom:
              "12px",
          }}
        >
          Your Personalized Journey
        </div>


        <h1
          style={{
            fontSize:
              "46px",

            lineHeight:
              1.1,

            fontWeight:
              800,

            color:
              "#0F172A",

            margin:
              0,

            maxWidth:
              "850px",
          }}
        >
          {familyProfile.childName
            ? `${familyProfile.childName}'s Personalized Journey`
            : "Your Personalized Journey"}
        </h1>


        <p
          style={{
            marginTop:
              "16px",

            maxWidth:
              "760px",

            fontSize:
              "18px",

            lineHeight:
              1.65,

            color:
              "#64748B",

            marginBottom:
              0,
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
          background:
            "#F8FAFC",

          border:
            "1px solid #E2E8F0",

          borderRadius:
            "20px",

          padding:
            "24px",

          marginBottom:
            "30px",
        }}
      >

        <div
          style={{
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


        {familyProfile.supports.length >
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

              {familyProfile.supports.map(
                (support) => (

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
                    {formatDisplayValue(
                      support
                    )}
                  </span>

                )
              )}

            </div>

          </div>

        )}


        {familyProfile.priority && (

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
              {formatDisplayValue(
                familyProfile.priority
              )}
            </div>

          </div>

        )}

      </section>


      {/* =====================================================
          START HERE
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

                fontSize:
                  "15px",

                fontWeight:
                  800,
              }}
            >
              1
            </span>


            <span
              style={{
                color:
                  "#2563EB",

                fontSize:
                  "13px",

                fontWeight:
                  800,

                letterSpacing:
                  "0.08em",

                textTransform:
                  "uppercase",
              }}
            >
              Start Here
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
              marginTop:
                "13px",

              marginBottom:
                0,

              maxWidth:
                "800px",

              color:
                "#475569",

              fontSize:
                "17px",

              lineHeight:
                1.65,
            }}
          >
            {
              personalizedJourney
                .currentFocus
                .explanation
            }
          </p>


          {personalizedJourney.nextStep && (

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
                  fontSize:
                    "12px",

                  fontWeight:
                    800,

                  color:
                    "#2563EB",

                  textTransform:
                    "uppercase",

                  letterSpacing:
                    "0.06em",

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
                  margin:
                    "7px 0 0",

                  color:
                    "#64748B",

                  lineHeight:
                    1.6,

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

          )}

        </div>

      </section>


      {/* =====================================================
          HOW TO DO IT
      ====================================================== */}

      {primaryAction && (

        <section
          style={{
            marginBottom:
              "36px",
          }}
        >

          <SectionHeading
            eyebrow="How to Do It"
            title="Your first action"
            description="Here's a practical way to get started."
          />


          <div
            style={{
              marginTop:
                "22px",

              padding:
                "28px",

              borderRadius:
                "20px",

              border:
                "1px solid #E2E8F0",

              background:
                "#FFFFFF",

              boxShadow:
                "0 6px 18px rgba(15, 23, 42, 0.04)",
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

                letterSpacing:
                  "0.04em",

                marginBottom:
                  "13px",
              }}
            >
              {primaryAction.priority} Priority
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


              {primaryAction.nextStep && (

                <GuidanceBlock
                  label="Then"
                  text={
                    primaryAction.nextStep
                  }
                />

              )}

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

        </section>

      )}


      {/* =====================================================
          RESOURCES
      ====================================================== */}

      {personalizedJourney
        .resources?.length >
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
                  (resource) => (

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

      )}


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
            padding:
              "26px",

            borderRadius:
              "20px",

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
              margin:
                "9px auto 18px",

              maxWidth:
                "620px",

              color:
                "#475569",

              fontSize:
                "15px",

              lineHeight:
                1.6,
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
              padding:
                "13px 22px",

              borderRadius:
                "10px",

              border:
                "none",

              background:
                savingJourney
                  ? "#93C5FD"
                  : "#2563EB",

              color:
                "#FFFFFF",

              fontSize:
                "15px",

              fontWeight:
                800,

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


          {saveMessage && (

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

          )}


          {saveError && (

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

          )}


          {showSaveAccountPrompt && (

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
                Create a free account or log in
                to save your journey.
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

          )}

        </div>

      </section>


      {/* =====================================================
          ACCOUNT
      ====================================================== */}

      {currentUserEmail && (

        <section
          style={{
            marginBottom:
              "35px",
          }}
        >

          <div
            style={{
              padding:
                "22px 24px",

              borderRadius:
                "18px",

              border:
                "1px solid #E2E8F0",

              background:
                "#FFFFFF",

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
                  color:
                    "#64748B",

                  fontSize:
                    "12px",

                  fontWeight:
                    800,

                  textTransform:
                    "uppercase",

                  letterSpacing:
                    "0.06em",

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

      )}


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
          eyebrow="Your Progress"
          title="Keep moving at your own pace"
          description="Complete the suggested tasks to unlock your next stage."
        />


        <div
          style={{
            marginTop:
              "22px",

            padding:
              "23px",

            borderRadius:
              "20px",

            background:
              "#F8FAFC",

            border:
              "1px solid #E2E8F0",
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

          {tasks.map(
            (task) => (

              <TaskCard
                key={
                  task.id
                }

                task={
                  task
                }

                onToggle={() =>
                  toggleTask(
                    task.id
                  )
                }
              />

            )
          )}

        </div>


        {/* ===================================================
            NEXT STAGE UNLOCK
        ==================================================== */}

        {allTasksCompleted && (

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
              You've completed your
              current steps.
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
              Great work. Now let's use what
              you've accomplished to determine
              what should come next in your
              journey.
            </p>


            {nextJourneyError && (

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

            )}


            <button
              type="button"

              onClick={
                handleShowNextJourney
              }

              disabled={
                generatingNextJourney
              }

              style={{
                padding:
                  "13px 22px",

                borderRadius:
                  "10px",

                border:
                  "none",

                background:
                  generatingNextJourney
                    ? "#6EE7B7"
                    : "#059669",

                color:
                  "#FFFFFF",

                fontSize:
                  "15px",

                fontWeight:
                  800,

                cursor:
                  generatingNextJourney
                    ? "default"
                    : "pointer",

                minWidth:
                  "210px",
              }}
            >
              {
                generatingNextJourney
                  ? "Building What's Next..."
                  : "Show Me What's Next →"
              }
            </button>


            {showNextAccountPrompt && (

              <div
                style={{
                  margin:
                    "22px auto 0",

                  maxWidth:
                    "650px",

                  paddingTop:
                    "20px",

                  borderTop:
                    "1px solid #A7F3D0",
                }}
              >

                <div
                  style={{
                    color:
                      "#065F46",

                    fontSize:
                      "15px",

                    fontWeight:
                      700,

                    marginBottom:
                      "7px",
                  }}
                >
                  Your next stage is ready to unlock.
                </div>


                <p
                  style={{
                    margin:
                      "0 auto 14px",

                    color:
                      "#047857",

                    fontSize:
                      "14px",

                    lineHeight:
                      1.6,
                  }}
                >
                  Create a free account or log in to continue your personalized journey and keep your progress saved.
                </p>


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

            )}

          </div>

        )}

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


/* =========================================================
   SNAPSHOT ITEM
========================================================= */

function SnapshotItem({
  label,
  value,
}: {
  label: string;
  value: string;
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


/* =========================================================
   SECTION HEADING
========================================================= */

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {

  return (

    <div>

      <div
        style={{
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
          maxWidth:
            "720px",

          color:
            "#64748B",

          fontSize:
            "15px",

          lineHeight:
            1.6,

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


/* =========================================================
   GUIDANCE BLOCK
========================================================= */

function GuidanceBlock({
  label,
  text,
}: {
  label: string;
  text: string;
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


/* =========================================================
   RESOURCE CARD
========================================================= */

function ResourceCard({
  resource,
}: {
  resource: AIResource;
}) {

  return (

    <div
      style={{
        padding:
          "23px",

        borderRadius:
          "18px",

        border:
          "1px solid #E2E8F0",

        background:
          "#FFFFFF",

        boxShadow:
          "0 5px 15px rgba(15, 23, 42, 0.03)",
      }}
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

          letterSpacing:
            "0.04em",

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
          color:
            "#64748B",

          lineHeight:
            1.55,

          fontSize:
            "14px",

          margin:
            "9px 0 14px",
        }}
      >
        {resource.description}
      </p>


      {resource.whyItMayHelp && (

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

      )}


      {resource.sourceName && (

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
            resource.sourceName
          }
        </div>

      )}


      {resource.url && (

        <a
          href={
            resource.url
          }

          target="_blank"

          rel="noreferrer"

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

      )}

    </div>

  );
}


/* =========================================================
   TASK CARD
========================================================= */

function TaskCard({
  task,
  onToggle,
}: {
  task: Task;
  onToggle: () => void;
}) {

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
            marginTop:
              "6px",

            marginBottom:
              "6px",

            color:
              "#64748B",

            lineHeight:
              1.5,

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


        {task.resourceLink && (

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

              rel="noreferrer"

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

        )}

      </div>

    </div>

  );
}