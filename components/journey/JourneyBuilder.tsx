"use client";

import { useState } from "react";

import type { FamilyProfile } from "../../types/familyProfile";
import {
  generateJourney,
  type Milestone,
} from "../../lib/journeyEngine";

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
  const totalQuestions = 6;

  const [step, setStep] = useState(0);

  const [isGenerating, setIsGenerating] =
    useState(false);

  const [journey, setJourney] =
    useState<Milestone[]>([]);

  const [familyProfile, setFamilyProfile] =
    useState<FamilyProfile>({
      childName: "",
      childAge: "",
      state: "",
      journeyStage: "",
      supports: [],
      priority: "",
      notes: "",
    });

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

  function nextStep() {
    if (step < totalQuestions) {
      setStep((current) => current + 1);
      return;
    }

    setIsGenerating(true);
  }

  function previousStep() {
    if (step > 1) {
      setStep((current) => current - 1);
    }
  }

  function canContinue() {
    switch (step) {
      case 1:
        return familyProfile.childName.trim() !== "";

      case 2:
        return familyProfile.childAge !== "";

      case 3:
        return familyProfile.state !== "";

      case 4:
        return familyProfile.journeyStage !== "";

      case 5:
        return familyProfile.supports.length > 0;

      case 6:
        return familyProfile.priority !== "";

      default:
        return true;
    }
  }

  function finishGenerating() {
    const generatedJourney = generateJourney({
      age: Number(familyProfile.childAge),
      state: familyProfile.state,
      diagnosisStatus:
        familyProfile.journeyStage === "new"
          ? "new"
          : "existing",
      insurance: "private",
      priorities: familyProfile.supports,
    });

    setJourney(generatedJourney);
    setIsGenerating(false);
  }

  if (isGenerating) {
    return (
      <GeneratingJourney
        onComplete={finishGenerating}
      />
    );
  }

  if (journey.length > 0) {
    return (
      <JourneyDashboard
        milestones={journey}
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
      {step === 0 && (
        <Welcome onBegin={() => setStep(1)} />
      )}

      {step > 0 && (
        <>
          <ProgressBar
            currentStep={step}
            totalSteps={totalQuestions}
          />

          {step === 1 && (
            <ChildName
              value={familyProfile.childName}
              onChange={(value) =>
                updateProfile("childName", value)
              }
            />
          )}

          {step === 2 && (
            <ChildAge
              value={familyProfile.childAge}
              onChange={(value) =>
                updateProfile("childAge", value)
              }
            />
          )}

          {step === 3 && (
            <StateSelector
              value={familyProfile.state}
              onChange={(value) =>
                updateProfile("state", value)
              }
            />
          )}

          {step === 4 && (
            <JourneyStage
              value={familyProfile.journeyStage}
              onChange={(value) =>
                updateProfile(
                  "journeyStage",
                  value
                )
              }
            />
          )}

          {step === 5 && (
            <Supports
              value={familyProfile.supports}
              onChange={(value) =>
                updateProfile(
                  "supports",
                  value
                )
              }
            />
          )}

          {step === 6 && (
            <Priority
              value={familyProfile.priority}
              onChange={(value) =>
                updateProfile(
                  "priority",
                  value
                )
              }
            />
          )}

          <div
            style={{
              marginTop: "50px",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <button
              onClick={previousStep}
              disabled={step === 1}
              style={{
                padding: "14px 28px",
                borderRadius: "10px",
                border: "1px solid #D1D5DB",
                background:
                  step === 1
                    ? "#E5E7EB"
                    : "#FFFFFF",
                cursor:
                  step === 1
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              ← Back
            </button>

            <button
              onClick={nextStep}
              disabled={!canContinue()}
              style={{
                padding: "14px 28px",
                borderRadius: "10px",
                border: "none",
                background:
                  canContinue()
                    ? "#2563EB"
                    : "#9CA3AF",
                color: "#FFFFFF",
                cursor:
                  canContinue()
                    ? "pointer"
                    : "not-allowed",
              }}
            >
              {step === totalQuestions
                ? "Build My Journey"
                : "Continue →"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}