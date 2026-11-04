"use client";

import type {
  FamilyProfile,
} from "../../types/familyProfile";

import ChildName from "../journey/ChildName";
import ChildAge from "../journey/ChildAge";
import StateSelector from "../journey/StateSelector";
import JourneyStage from "../journey/JourneyStage";
import Supports from "../journey/Supports";
import Priority from "../journey/Priority";
import ProgressBar from "../journey/ProgressBar";

import InsuranceQuestion from "./InsuranceQuestion";


interface JourneyQuestionnaireProps {
  step: number;

  totalQuestions:
    number;

  familyProfile:
    FamilyProfile;

  onUpdateProfile:
    <
      K extends keyof FamilyProfile
    >(
      field: K,
      value: FamilyProfile[K]
    ) => void;

  onPrevious:
    () => void;

  onNext:
    () => void;

  canContinue:
    boolean;
}


export default function JourneyQuestionnaire({
  step,
  totalQuestions,
  familyProfile,
  onUpdateProfile,
  onPrevious,
  onNext,
  canContinue,
}: JourneyQuestionnaireProps) {

  return (
    <>

      <ProgressBar
        currentStep={
          step
        }

        totalSteps={
          totalQuestions
        }
      />


      {/*
       * ========================================================
       * QUESTION 1 — CHILD NAME
       * ========================================================
       */}

      {
        step ===
        1 && (

          <ChildName
            value={
              familyProfile
                .childName
            }

            onChange={(
              value
            ) =>
              onUpdateProfile(
                "childName",
                value
              )
            }
          />
        )
      }


      {/*
       * ========================================================
       * QUESTION 2 — CHILD AGE
       * ========================================================
       */}

      {
        step ===
        2 && (

          <ChildAge
            value={
              familyProfile
                .childAge
            }

            onChange={(
              value
            ) =>
              onUpdateProfile(
                "childAge",
                value
              )
            }
          />
        )
      }


      {/*
       * ========================================================
       * QUESTION 3 — STATE
       * ========================================================
       */}

      {
        step ===
        3 && (

          <StateSelector
            value={
              familyProfile
                .state
            }

            onChange={(
              value
            ) =>
              onUpdateProfile(
                "state",
                value
              )
            }
          />
        )
      }


      {/*
       * ========================================================
       * QUESTION 4 — JOURNEY STAGE
       * ========================================================
       */}

      {
        step ===
        4 && (

          <JourneyStage
            value={
              familyProfile
                .journeyStage
            }

            onChange={(
              value
            ) =>
              onUpdateProfile(
                "journeyStage",
                value
              )
            }
          />
        )
      }


      {/*
       * ========================================================
       * QUESTION 5 — SUPPORTS
       * ========================================================
       */}

      {
        step ===
        5 && (

          <Supports
            value={
              familyProfile
                .supports
            }

            onChange={(
              value
            ) =>
              onUpdateProfile(
                "supports",
                value
              )
            }
          />
        )
      }


      {/*
       * ========================================================
       * QUESTION 6 — PRIORITY
       * ========================================================
       */}

      {
        step ===
        6 && (

          <Priority
            value={
              familyProfile
                .priority
            }

            onChange={(
              value
            ) =>
              onUpdateProfile(
                "priority",
                value
              )
            }
          />
        )
      }


      {/*
       * ========================================================
       * QUESTION 7 — INSURANCE
       * ========================================================
       */}

      {
        step ===
        7 && (

          <InsuranceQuestion
            value={
              familyProfile
                .insurance
            }

            onChange={(
              value
            ) =>
              onUpdateProfile(
                "insurance",
                value
              )
            }
          />
        )
      }


      {/*
       * ========================================================
       * NAVIGATION
       * ========================================================
       */}

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
            onPrevious
          }

          disabled={
            step ===
            1
          }

          style={{
            padding:
              "14px 28px",

            borderRadius:
              "10px",

            border:
              "1px solid #D1D5DB",

            background:
              step ===
              1
                ? "#E5E7EB"
                : "#FFFFFF",

            color:
              "#0F172A",

            cursor:
              step ===
              1
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
            onNext
          }

          disabled={
            !canContinue
          }

          style={{
            padding:
              "14px 28px",

            borderRadius:
              "10px",

            border:
              "none",

            background:
              canContinue
                ? "#2563EB"
                : "#9CA3AF",

            color:
              "#FFFFFF",

            cursor:
              canContinue
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
  );
}