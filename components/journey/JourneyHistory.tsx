
"use client";

import { useEffect, useState } from "react";

import type {
  JourneyStageRecord,
} from "../../lib/journeyHistory";

import {
  getJourneyHistory,
} from "../../lib/journeyHistory";

import {
  watchAuthState,
} from "../../lib/auth";

interface JourneyHistoryProps {
  childId?: string;
  ownerUserId?: string;
  journeyId?: string;
  refreshKey?: number;
}

export default function JourneyHistory({
  childId,
  ownerUserId,
  journeyId,
  refreshKey = 0,
}: JourneyHistoryProps) {
  const [history, setHistory] = useState<
    JourneyStageRecord[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    let requestId = 0;

    setHistory([]);
    setError("");
    setLoading(true);

    const unsubscribe = watchAuthState(async (user) => {
      if (!active) return;

      const currentRequest = ++requestId;

      if (!user || !childId) {
        setHistory([]);
        setError("");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      setHistory([]);

      try {
        const canonicalOwnerUserId =
          ownerUserId?.trim() || user.uid;

        const journeyHistory = await getJourneyHistory(
          canonicalOwnerUserId,
          childId,
          journeyId
        );

        if (
          !active ||
          currentRequest !== requestId
        ) {
          return;
        }

        setHistory(journeyHistory);
      } catch (loadError) {
        console.error(
          "Unable to load journey history:",
          loadError
        );

        if (
          !active ||
          currentRequest !== requestId
        ) {
          return;
        }

        setHistory([]);
        setError(
          "We couldn't load your journey history right now."
        );
      } finally {
        if (
          active &&
          currentRequest === requestId
        ) {
          setLoading(false);
        }
      }
    });

    return () => {
      active = false;
      requestId += 1;
      unsubscribe();
    };
  }, [childId, ownerUserId, journeyId, refreshKey]);

  function formatDate(timestamp: number): string {
    if (!timestamp) return "Date unavailable";

    try {
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date(timestamp));
    } catch {
      return "Date unavailable";
    }
  }

  if (!childId) return null;

  if (
    !loading &&
    history.length === 0 &&
    !error
  ) {
    return null;
  }

  return (
    <section
      style={{
        maxWidth: "1050px",
        margin: "40px auto 0",
        padding: "0 24px",
      }}
    >
      <div style={{ marginBottom: "22px" }}>
        <div
          style={{
            color: "#2563EB",
            fontSize: "12px",
            fontWeight: 800,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom: "7px",
          }}
        >
          Your Progress
        </div>

        <h2
          style={{
            margin: 0,
            color: "#0F172A",
            fontSize: "29px",
            fontWeight: 800,
            lineHeight: 1.2,
          }}
        >
          Journey History
        </h2>

        <p
          style={{
            margin: "8px 0 0",
            maxWidth: "720px",
            color: "#64748B",
            fontSize: "15px",
            lineHeight: 1.6,
          }}
        >
          See the steps you've completed as you move
          forward through your personalized journey.
        </p>
      </div>

      {loading && (
        <div
          style={{
            padding: "24px",
            borderRadius: "16px",
            border: "1px solid #E2E8F0",
            background: "#F8FAFC",
            color: "#64748B",
            fontSize: "14px",
            textAlign: "center",
          }}
        >
          Loading your journey history...
        </div>
      )}

      {!loading && error && (
        <div
          role="alert"
          style={{
            padding: "18px",
            borderRadius: "16px",
            border: "1px solid #FECACA",
            background: "#FEF2F2",
            color: "#B91C1C",
            fontSize: "14px",
            lineHeight: 1.5,
          }}
        >
          {error}
        </div>
      )}

      {!loading &&
        !error &&
        history.length > 0 && (
          <div
            style={{
              display: "grid",
              gap: "14px",
            }}
          >
            {history
              .slice()
              .sort(
                (a, b) =>
                  b.stageNumber - a.stageNumber
              )
              .map((stage) => {
                const completedCount =
                  stage.completedTaskIds?.length ??
                  stage.journey?.tasks?.filter(
                    (task) => task.completed
                  ).length ??
                  0;

                return (
                  <div
                    key={stage.stageId}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "16px",
                      padding: "20px",
                      borderRadius: "16px",
                      border: "1px solid #E2E8F0",
                      background: "#FFFFFF",
                    }}
                  >
                    <div
                      style={{
                        flexShrink: 0,
                        width: "42px",
                        height: "42px",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "#ECFDF5",
                        color: "#059669",
                        fontSize: "15px",
                        fontWeight: 800,
                      }}
                    >
                      ✓
                    </div>

                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent:
                            "space-between",
                          gap: "12px",
                          flexWrap: "wrap",
                        }}
                      >
                        <h3
                          style={{
                            margin: 0,
                            color: "#0F172A",
                            fontSize: "18px",
                            fontWeight: 800,
                          }}
                        >
                          Journey Stage{" "}
                          {stage.stageNumber}
                        </h3>

                        <span
                          style={{
                            padding: "5px 9px",
                            borderRadius: "999px",
                            background: "#ECFDF5",
                            color: "#047857",
                            fontSize: "10px",
                            fontWeight: 800,
                            textTransform: "uppercase",
                            letterSpacing: "0.04em",
                          }}
                        >
                          Completed
                        </span>
                      </div>

                      {stage.journey?.currentFocus
                        ?.title && (
                        <div style={{ marginTop: "10px" }}>
                          <div
                            style={{
                              color: "#64748B",
                              fontSize: "12px",
                              fontWeight: 700,
                              textTransform:
                                "uppercase",
                              letterSpacing:
                                "0.04em",
                              marginBottom: "4px",
                            }}
                          >
                            Focus
                          </div>

                          <div
                            style={{
                              color: "#334155",
                              fontSize: "15px",
                              fontWeight: 700,
                              lineHeight: 1.4,
                            }}
                          >
                            {
                              stage.journey
                                .currentFocus.title
                            }
                          </div>
                        </div>
                      )}

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "14px",
                          flexWrap: "wrap",
                          marginTop: "12px",
                          color: "#64748B",
                          fontSize: "13px",
                        }}
                      >
                        <span>
                          ✓ {completedCount} task
                          {completedCount === 1
                            ? ""
                            : "s"}{" "}
                          completed
                        </span>

                        <span>
                          Completed{" "}
                          {formatDate(
                            stage.completedAt
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
    </section>
  );
}
