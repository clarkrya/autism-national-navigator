"use client";

import { useEffect, useState } from "react";

const steps = [
  "Reviewing your family's information...",
  "Finding resources for your state...",
  "Matching your current journey stage...",
  "Building personalized recommendations...",
  "Finalizing your Family Roadmap...",
];

interface Props {
  onComplete: () => void;
}

export default function BuildingRoadmap({
  onComplete,
}: Props) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (currentStep >= steps.length) {
      const timer = setTimeout(() => {
        onComplete();
      }, 800);

      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      setCurrentStep((value) => value + 1);
    }, 900);

    return () => clearTimeout(timer);
  }, [currentStep, onComplete]);

  return (
    <div
      style={{
        maxWidth: "700px",
        margin: "80px auto",
        textAlign: "center",
      }}
    >
      <h1
        style={{
          color: "#0057B8",
          fontSize: "42px",
          marginBottom: "20px",
        }}
      >
        Building Your Personalized Roadmap
      </h1>

      <p
        style={{
          color: "#666",
          fontSize: "20px",
          marginBottom: "50px",
        }}
      >
        Please wait while we personalize your family's journey.
      </p>

      <div
        style={{
          display: "grid",
          gap: "18px",
        }}
      >
        {steps.map((step, index) => (
          <div
            key={step}
            style={{
              padding: "18px",
              borderRadius: "12px",
              border: "1px solid #E5E7EB",
              background:
                index < currentStep
                  ? "#E8F5E9"
                  : "#FFFFFF",
              transition: ".3s",
              textAlign: "left",
              fontSize: "18px",
            }}
          >
            {index < currentStep ? "✅ " : "⏳ "}
            {step}
          </div>
        ))}
      </div>
    </div>
  );
}