"use client";

import {
  useState,
} from "react";

import type {
  AIResource,
} from "../../lib/ai/journeyTypes";


/*
 * ============================================================
 * PROPS
 * ============================================================
 */

type JourneyResourcesSectionProps = {
  resources?:
    AIResource[];
};


/*
 * ============================================================
 * TEMPLATE
 * ============================================================
 */

type ResourceTemplate = {
  title:
    string;

  content:
    string;
};


/*
 * ============================================================
 * SAFE EXTERNAL URL
 * ============================================================
 */

function isSafeExternalUrl(
  value?: string
): boolean {
  if (!value) {
    return false;
  }

  try {
    const url =
      new URL(value);

    return (
      url.protocol === "https:" ||
      url.protocol === "http:"
    );
  } catch {
    return false;
  }
}


/*
 * ============================================================
 * FORMAT RESOURCE TYPE
 * ============================================================
 */

function formatResourceType(
  type: AIResource["type"]
): string {
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
 * RESOURCE TEXT
 * ============================================================
 */

function getResourceText(
  resource: AIResource
): string {
  return [
    resource.title,
    resource.description,
    resource.whyItMayHelp,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}


/*
 * ============================================================
 * PROVIDER COORDINATION AGENDA
 * ============================================================
 */

function buildProviderCoordinationAgenda():
  ResourceTemplate {
  return {
    title:
      "Provider Coordination Agenda",

    content:
`Provider Coordination Agenda

Child:
________________________________

Date:
________________________________

People participating:
________________________________


FAMILY PRIORITIES

What are the 1–2 most important things we want to work on right now?

1. ________________________________

2. ________________________________


CURRENT SERVICES AND GOALS

Provider / Service:
________________________________

Current goal:
________________________________

What progress are we seeing?
________________________________


Provider / Service:
________________________________

Current goal:
________________________________

What progress are we seeing?
________________________________


SHARED GOALS

What is one measurable goal everyone can support?

________________________________

How will we know progress is being made?

________________________________


HOME STRATEGIES

What can we practice or reinforce at home?

________________________________

Who will provide instructions or materials?

________________________________


RESPONSIBILITIES

Who will work on each part?

________________________________

Who will coordinate communication?

________________________________


NEXT STEPS

Action:
________________________________

Person responsible:
________________________________

Target date:
________________________________


FOLLOW-UP

Next check-in date:
________________________________

Questions or notes:
________________________________`,
  };
}


/*
 * ============================================================
 * TWO-WEEK HOME TRACKING LOG
 * ============================================================
 */

function buildHomeTrackingLog():
  ResourceTemplate {
  return {
    title:
      "Two-Week Home Tracking Log",

    content:
`Two-Week Home Tracking Log

Child:
________________________________

Skill or goal being tracked:
________________________________

What are we practicing?
________________________________


DAY 1

Date:
________________________________

What we tried:
________________________________

Result:
________________________________

Notes:
________________________________


DAY 2

Date:
________________________________

What we tried:
________________________________

Result:
________________________________

Notes:
________________________________


DAY 3

Date:
________________________________

What we tried:
________________________________

Result:
________________________________

Notes:
________________________________


DAY 4

Date:
________________________________

What we tried:
________________________________

Result:
________________________________

Notes:
________________________________


DAY 5

Date:
________________________________

What we tried:
________________________________

Result:
________________________________

Notes:
________________________________


DAY 6

Date:
________________________________

What we tried:
________________________________

Result:
________________________________

Notes:
________________________________


DAY 7

Date:
________________________________

What we tried:
________________________________

Result:
________________________________

Notes:
________________________________


WEEK 1 SUMMARY

What seemed to help?
________________________________

What was difficult?
________________________________


DAY 8

Date:
________________________________

What we tried:
________________________________

Result:
________________________________

Notes:
________________________________


DAY 9

Date:
________________________________

What we tried:
________________________________

Result:
________________________________

Notes:
________________________________


DAY 10

Date:
________________________________

What we tried:
________________________________

Result:
________________________________

Notes:
________________________________


DAY 11

Date:
________________________________

What we tried:
________________________________

Result:
________________________________

Notes:
________________________________


DAY 12

Date:
________________________________

What we tried:
________________________________

Result:
________________________________

Notes:
________________________________


DAY 13

Date:
________________________________

What we tried:
________________________________

Result:
________________________________

Notes:
________________________________


DAY 14

Date:
________________________________

What we tried:
________________________________

Result:
________________________________

Notes:
________________________________


TWO-WEEK SUMMARY

What improved?
________________________________

What stayed the same?
________________________________

What should we discuss with the provider?
________________________________`,
  };
}


/*
 * ============================================================
 * GENERIC CHECKLIST
 * ============================================================
 */

function buildGenericChecklist(
  resource: AIResource
): ResourceTemplate {
  return {
    title:
      resource.title,

    content:
`Checklist: ${resource.title}

☐ Write down your main goal

☐ Gather any relevant records or documents

☐ Write down important names and contact information

☐ Identify questions you want answered

☐ Ask what the next step is

☐ Ask whether there are deadlines

☐ Write down who is responsible for the next action

☐ Record the expected follow-up date

☐ Save copies of anything you submit

Notes:
________________________________
________________________________
________________________________`,
  };
}


/*
 * ============================================================
 * GENERIC WORKSHEET / TRACKER
 * ============================================================
 */

function buildGenericWorksheet(
  resource: AIResource
): ResourceTemplate {
  return {
    title:
      resource.title,

    content:
`${resource.title}

Goal:
________________________________

Date:
________________________________

What happened?
________________________________

What did we try?
________________________________

What was the result?
________________________________

What seemed helpful?
________________________________

What should we try next?
________________________________

Questions or notes:
________________________________
________________________________`,
  };
}


/*
 * ============================================================
 * BUILD RESOURCE TEMPLATE
 * ============================================================
 */

function buildResourceTemplate(
  resource: AIResource
):
  ResourceTemplate | null {

  const text =
    getResourceText(
      resource
    );


  /*
   * ----------------------------------------------------------
   * PROVIDER COORDINATION
   * ----------------------------------------------------------
   */

  if (
    text.includes(
      "provider coordination"
    ) ||
    (
      text.includes(
        "provider"
      ) &&
      text.includes(
        "agenda"
      )
    )
  ) {
    return buildProviderCoordinationAgenda();
  }


  /*
   * ----------------------------------------------------------
   * HOME TRACKING LOG
   * ----------------------------------------------------------
   */

  if (
    text.includes(
      "home tracking"
    ) ||
    text.includes(
      "tracking log"
    ) ||
    (
      text.includes(
        "two-week"
      ) &&
      text.includes(
        "log"
      )
    )
  ) {
    return buildHomeTrackingLog();
  }


  /*
   * ----------------------------------------------------------
   * CHECKLIST
   * ----------------------------------------------------------
   */

  if (
    text.includes(
      "checklist"
    )
  ) {
    return buildGenericChecklist(
      resource
    );
  }


  /*
   * ----------------------------------------------------------
   * WORKSHEET / TRACKER / LOG
   * ----------------------------------------------------------
   */

  if (
    text.includes(
      "worksheet"
    ) ||
    text.includes(
      "tracker"
    ) ||
    text.includes(
      "tracking"
    ) ||
    text.includes(
      "log template"
    )
  ) {
    return buildGenericWorksheet(
      resource
    );
  }


  /*
   * ----------------------------------------------------------
   * OTHER TEMPLATE
   * ----------------------------------------------------------
   */

  if (
    text.includes(
      "template"
    )
  ) {
    return buildGenericWorksheet(
      resource
    );
  }


  return null;
}


/*
 * ============================================================
 * TEMPLATE CARD
 * ============================================================
 */

function ResourceTemplateCard({
  template,
}: {
  template:
    ResourceTemplate;
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
        marginTop:
          "18px",

        padding:
          "18px",

        borderRadius:
          "14px",

        border:
          "1px solid #BFDBFE",

        background:
          "#F8FBFF",
      }}
    >
      <div
        style={{
          color:
            "#2563EB",

          fontSize:
            "11px",

          fontWeight:
            800,

          letterSpacing:
            "0.06em",

          textTransform:
            "uppercase",

          marginBottom:
            "7px",
        }}
      >
        Starter Template
      </div>


      <h4
        style={{
          margin:
            "0 0 12px",

          color:
            "#0F172A",

          fontSize:
            "17px",

          lineHeight:
            1.3,
        }}
      >
        {template.title}
      </h4>


      <pre
        style={{
          margin:
            0,

          padding:
            "14px",

          maxHeight:
            "320px",

          overflowY:
            "auto",

          whiteSpace:
            "pre-wrap",

          wordBreak:
            "break-word",

          border:
            "1px solid #E2E8F0",

          borderRadius:
            "11px",

          background:
            "#FFFFFF",

          color:
            "#475569",

          fontFamily:
            "inherit",

          fontSize:
            "13px",

          lineHeight:
            1.55,
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

          fontSize:
            "13px",

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


  const template =
    buildResourceTemplate(
      resource
    );


  return (
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

          marginBottom:
            "11px",
        }}
      >
        {
          template
            ? "Template"
            : formatResourceType(
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
            1.6,

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
            resource
              .sourceName
          }
        </div>
      )}


      {safeUrl && (
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
      )}


      {template && (
        <ResourceTemplateCard
          template={
            template
          }
        />
      )}
    </div>
  );
}


/*
 * ============================================================
 * JOURNEY RESOURCES SECTION
 * ============================================================
 */

export default function JourneyResourcesSection({
  resources,
}: JourneyResourcesSectionProps) {
  if (
    !resources ||
    resources.length === 0
  ) {
    return null;
  }


  return (
    <section
      style={{
        marginBottom:
          "48px",
      }}
    >
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
          Resources
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
          Resources selected for you
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
          These resources were selected
          based on your family&apos;s
          situation and priorities.
        </p>
      </div>


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
          resources.map(
            (
              resource,
              index
            ) => (
              <ResourceCard
                key={
                  resource.id ||
                  `${resource.title}-${index}`
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
  );
}