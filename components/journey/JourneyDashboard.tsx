"use client";

import { useMemo, useState } from "react";

import type { FamilyProfile } from "../../types/familyProfile";
import type { PersonalizedJourney } from "../../lib/ai/journeyTypes";

interface JourneyDashboardProps {
  personalizedJourney: PersonalizedJourney;
  familyProfile: FamilyProfile;
}

export default function JourneyDashboard({
  personalizedJourney,
  familyProfile,
}: JourneyDashboardProps) {
  const [journey, setJourney] =
    useState<PersonalizedJourney>(
      personalizedJourney
    );

  const [isRefreshing, setIsRefreshing] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const completedTasks = useMemo(
    () =>
      journey.tasks.filter(
        (task) => task.completed
      ).length,
    [journey.tasks]
  );

  const totalTasks =
    journey.tasks.length;

  const progressPercent =
    totalTasks === 0
      ? 0
      : Math.round(
          (completedTasks /
            totalTasks) *
            100
        );

  function toggleTask(taskId: string) {
    setJourney((currentJourney) => ({
      ...currentJourney,

      tasks: currentJourney.tasks.map(
        (task) =>
          task.id === taskId
            ? {
                ...task,
                completed:
                  !task.completed,
              }
            : task
      ),
    }));
  }

  async function refreshJourneyWithAI() {
    setIsRefreshing(true);
    setError(null);

    try {
      const response = await fetch(
        "/api/journey/generate",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            familyProfile,

            currentJourney: journey,

            completedTasks:
              journey.tasks.filter(
                (task) =>
                  task.completed
              ),

            reason:
              "tasks_completed",
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Unable to update your journey."
        );
      }

      if (!data?.journey) {
        throw new Error(
          "The AI did not return an updated journey."
        );
      }

      setJourney(data.journey);
    } catch (err) {
      console.error(
        "AI journey refresh failed:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "We couldn't update your journey."
      );
    } finally {
      setIsRefreshing(false);
    }
  }

  function handleTaskToggle(
    taskId: string
  ) {
    const task =
      journey.tasks.find(
        (item) =>
          item.id === taskId
      );

    if (!task) return;

    toggleTask(taskId);

    /*
     * We intentionally do NOT immediately
     * call the AI here.
     *
     * The family should be able to check
     * off multiple tasks before the AI
     * determines the next stage.
     *
     * The refresh button will temporarily
     * trigger the second AI analysis.
     */
  }

  return (
    <main
      style={{
        maxWidth: "1100px",
        margin: "0 auto",
        padding:
          "60px 24px 100px",
      }}
    >
      {/* Header */}

      <div
        style={{
          marginBottom: "50px",
        }}
      >
        <p
          style={{
            color: "#2563EB",
            fontWeight: 700,
            fontSize: "14px",
            textTransform:
              "uppercase",
            letterSpacing:
              "0.08em",
            marginBottom: "12px",
          }}
        >
          Your Personalized Journey
        </p>

        <h1
          style={{
            fontSize:
              "clamp(40px, 6vw, 64px)",
            lineHeight: 1.05,
            fontWeight: 800,
            color: "#0F172A",
            margin: 0,
            marginBottom: "18px",
          }}
        >
          Your Next Steps,
          <br />
          Personalized for Your Family
        </h1>

        <p
          style={{
            maxWidth: "760px",
            fontSize: "20px",
            lineHeight: 1.7,
            color: "#64748B",
            margin: 0,
          }}
        >
          {journey.summary}
        </p>
      </div>

      {/* Current Focus */}

      <section
        style={{
          padding: "36px",
          borderRadius: "28px",
          background:
            "linear-gradient(135deg, #EFF6FF, #F0FDFA)",
          border:
            "1px solid #DCE7F5",
          marginBottom: "32px",
        }}
      >
        <div
          style={{
            color: "#2563EB",
            fontSize: "14px",
            fontWeight: 800,
            textTransform:
              "uppercase",
            letterSpacing:
              "0.08em",
            marginBottom: "12px",
          }}
        >
          Current Focus
        </div>

        <h2
          style={{
            fontSize: "36px",
            fontWeight: 800,
            color: "#0F172A",
            margin: 0,
            marginBottom: "14px",
          }}
        >
          {
            journey.currentFocus
              .title
          }
        </h2>

        <p
          style={{
            fontSize: "18px",
            lineHeight: 1.8,
            color: "#475569",
            margin: 0,
            maxWidth: "800px",
          }}
        >
          {
            journey.currentFocus
              .explanation
          }
        </p>
      </section>

      {/* Next Best Step */}

      <section
        style={{
          padding: "32px",
          borderRadius: "24px",
          background: "#FFFFFF",
          border:
            "1px solid #E2E8F0",
          boxShadow:
            "0 10px 30px rgba(15,23,42,.06)",
          marginBottom: "40px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "14px",
          }}
        >
          <span
            style={{
              width: "12px",
              height: "12px",
              borderRadius: "50%",
              background: "#14B8A6",
              display: "inline-block",
            }}
          />

          <span
            style={{
              color: "#0F766E",
              fontWeight: 800,
              textTransform:
                "uppercase",
              fontSize: "14px",
              letterSpacing:
                "0.06em",
            }}
          >
            Your Next Best Step
          </span>
        </div>

        <h2
          style={{
            fontSize: "28px",
            color: "#0F172A",
            margin: 0,
            marginBottom: "10px",
          }}
        >
          {journey.nextStep.title}
        </h2>

        <p
          style={{
            color: "#64748B",
            fontSize: "17px",
            lineHeight: 1.7,
            margin: 0,
          }}
        >
          {journey.nextStep.description}
        </p>
      </section>

      {/* Priorities */}

      <section
        style={{
          marginBottom: "50px",
        }}
      >
        <div
          style={{
            marginBottom: "24px",
          }}
        >
          <h2
            style={{
              fontSize: "32px",
              color: "#0F172A",
              margin: 0,
              marginBottom: "8px",
            }}
          >
            What to Focus On
          </h2>

          <p
            style={{
              color: "#64748B",
              fontSize: "17px",
              margin: 0,
            }}
          >
            Based on what you told us, these
            are the areas the AI recommends
            focusing on.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "20px",
          }}
        >
          {journey.priorities.map(
            (priority) => (
              <div
                key={priority.id}
                style={{
                  padding: "26px",
                  borderRadius:
                    "20px",
                  background:
                    "#FFFFFF",
                  border:
                    "1px solid #E2E8F0",
                  boxShadow:
                    "0 6px 20px rgba(15,23,42,.04)",
                }}
              >
                <div
                  style={{
                    display:
                      "inline-block",
                    padding:
                      "6px 10px",
                    borderRadius:
                      "999px",
                    background:
                      priority.priority ===
                      "High"
                        ? "#FEF2F2"
                        : priority.priority ===
                            "Medium"
                          ? "#FFF7ED"
                          : "#F1F5F9",
                    color:
                      priority.priority ===
                      "High"
                        ? "#B91C1C"
                        : priority.priority ===
                            "Medium"
                          ? "#C2410C"
                          : "#475569",
                    fontSize:
                      "12px",
                    fontWeight: 800,
                    marginBottom:
                      "16px",
                  }}
                >
                  {priority.priority}
                </div>

                <h3
                  style={{
                    fontSize:
                      "21px",
                    color:
                      "#0F172A",
                    margin: 0,
                    marginBottom:
                      "10px",
                  }}
                >
                  {priority.title}
                </h3>

                <p
                  style={{
                    color:
                      "#64748B",
                    lineHeight:
                      1.7,
                    margin: 0,
                  }}
                >
                  {
                    priority.explanation
                  }
                </p>
              </div>
            )
          )}
        </div>
      </section>

      {/* Tasks */}

      <section
        style={{
          marginBottom: "50px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems:
              "flex-end",
            gap: "20px",
            marginBottom:
              "24px",
          }}
        >
          <div>
            <h2
              style={{
                fontSize: "32px",
                color:
                  "#0F172A",
                margin: 0,
                marginBottom:
                  "8px",
              }}
            >
              Your Next Steps
            </h2>

            <p
              style={{
                color:
                  "#64748B",
                fontSize:
                  "17px",
                margin: 0,
              }}
            >
              Complete these steps
              at your own pace.
            </p>
          </div>

          <div
            style={{
              minWidth:
                "160px",
              textAlign:
                "right",
            }}
          >
            <strong
              style={{
                color:
                  "#0F172A",
              }}
            >
              {completedTasks} of{" "}
              {totalTasks}
            </strong>

            <div
              style={{
                marginTop:
                  "8px",
                height: "8px",
                background:
                  "#E2E8F0",
                borderRadius:
                  "999px",
                overflow:
                  "hidden",
              }}
            >
              <div
                style={{
                  width: `${progressPercent}%`,
                  height: "100%",
                  background:
                    "linear-gradient(90deg,#2563EB,#14B8A6)",
                  transition:
                    "width .3s ease",
                }}
              />
            </div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gap: "16px",
          }}
        >
          {journey.tasks.map(
            (task) => (
              <div
                key={task.id}
                style={{
                  padding:
                    "24px",
                  borderRadius:
                    "20px",
                  background:
                    task.completed
                      ? "#F8FAFC"
                      : "#FFFFFF",
                  border:
                    "1px solid #E2E8F0",
                  display:
                    "flex",
                  alignItems:
                    "flex-start",
                  gap: "18px",
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    handleTaskToggle(
                      task.id
                    )
                  }
                  aria-label={
                    task.completed
                      ? `Mark ${task.title} incomplete`
                      : `Complete ${task.title}`
                  }
                  style={{
                    width:
                      "28px",
                    height:
                      "28px",
                    minWidth:
                      "28px",
                    borderRadius:
                      "50%",
                    border:
                      task.completed
                        ? "none"
                        : "2px solid #CBD5E1",
                    background:
                      task.completed
                        ? "#14B8A6"
                        : "#FFFFFF",
                    color:
                      "#FFFFFF",
                    cursor:
                      "pointer",
                    fontSize:
                      "16px",
                    fontWeight:
                      800,
                  }}
                >
                  {task.completed
                    ? "✓"
                    : ""}
                </button>

                <div
                  style={{
                    flex: 1,
                  }}
                >
                  <div
                    style={{
                      display:
                        "flex",
                      alignItems:
                        "center",
                      flexWrap:
                        "wrap",
                      gap: "10px",
                      marginBottom:
                        "8px",
                    }}
                  >
                    <h3
                      style={{
                        fontSize:
                          "20px",
                        color:
                          "#0F172A",
                        margin: 0,
                      }}
                    >
                      {task.title}
                    </h3>

                    <span
                      style={{
                        fontSize:
                          "12px",
                        fontWeight:
                          700,
                        color:
                          "#64748B",
                        background:
                          "#F1F5F9",
                        padding:
                          "5px 9px",
                        borderRadius:
                          "999px",
                      }}
                    >
                      {task.priority}
                    </span>
                  </div>

                  <p
                    style={{
                      color:
                        "#64748B",
                      lineHeight:
                        1.7,
                      margin:
                        "0 0 8px",
                    }}
                  >
                    {
                      task.description
                    }
                  </p>

                  <span
                    style={{
                      fontSize:
                        "14px",
                      color:
                        "#94A3B8",
                    }}
                  >
                    Estimated time:{" "}
                    {
                      task.estimatedTime
                    }
                  </span>
                </div>
              </div>
            )
          )}
        </div>
      </section>

      {/* AI Re-evaluation */}

      {completedTasks > 0 && (
        <section
          style={{
            padding: "32px",
            borderRadius: "24px",
            background:
              "linear-gradient(135deg,#F0FDFA,#EFF6FF)",
            border:
              "1px solid #DCE7F5",
            marginBottom: "50px",
            textAlign: "center",
          }}
        >
          <h2
            style={{
              fontSize: "28px",
              color: "#0F172A",
              margin: 0,
              marginBottom: "10px",
            }}
          >
            Ready for Your Next Step?
          </h2>

          <p
            style={{
              maxWidth:
                "650px",
              margin:
                "0 auto 24px",
              color:
                "#64748B",
              lineHeight:
                1.7,
            }}
          >
            Once you've made progress on
            your tasks, let the AI reassess
            your journey and determine what
            should come next.
          </p>

          {error && (
            <p
              style={{
                color: "#B91C1C",
                marginBottom:
                  "16px",
              }}
            >
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={
              refreshJourneyWithAI
            }
            disabled={
              isRefreshing
            }
            style={{
              padding:
                "14px 28px",
              borderRadius:
                "12px",
              border: "none",
              background:
                isRefreshing
                  ? "#94A3B8"
                  : "#2563EB",
              color:
                "#FFFFFF",
              fontSize:
                "16px",
              fontWeight:
                700,
              cursor:
                isRefreshing
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {isRefreshing
              ? "Reassessing Your Journey..."
              : "Update My Next Steps"}
          </button>
        </section>
      )}

      {/* Resources */}

      {journey.resources.length >
        0 && (
        <section>
          <h2
            style={{
              fontSize: "32px",
              color:
                "#0F172A",
              marginBottom:
                "24px",
            }}
          >
            Recommended Resources
          </h2>

          <div
            style={{
              display:
                "grid",
              gap: "16px",
            }}
          >
            {journey.resources.map(
              (resource) => (
                <div
                  key={
                    resource.id
                  }
                  style={{
                    padding:
                      "24px",
                    borderRadius:
                      "18px",
                    border:
                      "1px solid #E2E8F0",
                    background:
                      "#FFFFFF",
                  }}
                >
                  <h3
                    style={{
                      margin: 0,
                      marginBottom:
                        "8px",
                      fontSize:
                        "20px",
                    }}
                  >
                    {
                      resource.title
                    }
                  </h3>

                  <p
                    style={{
                      color:
                        "#64748B",
                      lineHeight:
                        1.7,
                      margin:
                        "0 0 12px",
                    }}
                  >
                    {
                      resource.description
                    }
                  </p>

                  {resource.url && (
                    <a
                      href={
                        resource.url
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color:
                          "#2563EB",
                        fontWeight:
                          700,
                      }}
                    >
                      View Resource →
                    </a>
                  )}
                </div>
              )
            )}
          </div>
        </section>
      )}
    </main>
  );
}