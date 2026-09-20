"use client";

/*
 * ============================================================
 * ADVANCED PERSONALIZED RESOURCES
 * ============================================================
 *
 * Premium resource experience.
 *
 * This page:
 *
 * 1. Requires an authenticated account
 * 2. Uses existing account entitlements
 * 3. Loads the family's saved children
 * 4. Loads the selected child's current Journey
 * 5. Matches trusted resources against the family profile
 * 6. Displays ranked, explainable recommendations
 *
 * IMPORTANT:
 *
 * Resource facts come from Myriad's trusted resource catalog.
 * Personalization determines relevance only.
 *
 * ============================================================
 */


/*
 * ============================================================
 * IMPORTS
 * ============================================================
 */

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import {
  getCurrentUser,
} from "../../lib/auth";

import {
  useAccountEntitlements,
} from "../../lib/useAccountEntitlements";

import {
  getCurrentJourney,
  getSavedChildren,
} from "../../lib/journeyRepository";

import type {
  SavedChild,
  SavedJourney,
} from "../../lib/journeyRepository";

import {
  getPersonalizedResourceRecommendations,
} from "../../lib/resources/resourceRecommendationEngine";

import type {
  PersonalizedResourceRecommendation,
} from "../../lib/resources/resourceRecommendationEngine";

import type {
  TrustedResource,
} from "../../data/resources/federal";


/*
 * ============================================================
 * PAGE STATE
 * ============================================================
 */

type PageStatus =
  | "loading"
  | "guest"
  | "free"
  | "ready"
  | "empty"
  | "error";


/*
 * ============================================================
 * SAFE EXTERNAL URL
 * ============================================================
 */

function isSafeExternalUrl(
  value?: string
): boolean {

  if (
    !value
  ) {
    return false;
  }


  try {

    const url =
      new URL(
        value
      );


    return (
      url.protocol ===
        "https:" ||
      url.protocol ===
        "http:"
    );

  } catch {

    return false;

  }
}


/*
 * ============================================================
 * RESOURCE TYPE LABEL
 * ============================================================
 */

function formatResourceType(
  type:
    TrustedResource["type"]
): string {

  switch (
    type
  ) {

    case "grant":
      return "Grant";

    case "government":
      return "Government";

    case "insurance":
      return "Insurance";

    case "therapy":
      return "Therapy";

    case "school":
      return "School & Education";

    case "financial":
      return "Financial Support";

    case "support":
      return "Family Support";

    default:
      return "Resource";

  }
}


/*
 * ============================================================
 * MATCH LABEL
 * ============================================================
 */

function getMatchLabel(
  recommendation:
    PersonalizedResourceRecommendation
): string {

  switch (
    recommendation.matchLevel
  ) {

    case "high":
      return "High Match";

    case "medium":
      return "Recommended";

    default:
      return "Trusted Resource";

  }
}


/*
 * ============================================================
 * FORMAT VERIFICATION DATE
 * ============================================================
 */

function formatVerificationDate(
  value?: string
): string {

  if (
    !value
  ) {
    return "";
  }


  const parsed =
    new Date(
      `${value}T00:00:00`
    );


  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return value;
  }


  return parsed.toLocaleDateString(
    undefined,
    {
      month:
        "short",

      day:
        "numeric",

      year:
        "numeric",
    }
  );
}


/*
 * ============================================================
 * DETAIL LIST
 * ============================================================
 */

function ResourceDetailList({
  title,
  items,
}: {
  title:
    string;

  items?:
    string[];
}) {

  if (
    !items ||
    items.length ===
      0
  ) {
    return null;
  }


  return (
    <div
      style={{
        marginTop:
          "18px",
      }}
    >
      <h4
        style={{
          margin:
            "0 0 8px",

          color:
            "#0F172A",

          fontSize:
            "14px",

          fontWeight:
            800,
        }}
      >
        {title}
      </h4>


      <ul
        style={{
          margin:
            0,

          paddingLeft:
            "20px",

          color:
            "#475569",

          fontSize:
            "14px",

          lineHeight:
            1.65,
        }}
      >
        {
          items.map(
            (
              item,
              index
            ) => (
              <li
                key={
                  `${title}-${index}-${item}`
                }

                style={{
                  marginBottom:
                    "5px",
                }}
              >
                {item}
              </li>
            )
          )
        }
      </ul>
    </div>
  );
}


/*
 * ============================================================
 * RESOURCE CARD
 * ============================================================
 */

function PersonalizedResourceCard({
  recommendation,
}: {
  recommendation:
    PersonalizedResourceRecommendation;
}) {

  const [
    expanded,
    setExpanded,
  ] =
    useState(
      false
    );


  const {
    resource,
    whyRecommended,
    supportsCurrentJourney,
  } =
    recommendation;


  const safeUrl =
    isSafeExternalUrl(
      resource.url
    );


  const verificationDate =
    formatVerificationDate(
      resource.lastVerified
    );


  return (
    <article
      style={{
        display:
          "flex",

        flexDirection:
          "column",

        padding:
          "24px",

        borderRadius:
          "20px",

        border:
          "1px solid #E2E8F0",

        background:
          "#FFFFFF",

        boxShadow:
          "0 8px 24px rgba(15, 23, 42, 0.04)",
      }}
    >
      <div
        style={{
          display:
            "flex",

          flexWrap:
            "wrap",

          gap:
            "8px",

          alignItems:
            "center",

          marginBottom:
            "13px",
        }}
      >
        <span
          style={{
            display:
              "inline-flex",

            padding:
              "5px 9px",

            borderRadius:
              "999px",

            background:
              recommendation.matchLevel ===
                "high"

                ? "#ECFDF5"

                : recommendation.matchLevel ===
                    "medium"

                ? "#EFF6FF"

                : "#F8FAFC",

            color:
              recommendation.matchLevel ===
                "high"

                ? "#047857"

                : recommendation.matchLevel ===
                    "medium"

                ? "#2563EB"

                : "#475569",

            fontSize:
              "10px",

            fontWeight:
              800,

            letterSpacing:
              "0.04em",

            textTransform:
              "uppercase",
          }}
        >
          {
            getMatchLabel(
              recommendation
            )
          }
        </span>


        <span
          style={{
            display:
              "inline-flex",

            padding:
              "5px 9px",

            borderRadius:
              "999px",

            background:
              "#F8FAFC",

            color:
              "#64748B",

            fontSize:
              "10px",

            fontWeight:
              800,

            textTransform:
              "uppercase",
          }}
        >
          {
            formatResourceType(
              resource.type
            )
          }
        </span>


        {
          supportsCurrentJourney && (
            <span
              style={{
                display:
                  "inline-flex",

                padding:
                  "5px 9px",

                borderRadius:
                  "999px",

                background:
                  "#F5F3FF",

                color:
                  "#6D28D9",

                fontSize:
                  "10px",

                fontWeight:
                  800,

                textTransform:
                  "uppercase",
              }}
            >
              Supports Current Journey
            </span>
          )
        }
      </div>


      <h2
        style={{
          margin:
            0,

          color:
            "#0F172A",

          fontSize:
            "21px",

          lineHeight:
            1.3,
        }}
      >
        {resource.title}
      </h2>


      <p
        style={{
          margin:
            "10px 0 0",

          color:
            "#64748B",

          fontSize:
            "14px",

          lineHeight:
            1.65,
        }}
      >
        {resource.description}
      </p>


      <div
        style={{
          marginTop:
            "17px",

          padding:
            "14px",

          borderRadius:
            "12px",

          background:
            "#F8FAFC",

          border:
            "1px solid #E2E8F0",
        }}
      >
        <div
          style={{
            marginBottom:
              "5px",

            color:
              "#2563EB",

            fontSize:
              "11px",

            fontWeight:
              800,

            letterSpacing:
              "0.05em",

            textTransform:
              "uppercase",
          }}
        >
          Why we're recommending this
        </div>


        <div
          style={{
            color:
              "#475569",

            fontSize:
              "14px",

            lineHeight:
              1.6,
          }}
        >
          {whyRecommended}
        </div>
      </div>


      <div
        style={{
          marginTop:
            "14px",

          color:
            "#64748B",

          fontSize:
            "13px",

          lineHeight:
            1.55,
        }}
      >
        <strong
          style={{
            color:
              "#334155",
          }}
        >
          Why it may help:
        </strong>{" "}
        {resource.whyItMayHelp}
      </div>


      {
        resource.sourceName && (
          <div
            style={{
              marginTop:
                "14px",

              color:
                "#94A3B8",

              fontSize:
                "12px",

              lineHeight:
                1.5,
            }}
          >
            Source:{" "}
            {
              resource.sourceName
            }

            {
              verificationDate
                ? (
                    <>
                      {" "}
                      · Last verified{" "}
                      {
                        verificationDate
                      }
                    </>
                  )

                : null
            }
          </div>
        )
      }


      <div
        style={{
          display:
            "flex",

          flexWrap:
            "wrap",

          gap:
            "10px",

          marginTop:
            "20px",
        }}
      >
        {
          safeUrl && (
            <a
              href={
                resource.url
              }

              target="_blank"

              rel="noopener noreferrer"

              style={{
                display:
                  "inline-flex",

                alignItems:
                  "center",

                justifyContent:
                  "center",

                padding:
                  "10px 14px",

                borderRadius:
                  "10px",

                background:
                  "#2563EB",

                color:
                  "#FFFFFF",

                fontSize:
                  "13px",

                fontWeight:
                  800,

                textDecoration:
                  "none",
              }}
            >
              View Official Resource →
            </a>
          )
        }


        <button
          type="button"

          onClick={
            () =>
              setExpanded(
                (
                  current
                ) =>
                  !current
              )
          }

          style={{
            padding:
              "10px 14px",

            borderRadius:
              "10px",

            border:
              "1px solid #CBD5E1",

            background:
              "#FFFFFF",

            color:
              "#334155",

            fontSize:
              "13px",

            fontWeight:
              800,

            cursor:
              "pointer",
          }}
        >
          {
            expanded
              ? "Hide Details"
              : "View Details"
          }
        </button>


        <Link
          href={
            `/navigator?resourceId=${encodeURIComponent(
              resource.id
            )}`
          }

          style={{
            display:
              "inline-flex",

            alignItems:
              "center",

            justifyContent:
              "center",

            padding:
              "10px 14px",

            borderRadius:
              "10px",

            border:
              "1px solid #7C3AED",

            background:
              "#FFFFFF",

            color:
              "#6D28D9",

            fontSize:
              "13px",

            fontWeight:
              800,

            textDecoration:
              "none",
          }}
        >
          Ask Your Navigator About This
        </Link>
      </div>


      {
        expanded && (
          <div
            style={{
              marginTop:
                "20px",

              paddingTop:
                "4px",

              borderTop:
                "1px solid #E2E8F0",
            }}
          >
            <ResourceDetailList
              title="Eligibility considerations"

              items={
                resource.eligibility
              }
            />


            <ResourceDetailList
              title="What it may provide"

              items={
                resource.whatItMayCover
              }
            />


            <ResourceDetailList
              title="How to get started"

              items={
                resource.applicationSteps
              }
            />


            <ResourceDetailList
              title="Documents you may need"

              items={
                resource.documentsNeeded
              }
            />
          </div>
        )
      }
    </article>
  );
}


/*
 * ============================================================
 * LOADING STATE
 * ============================================================
 */

function LoadingState() {

  return (
    <div
      style={{
        padding:
          "56px 20px",

        textAlign:
          "center",

        color:
          "#64748B",
      }}
    >
      Personalizing resources for your family...
    </div>
  );
}


/*
 * ============================================================
 * GUEST STATE
 * ============================================================
 */

function GuestState() {

  return (
    <div
      style={{
        maxWidth:
          "680px",

        margin:
          "60px auto",

        padding:
          "32px",

        border:
          "1px solid #E2E8F0",

        borderRadius:
          "20px",

        background:
          "#FFFFFF",

        textAlign:
          "center",
      }}
    >
      <h1
        style={{
          margin:
            "0 0 12px",

          color:
            "#0F172A",

          fontSize:
            "28px",
        }}
      >
        Advanced Personalized Resources
      </h1>


      <p
        style={{
          margin:
            "0 auto 22px",

          maxWidth:
            "520px",

          color:
            "#64748B",

          lineHeight:
            1.65,
        }}
      >
        Sign in to access resources selected around your
        family's profile, priorities, and current Journey.
      </p>


      <Link
        href="/login"

        style={{
          display:
            "inline-block",

          padding:
            "11px 17px",

          borderRadius:
            "10px",

          background:
            "#2563EB",

          color:
            "#FFFFFF",

          fontWeight:
            800,

          textDecoration:
            "none",
        }}
      >
        Log In
      </Link>
    </div>
  );
}


/*
 * ============================================================
 * FREE / UPGRADE STATE
 * ============================================================
 */

function UpgradeState() {

  return (
    <div
      style={{
        maxWidth:
          "760px",

        margin:
          "60px auto",

        padding:
          "34px",

        border:
          "1px solid #DDD6FE",

        borderRadius:
          "22px",

        background:
          "#FAF8FF",

        textAlign:
          "center",
      }}
    >
      <div
        style={{
          display:
            "inline-flex",

          marginBottom:
            "12px",

          padding:
            "5px 10px",

          borderRadius:
            "999px",

          background:
            "#EDE9FE",

          color:
            "#6D28D9",

          fontSize:
            "11px",

          fontWeight:
            800,

          textTransform:
            "uppercase",
        }}
      >
        Premium
      </div>


      <h1
        style={{
          margin:
            "0 0 12px",

          color:
            "#0F172A",

          fontSize:
            "30px",
        }}
      >
        Advanced Personalized Resources
      </h1>


      <p
        style={{
          maxWidth:
            "600px",

          margin:
            "0 auto",

          color:
            "#64748B",

          lineHeight:
            1.7,
        }}
      >
        Go beyond a general resource directory. Premium
        identifies trusted resources that are most relevant
        to your family right now based on your child's
        profile, priorities, state, and current Journey.
      </p>


      <Link
        href="/pricing"

        style={{
          display:
            "inline-block",

          marginTop:
            "24px",

          padding:
            "11px 18px",

          borderRadius:
            "10px",

          background:
            "#7C3AED",

          color:
            "#FFFFFF",

          fontWeight:
            800,

          textDecoration:
            "none",
        }}
      >
        View Premium
      </Link>
    </div>
  );
}


/*
 * ============================================================
 * EMPTY STATE
 * ============================================================
 */

function EmptyState() {

  return (
    <div
      style={{
        maxWidth:
          "700px",

        margin:
          "50px auto",

        padding:
          "30px",

        border:
          "1px solid #E2E8F0",

        borderRadius:
          "20px",

        background:
          "#FFFFFF",

        textAlign:
          "center",
      }}
    >
      <h2
        style={{
          margin:
            "0 0 10px",

          color:
            "#0F172A",
        }}
      >
        Start your family Journey first
      </h2>


      <p
        style={{
          margin:
            "0 auto 20px",

          color:
            "#64748B",

          lineHeight:
            1.65,
        }}
      >
        We use your saved family information to determine
        which trusted resources may be most relevant to you.
      </p>


      <Link
        href="/journey"

        style={{
          display:
            "inline-block",

          padding:
            "10px 16px",

          borderRadius:
            "10px",

          background:
            "#2563EB",

          color:
            "#FFFFFF",

          fontWeight:
            800,

          textDecoration:
            "none",
        }}
      >
        Go to My Journey
      </Link>
    </div>
  );
}


/*
 * ============================================================
 * ERROR STATE
 * ============================================================
 */

function ErrorState() {

  return (
    <div
      style={{
        maxWidth:
          "680px",

        margin:
          "50px auto",

        padding:
          "28px",

        border:
          "1px solid #FECACA",

        borderRadius:
          "18px",

        background:
          "#FFF7F7",

        color:
          "#991B1B",

        textAlign:
          "center",

        lineHeight:
          1.6,
      }}
    >
      We couldn't load your personalized resources right now.
      Please try again.
    </div>
  );
}


/*
 * ============================================================
 * PAGE
 * ============================================================
 */

export default function AdvancedPersonalizedResourcesPage() {

  const {
    plan,
  } =
    useAccountEntitlements();


  const [
    status,
    setStatus,
  ] =
    useState<PageStatus>(
      "loading"
    );


  const [
    children,
    setChildren,
  ] =
    useState<SavedChild[]>(
      []
    );


  const [
    selectedChildId,
    setSelectedChildId,
  ] =
    useState(
      ""
    );


  const [
    currentJourney,
    setCurrentJourney,
  ] =
    useState<SavedJourney | null>(
      null
    );


  const [
    loadingChild,
    setLoadingChild,
  ] =
    useState(
      false
    );


  /*
   * ==========================================================
   * PREMIUM ACCESS
   * ==========================================================
   */

  const hasPremiumAccess =
  plan ===
    "premium" ||
  plan ===
    "premium_plus";


  /*
   * ==========================================================
   * LOAD ACCOUNT + CHILDREN
   * ==========================================================
   */

  useEffect(
    () => {

      let cancelled =
        false;


      async function loadPage() {

        setStatus(
          "loading"
        );


        try {

          const user =
            await getCurrentUser();


          if (
            cancelled
          ) {
            return;
          }


          if (
            !user
          ) {

            setStatus(
              "guest"
            );

            return;

          }


          /*
           * Wait for account entitlement hook to resolve away
           * from its initial state before deciding access.
           *
           * Authenticated accounts without paid/tester access
           * resolve to free.
           */

          if (
            !hasPremiumAccess
          ) {

            setStatus(
              "free"
            );

            return;

          }


          const savedChildren =
            await getSavedChildren(
              user.uid
            );


          if (
            cancelled
          ) {
            return;
          }


          setChildren(
            savedChildren
          );


          if (
            savedChildren.length ===
              0
          ) {

            setSelectedChildId(
              ""
            );

            setCurrentJourney(
              null
            );

            setStatus(
              "empty"
            );

            return;

          }


          /*
           * Use the most recently updated child first.
           *
           * getSavedChildren() already returns children ordered
           * by updatedAt descending.
           */

          const initialChild =
            savedChildren[0];


          setSelectedChildId(
            initialChild.childId
          );


          const journey =
            await getCurrentJourney(
              user.uid,
              initialChild.childId
            );


          if (
            cancelled
          ) {
            return;
          }


          setCurrentJourney(
            journey
          );


          setStatus(
            "ready"
          );

        } catch (
          error
        ) {

          console.error(
            "Advanced resources load error:",
            error
          );


          if (
            !cancelled
          ) {
            setStatus(
              "error"
            );
          }

        }

      }


      loadPage();


      return () => {

        cancelled =
          true;

      };

    },
    [
      hasPremiumAccess,
    ]
  );


  /*
   * ==========================================================
   * SELECTED CHILD
   * ==========================================================
   */

  const selectedChild =
    useMemo(
      () =>
        children.find(
          (
            child
          ) =>
            child.childId ===
              selectedChildId
        ) ||
        null,

      [
        children,
        selectedChildId,
      ]
    );


  /*
   * ==========================================================
   * LOAD DIFFERENT CHILD
   * ==========================================================
   */

  async function handleChildChange(
    childId:
      string
  ) {

    setSelectedChildId(
      childId
    );


    const user =
      await getCurrentUser();


    if (
      !user
    ) {

      setStatus(
        "guest"
      );

      return;

    }


    setLoadingChild(
      true
    );


    try {

      const journey =
        await getCurrentJourney(
          user.uid,
          childId
        );


      setCurrentJourney(
        journey
      );

    } catch (
      error
    ) {

      console.error(
        "Advanced resources child load error:",
        error
      );


      setStatus(
        "error"
      );

    } finally {

      setLoadingChild(
        false
      );

    }

  }


  /*
   * ==========================================================
   * PERSONALIZED RECOMMENDATIONS
   * ==========================================================
   */

  const recommendationResult =
    useMemo(
      () => {

        if (
          !selectedChild
        ) {
          return null;
        }


        return getPersonalizedResourceRecommendations(
          selectedChild.familyProfile,
          currentJourney
            ?.journey ||
            null
        );

      },
      [
        selectedChild,
        currentJourney,
      ]
    );


  /*
   * ==========================================================
   * PAGE STATES
   * ==========================================================
   */

  if (
    status ===
      "loading"
  ) {
    return (
      <LoadingState />
    );
  }


  if (
    status ===
      "guest"
  ) {
    return (
      <GuestState />
    );
  }


  if (
    status ===
      "free"
  ) {
    return (
      <UpgradeState />
    );
  }


  if (
    status ===
      "empty"
  ) {
    return (
      <EmptyState />
    );
  }


  if (
    status ===
      "error"
  ) {
    return (
      <ErrorState />
    );
  }


  /*
   * ==========================================================
   * MAIN PREMIUM EXPERIENCE
   * ==========================================================
   */

  return (
    <main
      style={{
        minHeight:
          "100vh",

        background:
          "#F8FAFC",

        padding:
          "42px 20px 72px",
      }}
    >
      <div
        style={{
          width:
            "100%",

          maxWidth:
            "1180px",

          margin:
            "0 auto",
        }}
      >
        {/*
         * ------------------------------------------------------
         * HEADER
         * ------------------------------------------------------
         */}

        <section
          style={{
            padding:
              "30px",

            borderRadius:
              "24px",

            border:
              "1px solid #E2E8F0",

            background:
              "#FFFFFF",
          }}
        >
          <div
            style={{
              display:
                "inline-flex",

              padding:
                "5px 10px",

              borderRadius:
                "999px",

              background:
                "#EDE9FE",

              color:
                "#6D28D9",

              fontSize:
                "11px",

              fontWeight:
                800,

              letterSpacing:
                "0.06em",

              textTransform:
                "uppercase",
            }}
          >
            Premium
          </div>


          <h1
            style={{
              margin:
                "12px 0 8px",

              color:
                "#0F172A",

              fontSize:
                "clamp(30px, 5vw, 42px)",

              lineHeight:
                1.15,
            }}
          >
            Advanced Personalized Resources
          </h1>


          <p
            style={{
              maxWidth:
                "760px",

              margin:
                0,

              color:
                "#64748B",

              fontSize:
                "16px",

              lineHeight:
                1.7,
            }}
          >
            Trusted resources prioritized around your
            family's profile, current priorities, state,
            and Journey — so you can focus on what may
            matter most right now.
          </p>


          {/*
           * ----------------------------------------------------
           * CHILD SELECTOR
           * ----------------------------------------------------
           */}

          {
            children.length >
              0 && (
              <div
                style={{
                  display:
                    "flex",

                  flexWrap:
                    "wrap",

                  alignItems:
                    "center",

                  gap:
                    "10px",

                  marginTop:
                    "24px",
                }}
              >
                <label
                  htmlFor="advanced-resource-child"

                  style={{
                    color:
                      "#334155",

                    fontSize:
                      "14px",

                    fontWeight:
                      800,
                  }}
                >
                  Resources for
                </label>


                <select
                  id="advanced-resource-child"

                  value={
                    selectedChildId
                  }

                  disabled={
                    loadingChild
                  }

                  onChange={
                    (
                      event
                    ) =>
                      handleChildChange(
                        event.target.value
                      )
                  }

                  style={{
                    minWidth:
                      "190px",

                    padding:
                      "10px 12px",

                    border:
                      "1px solid #CBD5E1",

                    borderRadius:
                      "10px",

                    background:
                      "#FFFFFF",

                    color:
                      "#0F172A",

                    fontSize:
                      "14px",

                    fontWeight:
                      700,
                  }}
                >
                  {
                    children.map(
                      (
                        child
                      ) => (
                        <option
                          key={
                            child.childId
                          }

                          value={
                            child.childId
                          }
                        >
                          {
                            child
                              .familyProfile
                              .childName ||
                            "Child"
                          }
                        </option>
                      )
                    )
                  }
                </select>


                {
                  loadingChild && (
                    <span
                      style={{
                        color:
                          "#64748B",

                        fontSize:
                          "13px",
                      }}
                    >
                      Updating recommendations...
                    </span>
                  )
                }
              </div>
            )
          }
        </section>


        {/*
         * ------------------------------------------------------
         * FAMILY CONTEXT
         * ------------------------------------------------------
         */}

        {
          selectedChild && (
            <section
              style={{
                display:
                  "grid",

                gridTemplateColumns:
                  "repeat(auto-fit, minmax(180px, 1fr))",

                gap:
                  "12px",

                marginTop:
                  "18px",
              }}
            >
              <div
                style={{
                  padding:
                    "16px",

                  border:
                    "1px solid #E2E8F0",

                  borderRadius:
                    "14px",

                  background:
                    "#FFFFFF",
                }}
              >
                <div
                  style={{
                    color:
                      "#94A3B8",

                    fontSize:
                      "10px",

                    fontWeight:
                      800,

                    textTransform:
                      "uppercase",
                  }}
                >
                  Current Journey
                </div>


                <div
                  style={{
                    marginTop:
                      "5px",

                    color:
                      "#0F172A",

                    fontSize:
                      "14px",

                    fontWeight:
                      700,

                    lineHeight:
                      1.45,
                  }}
                >
                  {
                    currentJourney
                      ?.journey
                      ?.currentFocus
                      ?.title ||
                    "No active Journey focus"
                  }
                  
                </div>
              </div>


              <div
                style={{
                  padding:
                    "16px",

                  border:
                    "1px solid #E2E8F0",

                  borderRadius:
                    "14px",

                  background:
                    "#FFFFFF",
                }}
              >
                <div
                  style={{
                    color:
                      "#94A3B8",

                    fontSize:
                      "10px",

                    fontWeight:
                      800,

                    textTransform:
                      "uppercase",
                  }}
                >
                  Family Priority
                </div>


                <div
                  style={{
                    marginTop:
                      "5px",

                    color:
                      "#0F172A",

                    fontSize:
                      "14px",

                    fontWeight:
                      700,
                  }}
                >
                  {
                    selectedChild
                      .familyProfile
                      .priority ||
                    "Not specified"
                  }
                </div>
              </div>


              <div
                style={{
                  padding:
                    "16px",

                  border:
                    "1px solid #E2E8F0",

                  borderRadius:
                    "14px",

                  background:
                    "#FFFFFF",
                }}
              >
                <div
                  style={{
                    color:
                      "#94A3B8",

                    fontSize:
                      "10px",

                    fontWeight:
                      800,

                    textTransform:
                      "uppercase",
                  }}
                >
                  State
                </div>


                <div
                  style={{
                    marginTop:
                      "5px",

                    color:
                      "#0F172A",

                    fontSize:
                      "14px",

                    fontWeight:
                      700,
                  }}
                >
                  {
                    selectedChild
                      .familyProfile
                      .state ||
                    "Not specified"
                  }
                </div>
              </div>


              <div
                style={{
                  padding:
                    "16px",

                  border:
                    "1px solid #E2E8F0",

                  borderRadius:
                    "14px",

                  background:
                    "#FFFFFF",
                }}
              >
                <div
                  style={{
                    color:
                      "#94A3B8",

                    fontSize:
                      "10px",

                    fontWeight:
                      800,

                    textTransform:
                      "uppercase",
                  }}
                >
                  Journey Stage
                </div>


                <div
                  style={{
                    marginTop:
                      "5px",

                    color:
                      "#0F172A",

                    fontSize:
                      "14px",

                    fontWeight:
                      700,
                  }}
                >
                  {
                    selectedChild
                      .familyProfile
                      .journeyStage ||
                    "Not specified"
                  }
                </div>
              </div>
            </section>
          )
        }


        {/*
         * ------------------------------------------------------
         * RECOMMENDATIONS HEADER
         * ------------------------------------------------------
         */}

        <section
          style={{
            marginTop:
              "38px",
          }}
        >
          <div
            style={{
              color:
                "#2563EB",

              fontSize:
                "12px",

              fontWeight:
                800,

              letterSpacing:
                "0.08em",

              textTransform:
                "uppercase",

              marginBottom:
                "7px",
            }}
          >
            Recommended for Your Family
          </div>


          <h2
            style={{
              margin:
                0,

              color:
                "#0F172A",

              fontSize:
                "30px",

              lineHeight:
                1.2,
            }}
          >
            Resources that may matter most right now
          </h2>


          <p
            style={{
              maxWidth:
                "720px",

              margin:
                "8px 0 0",

              color:
                "#64748B",

              fontSize:
                "15px",

              lineHeight:
                1.65,
            }}
          >
            Recommendations are selected from Myriad's
            trusted resource library and prioritized using
            your saved family information and current Journey.
          </p>
        </section>


        {/*
         * ------------------------------------------------------
         * RESOURCE CARDS
         * ------------------------------------------------------
         */}

        {
          recommendationResult &&
          recommendationResult
            .recommendations
            .length >
            0

            ? (
                <section
                  style={{
                    display:
                      "grid",

                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(min(100%, 340px), 1fr))",

                    gap:
                      "18px",

                    marginTop:
                      "22px",
                  }}
                >
                  {
                    recommendationResult
                      .recommendations
                      .map(
                        (
                          recommendation
                        ) => (
                          <PersonalizedResourceCard
                            key={
                              recommendation
                                .resource
                                .id
                            }

                            recommendation={
                              recommendation
                            }
                          />
                        )
                      )
                  }
                </section>
              )

            : (
                <div
                  style={{
                    marginTop:
                      "22px",

                    padding:
                      "26px",

                    border:
                      "1px solid #E2E8F0",

                    borderRadius:
                      "16px",

                    background:
                      "#FFFFFF",

                    color:
                      "#64748B",

                    lineHeight:
                      1.6,
                  }}
                >
                  We don't have a personalized resource
                  recommendation for this profile yet. Your
                  Journey remains available while we continue
                  expanding the trusted resource library.
                </div>
              )
        }


        {/*
         * ------------------------------------------------------
         * TRUST / SAFETY NOTE
         * ------------------------------------------------------
         */}

        <section
          style={{
            marginTop:
              "28px",

            padding:
              "18px",

            border:
              "1px solid #E2E8F0",

            borderRadius:
              "14px",

            background:
              "#FFFFFF",

            color:
              "#64748B",

            fontSize:
              "13px",

            lineHeight:
              1.65,
          }}
        >
          <strong
            style={{
              color:
                "#334155",
            }}
          >
            About these recommendations:
          </strong>{" "}
          Myriad prioritizes resources from its trusted
          resource library based on information in your
          family profile and Journey. A recommendation does
          not guarantee eligibility, coverage, availability,
          or approval. Always confirm current requirements
          with the organization or program directly.
        </section>
      </div>
    </main>
  );
}