"use client";

import Link from "next/link";

import type {
  AITask,
} from "../../lib/ai/journeyTypes";

type TaskSaveStatus =
  | "idle"
  | "saving"
  | "error";

type JourneyProgressSectionProps = {
  journeyStageNumber:
    number;

  tasks:
    AITask[];

  completedTasks:
    number;

  totalTasks:
    number;

  taskPercent:
    number;

  taskSaveStatus:
    TaskSaveStatus;

  allTasksCompleted:
    boolean;

  nextJourneyError:
    string;

  showNextAccountPrompt:
    boolean;

  generatingNextJourney:
    boolean;

  entitlementsLoading:
    boolean;

  onToggleTask: (
    taskId: string
  ) => void;

  onShowNextJourney:
    () => void | Promise<void>;
};

function isSafeExternalUrl(
  value?: string
) {
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

function SectionHeading({
  journeyStageNumber,
}: {
  journeyStageNumber:
    number;
}) {
  return (
    <div>
      <div
        style={{
          color: "#2563EB",
          fontSize: "12px",
          fontWeight: 800,
          letterSpacing:
            "0.08em",
          textTransform:
            "uppercase",
          marginBottom: "7px",
        }}
      >
        Journey Stage{" "}
        {journeyStageNumber}
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
        Keep moving at your own pace
      </h2>

      <p
        style={{
          color: "#64748B",
          lineHeight: 1.6,
          maxWidth: "720px",
          fontSize: "15px",
          marginTop: "8px",
          marginBottom: 0,
        }}
      >
        Complete the suggested tasks
        to unlock your next stage.
      </p>
    </div>
  );
}

function TaskCard({
  task,
  onToggle,
}: {
  task:
    AITask;

  onToggle:
    () => void;
}) {
  const safeResourceLink =
    isSafeExternalUrl(
      task.resourceLink
    );

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "15px",
        padding: "18px",
        borderRadius: "16px",
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
          width: "27px",
          height: "27px",
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
          fontSize: "15px",
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
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <h3
            style={{
              margin: 0,
              color: task.completed
                ? "#64748B"
                : "#0F172A",
              fontSize: "17px",
              lineHeight: 1.3,
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
              padding: "3px 7px",
              borderRadius: "999px",
              background:
                task.priority ===
                "High"
                  ? "#FEF2F2"
                  : task.priority ===
                    "Medium"
                  ? "#FFFBEB"
                  : "#F8FAFC",
              color:
                task.priority ===
                "High"
                  ? "#DC2626"
                  : task.priority ===
                    "Medium"
                  ? "#D97706"
                  : "#64748B",
              fontSize: "10px",
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
            color: "#64748B",
            lineHeight: 1.6,
            marginTop: "6px",
            marginBottom: "6px",
            fontSize: "14px",
          }}
        >
          {task.description}
        </p>

        <span
          style={{
            color: "#94A3B8",
            fontSize: "12px",
          }}
        >
          Estimated time:{" "}
          {task.estimatedTime}
        </span>

        {safeResourceLink && (
          <div
            style={{
              marginTop: "8px",
            }}
          >
            <a
              href={
                task.resourceLink
              }
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: "#2563EB",
                fontSize: "13px",
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

function AccountLinks({
  message,
}: {
  message: string;
}) {
  return (
    <div
      style={{
        marginTop: "22px",
        paddingTop: "20px",
        borderTop:
          "1px solid #BFDBFE",
      }}
    >
      <div
        style={{
          color: "#0F172A",
          fontSize: "15px",
          fontWeight: 700,
          marginBottom: "12px",
        }}
      >
        {message}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent:
            "center",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        <Link
          href="/login"
          style={{
            padding:
              "10px 18px",
            borderRadius: "9px",
            background:
              "#2563EB",
            color: "#FFFFFF",
            fontSize: "14px",
            fontWeight: 700,
            textDecoration:
              "none",
          }}
        >
          Log In
        </Link>

        <Link
          href="/signup"
          style={{
            padding:
              "10px 18px",
            borderRadius: "9px",
            border:
              "1px solid #2563EB",
            background:
              "#FFFFFF",
            color: "#2563EB",
            fontSize: "14px",
            fontWeight: 700,
            textDecoration:
              "none",
          }}
        >
          Create Free Account
        </Link>
      </div>
    </div>
  );
}

export default function JourneyProgressSection({
  journeyStageNumber,
  tasks,
  completedTasks,
  totalTasks,
  taskPercent,
  taskSaveStatus,
  allTasksCompleted,
  nextJourneyError,
  showNextAccountPrompt,
  generatingNextJourney,
  entitlementsLoading,
  onToggleTask,
  onShowNextJourney,
}: JourneyProgressSectionProps) {
  return (
    <section
      style={{
        marginBottom: "35px",
      }}
    >
      <SectionHeading
        journeyStageNumber={
          journeyStageNumber
        }
      />

      <div
        style={{
          padding: "24px",
          borderRadius: "20px",
          border:
            "1px solid #E2E8F0",
          background: "#F8FAFC",
          marginTop: "22px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
            gap: "12px",
            marginBottom: "10px",
          }}
        >
          <strong
            style={{
              color: "#0F172A",
            }}
          >
            Journey Progress
          </strong>

          <span
            style={{
              color: "#475569",
              fontSize: "13px",
            }}
          >
            {completedTasks} of{" "}
            {totalTasks} completed
          </span>
        </div>

        <div
          style={{
            height: "9px",
            background: "#E2E8F0",
            borderRadius: "999px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width:
                `${taskPercent}%`,
              height: "100%",
              background:
                "linear-gradient(90deg, #2563EB, #14B8A6)",
              transition:
                "width .3s ease",
            }}
          />
        </div>

        {taskSaveStatus ===
          "saving" && (
          <div
            style={{
              marginTop: "8px",
              color: "#64748B",
              fontSize: "12px",
              textAlign: "right",
            }}
          >
            Saving your progress...
          </div>
        )}

        {taskSaveStatus ===
          "error" && (
          <div
            style={{
              marginTop: "8px",
              color: "#B91C1C",
              fontSize: "12px",
              textAlign: "right",
            }}
          >
            We couldn't save your
            latest task change.
          </div>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gap: "12px",
          marginTop: "16px",
        }}
      >
        {tasks.map(
          (task) => (
            <TaskCard
              key={task.id}
              task={task}
              onToggle={() =>
                onToggleTask(
                  task.id
                )
              }
            />
          )
        )}
      </div>

      {allTasksCompleted && (
        <div
          style={{
            marginTop: "22px",
            padding: "26px",
            borderRadius: "18px",
            background: "#ECFDF5",
            border:
              "1px solid #A7F3D0",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: "28px",
              marginBottom: "8px",
            }}
          >
            🎉
          </div>

          <h3
            style={{
              margin: 0,
              color: "#065F46",
              fontSize: "22px",
            }}
          >
            You've completed Journey
            Stage{" "}
            {journeyStageNumber}.
          </h3>

          <p
            style={{
              color: "#047857",
              lineHeight: 1.6,
              margin:
                "9px auto 18px",
              maxWidth: "650px",
            }}
          >
            Great work. We'll build on
            what you've accomplished to
            determine what should come
            next.
          </p>

          {nextJourneyError && (
            <div
              role="alert"
              style={{
                margin:
                  "0 auto 16px",
                maxWidth: "650px",
                padding:
                  "12px 14px",
                borderRadius: "10px",
                background: "#FEF2F2",
                border:
                  "1px solid #FECACA",
                color: "#B91C1C",
                fontSize: "14px",
                lineHeight: 1.5,
                textAlign: "left",
              }}
            >
              {nextJourneyError}
            </div>
          )}

          {showNextAccountPrompt && (
            <AccountLinks
              message="Create a free account or log in to continue your personalized journey and unlock your next steps."
            />
          )}

          <button
            type="button"
            onClick={
              onShowNextJourney
            }
            disabled={
              generatingNextJourney ||
              entitlementsLoading
            }
            style={{
              padding:
                "13px 22px",
              borderRadius: "10px",
              border: "none",
              color: "#FFFFFF",
              fontSize: "15px",
              fontWeight: 800,
              background:
                generatingNextJourney ||
                entitlementsLoading
                  ? "#6EE7B7"
                  : "#059669",
              cursor:
                generatingNextJourney ||
                entitlementsLoading
                  ? "default"
                  : "pointer",
              minWidth: "210px",
            }}
          >
            {generatingNextJourney
              ? "Building What's Next..."
              : entitlementsLoading
              ? "Checking Access..."
              : "Show Me What's Next →"}
          </button>
        </div>
      )}
    </section>
  );
}