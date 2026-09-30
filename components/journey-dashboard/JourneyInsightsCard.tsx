"use client";

import {
  useEffect,
  useState,
  type CSSProperties,
} from "react";

import type {
  FamilyProfile,
} from "../../types/familyProfile";

import {
  buildJourneyAnalyticsContext,
} from "../../lib/journeyInsights/journeyAnalyticsContext";

import {
  getStageCompletionInsight,
} from "../../lib/journeyInsights/journeyInsightClient";

import type {
  PublicJourneyInsightResponse,
} from "../../lib/journeyInsights/journeyInsightPublicTypes";

/*
 * ============================================================
 * PROPS
 * ============================================================
 */

interface JourneyInsightsCardProps {
  familyProfile: FamilyProfile;
  journeyStageNumber: number;
}

/*
 * ============================================================
 * STYLES
 * ============================================================
 */

const styles: Record<
  string,
  CSSProperties
> = {
  card: {
    marginTop: "28px",
    marginBottom: "28px",
    padding: "24px",
    borderRadius: "18px",
    border:
      "1px solid #DDD6FE",
    background:
      "#FAF8FF",
  },

  header: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "10px",
  },

  icon: {
    width: "34px",
    height: "34px",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent:
      "center",
    background:
      "#EDE9FE",
    color: "#6D28D9",
    fontSize: "17px",
    fontWeight: 800,
    flexShrink: 0,
  },

  title: {
    margin: 0,
    color: "#0F172A",
    fontSize: "18px",
    lineHeight: 1.3,
    fontWeight: 800,
  },

  description: {
    margin:
      "0 0 18px",
    color: "#64748B",
    fontSize: "14px",
    lineHeight: 1.6,
  },

  insightRow: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    flexWrap: "wrap",
  },

  percentage: {
    color: "#6D28D9",
    fontSize: "38px",
    lineHeight: 1,
    fontWeight: 800,
    letterSpacing:
      "-0.03em",
  },

  insightText: {
    margin: 0,
    maxWidth: "620px",
    color: "#334155",
    fontSize: "15px",
    lineHeight: 1.6,
  },

  unavailable: {
    margin: 0,
    padding:
      "14px 16px",
    borderRadius: "12px",
    background:
      "#FFFFFF",
    border:
      "1px solid #E2E8F0",
    color: "#475569",
    fontSize: "14px",
    lineHeight: 1.6,
  },

  footnote: {
    margin:
      "16px 0 0",
    color: "#94A3B8",
    fontSize: "12px",
    lineHeight: 1.5,
  },
};

/*
 * ============================================================
 * COMPONENT
 * ============================================================
 */

export default function JourneyInsightsCard({
  familyProfile,
  journeyStageNumber,
}: JourneyInsightsCardProps) {
  const [
    insightResponse,
    setInsightResponse,
  ] =
    useState<
      PublicJourneyInsightResponse | null
    >(null);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  useEffect(() => {
    let active = true;

    async function loadInsight() {
      setLoading(true);

      try {
        /*
         * We use the same standardized Journey context builder
         * that analytics uses when events are recorded.
         *
         * That prevents the UI and analytics pipeline from
         * independently interpreting Journey stage/focus.
         */

        const context =
          buildJourneyAnalyticsContext({
            journeyId:
              "family-facing-insight",

            stageNumber:
              journeyStageNumber,

            childAge:
              familyProfile.childAge,

            journeyStage:
              familyProfile.journeyStage,
          });

        /*
         * Unknown Journey stages must not be guessed into a
         * comparison cohort.
         */

        if (!context.focus) {
          if (active) {
            setInsightResponse({
              available: false,
              reason:
                "not_available",
              insight: null,
            });
          }

          return;
        }

        const response =
          await getStageCompletionInsight(
            journeyStageNumber,
            {
              focus:
                context.focus,

              stageNumber:
                journeyStageNumber,
            }
          );

        if (active) {
          setInsightResponse(
            response
          );
        }
      } catch (error) {
        console.error(
          "Unable to load Journey Insights:",
          error
        );

        if (active) {
          setInsightResponse({
            available: false,
            reason:
              "not_available",
            insight: null,
          });
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadInsight();

    return () => {
      active = false;
    };
  }, [
    familyProfile.childAge,
    familyProfile.journeyStage,
    journeyStageNumber,
  ]);

  /*
   * ----------------------------------------------------------
   * LOADING
   * ----------------------------------------------------------
   */

  if (loading) {
    return (
      <section
        style={styles.card}
        aria-label="Journey Insights"
      >
        <div
          style={
            styles.header
          }
        >
          <div
            style={
              styles.icon
            }
            aria-hidden="true"
          >
            i
          </div>

          <h2
            style={
              styles.title
            }
          >
            Journey Insights
          </h2>
        </div>

        <p
          style={
            styles.description
          }
        >
          Looking for
          aggregate Journey
          activity from families
          at a similar point in
          their Journey.
        </p>
      </section>
    );
  }

  /*
   * ----------------------------------------------------------
   * AVAILABLE STAGE INSIGHT
   * ----------------------------------------------------------
   */

  if (
    insightResponse?.available &&
    insightResponse.insight.type ===
      "stage_completion"
  ) {
    const insight =
      insightResponse.insight;

    return (
      <section
        style={styles.card}
        aria-label="Journey Insights"
      >
        <div
          style={
            styles.header
          }
        >
          <div
            style={
              styles.icon
            }
            aria-hidden="true"
          >
            i
          </div>

          <h2
            style={
              styles.title
            }
          >
            Journey Insights
          </h2>
        </div>

        <p
          style={
            styles.description
          }
        >
          See how aggregate
          Myriad Journey
          activity compares
          for families at a
          similar point in
          their Journey.
        </p>

        <div
          style={
            styles.insightRow
          }
        >
          <div
            style={
              styles.percentage
            }
          >
            {
              insight.completionPercent
            }
            %
          </div>

          <p
            style={
              styles.insightText
            }
          >
            of families in a
            similar Journey
            focus and stage
            completed this
            stage.
          </p>
        </div>

        <p
          style={
            styles.footnote
          }
        >
          This insight is based
          on aggregated Myriad
          Journey activity. No
          individual family's
          activity is shown.
        </p>
      </section>
    );
  }

  /*
   * ----------------------------------------------------------
   * INSUFFICIENT / UNAVAILABLE DATA
   * ----------------------------------------------------------
   *
   * We intentionally do NOT show:
   *
   * - the small cohort size
   * - an estimated percentage
   * - placeholder statistics
   * - fabricated comparisons
   */

  return (
    <section
      style={styles.card}
      aria-label="Journey Insights"
    >
      <div
        style={
          styles.header
        }
      >
        <div
          style={
            styles.icon
          }
          aria-hidden="true"
        >
          i
        </div>

        <h2
          style={
            styles.title
          }
        >
          Journey Insights
        </h2>
      </div>

      <p
        style={
          styles.description
        }
      >
        See how aggregate
        Myriad Journey
        activity compares for
        families at a similar
        point in their Journey.
      </p>

      <p
        style={
          styles.unavailable
        }
      >
        We're still building
        enough aggregate
        Journey activity to
        provide a meaningful
        comparison for this
        stage.
      </p>

      <p
        style={
          styles.footnote
        }
      >
        Journey Insights appear
        only when enough
        aggregate family
        activity is available
        to protect privacy.
      </p>
    </section>
  );
}