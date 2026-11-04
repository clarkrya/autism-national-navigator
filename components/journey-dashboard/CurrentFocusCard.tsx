"use client";

import type {
  PersonalizedJourney,
} from "../../lib/ai/journeyTypes";

type CurrentFocusCardProps = {
  personalizedJourney:
    PersonalizedJourney;

  journeyStageNumber:
    number;
};

export default function CurrentFocusCard({
  personalizedJourney,
  journeyStageNumber,
}: CurrentFocusCardProps) {
  return (
    <section
      style={{
        marginBottom: "32px",
      }}
    >
      <div
        style={{
          borderRadius: "22px",
          border:
            "1px solid #BFDBFE",
          background:
            "linear-gradient(135deg, #EFF6FF, #F0FDFA)",
          padding: "32px",
          boxShadow:
            "0 10px 26px rgba(15, 23, 42, 0.06)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "12px",
          }}
        >
          <span
            style={{
              display:
                "inline-flex",
              alignItems: "center",
              justifyContent:
                "center",
              width: "30px",
              height: "30px",
              borderRadius: "50%",
              background:
                "#2563EB",
              color: "#FFFFFF",
              fontWeight: 800,
            }}
          >
            {journeyStageNumber}
          </span>

          <span
            style={{
              color: "#2563EB",
              fontSize: "12px",
              fontWeight: 800,
              letterSpacing:
                "0.08em",
              textTransform:
                "uppercase",
            }}
          >
            Current Focus
          </span>
        </div>

        <h2
          style={{
            margin: 0,
            fontSize: "32px",
            lineHeight: 1.2,
            color: "#0F172A",
            fontWeight: 800,
          }}
        >
          {
            personalizedJourney
              .currentFocus.title
          }
        </h2>

        <p
          style={{
            color: "#64748B",
            lineHeight: 1.6,
            marginTop: "13px",
            marginBottom: 0,
            maxWidth: "800px",
            fontSize: "17px",
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
              marginTop: "24px",
              paddingTop: "22px",
              borderTop:
                "1px solid #BFDBFE",
            }}
          >
            <div
              style={{
                color: "#2563EB",
                fontSize: "12px",
                fontWeight: 800,
                letterSpacing:
                  "0.08em",
                textTransform:
                  "uppercase",
                marginBottom:
                  "7px",
              }}
            >
              Your Next Best Step
            </div>

            <div
              style={{
                fontSize: "19px",
                fontWeight: 750,
                color: "#0F172A",
              }}
            >
              {
                personalizedJourney
                  .nextStep.title
              }
            </div>

            <p
              style={{
                color: "#64748B",
                lineHeight: 1.6,
                margin: "7px 0 0",
                fontSize: "15px",
                maxWidth: "780px",
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
  );
}