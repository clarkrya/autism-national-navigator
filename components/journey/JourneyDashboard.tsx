"use client";

import { useMemo, useState } from "react";

import type { FamilyProfile } from "../../types/familyProfile";
import type {
  PersonalizedJourney,
  AIPriority,
} from "../../lib/ai/journeyTypes";
import type { Task } from "../../lib/journeyEngine";

interface JourneyDashboardProps {
  personalizedJourney: PersonalizedJourney;
  familyProfile: FamilyProfile;
}

export default function JourneyDashboard({
  personalizedJourney,
  familyProfile,
}: JourneyDashboardProps) {
  const [tasks, setTasks] = useState<Task[]>(
    personalizedJourney.tasks || []
  );

  /*
   * Calculate task progress.
   */
  const completedTasks = useMemo(() => {
    return tasks.filter((task) => task.completed).length;
  }, [tasks]);

  const totalTasks = tasks.length;

  const taskPercent =
    totalTasks > 0
      ? Math.round(
          (completedTasks / totalTasks) * 100
        )
      : 0;

  /*
   * Toggle a task.
   *
   * This currently updates the dashboard locally.
   * In the next sprint, completed tasks will be
   * saved and used to trigger the next AI journey.
   */
  function toggleTask(taskId: string) {
    setTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              completed: !task.completed,
            }
          : task
      )
    );
  }

  /*
   * Determine whether every AI-recommended task
   * has been completed.
   */
  const allTasksCompleted =
    tasks.length > 0 &&
    tasks.every((task) => task.completed);

  return (
    <main
      style={{
        maxWidth: "1100px",
        margin: "0 auto",
        padding: "70px 24px 100px",
      }}
    >
      {/* =====================================================
          HEADER
      ====================================================== */}

      <section
        style={{
          marginBottom: "45px",
        }}
      >
        <div
          style={{
            color: "#2563EB",
            fontSize: "14px",
            fontWeight: 800,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom: "14px",
          }}
        >
          Your Personalized Journey
        </div>

        <h1
          style={{
            fontSize: "52px",
            lineHeight: 1.08,
            fontWeight: 800,
            color: "#0F172A",
            margin: 0,
            maxWidth: "900px",
          }}
        >
          {familyProfile.childName
            ? `${familyProfile.childName}'s Personalized Journey`
            : "Your Personalized Journey"}
        </h1>

        <p
          style={{
            marginTop: "22px",
            maxWidth: "820px",
            fontSize: "20px",
            lineHeight: 1.7,
            color: "#64748B",
          }}
        >
          Based on what you shared, we've identified
          where we recommend focusing first.
        </p>
      </section>

      {/* =====================================================
          FAMILY SNAPSHOT
      ====================================================== */}

      <section
        style={{
          background: "#F8FAFC",
          border: "1px solid #E2E8F0",
          borderRadius: "24px",
          padding: "30px",
          marginBottom: "36px",
        }}
      >
        <div
          style={{
            color: "#2563EB",
            fontSize: "13px",
            fontWeight: 800,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom: "22px",
          }}
        >
          Your Family Snapshot
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "24px",
          }}
        >
          <SnapshotItem
            label="Age"
            value={
              familyProfile.childAge
                ? `${familyProfile.childAge} years`
                : "Not provided"
            }
          />

          <SnapshotItem
            label="Location"
            value={
              familyProfile.state ||
              "Not provided"
            }
          />

          <SnapshotItem
            label="Journey Stage"
            value={
              familyProfile.journeyStage ||
              "Not provided"
            }
          />

          <SnapshotItem
            label="Insurance"
            value={
              familyProfile.insurance ||
              "Not provided"
            }
          />
        </div>

        {familyProfile.supports.length >
          0 && (
          <div
            style={{
              marginTop: "26px",
              paddingTop: "24px",
              borderTop:
                "1px solid #E2E8F0",
            }}
          >
            <div
              style={{
                fontSize: "14px",
                fontWeight: 700,
                color: "#475569",
                marginBottom: "10px",
              }}
            >
              Current Supports
            </div>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "8px",
              }}
            >
              {familyProfile.supports.map(
                (support) => (
                  <span
                    key={support}
                    style={{
                      padding:
                        "8px 14px",
                      borderRadius:
                        "999px",
                      background:
                        "#FFFFFF",
                      border:
                        "1px solid #CBD5E1",
                      color:
                        "#334155",
                      fontSize:
                        "14px",
                      fontWeight: 600,
                    }}
                  >
                    {support}
                  </span>
                )
              )}
            </div>
          </div>
        )}

        {familyProfile.priority && (
          <div
            style={{
              marginTop: "22px",
            }}
          >
            <div
              style={{
                fontSize: "14px",
                fontWeight: 700,
                color: "#475569",
                marginBottom: "6px",
              }}
            >
              Top Priority
            </div>

            <div
              style={{
                fontSize: "18px",
                fontWeight: 700,
                color: "#0F172A",
              }}
            >
              {familyProfile.priority}
            </div>
          </div>
        )}
      </section>

      {/* =====================================================
          AI SUMMARY
      ====================================================== */}

      <section
        style={{
          marginBottom: "36px",
        }}
      >
        <div
          style={{
            background:
              "linear-gradient(135deg, #EFF6FF, #F0FDFA)",
          border: "1px solid #BFDBFE",
          borderRadius: "24px",
          padding: "34px",
        }}
      >
        <div
          style={{
            color: "#2563EB",
            fontSize: "13px",
            fontWeight: 800,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom: "14px",
          }}
        >
          What We See
        </div>

        <p
          style={{
            margin: 0,
            fontSize: "20px",
            lineHeight: 1.75,
            color: "#334155",
            maxWidth: "900px",
          }}
        >
          {personalizedJourney.summary}
        </p>
      </div>
      </section>

      {/* =====================================================
          CURRENT FOCUS
      ====================================================== */}

      <section
        style={{
          marginBottom: "36px",
        }}
      >
        <div
          style={{
            borderRadius: "24px",
            border: "1px solid #BFDBFE",
            background: "#FFFFFF",
            padding: "38px",
            boxShadow:
              "0 12px 30px rgba(15, 23, 42, 0.07)",
          }}
        >
          <div
            style={{
              color: "#2563EB",
              fontSize: "13px",
              fontWeight: 800,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: "14px",
            }}
          >
            Current Focus
          </div>

          <h2
            style={{
              margin: 0,
              fontSize: "36px",
              lineHeight: 1.2,
              color: "#0F172A",
              fontWeight: 800,
            }}
          >
            {
              personalizedJourney
                .currentFocus.title
            }
          </h2>

          <p
            style={{
              marginTop: "18px",
              marginBottom: 0,
              maxWidth: "850px",
              color: "#64748B",
              fontSize: "19px",
              lineHeight: 1.75,
            }}
          >
            {
              personalizedJourney
                .currentFocus
                .explanation
            }
          </p>
        </div>
      </section>

      {/* =====================================================
          NEXT BEST STEP
      ====================================================== */}

      <section
        style={{
          marginBottom: "55px",
        }}
      >
        <div
          style={{
            background: "#0F172A",
            color: "#FFFFFF",
            borderRadius: "24px",
            padding: "38px",
          }}
        >
          <div
            style={{
              color: "#93C5FD",
              fontSize: "13px",
              fontWeight: 800,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: "14px",
            }}
          >
            Your Next Best Step
          </div>

          <h2
            style={{
              margin: 0,
              fontSize: "32px",
              lineHeight: 1.25,
              fontWeight: 800,
            }}
          >
            {
              personalizedJourney
                .nextStep.title
            }
          </h2>

          <p
            style={{
              marginTop: "16px",
              marginBottom: 0,
              color: "#CBD5E1",
              fontSize: "18px",
              lineHeight: 1.7,
              maxWidth: "800px",
            }}
          >
            {
              personalizedJourney
                .nextStep
                .description
            }
          </p>
        </div>
      </section>

      {/* =====================================================
          AI PRIORITIES
      ====================================================== */}

      {personalizedJourney.priorities
        ?.length > 0 && (
        <section
          style={{
            marginBottom: "55px",
          }}
        >
          <SectionHeading
            eyebrow="What to Focus On"
            title="Your priorities"
            description="These are the areas the AI recommends keeping in focus as you move forward."
          />

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "20px",
              marginTop: "28px",
            }}
          >
            {personalizedJourney.priorities.map(
              (priority) => (
                <PriorityCard
                  key={priority.id}
                  priority={priority}
                />
              )
            )}
          </div>
        </section>
      )}

      {/* =====================================================
          TASKS
      ====================================================== */}

      <section
        style={{
          marginBottom: "55px",
        }}
      >
        <SectionHeading
          eyebrow="Your Next Steps"
          title="Actions recommended for your family"
          description="You don't need to do everything at once. Start with the highest-priority action and work through the list at your own pace."
        />

        <div
          style={{
            marginTop: "28px",
            padding: "24px",
            borderRadius: "20px",
            background: "#F8FAFC",
            border:
              "1px solid #E2E8F0",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              alignItems: "center",
              marginBottom: "12px",
            }}
          >
            <strong
              style={{
                color: "#0F172A",
              }}
            >
              Task Progress
            </strong>

            <span
              style={{
                color: "#475569",
                fontSize: "14px",
              }}
            >
              {completedTasks} of{" "}
              {totalTasks} completed
            </span>
          </div>

          <div
            style={{
              height: "10px",
              background: "#E2E8F0",
              borderRadius: "999px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${taskPercent}%`,
                height: "100%",
                background:
                  "linear-gradient(90deg, #2563EB, #14B8A6)",
                transition:
                  "width .3s ease",
              }}
            />
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gap: "16px",
            marginTop: "20px",
          }}
        >
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onToggle={() =>
                toggleTask(task.id)
              }
            />
          ))}
        </div>

        {allTasksCompleted && (
          <div
            style={{
              marginTop: "28px",
              padding: "28px",
              borderRadius: "20px",
              background:
                "#ECFDF5",
              border:
                "1px solid #A7F3D0",
            }}
          >
            <h3
              style={{
                margin: 0,
                color: "#065F46",
                fontSize: "22px",
              }}
            >
              You've completed your
              current steps.
            </h3>

            <p
              style={{
                color: "#047857",
                lineHeight: 1.6,
                marginBottom: "20px",
              }}
            >
              Your journey is ready to be
              reassessed so we can determine
              what should come next.
            </p>

            <button
              type="button"
              style={{
                padding:
                  "13px 22px",
                borderRadius: "10px",
                border: "none",
                background:
                  "#059669",
                color: "#FFFFFF",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Show Me What's Next →
            </button>
          </div>
        )}
      </section>

      {/* =====================================================
          RESOURCES
      ====================================================== */}

      {personalizedJourney.resources
        ?.length > 0 && (
        <section
          style={{
            marginBottom: "30px",
          }}
        >
          <SectionHeading
            eyebrow="Recommended Resources"
            title="Resources for your journey"
            description="These resources were selected based on the priorities identified for your family."
          />

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "20px",
              marginTop: "28px",
            }}
          >
            {personalizedJourney.resources.map(
              (resource) => (
                <div
                  key={resource.id}
                  style={{
                    padding: "26px",
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
                      color:
                        "#0F172A",
                      fontSize:
                        "20px",
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
                      margin:
                        "10px 0 18px",
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
                      rel="noreferrer"
                      style={{
                        color:
                          "#2563EB",
                        fontWeight:
                          700,
                        textDecoration:
                          "none",
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

      <p
        style={{
          textAlign: "center",
          color: "#94A3B8",
          fontSize: "13px",
          marginTop: "60px",
        }}
      >
        Your recommendations are based on the
        information you provided and are intended
        to help you identify possible next steps.
      </p>
    </main>
  );
}

/* =========================================================
   SNAPSHOT ITEM
========================================================= */

function SnapshotItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: "13px",
          fontWeight: 700,
          color: "#64748B",
          marginBottom: "6px",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: "17px",
          fontWeight: 700,
          color: "#0F172A",
        }}
      >
        {value}
      </div>
    </div>
  );
}

/* =========================================================
   SECTION HEADING
========================================================= */

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <div
        style={{
          color: "#2563EB",
          fontSize: "13px",
          fontWeight: 800,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          marginBottom: "8px",
        }}
      >
        {eyebrow}
      </div>

      <h2
        style={{
          margin: 0,
          color: "#0F172A",
          fontSize: "32px",
          fontWeight: 800,
        }}
      >
        {title}
      </h2>

      <p
        style={{
          maxWidth: "750px",
          color: "#64748B",
          fontSize: "17px",
          lineHeight: 1.7,
          marginTop: "10px",
          marginBottom: 0,
        }}
      >
        {description}
      </p>
    </div>
  );
}

/* =========================================================
   PRIORITY CARD
========================================================= */

function PriorityCard({
  priority,
}: {
  priority: AIPriority;
}) {
  const priorityColor =
    priority.priority === "High"
      ? "#DC2626"
      : priority.priority === "Medium"
      ? "#D97706"
      : "#64748B";

  return (
    <div
      style={{
        padding: "26px",
        borderRadius: "20px",
        border: "1px solid #E2E8F0",
        background: "#FFFFFF",
        boxShadow:
          "0 6px 18px rgba(15, 23, 42, 0.04)",
      }}
    >
      <div
        style={{
          display: "inline-block",
          padding: "5px 10px",
          borderRadius: "999px",
          background: "#F8FAFC",
          color: priorityColor,
          fontSize: "12px",
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          marginBottom: "16px",
        }}
      >
        {priority.priority} Priority
      </div>

      <h3
        style={{
          margin: 0,
          color: "#0F172A",
          fontSize: "21px",
          lineHeight: 1.3,
        }}
      >
        {priority.title}
      </h3>

      <p
        style={{
          color: "#64748B",
          lineHeight: 1.65,
          marginBottom: 0,
        }}
      >
        {priority.explanation}
      </p>
    </div>
  );
}

/* =========================================================
   TASK CARD
========================================================= */

function TaskCard({
  task,
  onToggle,
}: {
  task: Task;
  onToggle: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "18px",
        padding: "24px",
        borderRadius: "18px",
        border: task.completed
          ? "1px solid #A7F3D0"
          : "1px solid #E2E8F0",
        background: task.completed
          ? "#F0FDF4"
          : "#FFFFFF",
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-label={
          task.completed
            ? `Mark ${task.title} incomplete`
            : `Mark ${task.title} complete`
        }
        style={{
          flexShrink: 0,
          width: "28px",
          height: "28px",
          borderRadius: "8px",
          border: task.completed
            ? "none"
            : "2px solid #CBD5E1",
          background: task.completed
            ? "#059669"
            : "#FFFFFF",
          color: "#FFFFFF",
          cursor: "pointer",
          fontWeight: 800,
          fontSize: "16px",
        }}
      >
        {task.completed ? "✓" : ""}
      </button>

      <div
        style={{
          flex: 1,
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <h3
            style={{
              margin: 0,
              color: task.completed
                ? "#64748B"
                : "#0F172A",
              fontSize: "19px",
              textDecoration:
                task.completed
                  ? "line-through"
                  : "none",
            }}
          >
            {task.title}
          </h3>

          <span
            style={{
              padding: "4px 8px",
              borderRadius: "999px",
              background:
                task.priority === "High"
                  ? "#FEF2F2"
                  : task.priority ===
                    "Medium"
                  ? "#FFFBEB"
                  : "#F8FAFC",
              color:
                task.priority === "High"
                  ? "#DC2626"
                  : task.priority ===
                    "Medium"
                  ? "#D97706"
                  : "#64748B",
              fontSize: "11px",
              fontWeight: 800,
              textTransform:
                "uppercase",
            }}
          >
            {task.priority}
          </span>
        </div>

        <p
          style={{
            marginTop: "8px",
            marginBottom: "8px",
            color: "#64748B",
            lineHeight: 1.6,
          }}
        >
          {task.description}
        </p>

        <span
          style={{
            color: "#94A3B8",
            fontSize: "13px",
          }}
        >
          Estimated time:{" "}
          {task.estimatedTime}
        </span>

        {task.resourceLink && (
          <div
            style={{
              marginTop: "10px",
            }}
          >
            <a
              href={task.resourceLink}
              target="_blank"
              rel="noreferrer"
              style={{
                color: "#2563EB",
                fontSize: "14px",
                fontWeight: 700,
                textDecoration:
                  "none",
              }}
            >
              Open Resource →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}