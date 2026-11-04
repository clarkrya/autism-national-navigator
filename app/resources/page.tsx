
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { getCurrentUser } from "../../lib/auth";
import { useAccountEntitlements } from "../../lib/useAccountEntitlements";
import {
  getCurrentJourney,
  getSavedChildren,
} from "../../lib/journeyRepository";
import type {
  SavedChild,
  SavedJourney,
} from "../../lib/journeyRepository";

import { getPersonalizedResourceRecommendations } from "../../lib/resources/resourceRecommendationEngine";
import type { PersonalizedResourceRecommendation } from "../../lib/resources/resourceRecommendationEngine";
import type { TrustedResource } from "../../data/resources/federal";

/* ============================================================
   AUTIVOYA BRAND
============================================================ */

const BRAND = {
  navy: "#204D6A",
  darkNavy: "#173B52",
  teal: "#58AAA7",
  darkTeal: "#277F7B",
  gold: "#F7AD3F",
  paleTeal: "#EAF7F5",
  paleGold: "#FFF6E5",
  background: "#F7FAFC",
  white: "#FFFFFF",
  border: "#DFE8ED",
  text: "#173B52",
  muted: "#64748B",
  subtle: "#94A3B8",
};

type PageStatus =
  | "loading"
  | "guest"
  | "free"
  | "ready"
  | "empty"
  | "error";

/* ============================================================
   HELPERS
============================================================ */

function isSafeExternalUrl(value?: string): boolean {
  if (!value) return false;

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function formatResourceType(type: TrustedResource["type"]): string {
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
      return "School & Education";
    case "financial":
      return "Financial Support";
    case "support":
      return "Family Support";
    default:
      return "Resource";
  }
}

function getMatchLabel(
  recommendation: PersonalizedResourceRecommendation
): string {
  switch (recommendation.matchLevel) {
    case "high":
      return "High Match";
    case "medium":
      return "Recommended";
    default:
      return "Trusted Resource";
  }
}

function formatVerificationDate(value?: string): string {
  if (!value) return "";

  const parsed = new Date(`${value}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/* ============================================================
   REUSABLE STYLES
============================================================ */

const primaryButton: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "11px 16px",
  borderRadius: "10px",
  border: "1px solid " + BRAND.navy,
  background: BRAND.navy,
  color: BRAND.white,
  fontSize: "13px",
  fontWeight: 800,
  textDecoration: "none",
  cursor: "pointer",
};

const goldButton: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "11px 16px",
  borderRadius: "10px",
  border: "1px solid " + BRAND.gold,
  background: BRAND.gold,
  color: BRAND.darkNavy,
  fontSize: "13px",
  fontWeight: 800,
  textDecoration: "none",
  cursor: "pointer",
};

const secondaryButton: React.CSSProperties = {
  padding: "11px 16px",
  borderRadius: "10px",
  border: "1px solid " + BRAND.border,
  background: BRAND.white,
  color: BRAND.darkNavy,
  fontSize: "13px",
  fontWeight: 800,
  cursor: "pointer",
};

const panelStyle: React.CSSProperties = {
  padding: "24px",
  borderRadius: "20px",
  border: "1px solid " + BRAND.border,
  background: BRAND.white,
  boxShadow: "0 8px 24px rgba(23, 59, 82, 0.04)",
};

const premiumBadge: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "6px 12px",
  borderRadius: "999px",
  background: BRAND.paleTeal,
  color: BRAND.darkTeal,
  fontSize: "11px",
  fontWeight: 800,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
};

/* ============================================================
   RESOURCE DETAIL LIST
============================================================ */

function ResourceDetailList({
  title,
  items,
}: {
  title: string;
  items?: string[];
}) {
  if (!items || items.length === 0) return null;

  return (
    <div style={{ marginTop: "18px" }}>
      <h4
        style={{
          margin: "0 0 8px",
          color: BRAND.darkNavy,
          fontSize: "14px",
          fontWeight: 800,
        }}
      >
        {title}
      </h4>

      <ul
        style={{
          margin: 0,
          paddingLeft: "20px",
          color: BRAND.muted,
          fontSize: "14px",
          lineHeight: 1.65,
        }}
      >
        {items.map((item, index) => (
          <li
            key={`${title}-${index}-${item}`}
            style={{ marginBottom: "5px" }}
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ============================================================
   PERSONALIZED RESOURCE CARD
============================================================ */

function PersonalizedResourceCard({
  recommendation,
}: {
  recommendation: PersonalizedResourceRecommendation;
}) {
  const [expanded, setExpanded] = useState(false);

  const {
    resource,
    whyRecommended,
    supportsCurrentJourney,
  } = recommendation;

  const safeUrl = isSafeExternalUrl(resource.url);
  const verificationDate = formatVerificationDate(
    resource.lastVerified
  );

  const matchBackground =
    recommendation.matchLevel === "high"
      ? BRAND.paleTeal
      : recommendation.matchLevel === "medium"
      ? "#EDF4F8"
      : BRAND.background;

  const matchColor =
    recommendation.matchLevel === "high"
      ? BRAND.darkTeal
      : recommendation.matchLevel === "medium"
      ? BRAND.navy
      : BRAND.muted;

  return (
    <article
      style={{
        ...panelStyle,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* RESOURCE BADGES */}

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "8px",
          alignItems: "center",
          marginBottom: "13px",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            padding: "5px 9px",
            borderRadius: "999px",
            background: matchBackground,
            color: matchColor,
            fontSize: "10px",
            fontWeight: 800,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          {getMatchLabel(recommendation)}
        </span>

        <span
          style={{
            display: "inline-flex",
            padding: "5px 9px",
            borderRadius: "999px",
            background: BRAND.background,
            color: BRAND.muted,
            fontSize: "10px",
            fontWeight: 800,
            textTransform: "uppercase",
          }}
        >
          {formatResourceType(resource.type)}
        </span>

        {supportsCurrentJourney && (
          <span
            style={{
              display: "inline-flex",
              padding: "5px 9px",
              borderRadius: "999px",
              background: BRAND.paleGold,
              color: BRAND.darkNavy,
              fontSize: "10px",
              fontWeight: 800,
              textTransform: "uppercase",
            }}
          >
            Supports Current Journey
          </span>
        )}
      </div>

      {/* RESOURCE TITLE */}

      <h2
        style={{
          margin: 0,
          color: BRAND.darkNavy,
          fontSize: "21px",
          lineHeight: 1.3,
        }}
      >
        {resource.title}
      </h2>

      <p
        style={{
          margin: "10px 0 0",
          color: BRAND.muted,
          fontSize: "14px",
          lineHeight: 1.65,
        }}
      >
        {resource.description}
      </p>

      {/* WHY RECOMMENDED */}

      <div
        style={{
          marginTop: "17px",
          padding: "14px",
          borderRadius: "12px",
          background: BRAND.background,
          border: "1px solid " + BRAND.border,
        }}
      >
        <div
          style={{
            marginBottom: "5px",
            color: BRAND.darkTeal,
            fontSize: "11px",
            fontWeight: 800,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
          }}
        >
          Why We're Recommending This
        </div>

        <div
          style={{
            color: BRAND.muted,
            fontSize: "14px",
            lineHeight: 1.6,
          }}
        >
          {whyRecommended}
        </div>
      </div>

      {/* WHY IT MAY HELP */}

      <div
        style={{
          marginTop: "14px",
          color: BRAND.muted,
          fontSize: "13px",
          lineHeight: 1.55,
        }}
      >
        <strong style={{ color: BRAND.darkNavy }}>
          Why it may help:
        </strong>{" "}
        {resource.whyItMayHelp}
      </div>

      {/* RESOURCE SOURCE */}

      {resource.sourceName && (
        <div
          style={{
            marginTop: "14px",
            color: BRAND.subtle,
            fontSize: "12px",
            lineHeight: 1.5,
          }}
        >
          Source: {resource.sourceName}
          {verificationDate
            ? ` · Last verified ${verificationDate}`
            : ""}
        </div>
      )}

      {/* RESOURCE ACTIONS */}

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "10px",
          marginTop: "20px",
        }}
      >
        {safeUrl && (
          <a
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            style={primaryButton}
          >
            View Official Resource →
          </a>
        )}

        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          style={secondaryButton}
        >
          {expanded ? "Hide Details" : "View Details"}
        </button>

        <Link
          href={`/navigator?resourceId=${encodeURIComponent(
            resource.id
          )}`}
          style={goldButton}
        >
          Ask Your Autivoya Navigator About This
        </Link>
      </div>

      {/* EXPANDED RESOURCE DETAILS */}

      {expanded && (
        <div
          style={{
            marginTop: "20px",
            paddingTop: "4px",
            borderTop: "1px solid " + BRAND.border,
          }}
        >
          <ResourceDetailList
            title="Eligibility considerations"
            items={resource.eligibility}
          />

          <ResourceDetailList
            title="What it may provide"
            items={resource.whatItMayCover}
          />

          <ResourceDetailList
            title="How to get started"
            items={resource.applicationSteps}
          />

          <ResourceDetailList
            title="Documents you may need"
            items={resource.documentsNeeded}
          />
        </div>
      )}
    </article>
  );
}

/* ============================================================
   PAGE STATES
============================================================ */

function LoadingState() {
  return (
    <div
      style={{
        padding: "56px 20px",
        textAlign: "center",
        color: BRAND.muted,
      }}
    >
      Personalizing Autivoya resources for your family...
    </div>
  );
}

function GuestState() {
  return (
    <div
      style={{
        ...panelStyle,
        maxWidth: "680px",
        margin: "60px auto",
        padding: "32px",
        textAlign: "center",
      }}
    >
      <h1
        style={{
          margin: "0 0 12px",
          color: BRAND.darkNavy,
          fontSize: "28px",
        }}
      >
        Advanced Personalized Resources
      </h1>

      <p
        style={{
          margin: "0 auto 22px",
          maxWidth: "520px",
          color: BRAND.muted,
          lineHeight: 1.65,
        }}
      >
        Sign in to access Autivoya resources selected around
        your family's profile, priorities, and current Journey.
      </p>

      <Link href="/login" style={primaryButton}>
        Log In
      </Link>
    </div>
  );
}

function UpgradeState() {
  return (
    <div
      style={{
        ...panelStyle,
        maxWidth: "760px",
        margin: "60px auto",
        padding: "34px",
        border: "1px solid " + BRAND.teal,
        background: BRAND.paleTeal,
        textAlign: "center",
      }}
    >
      <div style={premiumBadge}>Autivoya Premium</div>

      <h1
        style={{
          margin: "12px 0",
          color: BRAND.darkNavy,
          fontSize: "30px",
        }}
      >
        Advanced Personalized Resources
      </h1>

      <p
        style={{
          maxWidth: "600px",
          margin: "0 auto",
          color: BRAND.muted,
          lineHeight: 1.7,
        }}
      >
        Go beyond a general resource directory. Autivoya
        Premium identifies trusted resources that are most
        relevant to your family right now based on your child's
        profile, priorities, state, and current Journey.
      </p>

      <Link
        href="/pricing"
        style={{
          ...goldButton,
          marginTop: "24px",
        }}
      >
        View Premium
      </Link>
    </div>
  );
}

function EmptyState() {
  return (
    <div
      style={{
        ...panelStyle,
        maxWidth: "700px",
        margin: "50px auto",
        padding: "30px",
        textAlign: "center",
      }}
    >
      <h2
        style={{
          margin: "0 0 10px",
          color: BRAND.darkNavy,
        }}
      >
        Start Your Family Journey First
      </h2>

      <p
        style={{
          margin: "0 auto 20px",
          color: BRAND.muted,
          lineHeight: 1.65,
        }}
      >
        Autivoya uses your saved family information to
        determine which trusted resources may be most
        relevant to you.
      </p>

      <Link href="/journey" style={primaryButton}>
        Go to My Journey
      </Link>
    </div>
  );
}

function ErrorState() {
  return (
    <div
      style={{
        maxWidth: "680px",
        margin: "50px auto",
        padding: "28px",
        border: "1px solid #FECACA",
        borderRadius: "18px",
        background: "#FFF7F7",
        color: "#991B1B",
        textAlign: "center",
        lineHeight: 1.6,
      }}
    >
      We couldn't load your personalized resources right now.
      Please try again.
    </div>
  );
}

/* ============================================================
   MAIN PAGE
============================================================ */

export default function AdvancedPersonalizedResourcesPage() {
  const { plan } = useAccountEntitlements();

  const [status, setStatus] =
    useState<PageStatus>("loading");

  const [children, setChildren] =
    useState<SavedChild[]>([]);

  const [selectedChildId, setSelectedChildId] =
    useState("");

  const [currentJourney, setCurrentJourney] =
    useState<SavedJourney | null>(null);

  const [loadingChild, setLoadingChild] =
    useState(false);

  /* PREMIUM ACCESS */

  const hasPremiumAccess =
    plan === "premium" ||
    plan === "premium_plus";

  /* LOAD ACCOUNT AND SAVED CHILDREN */

  useEffect(() => {
    let cancelled = false;

    async function loadPage() {
      setStatus("loading");

      try {
        const user = await getCurrentUser();

        if (cancelled) return;

        if (!user) {
          setStatus("guest");
          return;
        }

        if (!hasPremiumAccess) {
          setStatus("free");
          return;
        }

        const savedChildren =
          await getSavedChildren(user.uid);

        if (cancelled) return;

        setChildren(savedChildren);

        if (savedChildren.length === 0) {
          setSelectedChildId("");
          setCurrentJourney(null);
          setStatus("empty");
          return;
        }

        const initialChild = savedChildren[0];

        setSelectedChildId(initialChild.childId);

        const journey = await getCurrentJourney(
          user.uid,
          initialChild.childId
        );

        if (cancelled) return;

        setCurrentJourney(journey);
        setStatus("ready");
      } catch (error) {
        console.error(
          "Advanced resources load error:",
          error
        );

        if (!cancelled) {
          setStatus("error");
        }
      }
    }

    loadPage();

    return () => {
      cancelled = true;
    };
  }, [hasPremiumAccess]);

  /* SELECTED CHILD */

  const selectedChild = useMemo(
    () =>
      children.find(
        (child) => child.childId === selectedChildId
      ) || null,
    [children, selectedChildId]
  );

  /* CHANGE CHILD */

  async function handleChildChange(childId: string) {
    setSelectedChildId(childId);

    const user = await getCurrentUser();

    if (!user) {
      setStatus("guest");
      return;
    }

    setLoadingChild(true);

    try {
      const journey = await getCurrentJourney(
        user.uid,
        childId
      );

      setCurrentJourney(journey);
    } catch (error) {
      console.error(
        "Advanced resources child load error:",
        error
      );

      setStatus("error");
    } finally {
      setLoadingChild(false);
    }
  }

  /* RESOURCE RECOMMENDATIONS */

  const recommendationResult = useMemo(() => {
    if (!selectedChild) return null;

    return getPersonalizedResourceRecommendations(
      selectedChild.familyProfile,
      currentJourney?.journey || null
    );
  }, [selectedChild, currentJourney]);

  /* PAGE STATES */

  if (status === "loading") return <LoadingState />;
  if (status === "guest") return <GuestState />;
  if (status === "free") return <UpgradeState />;
  if (status === "empty") return <EmptyState />;
  if (status === "error") return <ErrorState />;

  /* MAIN PREMIUM EXPERIENCE */

  return (
    <main
      style={{
        minHeight: "100vh",
        background: BRAND.background,
        padding: "42px 20px 72px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "1180px",
          margin: "0 auto",
        }}
      >
        {/* PAGE HEADER */}

        <section
          style={{
            ...panelStyle,
            padding: "30px",
            borderRadius: "24px",
          }}
        >
          <div style={premiumBadge}>
            Autivoya Premium
          </div>

          <h1
            style={{
              margin: "12px 0 8px",
              color: BRAND.darkNavy,
              fontSize: "clamp(30px, 5vw, 42px)",
              lineHeight: 1.15,
            }}
          >
            Advanced Personalized Resources
          </h1>

          <p
            style={{
              maxWidth: "760px",
              margin: 0,
              color: BRAND.muted,
              fontSize: "16px",
              lineHeight: 1.7,
            }}
          >
            Trusted resources prioritized around your
            family's profile, current priorities, state,
            and Journey — so you can focus on what may
            matter most right now.
          </p>

          {/* CHILD SELECTOR */}

          {children.length > 0 && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: "10px",
                marginTop: "24px",
              }}
            >
              <label
                htmlFor="advanced-resource-child"
                style={{
                  color: BRAND.darkNavy,
                  fontSize: "14px",
                  fontWeight: 800,
                }}
              >
                Resources for
              </label>

              <select
                id="advanced-resource-child"
                value={selectedChildId}
                disabled={loadingChild}
                onChange={(event) =>
                  handleChildChange(event.target.value)
                }
                style={{
                  minWidth: "190px",
                  padding: "10px 12px",
                  border: "1px solid " + BRAND.border,
                  borderRadius: "10px",
                  background: BRAND.white,
                  color: BRAND.darkNavy,
                  fontSize: "14px",
                  fontWeight: 700,
                }}
              >
                {children.map((child) => (
                  <option
                    key={child.childId}
                    value={child.childId}
                  >
                    {child.familyProfile.childName || "Child"}
                  </option>
                ))}
              </select>

              {loadingChild && (
                <span
                  style={{
                    color: BRAND.muted,
                    fontSize: "13px",
                  }}
                >
                  Updating recommendations...
                </span>
              )}
            </div>
          )}
        </section>

        {/* FAMILY CONTEXT */}

        {selectedChild && (
          <section
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "12px",
              marginTop: "18px",
            }}
          >
            {[
              {
                label: "Current Journey",
                value:
                  currentJourney?.journey?.currentFocus
                    ?.title || "No active Journey focus",
              },
              {
                label: "Family Priority",
                value:
                  selectedChild.familyProfile.priority ||
                  "Not specified",
              },
              {
                label: "State",
                value:
                  selectedChild.familyProfile.state ||
                  "Not specified",
              },
              {
                label: "Journey Stage",
                value:
                  selectedChild.familyProfile.journeyStage ||
                  "Not specified",
              },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  padding: "16px",
                  border: "1px solid " + BRAND.border,
                  borderRadius: "14px",
                  background: BRAND.white,
                }}
              >
                <div
                  style={{
                    color: BRAND.darkTeal,
                    fontSize: "10px",
                    fontWeight: 800,
                    textTransform: "uppercase",
                  }}
                >
                  {item.label}
                </div>

                <div
                  style={{
                    marginTop: "5px",
                    color: BRAND.darkNavy,
                    fontSize: "14px",
                    fontWeight: 700,
                    lineHeight: 1.45,
                  }}
                >
                  {item.value}
                </div>
              </div>
            ))}
          </section>
        )}

        {/* RECOMMENDATIONS HEADER */}

        <section style={{ marginTop: "38px" }}>
          <div
            style={{
              color: BRAND.darkTeal,
              fontSize: "12px",
              fontWeight: 800,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: "7px",
            }}
          >
            Recommended for Your Family
          </div>

          <h2
            style={{
              margin: 0,
              color: BRAND.darkNavy,
              fontSize: "30px",
              lineHeight: 1.2,
            }}
          >
            Resources that may matter most right now
          </h2>

          <p
            style={{
              maxWidth: "720px",
              margin: "8px 0 0",
              color: BRAND.muted,
              fontSize: "15px",
              lineHeight: 1.65,
            }}
          >
            Recommendations are selected from Autivoya's
            trusted resource library and prioritized using
            your saved family information and current Journey.
          </p>
        </section>

        {/* RESOURCE CARDS */}

        {recommendationResult &&
        recommendationResult.recommendations.length > 0 ? (
          <section
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(min(100%, 340px), 1fr))",
              gap: "18px",
              marginTop: "22px",
            }}
          >
            {recommendationResult.recommendations.map(
              (recommendation) => (
                <PersonalizedResourceCard
                  key={recommendation.resource.id}
                  recommendation={recommendation}
                />
              )
            )}
          </section>
        ) : (
          <div
            style={{
              marginTop: "22px",
              padding: "26px",
              border: "1px solid " + BRAND.border,
              borderRadius: "16px",
              background: BRAND.white,
              color: BRAND.muted,
              lineHeight: 1.6,
            }}
          >
            We don't have a personalized resource
            recommendation for this profile yet. Your
            Journey remains available while we continue
            expanding the trusted resource library.
          </div>
        )}

        {/* TRUST AND SAFETY NOTE */}

        <section
          style={{
            marginTop: "28px",
            padding: "18px",
            border: "1px solid " + BRAND.border,
            borderRadius: "14px",
            background: BRAND.white,
            color: BRAND.muted,
            fontSize: "13px",
            lineHeight: 1.65,
          }}
        >
          <strong style={{ color: BRAND.darkNavy }}>
            About these recommendations:
          </strong>{" "}
          Autivoya prioritizes resources from its trusted
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
