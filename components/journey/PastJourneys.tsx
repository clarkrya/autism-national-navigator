
"use client";

import { useEffect, useState } from "react";

import {
  getPastJourneys,
  type ArchivedJourney,
} from "../../lib/journeyRepository";

import { watchAuthState } from "../../lib/auth";

type PastJourneysProps = {
  childId: string;
  ownerUserId?: string;
  refreshKey?: number;
};

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

export default function PastJourneys({
  childId,
  ownerUserId,
  refreshKey = 0,
}: PastJourneysProps) {
  const [journeys, setJourneys] = useState<
    ArchivedJourney[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedJourneyId, setExpandedJourneyId] =
    useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let requestId = 0;

    setLoading(true);
    setError("");
    setJourneys([]);
    setExpandedJourneyId(null);

    const unsubscribe = watchAuthState(async (user) => {
      if (!active) return;

      const currentRequest = ++requestId;

      if (!user || !childId) {
        setJourneys([]);
        setError("");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      setJourneys([]);

      try {
        const canonicalOwnerUserId =
          ownerUserId?.trim() || user.uid;

        const pastJourneys = await getPastJourneys(
          canonicalOwnerUserId,
          childId
        );

        if (
          !active ||
          currentRequest !== requestId
        ) {
          return;
        }

        setJourneys(pastJourneys);
      } catch (loadError) {
        console.error(
          "Unable to load past journeys:",
          loadError
        );

        if (
          !active ||
          currentRequest !== requestId
        ) {
          return;
        }

        setJourneys([]);
        setError(
          "We couldn't load past journeys right now."
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
  }, [childId, ownerUserId, refreshKey]);

  if (!childId) return null;

  if (!loading && !error && journeys.length === 0) {
    return null;
  }

  return (
    <section
      style={{
        maxWidth: "1050px",
        margin: "42px auto 0",
        padding: "0 24px",
      }}
    >
      <div style={{ marginBottom: "22px" }}>
        <div
          style={{
            color: "#7C3AED",
            fontSize: "12px",
            fontWeight: 800,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom: "7px",
          }}
        >
          Previous Journeys
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
          Past Journeys
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
          Review earlier Journeys for this child without
          changing the Journey you&apos;re currently working on.
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
          Loading past journeys...
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

      {!loading && !error && journeys.length > 0 && (
        <div
          style={{
            display: "grid",
            gap: "14px",
          }}
        >
          {journeys.map((archivedJourney, index) => {
            const expanded =
              expandedJourneyId === archivedJourney.journeyId;

            const focusTitle =
              archivedJourney.journey?.currentFocus?.title ||
              "Personalized Journey";

            const tasks =
              archivedJourney.journey?.tasks || [];

            const taskCount = tasks.length;

            const completedTaskCount = tasks.filter(
              (task) => task.completed
            ).length;

            return (
              <article
                key={archivedJourney.journeyId}
                style={{
                  overflow: "hidden",
                  borderRadius: "18px",
                  border: "1px solid #E2E8F0",
                  background: "#FFFFFF",
                  boxShadow:
                    "0 4px 16px rgba(15, 23, 42, 0.04)",
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    setExpandedJourneyId(
                      expanded
                        ? null
                        : archivedJourney.journeyId
                    )
                  }
                  aria-expanded={expanded}
                  aria-controls={`archived-journey-${index}`}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "18px",
                    padding: "20px",
                    border: "none",
                    background: "#FFFFFF",
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "14px",
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        flexShrink: 0,
                        width: "42px",
                        height: "42px",
                        borderRadius: "12px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "#F5F3FF",
                        color: "#7C3AED",
                        fontSize: "14px",
                        fontWeight: 800,
                      }}
                    >
                      {journeys.length - index}
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          color: "#0F172A",
                          fontSize: "17px",
                          fontWeight: 800,
                          lineHeight: 1.35,
                        }}
                      >
                        {focusTitle}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: "10px",
                          flexWrap: "wrap",
                          marginTop: "6px",
                          color: "#64748B",
                          fontSize: "12px",
                        }}
                      >
                        <span>
                          Archived{" "}
                          {formatDate(archivedJourney.archivedAt)}
                        </span>

                        <span>•</span>

                        <span>
                          Reached Stage{" "}
                          {archivedJourney.stageNumber}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div
                    aria-hidden="true"
                    style={{
                      flexShrink: 0,
                      color: "#64748B",
                      fontSize: "20px",
                      lineHeight: 1,
                      transform: expanded
                        ? "rotate(180deg)"
                        : "rotate(0deg)",
                      transition: "transform 160ms ease",
                    }}
                  >
                    ⌄
                  </div>
                </button>

                {expanded && (
                  <div
                    id={`archived-journey-${index}`}
                    style={{
                      padding: "0 20px 22px",
                      borderTop: "1px solid #F1F5F9",
                    }}
                  >
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        marginTop: "18px",
                        padding: "5px 9px",
                        borderRadius: "999px",
                        background: "#F1F5F9",
                        color: "#475569",
                        fontSize: "10px",
                        fontWeight: 800,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Read Only
                    </div>

                    <div style={{ marginTop: "18px" }}>
                      <div
                        style={{
                          color: "#64748B",
                          fontSize: "11px",
                          fontWeight: 800,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          marginBottom: "5px",
                        }}
                      >
                        Journey Focus
                      </div>

                      <div
                        style={{
                          color: "#334155",
                          fontSize: "15px",
                          fontWeight: 700,
                          lineHeight: 1.5,
                        }}
                      >
                        {focusTitle}
                      </div>
                    </div>

                    <div
                      style={{
                        marginTop: "18px",
                        padding: "14px 16px",
                        borderRadius: "12px",
                        background: "#F8FAFC",
                        color: "#475569",
                        fontSize: "13px",
                        lineHeight: 1.5,
                      }}
                    >
                      {completedTaskCount} of {taskCount}{" "}
                      task{taskCount === 1 ? "" : "s"}{" "}
                      completed in the archived stage.
                    </div>

                    {tasks.length > 0 && (
                      <div
                        style={{
                          display: "grid",
                          gap: "10px",
                          marginTop: "18px",
                        }}
                      >
                        {tasks.map((task, taskIndex) => (
                          <div
                            key={
                              task.id ||
                              `${archivedJourney.journeyId}-${taskIndex}`
                            }
                            style={{
                              padding: "13px 15px",
                              borderRadius: "12px",
                              border: "1px solid #E2E8F0",
                              background: task.completed
                                ? "#F8FAFC"
                                : "#FFFFFF",
                            }}
                          >
                            <div
                              style={{
                                color: "#334155",
                                fontSize: "14px",
                                fontWeight: 700,
                                lineHeight: 1.45,
                              }}
                            >
                              {task.title}
                            </div>

                            <div
                              style={{
                                marginTop: "4px",
                                color: "#64748B",
                                fontSize: "12px",
                                fontWeight: 600,
                              }}
                            >
                              {task.completed
                                ? "Completed"
                                : "Not completed"}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div
                      style={{
                        marginTop: "18px",
                        color: "#94A3B8",
                        fontSize: "12px",
                        lineHeight: 1.5,
                      }}
                    >
                      This archived Journey is for reference
                      only. Changes cannot be made from Past
                      Journeys.
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
