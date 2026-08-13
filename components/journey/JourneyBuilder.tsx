"use client";

import { useEffect, useState } from "react";

import type { FamilyProfile } from "../../types/familyProfile";
import type { PersonalizedJourney } from "../../lib/ai/journeyTypes";

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
   * The questionnaire has exactly 7 questions.
   *
   * Question 7 = Insurance
   */
  const totalQuestions = 7;

  const [step, setStep] = useState(0);

  const [isGenerating, setIsGenerating] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [
    personalizedJourney,
    setPersonalizedJourney,
  ] = useState<PersonalizedJourney | null>(null);

  const [familyProfile, setFamilyProfile] =
    useState<FamilyProfile>({
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
   * Automatically move the user to the top
   * whenever the questionnaire step changes.
   *
   * This prevents the user from having to
   * manually scroll back up after clicking
   * Continue or Back.
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
   * Automatically move the user to the top
   * when the personalized journey is displayed.
   *
   * This prevents the results page from opening
   * at the previous questionnaire scroll position.
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
   * Update one field in the family profile.
   */
  function updateProfile<
    K extends keyof FamilyProfile
  >(
    field: K,
    value: FamilyProfile[K]
  ) {
    setFamilyProfile((current) => ({
      ...current,
      [field]: value,
    }));
  }

  /*
   * Send the completed questionnaire
   * to the AI generation API.
   */
  async function generatePersonalizedJourney() {
    setIsGenerating(true);
    setError(null);

    try {
      console.log(
        "Sending family profile to AI:",
        familyProfile
      );

      const response = await fetch(
        "/api/journey/generate",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
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
   * Move to the next questionnaire step.
   *
   * Question 7 is the final question.
   * Once Question 7 is complete, the AI runs.
   */
  function nextStep() {
    if (step < totalQuestions) {
      setStep((current) => current + 1);
      return;
    }

    generatePersonalizedJourney();
  }

  /*
   * Go back one question.
   */
  function previousStep() {
    if (step > 1) {
      setStep((current) => current - 1);
    }
  }

  /*
   * Determine whether the user can
   * continue from the current question.
   */
  function canContinue() {
    switch (step) {
      case 1:
        return (
          familyProfile.childName.trim() !== ""
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
          familyProfile.supports.length > 0
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

  /*
   * Show the AI generation screen
   * while OpenAI creates the journey.
   */
  if (isGenerating) {
    return (
      <GeneratingJourney />
    );
  }

  /*
   * Show an error if AI generation fails.
   */
  if (error) {
    return (
      <div
        style={{
          maxWidth: "700px",
          margin: "80px auto",
          padding: "40px",
          textAlign: "center",
          background: "#FFFFFF",
          borderRadius: "24px",
          border:
            "1px solid #E2E8F0",
          boxShadow:
            "0 10px 30px rgba(15,23,42,.06)",
        }}
      >
        <h2
          style={{
            fontSize: "30px",
            fontWeight: 800,
            color: "#0F172A",
            marginBottom: "16px",
          }}
        >
          We Couldn't Build Your Journey
        </h2>

        <p
          style={{
            color: "#64748B",
            lineHeight: 1.7,
            marginBottom: "28px",
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
            padding: "14px 28px",
            borderRadius: "10px",
            border: "none",
            background: "#2563EB",
            color: "#FFFFFF",
            fontWeight: 700,
            fontSize: "16px",
            cursor: "pointer",
          }}
        >
          Try Again
        </button>
      </div>
    );
  }

  /*
   * Once AI has generated the journey,
   * show the personalized dashboard.
   */
  if (personalizedJourney) {
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

  return (
    <div
      style={{
        maxWidth: "900px",
        margin: "0 auto",
        padding: "40px 20px",
      }}
    >
      {/* Welcome screen */}

      {step === 0 && (
        <Welcome
          onBegin={() => setStep(1)}
        />
      )}

      {/* Questionnaire */}

      {step > 0 && (
        <>
          <ProgressBar
            currentStep={step}
            totalSteps={totalQuestions}
          />

          {/* Question 1 */}

          {step === 1 && (
            <ChildName
              value={
                familyProfile.childName
              }
              onChange={(value) =>
                updateProfile(
                  "childName",
                  value
                )
              }
            />
          )}

          {/* Question 2 */}

          {step === 2 && (
            <ChildAge
              value={
                familyProfile.childAge
              }
              onChange={(value) =>
                updateProfile(
                  "childAge",
                  value
                )
              }
            />
          )}

          {/* Question 3 */}

          {step === 3 && (
            <StateSelector
              value={
                familyProfile.state
              }
              onChange={(value) =>
                updateProfile(
                  "state",
                  value
                )
              }
            />
          )}

          {/* Question 4 */}

          {step === 4 && (
            <JourneyStage
              value={
                familyProfile.journeyStage
              }
              onChange={(value) =>
                updateProfile(
                  "journeyStage",
                  value
                )
              }
            />
          )}

          {/* Question 5 */}

          {step === 5 && (
            <Supports
              value={
                familyProfile.supports
              }
              onChange={(value) =>
                updateProfile(
                  "supports",
                  value
                )
              }
            />
          )}

          {/* Question 6 */}

          {step === 6 && (
            <Priority
              value={
                familyProfile.priority
              }
              onChange={(value) =>
                updateProfile(
                  "priority",
                  value
                )
              }
            />
          )}

          {/* Question 7 - Insurance */}

          {step === 7 && (
            <div
              style={{
                maxWidth: "650px",
                margin: "0 auto",
              }}
            >
              <h2
                style={{
                  fontSize: "36px",
                  fontWeight: 800,
                  color: "#0F172A",
                  marginBottom: "12px",
                }}
              >
                What type of insurance does
                your child have?
              </h2>

              <p
                style={{
                  fontSize: "18px",
                  lineHeight: 1.7,
                  color: "#64748B",
                  marginBottom: "28px",
                }}
              >
                This helps us personalize
                recommendations related to
                services, coverage, and
                available resources.
              </p>

              <div
                style={{
                  display: "grid",
                  gap: "16px",
                }}
              >
                {[
                  {
                    value: "private",
                    title:
                      "Private Insurance",
                    description:
                      "Insurance through an employer, individual plan, or another private health plan.",
                  },
                  {
                    value: "medicaid",
                    title: "Medicaid",
                    description:
                      "My child is covered by Medicaid or a Medicaid managed-care plan.",
                  },
                  {
                    value: "none",
                    title:
                      "No Insurance",
                    description:
                      "My child does not currently have health insurance.",
                  },
                ].map((option) => {
                  const selected =
                    familyProfile.insurance ===
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
                        width: "100%",
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
                          gap: "16px",
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
                              margin: 0,
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
                              margin: 0,
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
                })}
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

          {/* Navigation buttons */}

          <div
            style={{
              marginTop: "50px",
              display: "flex",
              justifyContent:
                "space-between",
              gap: "20px",
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
                border: "none",
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
              {step ===
              totalQuestions
                ? "Build My Personalized Journey"
                : "Continue →"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}