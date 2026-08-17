"use client";

import { useEffect, useState } from "react";

import {
  doc,
  getDoc,
} from "firebase/firestore";

import type { FamilyProfile } from "../../types/familyProfile";
import type { PersonalizedJourney } from "../../lib/ai/journeyTypes";

import {
  auth,
  db,
} from "../../lib/firebase";

import {
  watchAuthState,
} from "../../lib/auth";

import Welcome from "./Welcome";
import ChildName from "./ChildName";
import ChildAge from "./ChildAge";
import StateSelector from "./StateSelector";
import JourneyStage from "./JourneyStage";
import Supports from "./Supports";
import Priority from "./Priority";
import ProgressBar from "./ProgressBar";
import GeneratingJourney from "./GeneratingJourney";
import JourneyDashboard from "./JourneyDashboard";


export default function JourneyBuilder() {

  /*
   * ============================================================
   * QUESTIONNAIRE
   * ============================================================
   *
   * The questionnaire has exactly 7 questions.
   *
   * Question 7 = Insurance
   */

  const totalQuestions = 7;


  /*
   * ============================================================
   * BASIC STATE
   * ============================================================
   */

  const [step, setStep] =
    useState(0);

  const [isGenerating, setIsGenerating] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);


  /*
   * ============================================================
   * PERSONALIZED JOURNEY
   * ============================================================
   */

  const [
    personalizedJourney,
    setPersonalizedJourney,
  ] = useState<PersonalizedJourney | null>(
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
  ] = useState<FamilyProfile>({
    childName: "",
    childAge: "",
    state: "",
    journeyStage: "",
    supports: [],
    priority: "",
    insurance: "",
    notes: "",
  });


  /*
   * ============================================================
   * AUTH / SAVED JOURNEY STATE
   * ============================================================
   *
   * We need to wait for Firebase to tell us whether the user
   * is logged in before deciding whether to:
   *
   *   1. Show the questionnaire
   *   2. Load a saved journey
   *
   * This prevents a returning user from briefly seeing the
   * questionnaire while Firebase restores their session.
   */

  const [
    checkingSavedJourney,
    setCheckingSavedJourney,
  ] = useState(true);


  const [
    savedJourneyLoaded,
    setSavedJourneyLoaded,
  ] = useState(false);


  /*
   * ============================================================
   * CHECK FOR SAVED JOURNEY
   * ============================================================
   *
   * This runs whenever Firebase authentication changes.
   *
   * Logged in:
   *
   *   Check:
   *
   *   users/{uid}/journeys/current
   *
   * Logged out:
   *
   *   Show the normal questionnaire.
   */

  useEffect(() => {

    const unsubscribe =
      watchAuthState(
        async (user) => {

          /*
           * ----------------------------------------------------
           * NO USER
           * ----------------------------------------------------
           *
           * There is no saved account journey to load.
           *
           * The visitor can use the free questionnaire.
           */

          if (!user) {

            setCheckingSavedJourney(
              false
            );

            setSavedJourneyLoaded(
              false
            );

            return;
          }


          /*
           * ----------------------------------------------------
           * USER IS LOGGED IN
           * ----------------------------------------------------
           */

          setCheckingSavedJourney(
            true
          );


          try {

            const journeyRef =
              doc(
                db,
                "users",
                user.uid,
                "journeys",
                "current"
              );


            const journeySnapshot =
              await getDoc(
                journeyRef
              );


            /*
             * --------------------------------------------------
             * NO SAVED JOURNEY
             * --------------------------------------------------
             *
             * This is a new account.
             *
             * Allow the user to start the questionnaire.
             */

            if (
              !journeySnapshot.exists()
            ) {

              setSavedJourneyLoaded(
                false
              );

              setCheckingSavedJourney(
                false
              );

              return;
            }


            /*
             * --------------------------------------------------
             * SAVED JOURNEY FOUND
             * --------------------------------------------------
             */

            const savedData =
              journeySnapshot.data();


              const savedProfile = (
                savedData?.familyProfile
              ) as FamilyProfile | undefined;
              
              const savedJourney = (
                savedData?.journey
              ) as PersonalizedJourney | undefined;

            /*
             * --------------------------------------------------
             * BASIC VALIDATION
             * --------------------------------------------------
             *
             * Make sure both pieces exist before attempting
             * to restore the dashboard.
             */

            if (
              !savedProfile ||
              !savedJourney
            ) {

              console.warn(
                "Saved journey exists but is incomplete."
              );


              setSavedJourneyLoaded(
                false
              );

              setCheckingSavedJourney(
                false
              );

              return;
            }


            /*
             * --------------------------------------------------
             * RESTORE PROFILE
             * --------------------------------------------------
             */

            setFamilyProfile(
              savedProfile
            );


            /*
             * --------------------------------------------------
             * RESTORE JOURNEY
             * --------------------------------------------------
             */

            setPersonalizedJourney(
              savedJourney
            );


            /*
             * --------------------------------------------------
             * MARK AS LOADED
             * --------------------------------------------------
             */

            setSavedJourneyLoaded(
              true
            );

          } catch (error) {

            console.error(
              "Unable to load saved journey:",
              error
            );


            /*
             * Do not prevent the family from using
             * the free questionnaire if loading fails.
             */

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


    /*
     * ----------------------------------------------------------
     * CLEANUP
     * ----------------------------------------------------------
     */

    return () => {
      unsubscribe();
    };

  }, []);


  /*
   * ============================================================
   * SCROLL TO TOP — QUESTIONNAIRE
   * ============================================================
   *
   * Automatically move the user to the top whenever the
   * questionnaire step changes.
   */

  useEffect(() => {

    if (step > 0) {

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

    }

  }, [step]);


  /*
   * ============================================================
   * SCROLL TO TOP — JOURNEY
   * ============================================================
   *
   * Prevents the results page from opening at the previous
   * questionnaire scroll position.
   */

  useEffect(() => {

    if (personalizedJourney) {

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

    }

  }, [personalizedJourney]);


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
      (current) => ({
        ...current,
        [field]: value,
      })
    );

  }


  /*
   * ============================================================
   * GENERATE PERSONALIZED JOURNEY
   * ============================================================
   *
   * Sends the completed questionnaire to the AI generation API.
   */

  async function generatePersonalizedJourney() {

    setIsGenerating(true);

    setError(null);


    try {

      console.log(
        "Sending family profile to AI:",
        familyProfile
      );


      const response =
        await fetch(
          "/api/journey/generate",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                familyProfile,
              }),
          }
        );


      const data =
        await response.json();


      if (!response.ok) {

        throw new Error(
          data?.error ||
            "Unable to generate your personalized journey."
        );

      }


      if (!data?.journey) {

        throw new Error(
          "The AI did not return a personalized journey."
        );

      }


      console.log(
        "AI personalized journey received:",
        data.journey
      );


      setPersonalizedJourney(
        data.journey
      );

    } catch (err) {

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

      setIsGenerating(false);

    }

  }


  /*
   * ============================================================
   * START A NEW JOURNEY
   * ============================================================
   *
   * A returning user may already have a saved journey but
   * still want to begin a new questionnaire.
   *
   * This does NOT delete the saved journey from Firestore.
   *
   * It simply clears the current screen and starts a new
   * questionnaire session.
   */

  function startNewJourney() {

    setPersonalizedJourney(
      null
    );


    setFamilyProfile({
      childName: "",
      childAge: "",
      state: "",
      journeyStage: "",
      supports: [],
      priority: "",
      insurance: "",
      notes: "",
    });


    setStep(0);

    setError(null);

    setSavedJourneyLoaded(
      false
    );

  }


  /*
   * ============================================================
   * NEXT QUESTION
   * ============================================================
   */

  function nextStep() {

    if (
      step < totalQuestions
    ) {

      setStep(
        (current) =>
          current + 1
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

    if (step > 1) {

      setStep(
        (current) =>
          current - 1
      );

    }

  }


  /*
   * ============================================================
   * CAN CONTINUE
   * ============================================================
   */

  function canContinue() {

    switch (step) {

      case 1:

        return (
          familyProfile
            .childName
            .trim() !== ""
        );


      case 2:

        return (
          familyProfile
            .childAge !== ""
        );


      case 3:

        return (
          familyProfile
            .state !== ""
        );


      case 4:

        return (
          familyProfile
            .journeyStage !== ""
        );


      case 5:

        return (
          familyProfile
            .supports.length > 0
        );


      case 6:

        return (
          familyProfile
            .priority !== ""
        );


      case 7:

        return (
          familyProfile
            .insurance !== ""
        );


      default:

        return true;

    }

  }


  /*
   * ============================================================
   * AUTHENTICATION / SAVED JOURNEY LOADING SCREEN
   * ============================================================
   *
   * We don't want a returning user to see the questionnaire
   * while we're checking Firestore.
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
            We're checking whether you
            have a saved journey.
          </p>

        </div>

      </div>

    );

  }


  /*
   * ============================================================
   * GENERATING SCREEN
   * ============================================================
   */

  if (isGenerating) {

    return (
      <GeneratingJourney />
    );

  }


  /*
   * ============================================================
   * ERROR SCREEN
   * ============================================================
   */

  if (error) {

    return (

      <div
        style={{
          maxWidth:
            "700px",

          margin:
            "80px auto",

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

            marginBottom:
              "16px",
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

            marginBottom:
              "28px",
          }}
        >
          {error}
        </p>


        <button
          type="button"

          onClick={() => {

            setError(null);

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

    );

  }


  /*
   * ============================================================
   * SAVED JOURNEY
   * ============================================================
   *
   * If Firestore returned a saved journey, show the dashboard.
   *
   * This is what allows a returning user to log in and
   * immediately continue where they left off.
   */

  if (
    personalizedJourney &&
    savedJourneyLoaded
  ) {

    return (

      <>

        <JourneyDashboard
          personalizedJourney={
            personalizedJourney
          }

          familyProfile={
            familyProfile
          }
        />


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

          <button
            type="button"

            onClick={
              startNewJourney
            }

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

      </>

    );

  }


  /*
   * ============================================================
   * NEWLY GENERATED JOURNEY
   * ============================================================
   *
   * This is the normal free journey experience.
   *
   * We intentionally show the dashboard even when the journey
   * was just generated and has not yet been saved.
   */

  if (
    personalizedJourney
  ) {

    return (

      <JourneyDashboard
        personalizedJourney={
          personalizedJourney
        }

        familyProfile={
          familyProfile
        }
      />

    );

  }


  /*
   * ============================================================
   * QUESTIONNAIRE
   * ============================================================
   */

  return (

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

      {/* =====================================================
          WELCOME
      ====================================================== */}

      {step === 0 && (

        <Welcome
          onBegin={() =>
            setStep(1)
          }
        />

      )}


      {/* =====================================================
          QUESTIONNAIRE
      ====================================================== */}

      {step > 0 && (

        <>

          <ProgressBar
            currentStep={
              step
            }

            totalSteps={
              totalQuestions
            }
          />


          {/* =================================================
              QUESTION 1
          ================================================== */}

          {step === 1 && (

            <ChildName
              value={
                familyProfile
                  .childName
              }

              onChange={(
                value
              ) =>
                updateProfile(
                  "childName",
                  value
                )
              }
            />

          )}


          {/* =================================================
              QUESTION 2
          ================================================== */}

          {step === 2 && (

            <ChildAge
              value={
                familyProfile
                  .childAge
              }

              onChange={(
                value
              ) =>
                updateProfile(
                  "childAge",
                  value
                )
              }
            />

          )}


          {/* =================================================
              QUESTION 3
          ================================================== */}

          {step === 3 && (

            <StateSelector
              value={
                familyProfile
                  .state
              }

              onChange={(
                value
              ) =>
                updateProfile(
                  "state",
                  value
                )
              }
            />

          )}


          {/* =================================================
              QUESTION 4
          ================================================== */}

          {step === 4 && (

            <JourneyStage
              value={
                familyProfile
                  .journeyStage
              }

              onChange={(
                value
              ) =>
                updateProfile(
                  "journeyStage",
                  value
                )
              }
            />

          )}


          {/* =================================================
              QUESTION 5
          ================================================== */}

          {step === 5 && (

            <Supports
              value={
                familyProfile
                  .supports
              }

              onChange={(
                value
              ) =>
                updateProfile(
                  "supports",
                  value
                )
              }
            />

          )}


          {/* =================================================
              QUESTION 6
          ================================================== */}

          {step === 6 && (

            <Priority
              value={
                familyProfile
                  .priority
              }

              onChange={(
                value
              ) =>
                updateProfile(
                  "priority",
                  value
                )
              }
            />

          )}


          {/* =================================================
              QUESTION 7 — INSURANCE
          ================================================== */}

          {step === 7 && (

            <div
              style={{
                maxWidth:
                  "650px",

                margin:
                  "0 auto",
              }}
            >

              <h2
                style={{
                  fontSize:
                    "36px",

                  fontWeight:
                    800,

                  color:
                    "#0F172A",

                  marginBottom:
                    "12px",
                }}
              >
                What type of insurance does
                your child have?
              </h2>


              <p
                style={{
                  fontSize:
                    "18px",

                  lineHeight:
                    1.7,

                  color:
                    "#64748B",

                  marginBottom:
                    "28px",
                }}
              >
                This helps us personalize
                recommendations related to
                services, coverage, and
                available resources.
              </p>


              <div
                style={{
                  display:
                    "grid",

                  gap:
                    "16px",
                }}
              >

                {[
                  {
                    value:
                      "private",

                    title:
                      "Private Insurance",

                    description:
                      "Insurance through an employer, individual plan, or another private health plan.",
                  },

                  {
                    value:
                      "medicaid",

                    title:
                      "Medicaid",

                    description:
                      "My child is covered by Medicaid or a Medicaid managed-care plan.",
                  },

                  {
                    value:
                      "none",

                    title:
                      "No Insurance",

                    description:
                      "My child does not currently have health insurance.",
                  },

                ].map(
                  (option) => {

                    const selected =
                      familyProfile
                        .insurance ===
                      option.value;


                    return (

                      <button
                        key={
                          option.value
                        }

                        type="button"

                        onClick={() =>
                          updateProfile(
                            "insurance",
                            option.value
                          )
                        }

                        style={{
                          width:
                            "100%",

                          textAlign:
                            "left",

                          padding:
                            "24px",

                          borderRadius:
                            "16px",

                          border:
                            selected
                              ? "2px solid #2563EB"
                              : "1px solid #CBD5E1",

                          background:
                            selected
                              ? "#EFF6FF"
                              : "#FFFFFF",

                          cursor:
                            "pointer",

                          boxShadow:
                            selected
                              ? "0 6px 18px rgba(37, 99, 235, 0.12)"
                              : "0 2px 8px rgba(15, 23, 42, 0.04)",
                        }}
                      >

                        <div
                          style={{
                            display:
                              "flex",

                            alignItems:
                              "flex-start",

                            gap:
                              "16px",
                          }}
                        >

                          <div
                            style={{
                              width:
                                "22px",

                              height:
                                "22px",

                              minWidth:
                                "22px",

                              borderRadius:
                                "50%",

                              border:
                                selected
                                  ? "6px solid #2563EB"
                                  : "2px solid #CBD5E1",

                              background:
                                "#FFFFFF",

                              marginTop:
                                "2px",

                              boxSizing:
                                "border-box",
                            }}
                          />


                          <div>

                            <h3
                              style={{
                                margin:
                                  0,

                                marginBottom:
                                  "6px",

                                fontSize:
                                  "21px",

                                fontWeight:
                                  700,

                                color:
                                  "#0F172A",
                              }}
                            >
                              {
                                option.title
                              }
                            </h3>


                            <p
                              style={{
                                margin:
                                  0,

                                fontSize:
                                  "16px",

                                lineHeight:
                                  1.6,

                                color:
                                  "#64748B",
                              }}
                            >
                              {
                                option.description
                              }
                            </p>

                          </div>

                        </div>

                      </button>

                    );

                  }
                )}

              </div>


              <p
                style={{
                  marginTop:
                    "20px",

                  fontSize:
                    "14px",

                  color:
                    "#94A3B8",

                  lineHeight:
                    1.5,
                }}
              >
                You can update your
                insurance information
                later if your coverage
                changes.
              </p>

            </div>

          )}


          {/* =================================================
              NAVIGATION BUTTONS
          ================================================== */}

          <div
            style={{
              marginTop:
                "50px",

              display:
                "flex",

              justifyContent:
                "space-between",

              gap:
                "20px",
            }}
          >

            <button
              type="button"

              onClick={
                previousStep
              }

              disabled={
                step === 1
              }

              style={{
                padding:
                  "14px 28px",

                borderRadius:
                  "10px",

                border:
                  "1px solid #D1D5DB",

                background:
                  step === 1
                    ? "#E5E7EB"
                    : "#FFFFFF",

                color:
                  "#0F172A",

                cursor:
                  step === 1
                    ? "not-allowed"
                    : "pointer",

                fontWeight:
                  600,
              }}
            >
              ← Back
            </button>


            <button
              type="button"

              onClick={
                nextStep
              }

              disabled={
                !canContinue()
              }

              style={{
                padding:
                  "14px 28px",

                borderRadius:
                  "10px",

                border:
                  "none",

                background:
                  canContinue()
                    ? "#2563EB"
                    : "#9CA3AF",

                color:
                  "#FFFFFF",

                cursor:
                  canContinue()
                    ? "pointer"
                    : "not-allowed",

                fontWeight:
                  700,
              }}
            >
              {
                step ===
                totalQuestions
                  ? "Build My Personalized Journey"
                  : "Continue →"
              }
            </button>

          </div>

        </>

      )}

    </div>

  );

}