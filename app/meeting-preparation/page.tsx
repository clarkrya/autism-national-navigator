
"use client";

import { useEffect, useMemo, useState } from "react";

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

/* ============================================================
   AUTIVOYA BRAND COLORS
============================================================ */

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

/* ============================================================
   TYPES
============================================================ */

type MeetingPreparationResult = {
  childId: string;
  childName: string;

  currentFocus: string;
  currentFocusExplanation: string;

  nextStep: string;
  nextStepDescription: string;

  recommendation: MeetingRecommendation | null;
  prioritizedTemplate: PrioritizedMeetingTemplate | null;

  error?: string;
};

/* ============================================================
   TRUSTED TEMPLATE ITEM
============================================================ */

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
          ? `2px solid ${brand.teal}`
          : `1px solid ${brand.border}`,
        borderRadius: "9px",
        background: emphasized
          ? "#F5FBFA"
          : brand.white,
        color: brand.darkNavy,
      }}
    >
      <div style={{ lineHeight: 1.5 }}>
        {item.text}
      </div>
    </div>
  );
}

/* ============================================================
   TRUSTED TEMPLATE SECTION
============================================================ */

function TemplateSection({
  title,
  section,
}: {
  title: string;
  section: PrioritizedMeetingTemplateSection;
}) {
  return (
    <section style={{ marginTop: "26px" }}>
      <h3
        style={{
          margin: "0 0 12px",
          fontSize: "18px",
          color: brand.darkNavy,
        }}
      >
        {title}
      </h3>

      {section.prioritized.length > 0 && (
        <div
          style={{
            padding: "16px",
            borderRadius: "12px",
            background: brand.paleTeal,
            border: `1px solid ${brand.paleBorder}`,
          }}
        >
          <div
            style={{
              marginBottom: "12px",
              fontWeight: 700,
              color: brand.deepTeal,
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
            border: `1px solid ${brand.border}`,
            borderRadius: "10px",
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
              color: brand.muted,
              fontSize: "14px",
            }}
          >
            No preparation items are available for this section.
          </div>
        )}
    </section>
  );
}

/* ============================================================
   PAGE
============================================================ */

export default function MeetingPreparationPage() {
  const [user, setUser] =
    useState<User | null>(null);

  const [authChecked, setAuthChecked] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [results, setResults] =
    useState<MeetingPreparationResult[]>([]);

  const [selectedChildId, setSelectedChildId] =
    useState("");

  /* ==========================================================
     AUTH
  ========================================================== */

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
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

  /* ==========================================================
     LOAD SAVED CHILDREN + CURRENT JOURNEYS
  ========================================================== */

  useEffect(() => {
    if (!authChecked || !user) {
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

              try {
                const savedJourney =
                  await getCurrentJourney(
                    userId,
                    childId
                  );

                if (!savedJourney) {
                  return {
                    childId,
                    childName,
                    currentFocus: "No Current Journey",
                    currentFocusExplanation: "",
                    nextStep: "No Current Journey",
                    nextStepDescription: "",
                    recommendation: null,
                    prioritizedTemplate: null,
                  };
                }

                const recommendation =
                  detectMeetingType(
                    savedJourney.journey,
                    childName
                  );

                const prioritizedTemplate =
                  recommendation
                    ? prioritizeMeetingTemplate(
                        savedJourney.journey,
                        recommendation
                      )
                    : null;

                return {
                  childId,
                  childName,

                  currentFocus:
                    savedJourney.journey.currentFocus.title,

                  currentFocusExplanation:
                    savedJourney.journey.currentFocus
                      .explanation,

                  nextStep:
                    savedJourney.journey.nextStep.title,

                  nextStepDescription:
                    savedJourney.journey.nextStep
                      .description,

                  recommendation,
                  prioritizedTemplate,
                };
              } catch (error) {
                return {
                  childId,
                  childName,

                  currentFocus: "Unable to load",
                  currentFocusExplanation: "",

                  nextStep: "Unable to load",
                  nextStepDescription: "",

                  recommendation: null,
                  prioritizedTemplate: null,

                  error:
                    error instanceof Error
                      ? error.message
                      : "Unknown error",
                };
              }
            }
          )
        );

        if (!cancelled) {
          setResults(nextResults);

          setSelectedChildId(
            (currentSelectedChildId) => {
              if (
                currentSelectedChildId &&
                nextResults.some(
                  (result) =>
                    result.childId ===
                    currentSelectedChildId
                )
              ) {
                return currentSelectedChildId;
              }

              return nextResults[0]?.childId ?? "";
            }
          );
        }
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
  }, [authChecked, user]);

  /* ==========================================================
     SELECTED CHILD
  ========================================================== */

  const selectedResult = useMemo(
    () =>
      results.find(
        (result) =>
          result.childId === selectedChildId
      ) ?? null,
    [results, selectedChildId]
  );

  /* ==========================================================
     AUTH LOADING
  ========================================================== */

  if (!authChecked) {
    return (
      <main
        style={{
          maxWidth: "1050px",
          margin: "0 auto",
          padding: "40px 24px 80px",
          fontFamily: "Arial, sans-serif",
          color: brand.navy,
        }}
      >
        Checking account...
      </main>
    );
  }

  /* ==========================================================
     SIGNED OUT
  ========================================================== */

  if (!user) {
    return (
      <main
        style={{
          maxWidth: "1050px",
          margin: "0 auto",
          padding: "40px 24px 80px",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <h1
          style={{
            marginTop: 0,
            color: brand.darkNavy,
          }}
        >
          Meeting Preparation
        </h1>

        <p
          style={{
            color: brand.muted,
            lineHeight: 1.6,
          }}
        >
          Sign in to prepare for meetings using your
          family's saved Journey.
        </p>
      </main>
    );
  }

  /* ==========================================================
     MAIN PAGE
  ========================================================== */

  return (
    <main
      style={{
        maxWidth: "1050px",
        margin: "0 auto",
        padding: "40px 24px 80px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      {/* ======================================================
          PAGE HEADER
      ====================================================== */}

      <div
        style={{
          padding: "28px",
          border: `1px solid ${brand.border}`,
          borderRadius: "16px",
          background: brand.white,
          marginBottom: "24px",
        }}
      >
        <div
          style={{
            display: "inline-block",
            padding: "6px 12px",
            marginBottom: "12px",
            borderRadius: "999px",
            background: brand.paleTeal,
            color: brand.deepTeal,
            fontSize: "12px",
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
            fontSize: "36px",
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
            maxWidth: "760px",
            color: brand.muted,
            lineHeight: 1.6,
            fontSize: "16px",
          }}
        >
          Prepare for appointments and meetings with
          trusted guidance prioritized around your
          family's Current Journey.
        </p>

        {results.length > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
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
                setSelectedChildId(
                  event.target.value
                )
              }
              style={{
                minWidth: "190px",
                padding: "10px 36px 10px 12px",
                border: `1px solid #CBD5E1`,
                borderRadius: "8px",
                background: brand.white,
                color: brand.darkNavy,
                fontSize: "15px",
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

      {/* ======================================================
          LOADING
      ====================================================== */}

      {loading && (
        <div
          style={{
            padding: "24px",
            border: `1px solid ${brand.border}`,
            borderRadius: "14px",
            background: brand.white,
            color: brand.muted,
          }}
        >
          Preparing your personalized meeting guidance...
        </div>
      )}

      {/* ======================================================
          NO SAVED CHILDREN
      ====================================================== */}

      {!loading && results.length === 0 && (
        <div
          style={{
            padding: "24px",
            border: `1px solid ${brand.border}`,
            borderRadius: "14px",
            background: brand.white,
          }}
        >
          <h2
            style={{
              margin: "0 0 8px",
              fontSize: "20px",
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
            Create a family Journey first so Autivoya
            can personalize Meeting Preparation.
          </p>
        </div>
      )}

      {/* ======================================================
          SELECTED CHILD
      ====================================================== */}

      {!loading && selectedResult && (
        <section
          style={{
            padding: "28px",
            border: `1px solid ${brand.border}`,
            borderRadius: "16px",
            background: brand.white,
          }}
        >
          <div style={{ marginBottom: "26px" }}>
            <div
              style={{
                color: brand.deepTeal,
                fontSize: "13px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: "6px",
              }}
            >
              Meeting Preparation for
            </div>

            <h2
              style={{
                margin: 0,
                fontSize: "28px",
                color: brand.darkNavy,
              }}
            >
              {selectedResult.childName}
            </h2>
          </div>

          {/* ==================================================
              CURRENT JOURNEY + NEXT STEP
          ================================================== */}

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "14px",
              marginBottom: "26px",
            }}
          >
            <div
              style={{
                padding: "16px",
                border: `1px solid ${brand.border}`,
                borderRadius: "12px",
                background: brand.surface,
              }}
            >
              <div
                style={{
                  marginBottom: "7px",
                  color: brand.deepTeal,
                  fontSize: "12px",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                Current Journey
              </div>

              <div
                style={{
                  fontWeight: 700,
                  lineHeight: 1.45,
                  color: brand.darkNavy,
                }}
              >
                {selectedResult.currentFocus}
              </div>

              {selectedResult.currentFocusExplanation && (
                <div
                  style={{
                    marginTop: "7px",
                    color: brand.muted,
                    lineHeight: 1.5,
                    fontSize: "14px",
                  }}
                >
                  {selectedResult.currentFocusExplanation}
                </div>
              )}
            </div>

            <div
              style={{
                padding: "16px",
                border: `1px solid ${brand.border}`,
                borderRadius: "12px",
                background: brand.surface,
              }}
            >
              <div
                style={{
                  marginBottom: "7px",
                  color: brand.deepTeal,
                  fontSize: "12px",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                Next Step
              </div>

              <div
                style={{
                  fontWeight: 700,
                  lineHeight: 1.45,
                  color: brand.darkNavy,
                }}
              >
                {selectedResult.nextStep}
              </div>

              {selectedResult.nextStepDescription && (
                <div
                  style={{
                    marginTop: "7px",
                    color: brand.muted,
                    lineHeight: 1.5,
                    fontSize: "14px",
                  }}
                >
                  {selectedResult.nextStepDescription}
                </div>
              )}
            </div>
          </div>

          {/* ==================================================
              ERROR
          ================================================== */}

          {selectedResult.error && (
            <div
              style={{
                padding: "16px",
                marginBottom: "24px",
                borderRadius: "10px",
                border: "1px solid #FECACA",
                background: "#FEF2F2",
                color: "#991B1B",
              }}
            >
              We couldn't load Meeting Preparation for
              this Journey. Please try again.
            </div>
          )}

          {/* ==================================================
              RECOMMENDATION
          ================================================== */}

          {!selectedResult.error &&
            selectedResult.recommendation && (
              <div
                style={{
                  padding: "18px",
                  marginBottom: "28px",
                  borderRadius: "12px",
                  border: `1px solid ${brand.paleBorder}`,
                  background: brand.paleTeal,
                }}
              >
                <div
                  style={{
                    marginBottom: "5px",
                    color: brand.deepTeal,
                    fontSize: "12px",
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Recommended for Your Current Journey
                </div>

                <div
                  style={{
                    fontSize: "19px",
                    fontWeight: 800,
                    lineHeight: 1.4,
                    color: brand.darkNavy,
                  }}
                >
                  {selectedResult.recommendation.title}
                </div>

                <div
                  style={{
                    marginTop: "7px",
                    color: brand.text,
                    lineHeight: 1.55,
                  }}
                >
                  {selectedResult.recommendation.reason}
                </div>
              </div>
            )}

          {/* ==================================================
              NO AUTOMATIC RECOMMENDATION
          ================================================== */}

          {!selectedResult.error &&
            !selectedResult.recommendation && (
              <div
                style={{
                  padding: "18px",
                  marginBottom: "28px",
                  borderRadius: "12px",
                  border: `1px solid ${brand.border}`,
                  background: brand.surface,
                }}
              >
                <div
                  style={{
                    fontWeight: 800,
                    marginBottom: "6px",
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
                  Manual Meeting Preparation can be added
                  separately.
                </div>
              </div>
            )}

          {/* ==================================================
              JOURNEY-AWARE TRUSTED TEMPLATE
          ================================================== */}

          {selectedResult.prioritizedTemplate && (
            <div
              style={{
                marginTop: "30px",
                paddingTop: "28px",
                borderTop: `2px solid ${brand.border}`,
              }}
            >
              <div style={{ marginBottom: "20px" }}>
                <div
                  style={{
                    fontSize: "13px",
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
                    fontSize: "24px",
                    color: brand.darkNavy,
                  }}
                >
                  {selectedResult.prioritizedTemplate.title}
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
