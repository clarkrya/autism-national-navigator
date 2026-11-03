
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { signOut } from "firebase/auth";

import type { FamilyProfile } from "../../types/familyProfile";
import type {
  PersonalizedJourney,
  AIResource,
} from "../../lib/ai/journeyTypes";
import type { Task } from "../../lib/journeyEngine";

import { auth } from "../../lib/firebase";
import { getCurrentUser, watchAuthState } from "../../lib/auth";
import { savePendingJourney } from "../../lib/journeyStorage";
import {
  getCurrentJourney,
  saveCurrentJourney,
  saveTaskProgress,
} from "../../lib/journeyRepository";
import {
  getCurrentStageNumber,
  saveJourneyStage,
} from "../../lib/journeyHistory";

interface JourneyDashboardProps {
  personalizedJourney: PersonalizedJourney;
  familyProfile: FamilyProfile;
  onJourneySaved?: (childId: string) => void | Promise<void>;
}

const colors = {
  navy: "#204D6A",
  teal: "#58AAA7",
  gold: "#F7AD3F",
  dark: "#0F172A",
  text: "#475569",
  muted: "#64748B",
  border: "#E2E8F0",
  light: "#F8FAFC",
  white: "#FFFFFF",
  green: "#047857",
  red: "#B91C1C",
};

function formatDisplayValue(value: string): string {
  if (!value) return "";
  return value
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatResourceType(type: AIResource["type"]): string {
  switch (type) {
    case "grant":
      return "Grant";
    case "government":
      return "Government";
    case "insurance":
      return "Insurance";
    case "therapy":
      return "Therapy";
    case "school":
      return "School";
    case "financial":
      return "Financial Support";
    case "support":
      return "Support";
    default:
      return "Resource";
  }
}

const sectionStyle: React.CSSProperties = {
  marginBottom: 32,
};

const panelStyle: React.CSSProperties = {
  padding: 24,
  borderRadius: 18,
  border: `1px solid ${colors.border}`,
  background: colors.white,
};

const primaryButtonStyle: React.CSSProperties = {
  padding: "13px 22px",
  borderRadius: 10,
  border: "none",
  background: colors.navy,
  color: colors.white,
  fontSize: 15,
  fontWeight: 800,
  cursor: "pointer",
};

const linkButtonStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "10px 18px",
  borderRadius: 9,
  background: colors.navy,
  color: colors.white,
  fontSize: 14,
  fontWeight: 700,
  textDecoration: "none",
};

export default function JourneyDashboard({
  personalizedJourney: initialJourney,
  familyProfile,
  onJourneySaved,
}: JourneyDashboardProps) {
  /*
   * ACTIVE JOURNEY
   *
   * Rename the incoming prop to initialJourney.
   * This avoids the duplicate personalizedJourney declaration.
   */
  const [personalizedJourney, setPersonalizedJourney] =
    useState<PersonalizedJourney>(initialJourney);

  const [tasks, setTasks] = useState<Task[]>(
    initialJourney.tasks || []
  );

  const [journeyStageNumber, setJourneyStageNumber] = useState(1);
  const [loadingStageNumber, setLoadingStageNumber] = useState(true);

  const [savingJourney, setSavingJourney] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");

  const [showSaveAccountPrompt, setShowSaveAccountPrompt] =
    useState(false);

  const [showNextAccountPrompt, setShowNextAccountPrompt] =
    useState(false);

  const [currentUserEmail, setCurrentUserEmail] =
    useState<string | null>(null);

  const [loggingOut, setLoggingOut] = useState(false);

  const [generatingNextJourney, setGeneratingNextJourney] =
    useState(false);

  const [nextJourneyError, setNextJourneyError] = useState("");

  const [taskSaveStatus, setTaskSaveStatus] = useState<
    "idle" | "saving" | "error"
  >("idle");

  const taskSaveQueueRef = useRef<Promise<void>>(
    Promise.resolve()
  );

  /*
   * KEEP THE DISPLAY IN SYNC WHEN JOURNEY BUILDER
   * SUPPLIES A DIFFERENT JOURNEY.
   */
  useEffect(() => {
    setPersonalizedJourney(initialJourney);
    setTasks(initialJourney.tasks || []);
    setSaveMessage("");
    setSaveError("");
    setNextJourneyError("");
    setTaskSaveStatus("idle");
  }, [initialJourney, familyProfile.childId]);

  /*
   * LOAD AUTHENTICATION AND JOURNEY STAGE.
   */
  useEffect(() => {
    let active = true;

    const unsubscribe = watchAuthState(async (user) => {
      if (!active) return;

      setCurrentUserEmail(user?.email ?? null);

      if (!user) {
        setJourneyStageNumber(1);
        setLoadingStageNumber(false);
        return;
      }

      setLoadingStageNumber(true);

      try {

        const savedJourney = familyProfile.childId
        ? await getCurrentJourney(
            user.uid,
            familyProfile.childId
          )
        : null;
      
        if (!active) return;

        if (savedJourney && savedJourney.stageNumber >= 1) {
          setJourneyStageNumber(savedJourney.stageNumber);
        } else {
          const lastCompletedStage = await getCurrentStageNumber(
            user.uid
          );

          if (!active) return;

          setJourneyStageNumber(
            Math.max(1, lastCompletedStage + 1)
          );
        }
      } catch (error) {
        console.error(
          "Unable to determine journey stage:",
          error
        );

        if (active) setJourneyStageNumber(1);
      } finally {
        if (active) setLoadingStageNumber(false);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [familyProfile.childId]);
  /*
   * TASK PROGRESS
   */
  const completedTasks = useMemo(
    () => tasks.filter((task) => task.completed).length,
    [tasks]
  );

  const totalTasks = tasks.length;

  const taskPercent =
    totalTasks > 0
      ? Math.round((completedTasks / totalTasks) * 100)
      : 0;

  const allTasksCompleted =
    tasks.length > 0 && tasks.every((task) => task.completed);

  const actions = personalizedJourney.actions || [];
  const primaryAction = actions.length > 0 ? actions[0] : null;

  /*
   * NOTIFY JOURNEY BUILDER AFTER A SUCCESSFUL SAVE.
   */
  async function notifyJourneySaved() {
    if (onJourneySaved && familyProfile.childId) {
      try {
        await onJourneySaved(familyProfile.childId);
      } catch (error) {
        console.error(
          "Unable to refresh saved journey list:",
          error
        );
      }
    }
  }

  /*
   * TASK TOGGLING AND FIRESTORE SAVE QUEUE
   */
  function toggleTask(taskId: string) {
    const currentUser = getCurrentUser();

    setTasks((currentTasks) => {
      const nextTasks = currentTasks.map((task) =>
        task.id === taskId
          ? { ...task, completed: !task.completed }
          : task
      );

      setNextJourneyError("");
      setSaveMessage("");
      setSaveError("");

      if (!currentUser) {
        setTaskSaveStatus("idle");
        return nextTasks;
      }

      setTaskSaveStatus("saving");

      taskSaveQueueRef.current = taskSaveQueueRef.current
        .catch(() => undefined)
        .then(async () => {
          try {
            await saveTaskProgress(
              currentUser.uid,
              familyProfile,
              {
                ...personalizedJourney,
                tasks: nextTasks,
              },
              {
                stageNumber: journeyStageNumber,
                journeyReason:
                  journeyStageNumber === 1
                    ? "initial"
                    : "tasks_completed",
              }
            );

            setTaskSaveStatus("idle");
          } catch (error) {
            console.error(
              "Unable to save task progress:",
              error
            );

            setTaskSaveStatus("error");
            setSaveError(
              "Your task change is visible, but we couldn't save it right now. Please try again."
            );
          }
        });

      return nextTasks;
    });
  }

  /*
   * SAVE CURRENT JOURNEY
   */
  async function handleSaveJourney() {
    if (savingJourney) return;

    setSaveMessage("");
    setSaveError("");

    const currentUser = getCurrentUser();

    if (!currentUser) {
      savePendingJourney(familyProfile, {
        ...personalizedJourney,
        tasks,
      });

      setShowSaveAccountPrompt(true);
      return;
    }

    setSavingJourney(true);

    try {
      await taskSaveQueueRef.current;

      await saveCurrentJourney(
        currentUser.uid,
        familyProfile,
        {
          ...personalizedJourney,
          tasks,
        },
        {
          stageNumber: journeyStageNumber,
          journeyReason:
            journeyStageNumber === 1
              ? "initial"
              : "tasks_completed",
        }
      );

      setSaveMessage("Your journey has been saved.");
      setShowSaveAccountPrompt(false);

      await notifyJourneySaved();
    } catch (error) {
      console.error("Unable to save journey:", error);
      setSaveError(
        "We couldn't save your journey right now. Please try again."
      );
    } finally {
      setSavingJourney(false);
    }
  }

  /*
   * GENERATE NEXT JOURNEY STAGE
   */
  async function handleShowNextJourney() {
    if (!allTasksCompleted || generatingNextJourney) {
      return;
    }

    const currentUser = getCurrentUser();

    if (!currentUser) {
      savePendingJourney(familyProfile, {
        ...personalizedJourney,
        tasks,
      });

      setShowNextAccountPrompt(true);
      return;
    }

    setShowNextAccountPrompt(false);
    setNextJourneyError("");
    setSaveMessage("");
    setGeneratingNextJourney(true);

    try {
      // Wait for pending checkbox changes.
      await taskSaveQueueRef.current;

      const idToken = await currentUser.getIdToken();

      const completedTaskIds = tasks
        .filter((task) => task.completed)
        .map((task) => task.id);

      const completedTaskDetails = tasks.filter(
        (task) => task.completed
      );

      const currentJourney = {
        ...personalizedJourney,
        tasks,
      };

      const lastCompletedStageNumber =
        await getCurrentStageNumber(currentUser.uid);

      let completedStageNumber = Math.max(
        1,
        journeyStageNumber
      );

      if (lastCompletedStageNumber >= completedStageNumber) {
        completedStageNumber = lastCompletedStageNumber + 1;
      }

      /*
       * Request the next stage before archiving the current
       * stage. This prevents archiving a completed stage
       * when the API rejects the request.
       */
      const response = await fetch("/api/journey/next", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          familyProfile,
          currentJourney,
          completedTaskIds,
          completedTasks: completedTaskDetails,
        }),
      });

      const data = await response.json();

      if (response.status === 401) {
        savePendingJourney(familyProfile, currentJourney);

        setNextJourneyError(
          "Your login session has expired. Please log in again to continue your journey."
        );

        setShowNextAccountPrompt(true);
        return;
      }

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Unable to create the next stage of your journey."
        );
      }

      if (!data?.journey) {
        throw new Error(
          "The next stage of your journey was not returned."
        );
      }

      const nextJourney = data.journey as PersonalizedJourney;
      const nextStageNumber = completedStageNumber + 1;

      /*
       * ARCHIVE THE COMPLETED STAGE.
       */
      await saveJourneyStage(
        currentUser.uid,
        completedStageNumber,
        familyProfile,
        currentJourney,
        completedTaskIds,
        {
          reason:
            completedStageNumber === 1
              ? "initial"
              : "tasks_completed",
        }
      );

      /*
       * SAVE THE NEXT ACTIVE STAGE.
       */
      await saveCurrentJourney(
        currentUser.uid,
        familyProfile,
        {
          ...nextJourney,
          tasks: nextJourney.tasks || [],
        },
        {
          stageNumber: nextStageNumber,
          previousCompletedTaskIds: completedTaskIds,
          journeyReason: "tasks_completed",
        }
      );

      /*
       * UPDATE SCREEN ONLY AFTER SAVING SUCCEEDS.
       */
      setPersonalizedJourney(nextJourney);
      setTasks(nextJourney.tasks || []);
      setJourneyStageNumber(nextStageNumber);
      setTaskSaveStatus("idle");

      setSaveMessage(
        `Journey Stage ${nextStageNumber} has been created and saved.`
      );

      await notifyJourneySaved();
    } catch (error) {
      console.error(
        "Unable to generate next journey:",
        error
      );

      setNextJourneyError(
        error instanceof Error
          ? error.message
          : "We couldn't create the next stage of your journey. Please try again."
      );
    } finally {
      setGeneratingNextJourney(false);
    }
  }

  /*
   * LOG OUT
   */
  async function handleLogout() {
    setLoggingOut(true);

    try {
      await signOut(auth);
      window.location.href = "/";
    } catch (error) {
      console.error("Logout error:", error);
      setLoggingOut(false);
    }
  }

  return (
    <main
      style={{
        maxWidth: 1050,
        margin: "0 auto",
        padding: "56px 24px 90px",
      }}
    >
      {/* HEADER */}
      <section style={sectionStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 16,
            marginBottom: 14,
          }}
        >
          <span
            style={{
              color: colors.teal,
              fontSize: 13,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Your Personalized Journey
          </span>

          {!loadingStageNumber && (
            <span
              style={{
                padding: "8px 13px",
                borderRadius: 999,
                background: "#EFF6FF",
                color: colors.navy,
                fontSize: 12,
                fontWeight: 800,
              }}
            >
              Journey Stage {journeyStageNumber}
            </span>
          )}
        </div>

        <h1
          style={{
            fontSize: "clamp(30px, 5vw, 46px)",
            lineHeight: 1.1,
            fontWeight: 800,
            color: colors.dark,
            margin: 0,
          }}
        >
          {familyProfile.childName
            ? `${familyProfile.childName}'s Personalized Journey`
            : "Your Personalized Journey"}
        </h1>

        <p
          style={{
            marginTop: 16,
            fontSize: 18,
            lineHeight: 1.65,
            color: colors.muted,
          }}
        >
          Based on what you shared, we've identified where
          we'd recommend starting.
        </p>
      </section>

      {/* FAMILY SNAPSHOT */}
      <section
        style={{
          ...panelStyle,
          ...sectionStyle,
          background: colors.light,
        }}
      >
        <SectionHeading
          eyebrow="Your Family Snapshot"
          title="Your family's starting point"
          description="A summary of the information used to personalize this journey."
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(170px, 1fr))",
            gap: 20,
            marginTop: 24,
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
              familyProfile.state
                ? formatDisplayValue(familyProfile.state)
                : "Not provided"
            }
          />

          <SnapshotItem
            label="Journey Stage"
            value={
              familyProfile.journeyStage
                ? formatDisplayValue(familyProfile.journeyStage)
                : "Not provided"
            }
          />

          <SnapshotItem
            label="Insurance"
            value={
              familyProfile.insurance
                ? formatDisplayValue(familyProfile.insurance)
                : "Not provided"
            }
          />
        </div>

        {familyProfile.supports.length > 0 && (
          <div
            style={{
              marginTop: 22,
              paddingTop: 20,
              borderTop: `1px solid ${colors.border}`,
            }}
          >
            <strong
              style={{
                display: "block",
                marginBottom: 10,
                fontSize: 13,
                color: colors.text,
              }}
            >
              Current Supports
            </strong>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              {familyProfile.supports.map((support, index) => (
                <span
                  key={`${support}-${index}`}
                  style={{
                    padding: "7px 12px",
                    borderRadius: 999,
                    border: "1px solid #CBD5E1",
                    background: colors.white,
                    fontSize: 13,
                    color: colors.text,
                  }}
                >
                  {formatDisplayValue(support)}
                </span>
              ))}
            </div>
          </div>
        )}

        {familyProfile.priority && (
          <div style={{ marginTop: 20 }}>
            <strong
              style={{
                fontSize: 13,
                color: colors.text,
              }}
            >
              Top Priority
            </strong>

            <div
              style={{
                marginTop: 5,
                fontSize: 17,
                fontWeight: 700,
                color: colors.dark,
              }}
            >
              {formatDisplayValue(familyProfile.priority)}
            </div>
          </div>
        )}
      </section>

      {/* CURRENT FOCUS */}
      <section style={sectionStyle}>
        <div
          style={{
            padding: 32,
            borderRadius: 22,
            border: "1px solid #BFDBFE",
            background:
              "linear-gradient(135deg, #EFF6FF, #F0FDFA)",
          }}
        >
          <div
            style={{
              color: colors.navy,
              fontSize: 13,
              fontWeight: 800,
              textTransform: "uppercase",
              marginBottom: 12,
            }}
          >
            Journey Stage {journeyStageNumber} — Current Focus
          </div>

          <h2
            style={{
              margin: 0,
              fontSize: 32,
              lineHeight: 1.2,
              color: colors.dark,
            }}
          >
            {personalizedJourney.currentFocus.title}
          </h2>

          <p
            style={{
              marginTop: 13,
              marginBottom: 0,
              fontSize: 17,
              lineHeight: 1.65,
              color: colors.text,
            }}
          >
            {personalizedJourney.currentFocus.explanation}
          </p>

          {personalizedJourney.nextStep && (
            <div
              style={{
                marginTop: 24,
                paddingTop: 22,
                borderTop: "1px solid #BFDBFE",
              }}
            >
              <strong
                style={{
                  color: colors.navy,
                  fontSize: 12,
                  textTransform: "uppercase",
                }}
              >
                Your Next Best Step
              </strong>

              <h3
                style={{
                  fontSize: 19,
                  color: colors.dark,
                  margin: "8px 0",
                }}
              >
                {personalizedJourney.nextStep.title}
              </h3>

              <p
                style={{
                  color: colors.muted,
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                {personalizedJourney.nextStep.description}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* FIRST ACTION */}
      {primaryAction && (
        <section style={sectionStyle}>
          <SectionHeading
            eyebrow="How to Do It"
            title="Your first action"
            description="Here's a practical way to get started."
          />

          <div style={{ ...panelStyle, marginTop: 22 }}>
            <span
              style={{
                color: colors.navy,
                fontSize: 12,
                fontWeight: 800,
                textTransform: "uppercase",
              }}
            >
              {primaryAction.priority} Priority
            </span>

            <h3
              style={{
                color: colors.dark,
                fontSize: 23,
                margin: "12px 0 20px",
              }}
            >
              {primaryAction.title}
            </h3>

            <div style={{ display: "grid", gap: 18 }}>
              <GuidanceBlock
                label="Why it matters"
                text={primaryAction.whyItMatters}
              />

              <GuidanceBlock
                label="What to do"
                text={primaryAction.action}
              />

              <GuidanceBlock
                label="How to do it"
                text={primaryAction.howTo}
              />

              {primaryAction.nextStep && (
                <GuidanceBlock
                  label="Then"
                  text={primaryAction.nextStep}
                />
              )}
            </div>

            <div
              style={{
                marginTop: 20,
                paddingTop: 16,
                borderTop: `1px solid ${colors.border}`,
                color: colors.muted,
                fontSize: 13,
              }}
            >
              Estimated time: {primaryAction.estimatedTime}
            </div>
          </div>
        </section>
      )}

      {/* RESOURCES */}
      {(personalizedJourney.resources?.length ?? 0) > 0 && (
        <section style={{ ...sectionStyle, marginBottom: 48 }}>
          <SectionHeading
            eyebrow="Resources"
            title="Resources selected for you"
            description="These resources were selected based on your family's situation and priorities."
          />

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(290px, 1fr))",
              gap: 18,
              marginTop: 22,
            }}
          >
            {personalizedJourney.resources.map((resource) => (
              <ResourceCard
                key={resource.id}
                resource={resource}
              />
            ))}
          </div>
        </section>
      )}

      {/* SAVE JOURNEY */}
      <section style={sectionStyle}>
        <div
          style={{
            ...panelStyle,
            background: "#EFF6FF",
            borderColor: "#BFDBFE",
            textAlign: "center",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 23,
              color: colors.dark,
            }}
          >
            Want to keep your journey?
          </h2>

          <p
            style={{
              margin: "10px auto 18px",
              maxWidth: 620,
              color: colors.text,
              lineHeight: 1.6,
            }}
          >
            Save your personalized journey so you can come
            back to it and keep moving forward.
          </p>

          <button
            type="button"
            onClick={handleSaveJourney}
            disabled={savingJourney || generatingNextJourney}
            style={{
              ...primaryButtonStyle,
              opacity:
                savingJourney || generatingNextJourney
                  ? 0.6
                  : 1,
            }}
          >
            {savingJourney
              ? "Saving..."
              : "💾 Save My Journey"}
          </button>

          {saveMessage && (
            <p
              role="status"
              style={{
                color: colors.green,
                fontWeight: 700,
                marginTop: 15,
              }}
            >
              ✓ {saveMessage}
            </p>
          )}

          {saveError && (
            <p
              role="alert"
              style={{
                color: colors.red,
                marginTop: 15,
              }}
            >
              {saveError}
            </p>
          )}

          {showSaveAccountPrompt && (
            <AccountPrompt
              message="Create a free account or log in to save your journey."
            />
          )}
        </div>
      </section>

      {/* ACCOUNT */}
      {currentUserEmail && (
        <section style={sectionStyle}>
          <div
            style={{
              ...panelStyle,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 20,
            }}
          >
            <div>
              <div
                style={{
                  color: colors.muted,
                  fontSize: 12,
                  fontWeight: 800,
                  textTransform: "uppercase",
                }}
              >
                Your Account
              </div>

              <div
                style={{
                  marginTop: 5,
                  color: colors.dark,
                  fontWeight: 700,
                }}
              >
                {currentUserEmail}
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              style={{
                padding: "10px 18px",
                borderRadius: 9,
                border: "1px solid #CBD5E1",
                background: colors.white,
                color: colors.text,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {loggingOut ? "Logging Out..." : "Log Out"}
            </button>
          </div>
        </section>
      )}

      {/* PROGRESS */}
      <section style={sectionStyle}>
        <SectionHeading
          eyebrow={`Journey Stage ${journeyStageNumber}`}
          title="Keep moving at your own pace"
          description="Complete the suggested tasks to unlock your next stage."
        />

        <div
          style={{
            ...panelStyle,
            marginTop: 22,
            background: colors.light,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <strong style={{ color: colors.dark }}>
              Journey Progress
            </strong>

            <span
              style={{
                fontSize: 13,
                color: colors.text,
              }}
            >
              {completedTasks} of {totalTasks} completed
            </span>
          </div>

          <div
            style={{
              height: 9,
              background: colors.border,
              borderRadius: 999,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${taskPercent}%`,
                height: "100%",
                background:
                  "linear-gradient(90deg, #204D6A, #58AAA7)",
                transition: "width .3s ease",
              }}
            />
          </div>

          {taskSaveStatus === "saving" && (
            <p
              role="status"
              style={{
                color: colors.muted,
                fontSize: 12,
                textAlign: "right",
              }}
            >
              Saving your progress...
            </p>
          )}

          {taskSaveStatus === "error" && (
            <p
              role="alert"
              style={{
                color: colors.red,
                fontSize: 12,
                textAlign: "right",
              }}
            >
              We couldn't save your latest task change.
            </p>
          )}
        </div>

        <div
          style={{
            display: "grid",
            gap: 12,
            marginTop: 16,
          }}
        >
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onToggle={() => toggleTask(task.id)}
            />
          ))}
        </div>

        {/* NEXT STAGE */}
        {allTasksCompleted && (
          <div
            style={{
              marginTop: 22,
              padding: 26,
              borderRadius: 18,
              background: "#ECFDF5",
              border: "1px solid #A7F3D0",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 28,
                marginBottom: 8,
              }}
            >
              🎉
            </div>

            <h3
              style={{
                color: "#065F46",
                fontSize: 22,
                margin: 0,
              }}
            >
              You've completed Journey Stage{" "}
              {journeyStageNumber}.
            </h3>

            <p
              style={{
                color: colors.green,
                lineHeight: 1.6,
                margin: "9px auto 18px",
                maxWidth: 650,
              }}
            >
              Great work. We'll build on what you've
              accomplished to determine what should come next.
            </p>

            {nextJourneyError && (
              <div
                role="alert"
                style={{
                  maxWidth: 650,
                  margin: "0 auto 16px",
                  padding: 14,
                  borderRadius: 10,
                  background: "#FEF2F2",
                  border: "1px solid #FECACA",
                  color: colors.red,
                  textAlign: "left",
                }}
              >
                {nextJourneyError}
              </div>
            )}

            {showNextAccountPrompt && (
              <AccountPrompt
                message="Create a free account or log in to continue your personalized journey and unlock your next steps."
              />
            )}

            <button
              type="button"
              onClick={handleShowNextJourney}
              disabled={
                generatingNextJourney ||
                savingJourney ||
                taskSaveStatus === "saving"
              }
              style={{
                ...primaryButtonStyle,
                background: "#059669",
                minWidth: 210,
                opacity:
                  generatingNextJourney ||
                  savingJourney ||
                  taskSaveStatus === "saving"
                    ? 0.6
                    : 1,
              }}
            >
              {generatingNextJourney
                ? "Building What's Next..."
                : "Show Me What's Next →"}
            </button>
          </div>
        )}
      </section>

      {/* DISCLAIMER */}
      <p
        style={{
          textAlign: "center",
          color: "#94A3B8",
          fontSize: 12,
          lineHeight: 1.5,
          marginTop: 50,
        }}
      >
        Your recommendations are based on the information
        you provided and are intended to help you identify
        possible next steps.
      </p>
    </main>
  );
}

/*
 * FAMILY SNAPSHOT ITEM
 */
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
          fontSize: 12,
          fontWeight: 700,
          color: colors.muted,
          marginBottom: 5,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: 16,
          fontWeight: 700,
          color: colors.dark,
        }}
      >
        {value}
      </div>
    </div>
  );
}

/*
 * SECTION HEADING
 */
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
          color: colors.navy,
          fontSize: 12,
          fontWeight: 800,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          marginBottom: 7,
        }}
      >
        {eyebrow}
      </div>

      <h2
        style={{
          margin: 0,
          color: colors.dark,
          fontSize: 29,
          fontWeight: 800,
          lineHeight: 1.2,
        }}
      >
        {title}
      </h2>

      <p
        style={{
          maxWidth: 720,
          color: colors.muted,
          fontSize: 15,
          lineHeight: 1.6,
          marginTop: 8,
          marginBottom: 0,
        }}
      >
        {description}
      </p>
    </div>
  );
}

/*
 * GUIDANCE BLOCK
 */
function GuidanceBlock({
  label,
  text,
}: {
  label: string;
  text: string;
}) {
  return (
    <div>
      <div
        style={{
          color: "#334155",
          fontSize: 13,
          fontWeight: 800,
          marginBottom: 5,
        }}
      >
        {label}
      </div>

      <div
        style={{
          color: colors.muted,
          fontSize: 15,
          lineHeight: 1.6,
        }}
      >
        {text}
      </div>
    </div>
  );
}

/*
 * RESOURCE CARD
 */
function ResourceCard({
  resource,
}: {
  resource: AIResource;
}) {
  return (
    <div style={panelStyle}>
      <div
        style={{
          display: "inline-flex",
          padding: "5px 9px",
          borderRadius: 999,
          background: colors.light,
          color: colors.text,
          fontSize: 10,
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          marginBottom: 11,
        }}
      >
        {formatResourceType(resource.type)}
      </div>

      <h3
        style={{
          margin: 0,
          color: colors.dark,
          fontSize: 19,
          lineHeight: 1.3,
        }}
      >
        {resource.title}
      </h3>

      <p
        style={{
          color: colors.muted,
          lineHeight: 1.55,
          fontSize: 14,
          margin: "9px 0 14px",
        }}
      >
        {resource.description}
      </p>

      {resource.whyItMayHelp && (
        <div
          style={{
            marginBottom: 14,
            padding: "12px 13px",
            borderRadius: 11,
            background: colors.light,
            color: colors.text,
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          <strong>Why it may help:</strong>{" "}
          {resource.whyItMayHelp}
        </div>
      )}

      {resource.sourceName && (
        <div
          style={{
            color: "#94A3B8",
            fontSize: 12,
            marginBottom: 12,
          }}
        >
          Source: {resource.sourceName}
        </div>
      )}

      {resource.url && (
        <a
          href={resource.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-block",
            padding: "10px 14px",
            borderRadius: 9,
            background: "#EFF6FF",
            color: colors.navy,
            fontSize: 13,
            fontWeight: 800,
            textDecoration: "none",
          }}
        >
          Open Resource →
        </a>
      )}
    </div>
  );
}

/*
 * TASK CARD
 */

function TaskCard({
  task,
  onToggle,
}: {
  task: Task;
  onToggle: () => void;
}) {
  const priority = String(
    task.priority ?? "Low"
  ).toLowerCase();

  const priorityBackground =
    priority === "high"
      ? "#FEF2F2"
      : priority === "medium"
        ? "#FFFBEB"
        : colors.light;

  const priorityColor =
    priority === "high"
      ? "#B91C1C"
      : priority === "medium"
        ? "#92400E"
        : colors.text;

  return (
    <div
      style={{
        ...panelStyle,
        borderColor: task.completed
          ? "#A7F3D0"
          : colors.border,
        background: task.completed
          ? "#F0FDF4"
          : colors.white,
        display: "flex",
        alignItems: "flex-start",
        gap: 16,
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
        aria-pressed={task.completed}
        style={{
          width: 28,
          height: 28,
          flexShrink: 0,
          borderRadius: 8,
          border: task.completed
            ? "1px solid #059669"
            : "2px solid #CBD5E1",
          background: task.completed
            ? "#059669"
            : colors.white,
          color: colors.white,
          fontSize: 16,
          fontWeight: 800,
          cursor: "pointer",
        }}
      >
        {task.completed ? "✓" : ""}
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <h3
            style={{
              margin: 0,
              color: colors.dark,
              fontSize: 17,
              textDecoration: task.completed
                ? "line-through"
                : "none",
            }}
          >
            {task.title}
          </h3>

          <span
            style={{
              padding: "4px 8px",
              borderRadius: 999,
              background: priorityBackground,
              color: priorityColor,
              fontSize: 11,
              fontWeight: 800,
              textTransform: "uppercase",
            }}
          >
            {task.priority} Priority
          </span>
        </div>

        <p
          style={{
            color: colors.muted,
            fontSize: 14,
            lineHeight: 1.6,
            margin: "8px 0",
          }}
        >
          {task.description}
        </p>

        {task.estimatedTime && (
          <div
            style={{
              color: "#94A3B8",
              fontSize: 12,
              marginTop: 8,
            }}
          >
            Estimated time: {task.estimatedTime}
          </div>
        )}

        {task.resourceLink && (
          <a
            href={task.resourceLink}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-block",
              marginTop: 10,
              color: colors.navy,
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            View Related Resource →
          </a>
        )}
      </div>
    </div>
  );
}

/*
 * ============================================================
 * ACCOUNT PROMPT
 * ============================================================
 *
 * Displayed when a user needs to log in or create
 * an account to save or continue their journey.
 * ============================================================
 */

function AccountPrompt({
  message,
}: {
  message: string;
}) {
  return (
    <div
      style={{
        maxWidth: 650,
        margin: "20px auto 0",
        padding: 20,
        borderRadius: 14,
        background: colors.white,
        border: `1px solid ${colors.border}`,
        textAlign: "center",
      }}
    >
      <p
        style={{
          color: colors.text,
          lineHeight: 1.6,
          margin: "0 0 16px",
        }}
      >
        {message}
      </p>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <Link
          href="/login"
          style={linkButtonStyle}
        >
          Log In
        </Link>

        <Link
          href="/signup"
          style={{
            ...linkButtonStyle,
            background: colors.white,
            color: colors.navy,
            border: `1px solid ${colors.navy}`,
          }}
        >
          Create Free Account
        </Link>
      </div>
    </div>
  );
}
