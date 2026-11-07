
"use client";

import { useState } from "react";
import Link from "next/link";
import StripeCheckoutButton from "../../components/StripeCheckoutButton";

import {
  PLAN_DEFINITIONS,
  formatPlanPrice,
  type SubscriptionPlan,
} from "../../lib/subscriptionTypes";

type BillingInterval = "monthly" | "annual";

const planOrder: SubscriptionPlan[] = [
  "free",
  "premium",
  "premium_plus",
];

const pricingReturnTo = "/pricing";

function getFeatureLabel(feature: string): string {
  switch (feature) {
    case "initial_journey":
      return "Personalized autism journey";
    case "save_journey":
      return "Save your journey";
    case "next_journey":
      return "Continue to What's Next";
    case "journey_history":
      return "Journey History";
    case "community_read":
      return "Read community posts";
    case "community_participate":
      return "Post in the Community";
    case "ask_navigator":
      return "Ask Your Autivoya Navigator";
    case "advanced_resources":
      return "Advanced personalized resources";
    case "meeting_prep":
      return "Meeting preparation tools";
    case "document_vault":
      return "Document organization";
    case "ai_progress_insights":
      return "AI progress insights";
    case "family_organizer":
      return "Family organizer tools";
    case "human_navigator":
      return "Human Navigator support";
    default:
      return feature;
  }
}

export default function PricingPage() {
  const [interval, setInterval] =
    useState<BillingInterval>("monthly");

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 55%, #F8FAFC 100%)",
        padding: "70px 24px 100px",
      }}
    >
      <section
        style={{
          maxWidth: "850px",
          margin: "0 auto 35px",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            margin: 0,
            color: "#173B52",
            fontSize: "48px",
            lineHeight: 1.1,
            fontWeight: 850,
          }}
        >
          Choose the support that fits your journey.
        </h1>

        <p
          style={{
            maxWidth: "720px",
            margin: "18px auto 0",
            color: "#64748B",
            fontSize: "18px",
            lineHeight: 1.7,
          }}
        >
          Start with the tools you need today and choose
          more personalized support as your family's
          journey evolves.
        </p>

        <div
          style={{
            marginTop: "15px",
            color: "#475569",
            fontSize: "16px",
            fontStyle: "italic",
          }}
        >
          Every journey is unique. Every step matters.
        </div>
      </section>

      {/* BILLING INTERVAL SELECTOR */}

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "10px",
          marginBottom: "45px",
        }}
      >
        {(["monthly", "annual"] as const).map(
          (option) => (
            <button
              key={option}
              type="button"
              onClick={() => setInterval(option)}
              aria-pressed={interval === option}
              style={{
                padding: "11px 22px",
                borderRadius: "999px",
                border:
                  interval === option
                    ? "2px solid #2563EB"
                    : "1px solid #CBD5E1",
                background:
                  interval === option
                    ? "#EFF6FF"
                    : "#FFFFFF",
                color:
                  interval === option
                    ? "#1D4ED8"
                    : "#475569",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              {option === "monthly"
                ? "Monthly"
                : "Annual"}
            </button>
          )
        )}
      </div>

      {/* PRICING PLANS */}

      <section
        style={{
          maxWidth: "1180px",
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(290px, 1fr))",
          gap: "22px",
          alignItems: "stretch",
        }}
      >
        {planOrder.map((planOption) => {
          const definition =
            PLAN_DEFINITIONS[planOption];

          const isPremium =
            planOption === "premium";

          const isPremiumPlus =
            planOption === "premium_plus";

          const isFree = planOption === "free";

          const selectedPrice =
            isFree
              ? 0
              : interval === "annual"
                ? definition.annualPriceCents ??
                  definition.monthlyPriceCents
                : definition.monthlyPriceCents;

          return (
            <section
              key={planOption}
              style={{
                position: "relative",
                display: "flex",
                flexDirection: "column",
                padding: "30px",
                borderRadius: "22px",
                border: isPremium
                  ? "2px solid #2563EB"
                  : "1px solid #E2E8F0",
                background: "#FFFFFF",
                boxShadow: isPremium
                  ? "0 16px 35px rgba(37, 99, 235, 0.12)"
                  : "0 8px 24px rgba(15, 23, 42, 0.05)",
              }}
            >
              {definition.badge && (
                <div
                  style={{
                    position: "absolute",
                    top: "-13px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    padding: "6px 12px",
                    borderRadius: "999px",
                    background: "#2563EB",
                    color: "#FFFFFF",
                    fontSize: "11px",
                    fontWeight: 800,
                    whiteSpace: "nowrap",
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                  }}
                >
                  {definition.badge}
                </div>
              )}

              <div
                style={{
                  color: "#2563EB",
                  fontSize: "12px",
                  fontWeight: 800,
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                  marginBottom: "8px",
                }}
              >
                {definition.name}
              </div>

              <h2
                style={{
                  margin: 0,
                  color: "#0F172A",
                  fontSize: "29px",
                  lineHeight: 1.2,
                  fontWeight: 800,
                }}
              >
                {definition.name}
              </h2>

              <p
                style={{
                  margin: "10px 0 0",
                  minHeight: "50px",
                  color: "#64748B",
                  fontSize: "14px",
                  lineHeight: 1.55,
                }}
              >
                {definition.shortDescription}
              </p>

              <div
                style={{
                  marginTop: "24px",
                  display: "flex",
                  alignItems: "baseline",
                  gap: "6px",
                }}
              >
                <span
                  style={{
                    color: "#0F172A",
                    fontSize: "38px",
                    fontWeight: 850,
                    lineHeight: 1,
                  }}
                >
                  {formatPlanPrice(selectedPrice)}
                </span>

                {!isFree && (
                  <span
                    style={{
                      color: "#94A3B8",
                      fontSize: "13px",
                    }}
                  >
                    / {interval === "monthly"
                      ? "month"
                      : "year"}
                  </span>
                )}
              </div>

              {!isFree &&
                definition.annualPriceCents !== null && (
                  <div
                    style={{
                      marginTop: "7px",
                      color: "#64748B",
                      fontSize: "12px",
                    }}
                  >
                    {interval === "monthly"
                      ? `Annual plan: ${formatPlanPrice(
                          definition.annualPriceCents
                        )}`
                      : `Monthly plan: ${formatPlanPrice(
                          definition.monthlyPriceCents
                        )}/month`}
                  </div>
                )}

              <div style={{ marginTop: "25px" }}>
                {isFree ? (
                  <Link
                    href="/journey"
                    style={{
                      display: "block",
                      textAlign: "center",
                      padding: "13px 18px",
                      borderRadius: "10px",
                      border: "1px solid #CBD5E1",
                      background: "#FFFFFF",
                      color: "#0F172A",
                      fontSize: "14px",
                      fontWeight: 800,
                      textDecoration: "none",
                    }}
                  >
                    Start Free
                  </Link>
                ) : (
                  <StripeCheckoutButton
                    plan={
                      isPremium
                        ? "premium"
                        : "premium_plus"
                    }
                    interval={interval}
                    label={
                      isPremium
                        ? "Upgrade to Premium"
                        : "Upgrade to Premium+"
                    }
                    backgroundColor={
                      isPremium
                        ? "#2563EB"
                        : "#0F766E"
                    }
                  />
                )}
              </div>

              <div
                style={{
                  marginTop: "28px",
                  paddingTop: "24px",
                  borderTop: "1px solid #E2E8F0",
                  flex: 1,
                }}
              >
                <div
                  style={{
                    color: "#334155",
                    fontSize: "13px",
                    fontWeight: 800,
                    marginBottom: "14px",
                  }}
                >
                  What's included
                </div>

                <div
                  style={{
                    display: "grid",
                    gap: "11px",
                  }}
                >
                  {definition.features.map((feature) => (
                    <div
                      key={feature}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "9px",
                        color: "#475569",
                        fontSize: "14px",
                        lineHeight: 1.45,
                      }}
                    >
                      <span
                        style={{
                          color: isPremiumPlus
                            ? "#0F766E"
                            : "#059669",
                          fontWeight: 900,
                          marginTop: "1px",
                        }}
                      >
                        ✓
                      </span>

                      <span>
                        {getFeatureLabel(feature)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          );
        })}
      </section>

      {/* VALUE MESSAGE */}

      <section
        style={{
          maxWidth: "900px",
          margin: "60px auto 0",
          padding: "30px",
          borderRadius: "20px",
          background: "#F8FAFC",
          border: "1px solid #E2E8F0",
          textAlign: "center",
        }}
      >
        <h2
          style={{
            margin: 0,
            color: "#0F172A",
            fontSize: "25px",
            fontWeight: 800,
          }}
        >
          Your family's journey can evolve.
        </h2>

        <p
          style={{
            margin: "10px auto 0",
            maxWidth: "680px",
            color: "#64748B",
            fontSize: "15px",
            lineHeight: 1.65,
          }}
        >
          Start with the free journey and move into
          additional support when it becomes useful
          for your family. Your plan should meet
          you where you are.
        </p>
      </section>

      {/* FOOTER NAVIGATION */}

      <div
        style={{
          maxWidth: "900px",
          margin: "30px auto 0",
          display: "flex",
          justifyContent: "center",
          gap: "18px",
          flexWrap: "wrap",
        }}
      >
        <Link
          href="/journey"
          style={{
            color: "#64748B",
            fontSize: "13px",
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          ← Back to My Journey
        </Link>

        <Link
          href={`/login?returnTo=${encodeURIComponent(
            pricingReturnTo
          )}`}
          style={{
            color: "#2563EB",
            fontSize: "13px",
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          Log In
        </Link>
      </div>
    </main>
  );
}
