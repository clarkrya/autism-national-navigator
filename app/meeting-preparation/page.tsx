
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  onAuthStateChanged,
  type User,
} from "firebase/auth";

import { auth } from "../../lib/firebase";
import MeetingPreparationAccessGate from "../../components/meeting-preparation/MeetingPreparationAccessGate";

import {
  getCurrentJourney,
  getSavedChildren,
  type SavedChild,
} from "../../lib/journeyRepository";

import {
  getChildJourneyResponses,
  type JourneyResponse,
} from "../../lib/journeyResponseRepository";

import {
  detectMeetingType,
} from "../../lib/meetingPreparation/detectMeetingType";

import {
  prioritizeMeetingTemplate,
  type PrioritizedMeetingTemplate,
  type PrioritizedMeetingTemplateItem,
  type PrioritizedMeetingTemplateSection,
} from "../../lib/meetingPreparation/prioritizeMeetingTemplate";

import type {
  MeetingRecommendation,
} from "../../types/meetingPreparation";

import type {
  PersonalizedJourney,
} from "../../lib/ai/journeyTypes";

const brand = {
  navy: "#204D6A",
  darkNavy: "#173B52",
  teal: "#58AAA7",
  deepTeal: "#278482",
  paleTeal: "#EAF6F5",
  paleBorder: "#CDE7E5",
  gold: "#F7AD3F",
  text: "#334155",
  muted: "#64748B",
  border: "#E2E8F0",
  surface: "#F8FAFC",
  white: "#FFFFFF",
};

type MeetingPreparationResult = {
  childId: string;
  childName: string;
  journeyId: string;
  currentFocus: string;
  currentFocusExplanation: string;
  nextStep: string;
  nextStepDescription: string;
  recommendation: MeetingRecommendation | null;
  prioritizedTemplate: PrioritizedMeetingTemplate | null;
  selectedTaskTitle: string;
  selectedTaskDescription: string;
  savedNotes: JourneyResponse[];
  notesUnavailable: boolean;
  error?: string;
};

type JourneyContext = {
  childId: string;
  taskId: string;
};

function readJourneyContext(): JourneyContext {
  if (typeof window === "undefined") {
    return { childId: "", taskId: "" };
  }

  const params = new URLSearchParams(
    window.location.search
  );

  return {
    childId: params.get("childId") || "",
    taskId: params.get("taskId") || "",
  };
}

function TemplateItem({
  item,
  emphasized,
}: {
  item: PrioritizedMeetingTemplateItem;
  emphasized: boolean;
}) {
  return (
    <div
      style={{
        padding: 12,
        border: emphasized
          ? `2px solid ${brand.teal}`
          : `1px solid ${brand.border}`,
        borderRadius: 9,
        background: emphasized
          ? "#F5FBFA"
          : brand.white,
        color: brand.darkNavy,
        lineHeight: 1.5,
      }}
    >
      {item.text}
    </div>
  );
}

function TemplateSection({
  title,
  section,
}: {
  title: string;
  section: PrioritizedMeetingTemplateSection;
}) {
  return (
    <section style={{ marginTop: 26 }}>
      <h3
        style={{
          margin: "0 0 12px",
          fontSize: 18,
          color: brand.darkNavy,
        }}
      >
        {title}
      </h3>

      {section.prioritized.length > 0 && (
        <div
          style={{
            padding: 16,
            borderRadius: 12,
            background: brand.paleTeal,
            border: `1px solid ${brand.paleBorder}`,
          }}
        >
          <div
            style={{
              marginBottom: 12,
              fontWeight: 700,
              color: brand.deepTeal,
            }}
          >
            Prioritized from Current Journey
          </div>

          <div
            style={{
              display: "grid",
              gap: 10,
            }}
          >
            {section.prioritized.map((item) => (
              <TemplateItem
                key={item.id}
                item={item}
                emphasized={true}
              />
            ))}
          </div>
        </div>
      )}

      {section.additional.length > 0 && (
        <details
          style={{
            marginTop:
              section.prioritized.length > 0
                ? 12
                : 0,
            padding: 14,
            border: `1px solid ${brand.border}`,
            borderRadius: 10,
            background: brand.surface,
          }}
        >
          <summary
            style={{
              cursor: "pointer",
              fontWeight: 700,
              color: brand.navy,
            }}
          >
            Additional trusted items (
            {section.additional.length})
          </summary>

          <div
            style={{
              display: "grid",
              gap: 10,
              marginTop: 14,
            }}
          >
            {section.additional.map((item) => (
              <TemplateItem
                key={item.id}
                item={item}
                emphasized={false}
              />
            ))}
          </div>
        </details>
      )}

      {section.prioritized.length === 0 &&
        section.additional.length === 0 && (
          <p style={{ color: brand.muted }}>
            No preparation items are available for
            this section.
          </p>
        )}
    </section>
  );
}

function JourneySummaryCard({
  label,
  title,
  description,
}: {
  label: string;
  title: string;
  description: string;
}) {
  return (
    <div
      style={{
        padding: 16,
        border: `1px solid ${brand.border}`,
        borderRadius: 12,
        background: brand.surface,
      }}
    >
      <div
        style={{
          marginBottom: 7,
          color: brand.deepTeal,
          fontSize: 12,
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontWeight: 700,
          lineHeight: 1.45,
          color: brand.darkNavy,
        }}
      >
        {title}
      </div>

      {description && (
        <p
          style={{
            margin: "7px 0 0",
            color: brand.muted,
            lineHeight: 1.5,
            fontSize: 14,
          }}
        >
          {description}
        </p>
      )}
    </div>
  );
}

function getTaskFocusedJourney(
  journey: PersonalizedJourney,
  taskId: string
): PersonalizedJourney | null {
  const task = (journey.tasks || []).find(
    (item) => item.id === taskId
  );

  if (!task) return null;

  return {
    ...journey,
    currentFocus: {
      title: task.title,
      explanation: task.description,
    },
    nextStep: {
      title: task.title,
      description: task.description,
    },
    actions: [],
    tasks: [task],
  };
}

function getRelevantNotes(
  responses: JourneyResponse[],
  journeyId: string,
  taskId: string
): JourneyResponse[] {
  const currentJourneyResponses = responses.filter(
    (item) =>
      item.journeyId === journeyId &&
      item.response.trim().length > 0
  );

  if (!taskId) return [];

  return currentJourneyResponses
    .filter((item) => item.taskId === taskId)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

function MeetingPreparationContent() {
    const [user, setUser] =
    useState<User | null>(null);

  const [authChecked, setAuthChecked] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [results, setResults] = useState<
    MeetingPreparationResult[]
  >([]);

  const [selectedChildId, setSelectedChildId] =
    useState("");

  const [journeyContext, setJourneyContext] =
    useState<JourneyContext>({
      childId: "",
      taskId: "",
    });

  useEffect(() => {
    setJourneyContext(readJourneyContext());

    const unsubscribe = onAuthStateChanged(
      auth,
      (nextUser) => {
        setUser(nextUser);
        setAuthChecked(true);
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!authChecked || !user) {
      setResults([]);
      setSelectedChildId("");
      return;
    }

    const userId = user.uid;
    let cancelled = false;

    async function loadMeetingPreparation() {
      setLoading(true);

      try {
        const children =
          await getSavedChildren(userId);

        const nextResults = await Promise.all(
          children.map(
            async (
              child: SavedChild
            ): Promise<MeetingPreparationResult> => {
              const childId = child.childId;

              const childName =
                child.familyProfile.childName?.trim() ||
                "Unnamed child";

              const emptyResult: MeetingPreparationResult = {
                childId,
                childName,
                journeyId: "",
                currentFocus: "No Current Journey",
                currentFocusExplanation: "",
                nextStep: "No Current Journey",
                nextStepDescription: "",
                recommendation: null,
                prioritizedTemplate: null,
                selectedTaskTitle: "",
                selectedTaskDescription: "",
                savedNotes: [],
                notesUnavailable: false,
              };

              try {
                const savedJourney =
                  await getCurrentJourney(
                    userId,
                    childId
                  );

                if (!savedJourney) {
                  return emptyResult;
                }

                const journey =
                  savedJourney.journey;

                const isRequestedChild =
                  journeyContext.childId === childId;

                const requestedTaskId =
                  isRequestedChild
                    ? journeyContext.taskId
                    : "";

                const selectedTask = (
                  journey.tasks || []
                ).find(
                  (task) =>
                    task.id === requestedTaskId
                );

                const taskFocusedJourney =
                  selectedTask
                    ? getTaskFocusedJourney(
                        journey,
                        selectedTask.id
                      )
                    : null;

                const focusedRecommendation =
                  taskFocusedJourney
                    ? detectMeetingType(
                        taskFocusedJourney,
                        childName
                      )
                    : null;

                const recommendation =
                  focusedRecommendation ||
                  detectMeetingType(
                    journey,
                    childName
                  );

                const prioritizedTemplate =
                  recommendation
                    ? prioritizeMeetingTemplate(
                        taskFocusedJourney &&
                          focusedRecommendation
                          ? taskFocusedJourney
                          : journey,
                        recommendation
                      )
                    : null;

                let savedNotes: JourneyResponse[] = [];
                let notesUnavailable = false;

                // Journey Notes are owner-private.
                // Read only under the signed-in owner's
                // own child record. Firestore rules remain
                // the final authorization authority.
                if (selectedTask) {
                  try {
                    const responses =
                      await getChildJourneyResponses(
                        userId,
                        childId
                      );

                    savedNotes = getRelevantNotes(
                      responses,
                      savedJourney.journeyId,
                      selectedTask.id
                    );
                  } catch (notesError) {
                    console.warn(
                      "Journey Notes could not be loaded:",
                      notesError
                    );

                    notesUnavailable = true;
                  }
                }

                return {
                  childId,
                  childName,
                  journeyId:
                    savedJourney.journeyId,
                  currentFocus:
                    journey.currentFocus.title,
                  currentFocusExplanation:
                    journey.currentFocus.explanation,
                  nextStep:
                    journey.nextStep?.title || "",
                  nextStepDescription:
                    journey.nextStep?.description || "",
                  recommendation,
                  prioritizedTemplate,
                  selectedTaskTitle:
                    selectedTask?.title || "",
                  selectedTaskDescription:
                    selectedTask?.description || "",
                  savedNotes,
                  notesUnavailable,
                };
              } catch (error) {
                return {
                  ...emptyResult,
                  currentFocus: "Unable to load",
                  nextStep: "Unable to load",
                  error:
                    error instanceof Error
                      ? error.message
                      : "Unknown error",
                };
              }
            }
          )
        );

        if (cancelled) return;

        setResults(nextResults);

        setSelectedChildId((current) => {
          if (
            journeyContext.childId &&
            nextResults.some(
              (item) =>
                item.childId ===
                journeyContext.childId
            )
          ) {
            return journeyContext.childId;
          }

          if (
            current &&
            nextResults.some(
              (item) =>
                item.childId === current
            )
          ) {
            return current;
          }

          return nextResults[0]?.childId || "";
        });
      } catch (error) {
        console.error(
          "Meeting Preparation failed to load:",
          error
        );

        if (!cancelled) {
          setResults([]);
          setSelectedChildId("");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadMeetingPreparation();

    return () => {
      cancelled = true;
    };
  }, [
    authChecked,
    user,
    journeyContext.childId,
    journeyContext.taskId,
  ]);

  const selectedResult = useMemo(
    () =>
      results.find(
        (result) =>
          result.childId === selectedChildId
      ) || null,
    [results, selectedChildId]
  );

  function handleChildChange(childId: string) {
    setSelectedChildId(childId);

    // Clear the task-specific context when
    // switching to another child.
    setJourneyContext({
      childId: "",
      taskId: "",
    });

    if (typeof window !== "undefined") {
      window.history.replaceState(
        null,
        "",
        window.location.pathname
      );
    }
  }

  const pageStyle: React.CSSProperties = {
    maxWidth: 1050,
    margin: "0 auto",
    padding: "40px 24px 80px",
    fontFamily: "Arial, sans-serif",
  };

  if (!authChecked) {
    return (
      <main style={pageStyle}>
        Checking account...
      </main>
    );
  }

  if (!user) {
    return (
      <main style={pageStyle}>
        <h1 style={{ color: brand.darkNavy }}>
          Meeting Preparation
        </h1>

        <p style={{ color: brand.muted }}>
          Sign in to prepare for meetings using
          your family's saved Journey.
        </p>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      {/* PAGE HEADER */}

      <div
        style={{
          padding: 28,
          border: `1px solid ${brand.border}`,
          borderRadius: 16,
          background: brand.white,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            display: "inline-block",
            padding: "6px 12px",
            marginBottom: 12,
            borderRadius: 999,
            background: brand.paleTeal,
            color: brand.deepTeal,
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
          }}
        >
          Autivoya Premium
        </div>

        <h1
          style={{
            margin: "0 0 10px",
            fontSize: 36,
            lineHeight: 1.15,
            color: brand.darkNavy,
            fontWeight: 800,
          }}
        >
          Meeting Preparation
        </h1>

        <p
          style={{
            margin: "0 0 24px",
            maxWidth: 760,
            color: brand.muted,
            lineHeight: 1.6,
            fontSize: 16,
          }}
        >
          Prepare for appointments and meetings
          with trusted guidance prioritized around
          your family's Current Journey.
        </p>

        {results.length > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <label
              htmlFor="meeting-preparation-child"
              style={{
                fontWeight: 700,
                color: brand.darkNavy,
              }}
            >
              Prepare for
            </label>

            <select
              id="meeting-preparation-child"
              value={selectedChildId}
              onChange={(event) =>
                handleChildChange(
                  event.target.value
                )
              }
              style={{
                minWidth: 190,
                padding: "10px 36px 10px 12px",
                border: "1px solid #CBD5E1",
                borderRadius: 8,
                background: brand.white,
                color: brand.darkNavy,
                fontSize: 15,
                cursor: "pointer",
              }}
            >
              {results.map((result) => (
                <option
                  key={result.childId}
                  value={result.childId}
                >
                  {result.childName}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* LOADING */}

      {loading && (
        <div
          role="status"
          style={{
            padding: 24,
            border: `1px solid ${brand.border}`,
            borderRadius: 14,
            background: brand.white,
            color: brand.muted,
          }}
        >
          Preparing your personalized meeting
          guidance...
        </div>
      )}

      {/* NO SAVED CHILDREN */}

      {!loading && results.length === 0 && (
        <div
          style={{
            padding: 24,
            border: `1px solid ${brand.border}`,
            borderRadius: 14,
            background: brand.white,
          }}
        >
          <h2
            style={{
              margin: "0 0 8px",
              fontSize: 20,
              color: brand.darkNavy,
            }}
          >
            No saved children found
          </h2>

          <p
            style={{
              margin: 0,
              color: brand.muted,
              lineHeight: 1.6,
            }}
          >
            Create a family Journey first so
            Autivoya can personalize Meeting
            Preparation.
          </p>
        </div>
      )}

      {/* SELECTED CHILD */}

      {!loading && selectedResult && (
        <section
          style={{
            padding: 28,
            border: `1px solid ${brand.border}`,
            borderRadius: 16,
            background: brand.white,
          }}
        >
          <div style={{ marginBottom: 26 }}>
            <div
              style={{
                color: brand.deepTeal,
                fontSize: 13,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: 6,
              }}
            >
              Meeting Preparation for
            </div>

            <h2
              style={{
                margin: 0,
                fontSize: 28,
                color: brand.darkNavy,
              }}
            >
              {selectedResult.childName}
            </h2>
          </div>

          {/* CURRENT JOURNEY + NEXT STEP */}

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 14,
              marginBottom: 26,
            }}
          >
            <JourneySummaryCard
              label="Current Journey"
              title={selectedResult.currentFocus}
              description={
                selectedResult.currentFocusExplanation
              }
            />

            <JourneySummaryCard
              label="Next Step"
              title={selectedResult.nextStep}
              description={
                selectedResult.nextStepDescription
              }
            />
          </div>

          {/* SELECTED JOURNEY TASK */}

          {selectedResult.selectedTaskTitle && (
            <div
              style={{
                padding: 18,
                marginBottom: 26,
                borderRadius: 12,
                background: brand.surface,
                border: `1px solid ${brand.border}`,
              }}
            >
              <div
                style={{
                  color: brand.deepTeal,
                  fontSize: 12,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  marginBottom: 7,
                }}
              >
                From Your Journey Task
              </div>

              <h3
                style={{
                  margin: "0 0 8px",
                  color: brand.darkNavy,
                  fontSize: 19,
                }}
              >
                {selectedResult.selectedTaskTitle}
              </h3>

              <p
                style={{
                  margin: 0,
                  color: brand.text,
                  lineHeight: 1.6,
                }}
              >
                {selectedResult.selectedTaskDescription}
              </p>
            </div>
          )}

          {/* ERROR */}

          {selectedResult.error && (
            <div
              role="alert"
              style={{
                padding: 16,
                marginBottom: 24,
                borderRadius: 10,
                border: "1px solid #FECACA",
                background: "#FEF2F2",
                color: "#991B1B",
              }}
            >
              We couldn't load Meeting Preparation
              for this Journey. Please try again.
            </div>
          )}

          {/* RECOMMENDATION */}

          {!selectedResult.error &&
            selectedResult.recommendation && (
              <div
                style={{
                  padding: 18,
                  marginBottom: 28,
                  borderRadius: 12,
                  border: `1px solid ${brand.paleBorder}`,
                  background: brand.paleTeal,
                }}
              >
                <div
                  style={{
                    marginBottom: 5,
                    color: brand.deepTeal,
                    fontSize: 12,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Recommended for Your Current Journey
                </div>

                <div
                  style={{
                    fontSize: 19,
                    fontWeight: 800,
                    lineHeight: 1.4,
                    color: brand.darkNavy,
                  }}
                >
                  {
                    selectedResult.recommendation
                      .title
                  }
                </div>

                <div
                  style={{
                    marginTop: 7,
                    color: brand.text,
                    lineHeight: 1.55,
                  }}
                >
                  {
                    selectedResult.recommendation
                      .reason
                  }
                </div>
              </div>
            )}

          {/* NO AUTOMATIC RECOMMENDATION */}

          {!selectedResult.error &&
            !selectedResult.recommendation && (
              <div
                style={{
                  padding: 18,
                  marginBottom: 28,
                  borderRadius: 12,
                  border: `1px solid ${brand.border}`,
                  background: brand.surface,
                }}
              >
                <div
                  style={{
                    fontWeight: 800,
                    marginBottom: 6,
                    color: brand.darkNavy,
                  }}
                >
                  No Journey-based meeting preparation
                  is recommended right now.
                </div>

                <div
                  style={{
                    color: brand.muted,
                    lineHeight: 1.55,
                  }}
                >
                  Your Current Journey does not clearly
                  point to a specific upcoming meeting.
                  Manual Meeting Preparation can be
                  added separately.
                </div>
              </div>
            )}

          {/* REUSED JOURNEY NOTES */}

          {!selectedResult.error &&
            selectedResult.savedNotes.length > 0 && (
              <section
                style={{
                  marginBottom: 28,
                  padding: 20,
                  borderRadius: 12,
                  border: `1px solid ${brand.paleBorder}`,
                  background: "#F5FBFA",
                }}
              >
                <div
                  style={{
                    color: brand.deepTeal,
                    fontSize: 12,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    marginBottom: 8,
                  }}
                >
                  Reused from My Journey
                </div>

                <h3
                  style={{
                    margin: "0 0 10px",
                    color: brand.darkNavy,
                    fontSize: 21,
                  }}
                >
                  Your Saved Journey Notes
                </h3>

                <p
                  style={{
                    color: brand.muted,
                    fontSize: 14,
                    lineHeight: 1.6,
                    margin: "0 0 16px",
                  }}
                >
                  These notes were previously saved
                  for this Journey task. Review them
                  before your meeting. Your original
                  notes will not be changed.
                </p>

                <div
                  style={{
                    display: "grid",
                    gap: 12,
                  }}
                >
                  {selectedResult.savedNotes.map(
                    (note) => (
                      <div
                        key={note.id}
                        style={{
                          padding: 16,
                          background: brand.white,
                          borderRadius: 10,
                          border:
                            `1px solid ${brand.border}`,
                        }}
                      >
                        <div
                          style={{
                            fontWeight: 700,
                            color: brand.darkNavy,
                            marginBottom: 8,
                          }}
                        >
                          {note.taskTitle}
                        </div>

                        <div
                          style={{
                            whiteSpace: "pre-wrap",
                            overflowWrap: "anywhere",
                            color: brand.text,
                            lineHeight: 1.65,
                            fontSize: 14,
                          }}
                        >
                          {note.response}
                        </div>
                      </div>
                    )
                  )}
                </div>
              </section>
            )}

          {selectedResult.notesUnavailable && (
            <p
              role="status"
              style={{
                color: brand.muted,
                fontSize: 13,
                marginBottom: 24,
              }}
            >
              Saved Journey Notes aren't available
              right now. Meeting guidance is still
              available below.
            </p>
          )}

          {/* TRUSTED MEETING TEMPLATE */}

          {selectedResult.prioritizedTemplate && (
            <div
              style={{
                marginTop: 30,
                paddingTop: 28,
                borderTop:
                  `2px solid ${brand.border}`,
              }}
            >
              <div style={{ marginBottom: 20 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: brand.deepTeal,
                  }}
                >
                  Journey-Aware Trusted Template
                </div>

                <h2
                  style={{
                    margin: "6px 0 6px",
                    fontSize: 24,
                    color: brand.darkNavy,
                  }}
                >
                  {
                    selectedResult.prioritizedTemplate
                      .title
                  }
                </h2>

                <div
                  style={{
                    color: brand.muted,
                    lineHeight: 1.6,
                  }}
                >
                  {
                    selectedResult.prioritizedTemplate
                      .description
                  }
                </div>
              </div>

              <TemplateSection
                title="Priorities"
                section={
                  selectedResult.prioritizedTemplate
                    .priorities
                }
              />

              <TemplateSection
                title="Questions to Ask"
                section={
                  selectedResult.prioritizedTemplate
                    .questions
                }
              />

              <TemplateSection
                title="Items to Have / Bring"
                section={
                  selectedResult.prioritizedTemplate
                    .bringItems
                }
              />

              <TemplateSection
                title="Information to Share"
                section={
                  selectedResult.prioritizedTemplate
                    .informationToShare
                }
              />

              <TemplateSection
                title="Before You Leave"
                section={
                  selectedResult.prioritizedTemplate
                    .beforeYouLeave
                }
              />
            </div>
          )}
        </section>
      )}
    </main>
  );
}
export default function MeetingPreparationPage() {
  return (
    <MeetingPreparationAccessGate>
      <MeetingPreparationContent />
    </MeetingPreparationAccessGate>
  );
}