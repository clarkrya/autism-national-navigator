"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import {
  getCurrentUser,
} from "../../lib/auth";

import {
  useAccountEntitlements,
} from "../../lib/useAccountEntitlements";

import {
  getCurrentJourney,
  getSavedChildren,
} from "../../lib/journeyRepository";

import type {
  SavedChild,
  SavedJourney,
} from "../../lib/journeyRepository";

import {
  getJourneyInsightFocus,
} from "../../lib/journeyInsights/journeyAnalyticsContext";

import {
  getStageCompletionInsight,
} from "../../lib/journeyInsights/journeyInsightClient";

import type {
  PublicJourneyInsightResponse,
} from "../../lib/journeyInsights/journeyInsightPublicTypes";

/*
 * ============================================================
 * AI PROGRESS INSIGHTS PAGE
 * ============================================================
 *
 * Family-facing aggregate Journey comparison experience.
 *
 * This page:
 *
 * 1. Requires an authenticated Premium account
 * 2. Loads the family's saved children
 * 3. Loads the selected child's current Journey
 * 4. Maps that Journey into a safe comparison cohort
 * 5. Requests de-identified aggregate Journey Insight data
 * 6. Displays a comparison only when the privacy threshold
 *    has been satisfied
 *
 * IMPORTANT:
 *
 * This page does NOT read raw Journey analytics.
 *
 * It only receives safe aggregate data through the trusted
 * Journey Insights read API.
 * ============================================================
 */

type PageStatus =
  | "loading"
  | "guest"
  | "free"
  | "empty"
  | "ready"
  | "error";

/*
 * ============================================================
 * LOADING STATE
 * ============================================================
 */

function LoadingState() {
  return (
    <main
      style={{
        minHeight: "calc(100vh - 72px)",
        background: "#F8FAFC",
        padding: "64px 24px",
      }}
    >
      <div
        style={{
          maxWidth: "720px",
          margin: "0 auto",
          textAlign: "center",
          color: "#64748B",
          lineHeight: 1.7,
        }}
      >
        Loading Progress Insights...
      </div>
    </main>
  );
}

/*
 * ============================================================
 * GUEST STATE
 * ============================================================
 */

function GuestState() {
  return (
    <main
      style={{
        minHeight: "calc(100vh - 72px)",
        background: "#F8FAFC",
        padding: "64px 24px",
      }}
    >
      <div
        style={{
          maxWidth: "680px",
          margin: "0 auto",
          padding: "32px",
          borderRadius: "20px",
          border: "1px solid #E2E8F0",
          background: "#FFFFFF",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            margin: "0 0 12px",
            color: "#0F172A",
            fontSize: "28px",
          }}
        >
          AI Progress Insights
        </h1>

        <p
          style={{
            margin: "0 auto 22px",
            color: "#64748B",
            lineHeight: 1.7,
          }}
        >
          Sign in to view Progress Insights for your family's
          Journey.
        </p>

        <Link
          href="/login"
          style={{
            display: "inline-block",
            padding: "11px 17px",
            borderRadius: "10px",
            background: "#2563EB",
            color: "#FFFFFF",
            fontWeight: 800,
            textDecoration: "none",
          }}
        >
          Log In
        </Link>
      </div>
    </main>
  );
}

/*
 * ============================================================
 * UPGRADE STATE
 * ============================================================
 */

function UpgradeState() {
  return (
    <main
      style={{
        minHeight: "calc(100vh - 72px)",
        background: "#F8FAFC",
        padding: "64px 24px",
      }}
    >
      <div
        style={{
          maxWidth: "720px",
          margin: "0 auto",
          padding: "34px",
          borderRadius: "22px",
          border: "1px solid #DDD6FE",
          background: "#FAF8FF",
          textAlign: "center",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            marginBottom: "12px",
            padding: "5px 10px",
            borderRadius: "999px",
            background: "#EDE9FE",
            color: "#6D28D9",
            fontSize: "11px",
            fontWeight: 800,
            textTransform: "uppercase",
          }}
        >
          Premium
        </div>

        <h1
          style={{
            margin: "0 0 12px",
            color: "#0F172A",
            fontSize: "30px",
          }}
        >
          AI Progress Insights
        </h1>

        <p
          style={{
            margin: "0 auto",
            maxWidth: "580px",
            color: "#64748B",
            lineHeight: 1.7,
          }}
        >
          Compare your Journey with de-identified progress
          patterns from families navigating a similar stage.
        </p>

        <Link
          href="/pricing"
          style={{
            display: "inline-block",
            marginTop: "24px",
            padding: "11px 18px",
            borderRadius: "10px",
            background: "#7C3AED",
            color: "#FFFFFF",
            fontWeight: 800,
            textDecoration: "none",
          }}
        >
          View Premium
        </Link>
      </div>
    </main>
  );
}

/*
 * ============================================================
 * EMPTY STATE
 * ============================================================
 */

function EmptyState() {
  return (
    <main
      style={{
        minHeight: "calc(100vh - 72px)",
        background: "#F8FAFC",
        padding: "64px 24px",
      }}
    >
      <div
        style={{
          maxWidth: "700px",
          margin: "0 auto",
          padding: "30px",
          borderRadius: "20px",
          border: "1px solid #E2E8F0",
          background: "#FFFFFF",
          textAlign: "center",
        }}
      >
        <h2
          style={{
            margin: "0 0 10px",
            color: "#0F172A",
          }}
        >
          Start your family Journey first
        </h2>

        <p
          style={{
            margin: "0 auto 20px",
            color: "#64748B",
            lineHeight: 1.65,
          }}
        >
          Progress Insights use your child's current Journey to
          identify the appropriate comparison group.
        </p>

        <Link
          href="/journey"
          style={{
            display: "inline-block",
            padding: "10px 16px",
            borderRadius: "10px",
            background: "#2563EB",
            color: "#FFFFFF",
            fontWeight: 800,
            textDecoration: "none",
          }}
        >
          Go to My Journey
        </Link>
      </div>
    </main>
  );
}

/*
 * ============================================================
 * ERROR STATE
 * ============================================================
 */

function ErrorState() {
  return (
    <main
      style={{
        minHeight: "calc(100vh - 72px)",
        background: "#F8FAFC",
        padding: "64px 24px",
      }}
    >
      <div
        style={{
          maxWidth: "680px",
          margin: "0 auto",
          padding: "28px",
          borderRadius: "18px",
          border: "1px solid #FECACA",
          background: "#FFF7F7",
          color: "#991B1B",
          textAlign: "center",
          lineHeight: 1.6,
        }}
      >
        We couldn't load your Progress Insights right now.
        Please try again.
      </div>
    </main>
  );
}

/*
 * ============================================================
 * PAGE
 * ============================================================
 */

export default function ProgressInsightsPage() {
  const {
    plan,
  } =
    useAccountEntitlements();

  const [
    status,
    setStatus,
  ] =
    useState<PageStatus>(
      "loading"
    );

  const [
    children,
    setChildren,
  ] =
    useState<SavedChild[]>(
      []
    );

  const [
    selectedChildId,
    setSelectedChildId,
  ] =
    useState("");

  const [
    currentJourney,
    setCurrentJourney,
  ] =
    useState<SavedJourney | null>(
      null
    );

  const [
    insightResponse,
    setInsightResponse,
  ] =
    useState<PublicJourneyInsightResponse | null>(
      null
    );

  const [
    loadingChild,
    setLoadingChild,
  ] =
    useState(false);

  /*
   * ==========================================================
   * PREMIUM ACCESS
   * ==========================================================
   */

  const hasPremiumAccess =
    plan === "premium" ||
    plan === "premium_plus";

  /*
   * ==========================================================
   * SELECTED CHILD
   * ==========================================================
   */

  const selectedChild =
    useMemo(
      () =>
        children.find(
          (child) =>
            child.childId ===
            selectedChildId
        ) || null,
      [
        children,
        selectedChildId,
      ]
    );

  /*
   * ==========================================================
   * LOAD INSIGHT FOR JOURNEY
   * ==========================================================
   */

  async function loadInsight(
    child: SavedChild,
    journey: SavedJourney | null
  ) {
    if (!journey) {
      setInsightResponse(null);
      return;
    }

    const focus =
      getJourneyInsightFocus(
        child.familyProfile
          .journeyStage || ""
      );

    if (!focus) {
      setInsightResponse({
        available: false,
        reason: "not_available",
        insight: null,
      });

      return;
    }

    const stageNumber =
      Math.max(
        1,
        Math.floor(
          journey.stageNumber || 1
        )
      );

    const response =
      await getStageCompletionInsight(
        stageNumber,
        {
          focus,
          stageNumber,
        }
      );

    setInsightResponse(
      response
    );
  }

  /*
   * ==========================================================
   * LOAD ACCOUNT + INITIAL CHILD
   * ==========================================================
   */

  useEffect(
    () => {
      let cancelled =
        false;

      async function loadPage() {
        setStatus(
          "loading"
        );

        try {
          const user =
            await getCurrentUser();

          if (cancelled) {
            return;
          }

          if (!user) {
            setStatus(
              "guest"
            );

            return;
          }

          if (!hasPremiumAccess) {
            setStatus(
              "free"
            );

            return;
          }

          const savedChildren =
            await getSavedChildren(
              user.uid
            );

          if (cancelled) {
            return;
          }

          setChildren(
            savedChildren
          );

          if (
            savedChildren.length ===
            0
          ) {
            setSelectedChildId(
              ""
            );

            setCurrentJourney(
              null
            );

            setInsightResponse(
              null
            );

            setStatus(
              "empty"
            );

            return;
          }

          /*
           * getSavedChildren() already returns children with the
           * most recently updated child first.
           */

          const initialChild =
            savedChildren[0];

          setSelectedChildId(
            initialChild.childId
          );

          const journey =
            await getCurrentJourney(
              user.uid,
              initialChild.childId
            );

          if (cancelled) {
            return;
          }

          setCurrentJourney(
            journey
          );

          await loadInsight(
            initialChild,
            journey
          );

          if (cancelled) {
            return;
          }

          setStatus(
            "ready"
          );
        } catch (error) {
          console.error(
            "Progress Insights load error:",
            error
          );

          if (!cancelled) {
            setStatus(
              "error"
            );
          }
        }
      }

      loadPage();

      return () => {
        cancelled =
          true;
      };
    },
    [
      hasPremiumAccess,
    ]
  );

  /*
   * ==========================================================
   * CHANGE CHILD
   * ==========================================================
   */

  async function handleChildChange(
    childId: string
  ) {
    setSelectedChildId(
      childId
    );

    setLoadingChild(
      true
    );

    setInsightResponse(
      null
    );

    try {
      const user =
        await getCurrentUser();

      if (!user) {
        setStatus(
          "guest"
        );

        return;
      }

      const child =
        children.find(
          (item) =>
            item.childId ===
            childId
        );

      if (!child) {
        setStatus(
          "error"
        );

        return;
      }

      const journey =
        await getCurrentJourney(
          user.uid,
          childId
        );

      setCurrentJourney(
        journey
      );

      await loadInsight(
        child,
        journey
      );
    } catch (error) {
      console.error(
        "Progress Insights child load error:",
        error
      );

      setStatus(
        "error"
      );
    } finally {
      setLoadingChild(
        false
      );
    }
  }

  /*
   * ==========================================================
   * PAGE STATES
   * ==========================================================
   */

  if (
    status === "loading"
  ) {
    return (
      <LoadingState />
    );
  }

  if (
    status === "guest"
  ) {
    return (
      <GuestState />
    );
  }

  if (
    status === "free"
  ) {
    return (
      <UpgradeState />
    );
  }

  if (
    status === "empty"
  ) {
    return (
      <EmptyState />
    );
  }

  if (
    status === "error"
  ) {
    return (
      <ErrorState />
    );
  }

  /*
   * ==========================================================
   * CURRENT JOURNEY INFORMATION
   * ==========================================================
   */

  const stageNumber =
    currentJourney
      ? Math.max(
          1,
          Math.floor(
            currentJourney.stageNumber ||
              1
          )
        )
      : null;

  const focus =
    selectedChild
      ? getJourneyInsightFocus(
          selectedChild.familyProfile
            .journeyStage || ""
        )
      : undefined;

  /*
   * ==========================================================
   * MAIN EXPERIENCE
   * ==========================================================
   */

  return (
    <main
      style={{
        minHeight:
          "calc(100vh - 72px)",
        background:
          "#F8FAFC",
        padding:
          "48px 24px 72px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "960px",
          margin: "0 auto",
        }}
      >
        {/* ==================================================
            PAGE INTRODUCTION
        =================================================== */}

        <section
          style={{
            marginBottom: "28px",
          }}
        >
          <div
            style={{
              display:
                "inline-flex",
              alignItems:
                "center",
              gap: "7px",
              padding:
                "6px 10px",
              borderRadius:
                "999px",
              background:
                "#DBEAFE",
              color:
                "#1D4ED8",
              fontSize:
                "11px",
              fontWeight:
                800,
              textTransform:
                "uppercase",
              letterSpacing:
                "0.05em",
              marginBottom:
                "16px",
            }}
          >
            Premium
          </div>

          <h1
            style={{
              margin: 0,
              color:
                "#0F172A",
              fontSize:
                "36px",
              lineHeight:
                1.15,
              fontWeight:
                850,
            }}
          >
            AI Progress Insights
          </h1>

          <p
            style={{
              margin:
                "12px 0 0",
              maxWidth:
                "720px",
              color:
                "#64748B",
              fontSize:
                "16px",
              lineHeight:
                1.7,
            }}
          >
            See how families navigating a similar point in their
            Journey are progressing, using de-identified aggregate
            Journey activity.
          </p>
        </section>

        {/* ==================================================
            CHILD SELECTOR
        =================================================== */}

        {children.length > 1 && (
          <section
            style={{
              marginBottom:
                "20px",
              padding:
                "18px 20px",
              borderRadius:
                "14px",
              border:
                "1px solid #E2E8F0",
              background:
                "#FFFFFF",
            }}
          >
            <label
              htmlFor="progress-insights-child"
              style={{
                display:
                  "block",
                marginBottom:
                  "8px",
                color:
                  "#334155",
                fontSize:
                  "13px",
                fontWeight:
                  800,
              }}
            >
              View insights for
            </label>

            <select
              id="progress-insights-child"
              value={
                selectedChildId
              }
              disabled={
                loadingChild
              }
              onChange={(
                event
              ) =>
                handleChildChange(
                  event.target
                    .value
                )
              }
              style={{
                width:
                  "100%",
                maxWidth:
                  "420px",
                padding:
                  "11px 12px",
                borderRadius:
                  "10px",
                border:
                  "1px solid #CBD5E1",
                background:
                  "#FFFFFF",
                color:
                  "#0F172A",
                fontSize:
                  "14px",
              }}
            >
              {children.map(
                (child) => (
                  <option
                    key={
                      child.childId
                    }
                    value={
                      child.childId
                    }
                  >
                    {child.familyProfile
                      .childName ||
                      "Child"}
                  </option>
                )
              )}
            </select>

            {loadingChild && (
              <div
                style={{
                  marginTop:
                    "8px",
                  color:
                    "#64748B",
                  fontSize:
                    "12px",
                }}
              >
                Loading insights...
              </div>
            )}
          </section>
        )}

        {/* ==================================================
            INSIGHT CARD
        =================================================== */}

        <section
          style={{
            background:
              "#FFFFFF",
            border:
              "1px solid #E2E8F0",
            borderRadius:
              "18px",
            padding:
              "30px",
            boxShadow:
              "0 8px 24px rgba(15, 23, 42, 0.05)",
          }}
        >
          <div
            style={{
              width:
                "46px",
              height:
                "46px",
              display:
                "flex",
              alignItems:
                "center",
              justifyContent:
                "center",
              borderRadius:
                "13px",
              background:
                "#EFF6FF",
              fontSize:
                "22px",
              marginBottom:
                "18px",
            }}
            aria-hidden="true"
          >
            ✨
          </div>

          <h2
            style={{
              margin: 0,
              color:
                "#0F172A",
              fontSize:
                "23px",
              lineHeight:
                1.3,
              fontWeight:
                800,
            }}
          >
            Families at a similar point in the Journey
          </h2>

          <p
            style={{
              margin:
                "10px 0 0",
              color:
                "#64748B",
              fontSize:
                "14px",
              lineHeight:
                1.7,
              maxWidth:
                "680px",
            }}
          >
            These insights compare de-identified Journey activity
            from families navigating the same Journey focus and
            stage.
          </p>

          {/* ================================================
              NO CURRENT JOURNEY
          ================================================= */}

          {!currentJourney && (
            <div
              style={{
                marginTop:
                  "24px",
                padding:
                  "20px",
                borderRadius:
                  "12px",
                background:
                  "#F8FAFC",
                border:
                  "1px solid #E2E8F0",
              }}
            >
              <div
                style={{
                  color:
                    "#334155",
                  fontSize:
                    "14px",
                  fontWeight:
                    800,
                }}
              >
                No current Journey found
              </div>

              <div
                style={{
                  marginTop:
                    "6px",
                  color:
                    "#64748B",
                  fontSize:
                    "13px",
                  lineHeight:
                    1.6,
                }}
              >
                Start a Journey for this child before viewing
                Progress Insights.
              </div>
            </div>
          )}

          {/* ================================================
              UNSUPPORTED COHORT
          ================================================= */}

          {currentJourney &&
            !focus && (
              <div
                style={{
                  marginTop:
                    "24px",
                  padding:
                    "20px",
                  borderRadius:
                    "12px",
                  background:
                    "#F8FAFC",
                  border:
                    "1px solid #E2E8F0",
                }}
              >
                <div
                  style={{
                    color:
                      "#334155",
                    fontSize:
                      "14px",
                    fontWeight:
                      800,
                  }}
                >
                  This comparison isn't available yet
                </div>

                <div
                  style={{
                    marginTop:
                      "6px",
                    color:
                      "#64748B",
                    fontSize:
                      "13px",
                    lineHeight:
                      1.6,
                  }}
                >
                  We're continuing to expand the Journey categories
                  supported by Progress Insights.
                </div>
              </div>
            )}

          {/* ================================================
              AGGREGATE AVAILABLE
          ================================================= */}

          {currentJourney &&
            focus &&
            insightResponse
              ?.available &&
            insightResponse
              .insight.type ===
              "stage_completion" && (
              <div
                style={{
                  marginTop:
                    "24px",
                }}
              >
                <div
                  style={{
                    padding:
                      "24px",
                    borderRadius:
                      "16px",
                    background:
                      "#EFF6FF",
                    border:
                      "1px solid #BFDBFE",
                  }}
                >
                  <div
                    style={{
                      color:
                        "#1D4ED8",
                      fontSize:
                        "46px",
                      lineHeight:
                        1,
                      fontWeight:
                        850,
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
                      marginTop:
                        "10px",
                      color:
                        "#1E3A8A",
                      fontSize:
                        "16px",
                      fontWeight:
                        800,
                      lineHeight:
                        1.5,
                    }}
                  >
                    of families in this comparison group completed
                    Journey Stage{" "}
                    {
                      insightResponse
                        .insight
                        .stageNumber
                    }
                  </div>

                  <div
                    style={{
                      marginTop:
                        "8px",
                      color:
                        "#64748B",
                      fontSize:
                        "13px",
                      lineHeight:
                        1.6,
                    }}
                  >
                    Based on de-identified aggregate activity from{" "}
                    {
                      insightResponse
                        .insight
                        .cohortSize
                    }{" "}
                    families navigating a similar Journey focus
                    and stage.
                  </div>
                </div>
              </div>
            )}

          {/* ================================================
              INSUFFICIENT AGGREGATE DATA
          ================================================= */}

          {currentJourney &&
            focus &&
            insightResponse &&
            !insightResponse.available && (
              <div
                style={{
                  marginTop:
                    "24px",
                  padding:
                    "20px",
                  borderRadius:
                    "12px",
                  background:
                    "#F8FAFC",
                  border:
                    "1px solid #E2E8F0",
                }}
              >
                <div
                  style={{
                    color:
                      "#334155",
                    fontSize:
                      "14px",
                    fontWeight:
                      800,
                  }}
                >
                  We're still building this insight
                </div>

                <div
                  style={{
                    marginTop:
                      "6px",
                    color:
                      "#64748B",
                    fontSize:
                      "13px",
                    lineHeight:
                      1.6,
                  }}
                >
                  We only show comparisons after enough families
                  are represented in the same Journey group. This
                  helps protect family privacy and keeps the
                  comparison meaningful.
                </div>
              </div>
            )}

          {/* ================================================
              COHORT CONTEXT
          ================================================= */}

          {currentJourney &&
            focus &&
            stageNumber && (
              <div
                style={{
                  marginTop:
                    "18px",
                  color:
                    "#94A3B8",
                  fontSize:
                    "12px",
                  lineHeight:
                    1.6,
                }}
              >
                Current comparison: Journey Stage{" "}
                {stageNumber}
              </div>
            )}
        </section>

        {/* ==================================================
            PRIVACY / CONTEXT
        =================================================== */}

        <section
          style={{
            marginTop:
              "20px",
            padding:
              "18px 20px",
            borderRadius:
              "14px",
            background:
              "#F5F3FF",
            border:
              "1px solid #DDD6FE",
          }}
        >
          <div
            style={{
              color:
                "#5B21B6",
              fontSize:
                "13px",
              fontWeight:
                800,
            }}
          >
            About your Progress Insights
          </div>

          <p
            style={{
              margin:
                "6px 0 0",
              color:
                "#64748B",
              fontSize:
                "12px",
              lineHeight:
                1.6,
            }}
          >
            Progress Insights use de-identified aggregate Journey
            activity. Individual family activity is not shown.
            Comparisons are only displayed when enough families
            are represented to meet Myriad's privacy threshold.
            These insights do not diagnose conditions, predict
            outcomes, or replace professional guidance.
          </p>
        </section>

        {/* ==================================================
            BACK TO JOURNEY
        =================================================== */}

        <div
          style={{
            marginTop:
              "28px",
          }}
        >
          <Link
            href="/journey"
            style={{
              color:
                "#2563EB",
              fontSize:
                "14px",
              fontWeight:
                750,
              textDecoration:
                "none",
            }}
          >
            ← Back to My Journey
          </Link>
        </div>
      </div>
    </main>
  );
}