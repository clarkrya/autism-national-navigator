"use client";

/*
 * ============================================================
 * TEMPORARY MEETING PREPARATION TEST
 * ============================================================
 *
 * DEVELOPMENT ONLY.
 *
 * This page loads the signed-in user's saved children and each
 * child's Current Journey, then:
 *
 *   1. Runs the Journey → Meeting detector
 *   2. Runs the Journey-aware trusted-template prioritizer
 *   3. Displays the resulting preparation priorities
 *   4. Displays Journey actions and open tasks for comparison
 *
 * Scores and matched concepts remain internal prioritization
 * metadata and are intentionally hidden from the visible UI.
 *
 * Delete this page after Meeting Preparation testing is
 * complete.
 * ============================================================
 */

import { useEffect, useState } from "react";

import {
  onAuthStateChanged,
  type User,
} from "firebase/auth";

import { auth } from "../../lib/firebase";

import {
  getCurrentJourney,
  getSavedChildren,
  type SavedChild,
} from "../../lib/journeyRepository";

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

/*
 * ============================================================
 * TEST TYPES
 * ============================================================
 */

type TestAction = {
  id: string;
  title: string;
  action: string;
  howTo: string;
  nextStep?: string;
};

type TestTask = {
  id: string;
  title: string;
  description: string;
  completed: boolean;
};

type TestResult = {
  childId: string;
  childName: string;

  currentFocus: string;
  currentFocusExplanation: string;

  nextStep: string;
  nextStepDescription: string;

  actions: TestAction[];
  tasks: TestTask[];

  recommendation: MeetingRecommendation | null;

  prioritizedTemplate: PrioritizedMeetingTemplate | null;

  error?: string;
};

/*
 * ============================================================
 * TRUSTED TEMPLATE ITEM
 * ============================================================
 *
 * IMPORTANT:
 *
 * score, matchedConcepts, and item IDs remain available inside
 * the prioritization engine but are not displayed here.
 *
 * Families should see the useful recommendation — not the
 * internal mechanics used to rank it.
 * ============================================================
 */

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
        padding: "12px",
        border: emphasized
          ? "2px solid #7C3AED"
          : "1px solid #E2E8F0",
        borderRadius: "9px",
        background: emphasized
          ? "#F5F3FF"
          : "#FFFFFF",
      }}
    >
      <div
        style={{
          lineHeight: 1.5,
        }}
      >
        {item.text}
      </div>
    </div>
  );
}

/*
 * ============================================================
 * TRUSTED TEMPLATE SECTION
 * ============================================================
 */

function TemplateSection({
  title,
  section,
}: {
  title: string;
  section: PrioritizedMeetingTemplateSection;
}) {
  return (
    <section
      style={{
        marginTop: "26px",
      }}
    >
      <h4
        style={{
          margin: "0 0 12px",
          fontSize: "18px",
        }}
      >
        {title}
      </h4>

      {section.prioritized.length > 0 && (
        <div
          style={{
            padding: "16px",
            borderRadius: "12px",
            background: "#FAF5FF",
            border: "1px solid #E9D5FF",
          }}
        >
          <div
            style={{
              marginBottom: "12px",
              fontWeight: 700,
              color: "#6D28D9",
            }}
          >
            Prioritized from Current Journey
          </div>

          <div
            style={{
              display: "grid",
              gap: "10px",
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
                ? "12px"
                : "0",
            padding: "14px",
            border: "1px solid #E2E8F0",
            borderRadius: "10px",
            background: "#F8FAFC",
          }}
        >
          <summary
            style={{
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Additional trusted items (
            {section.additional.length})
          </summary>

          <div
            style={{
              display: "grid",
              gap: "10px",
              marginTop: "14px",
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
          <div
            style={{
              color: "#64748B",
              fontSize: "14px",
            }}
          >
            No preparation items are available for this section.
          </div>
        )}
    </section>
  );
}

/*
 * ============================================================
 * PAGE
 * ============================================================
 */

export default function MeetingPreparationTestPage() {
  const [user, setUser] =
    useState<User | null>(null);

  const [authChecked, setAuthChecked] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [results, setResults] =
    useState<TestResult[]>([]);

  /*
   * ==========================================================
   * AUTH
   * ==========================================================
   */

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
        auth,
        (nextUser) => {
          setUser(nextUser);
          setAuthChecked(true);
        }
      );

    return () => {
      unsubscribe();
    };
  }, []);

  /*
   * ==========================================================
   * RUN TEST AGAINST REAL SAVED JOURNEYS
   * ==========================================================
   */

  useEffect(() => {
    if (!authChecked || !user) {
      return;
    }

    const userId = user.uid;

    let cancelled = false;

    async function runTest() {
      setLoading(true);

      try {
        /*
         * ------------------------------------------------------
         * LOAD SAVED CHILDREN
         * ------------------------------------------------------
         */

        const children =
          await getSavedChildren(userId);

        /*
         * ------------------------------------------------------
         * LOAD EACH CHILD'S CURRENT JOURNEY
         * ------------------------------------------------------
         */

        const nextResults =
          await Promise.all(
            children.map(
              async (
                child: SavedChild
              ) => {
                const childId =
                  child.childId;

                const childName =
                  child.familyProfile
                    .childName
                    ?.trim() ||
                  "Unnamed child";

                try {
                  const savedJourney =
                    await getCurrentJourney(
                      userId,
                      childId
                    );

                  /*
                   * --------------------------------------------
                   * NO CURRENT JOURNEY
                   * --------------------------------------------
                   */

                  if (!savedJourney) {
                    return {
                      childId,
                      childName,

                      currentFocus:
                        "No Current Journey",

                      currentFocusExplanation:
                        "",

                      nextStep:
                        "No Current Journey",

                      nextStepDescription:
                        "",

                      actions: [],
                      tasks: [],

                      recommendation:
                        null,

                      prioritizedTemplate:
                        null,
                    } satisfies TestResult;
                  }

                  /*
                   * --------------------------------------------
                   * RUN DETECTOR
                   * --------------------------------------------
                   */

                  const recommendation =
                    detectMeetingType(
                      savedJourney.journey,
                      childName
                    );

                  /*
                   * --------------------------------------------
                   * RUN JOURNEY-AWARE TEMPLATE PRIORITIZER
                   * --------------------------------------------
                   */

                  const prioritizedTemplate =
                    recommendation
                      ? prioritizeMeetingTemplate(
                          savedJourney.journey,
                          recommendation
                        )
                      : null;

                  /*
                   * --------------------------------------------
                   * COPY ACTIONS FOR TEST DISPLAY
                   * --------------------------------------------
                   */

                  const actions:
                    TestAction[] =
                    savedJourney
                      .journey
                      .actions
                      .map(
                        (action) => ({
                          id:
                            action.id,

                          title:
                            action.title,

                          action:
                            action.action,

                          howTo:
                            action.howTo,

                          nextStep:
                            action.nextStep,
                        })
                      );

                  /*
                   * --------------------------------------------
                   * COPY TASKS FOR TEST DISPLAY
                   * --------------------------------------------
                   */

                  const tasks:
                    TestTask[] =
                    savedJourney
                      .journey
                      .tasks
                      .map(
                        (task) => ({
                          id:
                            task.id,

                          title:
                            task.title,

                          description:
                            task.description,

                          completed:
                            task.completed,
                        })
                      );

                  return {
                    childId,
                    childName,

                    currentFocus:
                      savedJourney
                        .journey
                        .currentFocus
                        .title,

                    currentFocusExplanation:
                      savedJourney
                        .journey
                        .currentFocus
                        .explanation,

                    nextStep:
                      savedJourney
                        .journey
                        .nextStep
                        .title,

                    nextStepDescription:
                      savedJourney
                        .journey
                        .nextStep
                        .description,

                    actions,
                    tasks,

                    recommendation,

                    prioritizedTemplate,
                  } satisfies TestResult;
                } catch (error) {
                  return {
                    childId,
                    childName,

                    currentFocus:
                      "Unable to load",

                    currentFocusExplanation:
                      "",

                    nextStep:
                      "Unable to load",

                    nextStepDescription:
                      "",

                    actions: [],
                    tasks: [],

                    recommendation:
                      null,

                    prioritizedTemplate:
                      null,

                    error:
                      error instanceof Error
                        ? error.message
                        : "Unknown error",
                  } satisfies TestResult;
                }
              }
            )
          );

        if (!cancelled) {
          setResults(nextResults);
        }
      } catch (error) {
        console.error(
          "Meeting Preparation test failed:",
          error
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void runTest();

    return () => {
      cancelled = true;
    };
  }, [
    authChecked,
    user,
  ]);

  /*
   * ==========================================================
   * AUTH LOADING
   * ==========================================================
   */

  if (!authChecked) {
    return (
      <main
        style={{
          padding: "40px",
          fontFamily:
            "Arial, sans-serif",
        }}
      >
        Checking account...
      </main>
    );
  }

  /*
   * ==========================================================
   * SIGNED OUT
   * ==========================================================
   */

  if (!user) {
    return (
      <main
        style={{
          padding: "40px",
          fontFamily:
            "Arial, sans-serif",
        }}
      >
        Sign in before running the
        Meeting Preparation test.
      </main>
    );
  }

  /*
   * ==========================================================
   * PAGE
   * ==========================================================
   */

  return (
    <main
      style={{
        maxWidth: "1100px",
        margin: "0 auto",
        padding:
          "40px 24px 80px",
        fontFamily:
          "Arial, sans-serif",
      }}
    >
      <h1
        style={{
          marginBottom: "8px",
        }}
      >
        Meeting Preparation Test
      </h1>

      <p
        style={{
          marginTop: 0,
          marginBottom: "32px",
          color: "#64748B",
          lineHeight: 1.5,
        }}
      >
        Development-only view using
        real saved Current Journeys.
        Internal ranking information is
        intentionally hidden from the
        visible preparation experience.
      </p>

      {loading && (
        <p>
          Testing saved Journeys...
        </p>
      )}

      {!loading &&
        results.length === 0 && (
          <p>
            No saved children were
            found.
          </p>
        )}

      <div
        style={{
          display: "grid",
          gap: "32px",
        }}
      >
        {results.map((result) => {
          const openTasks =
            result.tasks.filter(
              (task) =>
                !task.completed
            );

          return (
            <section
              key={result.childId}
              style={{
                padding: "24px",
                border:
                  "1px solid #E2E8F0",
                borderRadius:
                  "14px",
                background:
                  "#FFFFFF",
              }}
            >
              <h2
                style={{
                  marginTop: 0,
                  fontSize: "28px",
                }}
              >
                {result.childName}
              </h2>

              {/*
               * ==============================================
               * CURRENT JOURNEY
               * ==============================================
               */}

              <div
                style={{
                  marginBottom:
                    "18px",
                }}
              >
                <strong>
                  Current Journey:
                </strong>

                <div
                  style={{
                    marginTop: "4px",
                  }}
                >
                  {result.currentFocus}
                </div>

                {result.currentFocusExplanation && (
                  <div
                    style={{
                      marginTop:
                        "6px",
                      color:
                        "#64748B",
                      lineHeight:
                        1.5,
                    }}
                  >
                    {
                      result.currentFocusExplanation
                    }
                  </div>
                )}
              </div>

              {/*
               * ==============================================
               * NEXT STEP
               * ==============================================
               */}

              <div
                style={{
                  marginBottom:
                    "22px",
                }}
              >
                <strong>
                  Next Step:
                </strong>

                <div
                  style={{
                    marginTop: "4px",
                  }}
                >
                  {result.nextStep}
                </div>

                {result.nextStepDescription && (
                  <div
                    style={{
                      marginTop:
                        "6px",
                      color:
                        "#64748B",
                      lineHeight:
                        1.5,
                    }}
                  >
                    {
                      result.nextStepDescription
                    }
                  </div>
                )}
              </div>

              {/*
               * ==============================================
               * MEETING RECOMMENDATION
               * ==============================================
               */}

              {result.error ? (
                <div
                  style={{
                    padding: "14px",
                    marginBottom:
                      "24px",
                    borderRadius:
                      "10px",
                    background:
                      "#FEF2F2",
                  }}
                >
                  Error: {result.error}
                </div>
              ) : result.recommendation ? (
                <div
                  style={{
                    padding: "16px",
                    marginBottom:
                      "28px",
                    borderRadius:
                      "10px",
                    background:
                      "#F5F3FF",
                  }}
                >
                  <div>
                    <strong>
                      Recommended
                      preparation:
                    </strong>{" "}
                    {
                      result
                        .recommendation
                        .title
                    }
                  </div>

                  <div
                    style={{
                      marginTop: "8px",
                      color:
                        "#475569",
                      lineHeight:
                        1.5,
                    }}
                  >
                    {
                      result
                        .recommendation
                        .reason
                    }
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    padding: "16px",
                    marginBottom:
                      "28px",
                    borderRadius:
                      "10px",
                    background:
                      "#F8FAFC",
                  }}
                >
                  <strong>
                    No Journey-based
                    meeting recommendation.
                  </strong>

                  <div
                    style={{
                      marginTop:
                        "6px",
                      color:
                        "#64748B",
                    }}
                  >
                    Myriad would offer
                    manual meeting
                    preparation instead.
                  </div>
                </div>
              )}

              {/*
               * ==============================================
               * JOURNEY-AWARE TRUSTED TEMPLATE
               * ==============================================
               */}

              {result.prioritizedTemplate && (
                <div
                  style={{
                    marginTop: "30px",
                    paddingTop:
                      "28px",
                    borderTop:
                      "2px solid #E2E8F0",
                  }}
                >
                  <div
                    style={{
                      marginBottom:
                        "20px",
                    }}
                  >
                    <div
                      style={{
                        fontSize:
                          "13px",
                        fontWeight:
                          700,
                        letterSpacing:
                          "0.06em",
                        textTransform:
                          "uppercase",
                        color:
                          "#7C3AED",
                      }}
                    >
                      Journey-Aware
                      Trusted Template
                    </div>

                    <h3
                      style={{
                        margin:
                          "6px 0 6px",
                        fontSize:
                          "24px",
                      }}
                    >
                      {
                        result
                          .prioritizedTemplate
                          .title
                      }
                    </h3>

                    <div
                      style={{
                        color:
                          "#64748B",
                        lineHeight:
                          1.5,
                      }}
                    >
                      {
                        result
                          .prioritizedTemplate
                          .description
                      }
                    </div>
                  </div>

                  <TemplateSection
                    title="Priorities"
                    section={
                      result
                        .prioritizedTemplate
                        .priorities
                    }
                  />

                  <TemplateSection
                    title="Questions to Ask"
                    section={
                      result
                        .prioritizedTemplate
                        .questions
                    }
                  />

                  <TemplateSection
                    title="Items to Have / Bring"
                    section={
                      result
                        .prioritizedTemplate
                        .bringItems
                    }
                  />

                  <TemplateSection
                    title="Information to Share"
                    section={
                      result
                        .prioritizedTemplate
                        .informationToShare
                    }
                  />

                  <TemplateSection
                    title="Before You Leave"
                    section={
                      result
                        .prioritizedTemplate
                        .beforeYouLeave
                    }
                  />
                </div>
              )}

              {/*
               * ==============================================
               * JOURNEY ACTIONS
               *
               * TESTING ONLY:
               * Keep these visible so we can compare the
               * preparation recommendations against the
               * underlying Current Journey.
               * ==============================================
               */}

              <div
                style={{
                  marginTop: "34px",
                  paddingTop:
                    "28px",
                  borderTop:
                    "2px solid #E2E8F0",
                }}
              >
                <h3
                  style={{
                    marginBottom:
                      "12px",
                  }}
                >
                  Journey Actions
                </h3>

                {result.actions.length ===
                0 ? (
                  <div
                    style={{
                      color:
                        "#64748B",
                    }}
                  >
                    No actions found.
                  </div>
                ) : (
                  <div
                    style={{
                      display:
                        "grid",
                      gap: "12px",
                    }}
                  >
                    {result.actions.map(
                      (action) => (
                        <div
                          key={
                            action.id
                          }
                          style={{
                            padding:
                              "14px",
                            border:
                              "1px solid #E2E8F0",
                            borderRadius:
                              "10px",
                            background:
                              "#F8FAFC",
                          }}
                        >
                          <div>
                            <strong>
                              {
                                action.title
                              }
                            </strong>
                          </div>

                          <div
                            style={{
                              marginTop:
                                "8px",
                            }}
                          >
                            <strong>
                              Action:
                            </strong>{" "}
                            {
                              action.action
                            }
                          </div>

                          <div
                            style={{
                              marginTop:
                                "6px",
                            }}
                          >
                            <strong>
                              How To:
                            </strong>{" "}
                            {
                              action.howTo
                            }
                          </div>

                          {action.nextStep && (
                            <div
                              style={{
                                marginTop:
                                  "6px",
                              }}
                            >
                              <strong>
                                Next:
                              </strong>{" "}
                              {
                                action.nextStep
                              }
                            </div>
                          )}
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>

              {/*
               * ==============================================
               * OPEN JOURNEY TASKS
               *
               * TESTING ONLY
               * ==============================================
               */}

              <div
                style={{
                  marginTop: "28px",
                }}
              >
                <h3
                  style={{
                    marginBottom:
                      "12px",
                  }}
                >
                  Open Journey Tasks
                </h3>

                {openTasks.length ===
                0 ? (
                  <div
                    style={{
                      color:
                        "#64748B",
                    }}
                  >
                    No open tasks found.
                  </div>
                ) : (
                  <div
                    style={{
                      display:
                        "grid",
                      gap: "12px",
                    }}
                  >
                    {openTasks.map(
                      (task) => (
                        <div
                          key={task.id}
                          style={{
                            padding:
                              "14px",
                            border:
                              "1px solid #E2E8F0",
                            borderRadius:
                              "10px",
                            background:
                              "#F8FAFC",
                          }}
                        >
                          <div>
                            <strong>
                              {
                                task.title
                              }
                            </strong>
                          </div>

                          <div
                            style={{
                              marginTop:
                                "6px",
                              color:
                                "#475569",
                              lineHeight:
                                1.5,
                            }}
                          >
                            {
                              task.description
                            }
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}