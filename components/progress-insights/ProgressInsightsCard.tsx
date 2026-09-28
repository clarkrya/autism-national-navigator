"use client";

import type {
  JourneyProgressSummary,
  ProgressInsight,
} from "../../lib/progressInsights/progressInsightTypes";

/*
 * ============================================================
 * PROGRESS INSIGHTS CARD
 * ============================================================
 *
 * Family-facing summary of progress through the current Journey.
 *
 * This component is presentation-only.
 * Progress calculations happen before the summary reaches the UI.
 * ============================================================
 */

type ProgressInsightsCardProps = {
  summary: JourneyProgressSummary;
};

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
        border:
          "1px solid rgba(91, 72, 128, 0.12)",
        borderRadius: 20,
        background: "#ffffff",
        boxShadow:
          "0 10px 28px rgba(46, 35, 67, 0.05)",
      }}
    >
      {/* HEADER */}

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
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              minHeight: 26,
              padding: "3px 9px",
              marginBottom: 9,
              borderRadius: 999,
              background:
                "rgba(108, 82, 160, 0.09)",
              color: "#654c91",
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            Progress Insights
          </div>

          <h2
            id="progress-insights-title"
            style={{
              margin: 0,
              color: "#302738",
              fontSize: 21,
              lineHeight: 1.25,
              fontWeight: 850,
            }}
          >
            {displayName}&apos;s Journey
            progress
          </h2>

          <p
            style={{
              margin: "7px 0 0",
              color: "#766d7b",
              fontSize: 13,
              lineHeight: 1.55,
            }}
          >
            A simple view of what you&apos;ve
            completed and what remains in the
            current Journey.
          </p>
        </div>

        {/* PERCENTAGE */}

        <div
          style={{
            minWidth: 96,
            padding: "11px 14px",
            borderRadius: 15,
            background:
              "rgba(108, 82, 160, 0.07)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              color: "#654c91",
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
              color: "#817887",
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

      {/* PROGRESS BAR */}

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
            background:
              "rgba(108, 82, 160, 0.10)",
          }}
        >
          <div
            style={{
              width: `${counts.completionPercentage}%`,
              height: "100%",
              borderRadius: 999,
              background: "#654c91",
              transition:
                "width 220ms ease",
            }}
          />
        </div>
      </div>

      {/* COUNTS */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(120px, 1fr))",
          gap: 10,
          marginTop: 16,
        }}
      >
        <div
          style={{
            padding: 13,
            borderRadius: 14,
            background: "#fbfafc",
            border:
              "1px solid rgba(91, 72, 128, 0.08)",
          }}
        >
          <div
            style={{
              color: "#302738",
              fontSize: 19,
              fontWeight: 850,
            }}
          >
            {counts.completedTasks}
          </div>

          <div
            style={{
              marginTop: 3,
              color: "#817887",
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            Completed
          </div>
        </div>

        <div
          style={{
            padding: 13,
            borderRadius: 14,
            background: "#fbfafc",
            border:
              "1px solid rgba(91, 72, 128, 0.08)",
          }}
        >
          <div
            style={{
              color: "#302738",
              fontSize: 19,
              fontWeight: 850,
            }}
          >
            {counts.remainingTasks}
          </div>

          <div
            style={{
              marginTop: 3,
              color: "#817887",
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            Remaining
          </div>
        </div>

        <div
          style={{
            padding: 13,
            borderRadius: 14,
            background: "#fbfafc",
            border:
              "1px solid rgba(91, 72, 128, 0.08)",
          }}
        >
          <div
            style={{
              color: "#302738",
              fontSize: 19,
              fontWeight: 850,
            }}
          >
            {counts.totalTasks}
          </div>

          <div
            style={{
              marginTop: 3,
              color: "#817887",
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            Total Steps
          </div>
        </div>
      </div>

      {/* INSIGHTS */}

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
                background:
                  "rgba(108, 82, 160, 0.045)",
                border:
                  "1px solid rgba(108, 82, 160, 0.09)",
              }}
            >
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
                  background:
                    "rgba(108, 82, 160, 0.10)",
                  color: "#654c91",
                  fontSize: 15,
                  fontWeight: 850,
                }}
              >
                {getInsightIcon(insight)}
              </div>

              <div
                style={{
                  minWidth: 0,
                  flex: 1,
                }}
              >
                <div
                  style={{
                    color: "#756a7c",
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
                    color: "#3b3242",
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
                    color: "#756d7a",
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
                      color: "#554b5c",
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

      {/* SAFETY / CONTEXT NOTE */}

      <p
        style={{
          margin: "17px 0 0",
          color: "#918995",
          fontSize: 10,
          lineHeight: 1.5,
        }}
      >
        Progress Insights summarize activity
        within Myriad and are not a clinical,
        educational, legal, or benefits
        assessment.
      </p>
    </section>
  );
}