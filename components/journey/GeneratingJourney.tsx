"use client";

import { useEffect } from "react";

interface GeneratingJourneyProps {
  onComplete: () => void;
}

export default function GeneratingJourney({
  onComplete,
}: GeneratingJourneyProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  const steps = [
    "Reviewing your child's information",
    "Understanding your family's priorities",
    "Finding state-specific guidance",
    "Building personalized milestones",
    "Preparing your Family Journey",
  ];

  return (
    <div
      style={{
        maxWidth: "700px",
        margin: "80px auto",
        padding: "50px",
        background: "#ffffff",
        borderRadius: "24px",
        boxShadow: "0 20px 50px rgba(15,23,42,.08)",
        textAlign: "center",
      }}
    >
      <h1
        style={{
          fontSize: "40px",
          marginBottom: "20px",
          color: "#0F172A",
        }}
      >
        Creating Your Family Journey
      </h1>

      <p
        style={{
          color: "#64748B",
          fontSize: "20px",
          marginBottom: "40px",
        }}
      >
        Please wait while we build a personalized roadmap for your family.
      </p>

      <div
        style={{
          textAlign: "left",
          maxWidth: "500px",
          margin: "0 auto",
        }}
      >
        {steps.map((step) => (
          <div
            key={step}
            style={{
              padding: "14px 0",
              fontSize: "18px",
              color: "#334155",
            }}
          >
            ✓ {step}
          </div>
        ))}
      </div>
    </div>
  );
}