
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { getCurrentUser } from "../../lib/auth";
import { useAccountEntitlements } from "../../lib/useAccountEntitlements";

import {
  getCurrentJourney,
  getSavedChildren,
} from "../../lib/journeyRepository";

import type {
  SavedChild,
  SavedJourney,
} from "../../lib/journeyRepository";

import { getJourneyInsightFocus } from "../../lib/journeyInsights/journeyAnalyticsContext";
import { getStageCompletionInsight } from "../../lib/journeyInsights/journeyInsightClient";

import type {
  PublicJourneyInsightResponse,
} from "../../lib/journeyInsights/journeyInsightPublicTypes";

/*
 * AUTIVOYA — AI PROGRESS INSIGHTS
 *
 * Family-facing aggregate Journey comparisons.
 *
 * Existing behavior:
 * - Premium access required
 * - Loads saved children and current Journey
 * - Maps Journey to comparison cohort
 * - Requests de-identified aggregate insights
 * - Displays comparisons only when the privacy
 *   threshold has been satisfied
 *
 * This page does not read raw Journey analytics.
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

type PageStatus =
  | "loading"
  | "guest"
  | "free"
  | "empty"
  | "ready"
  | "error";

/* ============================================================
   SHARED STYLES
============================================================ */

const pageStyle: React.CSSProperties = {
  minHeight: "calc(100vh - 72px)",
  background: BRAND.background,
  padding: "48px 24px 72px",
};

const cardStyle: React.CSSProperties = {
  background: BRAND.white,
  border: `1px solid ${BRAND.border}`,
  borderRadius: 18,
  boxShadow: "0 8px 24px rgba(23,59,82,0.05)",
};

const primaryLinkStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "11px 18px",
  borderRadius: 11,
  background: BRAND.darkTeal,
  color: BRAND.white,
  fontWeight: 800,
  fontSize: 14,
  textDecoration: "none",
};

const premiumBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "6px 11px",
  borderRadius: 999,
  background: BRAND.lightTeal,
  color: BRAND.darkTeal,
  fontSize: 11,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const informationPanelStyle: React.CSSProperties = {
  marginTop: 24,
  padding: 20,
  borderRadius: 12,
  background: BRAND.background,
  border: `1px solid ${BRAND.border}`,
};

/* ============================================================
   LOADING STATE
============================================================ */

function LoadingState() {
  return (
    <main style={pageStyle}>
      <div
        style={{
          maxWidth: 720,
          margin: "0 auto",
          textAlign: "center",
          color: BRAND.muted,
          lineHeight: 1.7,
        }}
      >
        Loading Progress Insights...
      </div>
    </main>
  );
}

/* ============================================================
   GUEST STATE
============================================================ */

function GuestState() {
  return (
    <main style={pageStyle}>
      <div
        style={{
          ...cardStyle,
          maxWidth: 680,
          margin: "0 auto",
          padding: 32,
          textAlign: "center",
        }}
      >
        <h1
          style={{
            margin: "0 0 12px",
            color: BRAND.darkNavy,
            fontSize: 28,
          }}
        >
          AI Progress Insights
        </h1>

        <p
          style={{
            margin: "0 auto 22px",
            color: BRAND.muted,
            lineHeight: 1.7,
          }}
        >
          Sign in to view Progress Insights for your
          family's Journey.
        </p>

        <Link href="/login" style={primaryLinkStyle}>
          Log In
        </Link>
      </div>
    </main>
  );
}

/* ============================================================
   UPGRADE STATE
============================================================ */

function UpgradeState() {
  return (
    <main style={pageStyle}>
      <div
        style={{
          ...cardStyle,
          maxWidth: 720,
          margin: "0 auto",
          padding: 34,
          textAlign: "center",
          background: BRAND.white,
        }}
      >
        <div style={premiumBadgeStyle}>
          Autivoya Premium
        </div>

        <h1
          style={{
            margin: "14px 0 12px",
            color: BRAND.darkNavy,
            fontSize: 30,
          }}
        >
          AI Progress Insights
        </h1>

        <p
          style={{
            margin: "0 auto",
            maxWidth: 580,
            color: BRAND.muted,
            lineHeight: 1.7,
          }}
        >
          Compare your Journey with de-identified
          progress patterns from families navigating
          a similar stage.
        </p>

        <Link
          href="/pricing"
          style={{
            ...primaryLinkStyle,
            marginTop: 24,
          }}
        >
          View Premium
        </Link>
      </div>
    </main>
  );
}

/* ============================================================
   EMPTY STATE
============================================================ */

function EmptyState() {
  return (
    <main style={pageStyle}>
      <div
        style={{
          ...cardStyle,
          maxWidth: 700,
          margin: "0 auto",
          padding: 30,
          textAlign: "center",
        }}
      >
        <h2
          style={{
            margin: "0 0 10px",
            color: BRAND.darkNavy,
          }}
        >
          Start your family Journey first
        </h2>

        <p
          style={{
            margin: "0 auto 20px",
            color: BRAND.muted,
            lineHeight: 1.65,
          }}
        >
          Progress Insights use your child's current
          Journey to identify the appropriate
          comparison group.
        </p>

        <Link
          href="/journey"
          style={primaryLinkStyle}
        >
          Go to My Journey
        </Link>
      </div>
    </main>
  );
}

/* ============================================================
   ERROR STATE
============================================================ */

function ErrorState() {
  return (
    <main style={pageStyle}>
      <div
        role="alert"
        style={{
          maxWidth: 680,
          margin: "0 auto",
          padding: 28,
          borderRadius: 18,
          border: "1px solid #FECACA",
          background: "#FFF7F7",
          color: "#991B1B",
          textAlign: "center",
          lineHeight: 1.6,
        }}
      >
        We couldn't load your Progress Insights
        right now. Please try again.
      </div>
    </main>
  );
}

/* ============================================================
   MAIN PAGE
============================================================ */

export default function ProgressInsightsPage() {
  const { plan } = useAccountEntitlements();

  const [status, setStatus] =
    useState<PageStatus>("loading");

  const [children, setChildren] =
    useState<SavedChild[]>([]);

  const [selectedChildId, setSelectedChildId] =
    useState("");

  const [currentJourney, setCurrentJourney] =
    useState<SavedJourney | null>(null);

  const [insightResponse, setInsightResponse] =
    useState<PublicJourneyInsightResponse | null>(
      null
    );

  const [loadingChild, setLoadingChild] =
    useState(false);

  /* ==========================================================
     PREMIUM ACCESS
  ========================================================== */

  const hasPremiumAccess =
    plan === "premium" ||
    plan === "premium_plus";

  /* ==========================================================
     SELECTED CHILD
  ========================================================== */

  const selectedChild = useMemo(
    () =>
      children.find(
        (child) =>
          child.childId === selectedChildId
      ) || null,
    [children, selectedChildId]
  );

  /* ==========================================================
     LOAD INSIGHT FOR JOURNEY
  ========================================================== */

  async function loadInsight(
    child: SavedChild,
    journey: SavedJourney | null
  ) {
    if (!journey) {
      setInsightResponse(null);
      return;
    }

    const focus = getJourneyInsightFocus(
      child.familyProfile.journeyStage || ""
    );

    if (!focus) {
      setInsightResponse({
        available: false,
        reason: "not_available",
        insight: null,
      });

      return;
    }

    const stageNumber = Math.max(
      1,
      Math.floor(journey.stageNumber || 1)
    );

    const response =
      await getStageCompletionInsight(
        stageNumber,
        {
          focus,
          stageNumber,
        }
      );

    setInsightResponse(response);
  }

  /* ==========================================================
     LOAD ACCOUNT AND INITIAL CHILD
  ========================================================== */

  useEffect(() => {
    let cancelled = false;

    async function loadPage() {
      setStatus("loading");

      try {
        const user = await getCurrentUser();

        if (cancelled) return;

        if (!user) {
          setStatus("guest");
          return;
        }

        if (!hasPremiumAccess) {
          setStatus("free");
          return;
        }

        const savedChildren =
          await getSavedChildren(user.uid);

        if (cancelled) return;

        setChildren(savedChildren);

        if (savedChildren.length === 0) {
          setSelectedChildId("");
          setCurrentJourney(null);
          setInsightResponse(null);
          setStatus("empty");
          return;
        }

        /*
         * getSavedChildren returns children
         * with the most recently updated first.
         */

        const initialChild = savedChildren[0];

        setSelectedChildId(
          initialChild.childId
        );

        const journey =
          await getCurrentJourney(
            user.uid,
            initialChild.childId
          );

        if (cancelled) return;

        setCurrentJourney(journey);

        await loadInsight(
          initialChild,
          journey
        );

        if (cancelled) return;

        setStatus("ready");
      } catch (error) {
        console.error(
          "Progress Insights load error:",
          error
        );

        if (!cancelled) {
          setStatus("error");
        }
      }
    }

    void loadPage();

    return () => {
      cancelled = true;
    };
  }, [hasPremiumAccess]);

  /* ==========================================================
     CHANGE CHILD
  ========================================================== */

  async function handleChildChange(
    childId: string
  ) {
    setSelectedChildId(childId);
    setLoadingChild(true);
    setInsightResponse(null);

    try {
      const user = await getCurrentUser();

      if (!user) {
        setStatus("guest");
        return;
      }

      const child = children.find(
        (item) => item.childId === childId
      );

      if (!child) {
        setStatus("error");
        return;
      }

      const journey =
        await getCurrentJourney(
          user.uid,
          childId
        );

      setCurrentJourney(journey);

      await loadInsight(
        child,
        journey
      );
    } catch (error) {
      console.error(
        "Progress Insights child load error:",
        error
      );

      setStatus("error");
    } finally {
      setLoadingChild(false);
    }
  }

  /* ==========================================================
     PAGE STATES
  ========================================================== */

  if (status === "loading") {
    return <LoadingState />;
  }

  if (status === "guest") {
    return <GuestState />;
  }

  if (status === "free") {
    return <UpgradeState />;
  }

  if (status === "empty") {
    return <EmptyState />;
  }

  if (status === "error") {
    return <ErrorState />;
  }

  /* ==========================================================
     CURRENT JOURNEY INFORMATION
  ========================================================== */

  const stageNumber = currentJourney
    ? Math.max(
        1,
        Math.floor(
          currentJourney.stageNumber || 1
        )
      )
    : null;

  const focus = selectedChild
    ? getJourneyInsightFocus(
        selectedChild.familyProfile
          .journeyStage || ""
      )
    : undefined;

  /* ==========================================================
     MAIN EXPERIENCE
  ========================================================== */

  return (
    <main style={pageStyle}>
      <div
        style={{
          width: "100%",
          maxWidth: 960,
          margin: "0 auto",
        }}
      >
        {/* PAGE INTRODUCTION */}

        <section
          style={{
            marginBottom: 28,
          }}
        >
          <div
            style={{
              ...premiumBadgeStyle,
              marginBottom: 16,
            }}
          >
            Autivoya Premium
          </div>

          <h1
            style={{
              margin: 0,
              color: BRAND.darkNavy,
              fontSize: 36,
              lineHeight: 1.15,
              fontWeight: 850,
            }}
          >
            AI Progress Insights
          </h1>

          <p
            style={{
              margin: "12px 0 0",
              maxWidth: 720,
              color: BRAND.muted,
              fontSize: 16,
              lineHeight: 1.7,
            }}
          >
            See how families navigating a similar
            point in their Journey are progressing,
            using de-identified aggregate
            Journey activity.
          </p>
        </section>

        {/* CHILD SELECTOR */}

        {children.length > 1 && (
          <section
            style={{
              ...cardStyle,
              marginBottom: 20,
              padding: "18px 20px",
              borderRadius: 14,
            }}
          >
            <label
              htmlFor="progress-insights-child"
              style={{
                display: "block",
                marginBottom: 8,
                color: BRAND.darkNavy,
                fontSize: 13,
                fontWeight: 800,
              }}
            >
              View insights for
            </label>

            <select
              id="progress-insights-child"
              value={selectedChildId}
              disabled={loadingChild}
              onChange={(event) =>
                handleChildChange(
                  event.target.value
                )
              }
              style={{
                width: "100%",
                maxWidth: 420,
                padding: "11px 12px",
                borderRadius: 10,
                border:
                  `1px solid ${BRAND.border}`,
                background: BRAND.white,
                color: BRAND.darkNavy,
                fontSize: 14,
                outlineColor: BRAND.teal,
              }}
            >
              {children.map((child) => (
                <option
                  key={child.childId}
                  value={child.childId}
                >
                  {child.familyProfile
                    .childName || "Child"}
                </option>
              ))}
            </select>

            {loadingChild && (
              <div
                style={{
                  marginTop: 8,
                  color: BRAND.muted,
                  fontSize: 12,
                }}
              >
                Loading insights...
              </div>
            )}
          </section>
        )}

        {/* MAIN INSIGHT CARD */}

        <section
          style={{
            ...cardStyle,
            padding: 30,
          }}
        >
          {/* ICON */}

          <div
            aria-hidden="true"
            style={{
              width: 46,
              height: 46,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 13,
              background: BRAND.lightTeal,
              color: BRAND.darkTeal,
              fontSize: 22,
              marginBottom: 18,
            }}
          >
            ✨
          </div>

          <h2
            style={{
              margin: 0,
              color: BRAND.darkNavy,
              fontSize: 23,
              lineHeight: 1.3,
              fontWeight: 800,
            }}
          >
            Families at a similar point
            in the Journey
          </h2>

          <p
            style={{
              margin: "10px 0 0",
              color: BRAND.muted,
              fontSize: 14,
              lineHeight: 1.7,
              maxWidth: 680,
            }}
          >
            These insights compare de-identified
            Journey activity from families
            navigating the same Journey focus
            and stage.
          </p>

          {/* NO CURRENT JOURNEY */}

          {!currentJourney && (
            <div style={informationPanelStyle}>
              <div
                style={{
                  color: BRAND.darkNavy,
                  fontSize: 14,
                  fontWeight: 800,
                }}
              >
                No current Journey found
              </div>

              <div
                style={{
                  marginTop: 6,
                  color: BRAND.muted,
                  fontSize: 13,
                  lineHeight: 1.6,
                }}
              >
                Start a Journey for this child
                before viewing Progress Insights.
              </div>
            </div>
          )}

          {/* UNSUPPORTED COMPARISON COHORT */}

          {currentJourney && !focus && (
            <div style={informationPanelStyle}>
              <div
                style={{
                  color: BRAND.darkNavy,
                  fontSize: 14,
                  fontWeight: 800,
                }}
              >
                This comparison isn't available yet
              </div>

              <div
                style={{
                  marginTop: 6,
                  color: BRAND.muted,
                  fontSize: 13,
                  lineHeight: 1.6,
                }}
              >
                We're continuing to expand
                the Journey categories supported
                by Progress Insights.
              </div>
            </div>
          )}

          {/* AGGREGATE DATA AVAILABLE */}

          {currentJourney &&
            focus &&
            insightResponse?.available &&
            insightResponse.insight.type ===
              "stage_completion" && (
              <div
                style={{
                  marginTop: 24,
                }}
              >
                <div
                  style={{
                    padding: 24,
                    borderRadius: 16,
                    background:
                      BRAND.lightTeal,
                    border:
                      "1px solid #D1EAE8",
                    borderLeft:
                      `4px solid ${BRAND.teal}`,
                  }}
                >
                  <div
                    style={{
                      color:
                        BRAND.darkTeal,
                      fontSize: 46,
                      lineHeight: 1,
                      fontWeight: 850,
                    }}
                  >
                    {
                      insightResponse
                        .insight
                        .completionPercent
                    }
                    %
                  </div>

                  <div
                    style={{
                      marginTop: 10,
                      color:
                        BRAND.darkNavy,
                      fontSize: 16,
                      fontWeight: 800,
                      lineHeight: 1.5,
                    }}
                  >
                    of families in this
                    comparison group completed
                    Journey Stage{" "}
                    {
                      insightResponse
                        .insight
                        .stageNumber
                    }
                  </div>

                  <div
                    style={{
                      marginTop: 8,
                      color: BRAND.muted,
                      fontSize: 13,
                      lineHeight: 1.6,
                    }}
                  >
                    Based on de-identified
                    aggregate activity from{" "}
                    {
                      insightResponse
                        .insight
                        .cohortSize
                    }{" "}
                    families navigating a similar
                    Journey focus and stage.
                  </div>
                </div>
              </div>
            )}

          {/* INSUFFICIENT AGGREGATE DATA */}

          {currentJourney &&
            focus &&
            insightResponse &&
            !insightResponse.available && (
              <div style={informationPanelStyle}>
                <div
                  style={{
                    color:
                      BRAND.darkNavy,
                    fontSize: 14,
                    fontWeight: 800,
                  }}
                >
                  We're still building this insight
                </div>

                <div
                  style={{
                    marginTop: 6,
                    color: BRAND.muted,
                    fontSize: 13,
                    lineHeight: 1.6,
                  }}
                >
                  We only show comparisons after
                  enough families are represented
                  in the same Journey group. This
                  helps protect family privacy
                  and keeps the comparison meaningful.
                </div>
              </div>
            )}

          {/* COMPARISON CONTEXT */}

          {currentJourney &&
            focus &&
            stageNumber && (
              <div
                style={{
                  marginTop: 18,
                  color: BRAND.muted,
                  fontSize: 12,
                  lineHeight: 1.6,
                }}
              >
                Current comparison:
                Journey Stage {stageNumber}
              </div>
            )}
        </section>

        {/* PRIVACY INFORMATION */}

        <section
          style={{
            marginTop: 20,
            padding: "18px 20px",
            borderRadius: 14,
            background: BRAND.lightTeal,
            border:
              "1px solid #D1EAE8",
          }}
        >
          <div
            style={{
              color: BRAND.darkTeal,
              fontSize: 13,
              fontWeight: 800,
            }}
          >
            About your Progress Insights
          </div>

          <p
            style={{
              margin: "6px 0 0",
              color: BRAND.muted,
              fontSize: 12,
              lineHeight: 1.6,
            }}
          >
            Progress Insights use de-identified
            aggregate Journey activity. Individual
            family activity is not shown.
            Comparisons are only displayed when
            enough families are represented to
            meet Autivoya's privacy threshold.
            These insights do not diagnose
            conditions, predict outcomes,
            or replace professional guidance.
          </p>
        </section>

        {/* BACK TO MY JOURNEY */}

        <div
          style={{
            marginTop: 28,
          }}
        >
          <Link
            href="/journey"
            style={{
              color: BRAND.darkTeal,
              fontSize: 14,
              fontWeight: 750,
              textDecoration: "none",
            }}
          >
            ← Back to My Journey
          </Link>
        </div>
      </div>
    </main>
  );
}
