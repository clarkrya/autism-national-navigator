"use client";

import type {
  AIAction,
} from "../../lib/ai/journeyTypes";

import type {
  FamilyProfile,
} from "../../types/familyProfile";


/*
 * ============================================================
 * PROPS
 * ============================================================
 */

type ActionGuidanceSectionProps = {
  primaryAction:
    AIAction | null;

  familyProfile:
    FamilyProfile;
};


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
          color:
            "#64748B",

          lineHeight:
            1.6,

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
 * ACTION GUIDANCE SECTION
 * ============================================================
 */

export default function ActionGuidanceSection({
  primaryAction,
  familyProfile,
}: ActionGuidanceSectionProps) {
  if (!primaryAction) {
    return null;
  }


  /*
   * familyProfile remains part of the component contract because
   * this section may use family-specific guidance again as the
   * Journey experience expands.
   */

  void familyProfile;


  return (
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
          padding:
            "24px",

          borderRadius:
            "20px",

          border:
            "1px solid #E2E8F0",

          background:
            "#FFFFFF",

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
              primaryAction
                .whyItMatters
            }
          />


          <GuidanceBlock
            label="What to do"
            text={
              primaryAction
                .action
            }
          />


          <GuidanceBlock
            label="How to do it"
            text={
              primaryAction
                .howTo
            }
          />


          {primaryAction.nextStep && (
            <GuidanceBlock
              label="Then"
              text={
                primaryAction
                  .nextStep
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
  );
}