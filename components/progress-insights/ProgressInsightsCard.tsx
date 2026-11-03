
"use client";

import type {
  JourneyProgressSummary,
  ProgressInsight,
} from "../../lib/progressInsights/progressInsightTypes";

/*
 * ============================================================
 * AUTIVOYA — PROGRESS INSIGHTS CARD
 * ============================================================
 *
 * Family-facing summary of progress through the current Journey.
 *
 * Presentation only:
 * - Progress calculations are performed elsewhere.
 * - This component displays the provided summary.
 * - Existing data and insight logic remain unchanged.
 *
 * Autivoya branding:
 * Navy:       #204D6A
 * Dark Navy:  #173B52
 * Teal:       #58AAA7
 * Dark Teal:  #317E7B
 * Gold:       #F7AD3F
 * ============================================================
 */

const BRAND = {
  navy: "#204D6A",
  darkNavy: "#173B52",
  teal: "#58AAA7",
  darkTeal: "#317E7B",
  gold: "#F7AD3F",
  lightTeal: "#EAF6F5",
  white: "#FFFFFF",
  background: "#F7FAFB",
  muted: "#647B8B",
  border: "#DCE7EC",
};

type ProgressInsightsCardProps = {
  summary: JourneyProgressSummary;
};

/*
 * ============================================================
 * INSIGHT ICONS
 * ============================================================
 */

function getInsightIcon(
  insight: ProgressInsight
): string {
  switch (insight.category) {
    case "progress":
      return "✓";

    case "momentum":
      return "↗";

    case "focus":
      return "◎";

    case "support":
      return "♡";

    case "next_step":
      return "→";

    default:
      return "•";
  }
}

/*
 * ============================================================
 * INSIGHT LABELS
 * ============================================================
 */

function getInsightLabel(
  insight: ProgressInsight
): string {
  switch (insight.category) {
    case "progress":
      return "Progress";

    case "momentum":
      return "Momentum";

    case "focus":
      return "Focus";

    case "support":
      return "Support";

    case "next_step":
      return "Next Step";

    default:
      return "Insight";
  }
}

/*
 * ============================================================
 * PROGRESS INSIGHTS CARD
 * ============================================================
 */

export default function ProgressInsightsCard({
  summary,
}: ProgressInsightsCardProps) {
  const {
    counts,
    insights,
    childName,
  } = summary;

  const displayName =
    childName?.trim() || "your family";

  return (
    <section
      aria-labelledby="progress-insights-title"
      style={{
        width: "100%",
        boxSizing: "border-box",
        padding: 22,
        border: `1px solid ${BRAND.border}`,
        borderRadius: 20,
        background: BRAND.white,
        boxShadow:
          "0 10px 28px rgba(23, 59, 82, 0.06)",
      }}
    >
      {/* ======================================================
          HEADER
      ====================================================== */}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 18,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            flex: "1 1 360px",
          }}
        >
          {/* SECTION BADGE */}

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              minHeight: 26,
              padding: "3px 10px",
              marginBottom: 9,
              borderRadius: 999,
              background: BRAND.lightTeal,
              color: BRAND.darkTeal,
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            Progress Insights
          </div>

          {/* TITLE */}

          <h2
            id="progress-insights-title"
            style={{
              margin: 0,
              color: BRAND.darkNavy,
              fontSize: 21,
              lineHeight: 1.25,
              fontWeight: 850,
            }}
          >
            {displayName}&apos;s Journey progress
          </h2>

          <p
            style={{
              margin: "7px 0 0",
              color: BRAND.muted,
              fontSize: 13,
              lineHeight: 1.55,
            }}
          >
            A simple view of what you&apos;ve
            completed and what remains in the
            current Journey.
          </p>
        </div>

        {/* ====================================================
            COMPLETION PERCENTAGE
        ==================================================== */}

        <div
          style={{
            minWidth: 96,
            padding: "11px 14px",
            borderRadius: 15,
            background: BRAND.lightTeal,
            textAlign: "center",
          }}
        >
          <div
            style={{
              color: BRAND.darkTeal,
              fontSize: 24,
              lineHeight: 1,
              fontWeight: 850,
            }}
          >
            {counts.completionPercentage}%
          </div>

          <div
            style={{
              marginTop: 5,
              color: BRAND.navy,
              fontSize: 10,
              fontWeight: 750,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            Complete
          </div>
        </div>
      </div>

      {/* ======================================================
          PROGRESS BAR
      ====================================================== */}

      <div
        style={{
          marginTop: 20,
        }}
      >
        <div
          aria-label={`${counts.completionPercentage}% of Journey steps completed`}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={
            counts.completionPercentage
          }
          style={{
            width: "100%",
            height: 9,
            overflow: "hidden",
            borderRadius: 999,
            background: BRAND.lightTeal,
          }}
        >
          <div
            style={{
              width: `${counts.completionPercentage}%`,
              height: "100%",
              borderRadius: 999,
              background: BRAND.teal,
              transition: "width 220ms ease",
            }}
          />
        </div>
      </div>

      {/* ======================================================
          TASK COUNTS
      ====================================================== */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(120px, 1fr))",
          gap: 10,
          marginTop: 16,
        }}
      >
        {/* COMPLETED TASKS */}

        <div
          style={{
            padding: 13,
            borderRadius: 14,
            background: BRAND.background,
            border: `1px solid ${BRAND.border}`,
          }}
        >
          <div
            style={{
              color: BRAND.darkTeal,
              fontSize: 19,
              fontWeight: 850,
            }}
          >
            {counts.completedTasks}
          </div>

          <div
            style={{
              marginTop: 3,
              color: BRAND.muted,
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            Completed
          </div>
        </div>

        {/* REMAINING TASKS */}

        <div
          style={{
            padding: 13,
            borderRadius: 14,
            background: BRAND.background,
            border: `1px solid ${BRAND.border}`,
          }}
        >
          <div
            style={{
              color: BRAND.darkNavy,
              fontSize: 19,
              fontWeight: 850,
            }}
          >
            {counts.remainingTasks}
          </div>

          <div
            style={{
              marginTop: 3,
              color: BRAND.muted,
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            Remaining
          </div>
        </div>

        {/* TOTAL STEPS */}

        <div
          style={{
            padding: 13,
            borderRadius: 14,
            background: BRAND.background,
            border: `1px solid ${BRAND.border}`,
          }}
        >
          <div
            style={{
              color: BRAND.navy,
              fontSize: 19,
              fontWeight: 850,
            }}
          >
            {counts.totalTasks}
          </div>

          <div
            style={{
              marginTop: 3,
              color: BRAND.muted,
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            Total Steps
          </div>
        </div>
      </div>

      {/* ======================================================
          PERSONALIZED INSIGHTS
      ====================================================== */}

      {insights.length > 0 ? (
        <div
          style={{
            display: "grid",
            gap: 10,
            marginTop: 20,
          }}
        >
          {insights.map((insight) => (
            <article
              key={insight.id}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                padding: 15,
                borderRadius: 15,
                background: BRAND.lightTeal,
                border: "1px solid #D1EAE8",
              }}
            >
              {/* INSIGHT ICON */}

              <div
                aria-hidden="true"
                style={{
                  flex: "0 0 auto",
                  width: 32,
                  height: 32,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 10,
                  background: BRAND.white,
                  color: BRAND.darkTeal,
                  fontSize: 15,
                  fontWeight: 850,
                }}
              >
                {getInsightIcon(insight)}
              </div>

              {/* INSIGHT CONTENT */}

              <div
                style={{
                  minWidth: 0,
                  flex: 1,
                }}
              >
                <div
                  style={{
                    color: BRAND.darkTeal,
                    fontSize: 9,
                    fontWeight: 800,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                  }}
                >
                  {getInsightLabel(insight)}
                </div>

                <h3
                  style={{
                    margin: "3px 0 0",
                    color: BRAND.darkNavy,
                    fontSize: 14,
                    lineHeight: 1.4,
                    fontWeight: 800,
                  }}
                >
                  {insight.title}
                </h3>

                <p
                  style={{
                    margin: "5px 0 0",
                    color: BRAND.muted,
                    fontSize: 12,
                    lineHeight: 1.55,
                  }}
                >
                  {insight.summary}
                </p>

                {insight.suggestedAction ? (
                  <p
                    style={{
                      margin: "8px 0 0",
                      color: BRAND.navy,
                      fontSize: 12,
                      lineHeight: 1.55,
                      fontWeight: 650,
                    }}
                  >
                    {insight.suggestedAction}
                  </p>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {/* ======================================================
          SAFETY AND CONTEXT NOTE
      ====================================================== */}

      <p
        style={{
          margin: "17px 0 0",
          color: BRAND.muted,
          fontSize: 10,
          lineHeight: 1.5,
        }}
      >
        Progress Insights summarize activity
        within Autivoya and are not a clinical,
        educational, legal, or benefits
        assessment.
      </p>
    </section>
  );
}
