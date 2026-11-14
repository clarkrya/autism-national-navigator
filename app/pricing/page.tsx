
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getApp, getApps } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import {
  doc,
  getDocFromServer,
  getFirestore,
  onSnapshot,
} from "firebase/firestore";

import {
  PLAN_DEFINITIONS,
  formatPlanPrice,
  type SubscriptionPlan,
} from "../../lib/subscriptionTypes";

type BillingInterval = "monthly" | "annual";
type PaidPlan = "premium" | "premium_plus";

type Membership = {
  plan: SubscriptionPlan;
  status: string;
  billingInterval: BillingInterval | null;
  cancelAtPeriodEnd: boolean;
  pendingPlan: PaidPlan | null;
  pendingBillingInterval: BillingInterval | null;
};

type ChangePreview = {
  changeType: string;
  amountDueFormatted?: string;
  effectiveAt?: number;
};

type ExpectedChange = {
  plan: PaidPlan;
  interval: BillingInterval;
};

const planOrder: SubscriptionPlan[] = [
  "free",
  "premium",
  "premium_plus",
];

const PREMIUM_PLUS_AVAILABLE = false;

const buttonStyle = {
  display: "block",
  width: "100%",
  textAlign: "center" as const,
  padding: "13px 18px",
  borderRadius: "10px",
  border: "none",
  color: "#FFFFFF",
  fontSize: "14px",
  fontWeight: 800,
  cursor: "pointer",
  boxSizing: "border-box" as const,
};

const featureLabels: Record<string, string> = {
  initial_journey: "Personalized autism journey",
  save_journey: "Save your journey",
  next_journey: "Continue to What's Next",
  journey_history: "Journey History",
  community_read: "Read community posts",
  community_participate: "Post in the Community",
  ask_navigator: "Ask Your Autivoya Navigator",
  advanced_resources: "Advanced personalized resources",
  meeting_prep: "Meeting preparation tools",
  document_vault: "Document organization",
  ai_progress_insights: "AI progress insights",
  family_organizer: "Family organizer tools",
  human_navigator: "Human Navigator support",
};

function isPaidPlan(value: unknown): value is PaidPlan {
  return value === "premium" || value === "premium_plus";
}

function isBillingInterval(
  value: unknown
): value is BillingInterval {
  return value === "monthly" || value === "annual";
}

function membershipName(plan: SubscriptionPlan): string {
  if (plan === "premium_plus") return "Premium+";
  if (plan === "premium") return "Premium";
  return "Free";
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const initialMembership: Membership = {
  plan: "free",
  status: "none",
  billingInterval: null,
  cancelAtPeriodEnd: false,
  pendingPlan: null,
  pendingBillingInterval: null,
};

export default function PricingPage() {
  const [interval, setInterval] =
    useState<BillingInterval>("monthly");

  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [membershipLoading, setMembershipLoading] =
    useState(true);

  const [membership, setMembership] =
    useState<Membership>(initialMembership);

  const [busyPlan, setBusyPlan] =
    useState<PaidPlan | null>(null);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [preview, setPreview] =
    useState<ChangePreview | null>(null);

  const [previewPlan, setPreviewPlan] =
    useState<PaidPlan | null>(null);

  const [previewInterval, setPreviewInterval] =
    useState<BillingInterval>("monthly");

  const expectedChangeRef =
    useRef<ExpectedChange | null>(null);

  useEffect(() => {
    if (!getApps().length) {
      setAuthLoading(false);
      setMembershipLoading(false);
      setError(
        "Firebase is not initialized. Please refresh the page."
      );
      return;
    }

    const auth = getAuth(getApp());

    return onAuthStateChanged(
      auth,
      (currentUser) => {
        expectedChangeRef.current = null;
        setUser(currentUser);
        setAuthLoading(false);
      },
      () => {
        setAuthLoading(false);
        setMembershipLoading(false);
        setError("Unable to verify your account.");
      }
    );
  }, []);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      expectedChangeRef.current = null;
      setMembership(initialMembership);
      setMembershipLoading(false);
      return;
    }

    setMembershipLoading(true);

    const subscriptionRef = doc(
      getFirestore(getApp()),
      "users",
      user.uid,
      "subscription",
      "current"
    );

    return onSnapshot(
      subscriptionRef,
      (snapshot) => {
        const data = snapshot.data() ?? {};

        const paidActive =
          data.status === "active" ||
          data.status === "trialing";

        const plan: SubscriptionPlan =
          paidActive && isPaidPlan(data.plan)
            ? data.plan
            : "free";

        const billingInterval = isBillingInterval(
          data.billingInterval
        )
          ? data.billingInterval
          : null;

        const nextMembership: Membership = {
          plan,
          status:
            typeof data.status === "string"
              ? data.status
              : "none",
          billingInterval,
          cancelAtPeriodEnd:
            data.cancelAtPeriodEnd === true,
          pendingPlan: isPaidPlan(data.pendingPlan)
            ? data.pendingPlan
            : null,
          pendingBillingInterval: isBillingInterval(
            data.pendingBillingInterval
          )
            ? data.pendingBillingInterval
            : null,
        };

        setMembership(nextMembership);
        setMembershipLoading(false);

        const expected = expectedChangeRef.current;

        if (
          expected &&
          paidActive &&
          plan === expected.plan &&
          billingInterval === expected.interval &&
          nextMembership.pendingPlan === null
        ) {
          expectedChangeRef.current = null;
          setError("");
          setNotice(
            `Membership Change Successful! Your ${
              membershipName(expected.plan)
            } ${
              expected.interval === "annual"
                ? "annual"
                : "monthly"
            } membership is now active.`
          );
        }
      },
      () => {
        setMembershipLoading(false);
        setError(
          "Unable to load membership. Please refresh before changing plans."
        );
      }
    );
  }, [user, authLoading]);

  async function authenticatedPost(
    endpoint: string,
    payload: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    if (!user) {
      throw new Error("Please sign in first.");
    }

    const token = await user.getIdToken();

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data: unknown = await response.json();

    if (!data || typeof data !== "object") {
      throw new Error("Invalid server response.");
    }

    const result = data as Record<string, unknown>;

    if (!response.ok) {
      throw new Error(
        typeof result.error === "string"
          ? result.error
          : "Unable to process your request."
      );
    }

    return result;
  }

  async function handlePlanClick(plan: PaidPlan) {
    if (plan === "premium_plus" && !PREMIUM_PLUS_AVAILABLE) {
      return;
    }

    setError("");
    setNotice("");

    if (!user) {
      window.location.href =
        `/login?returnTo=${encodeURIComponent("/pricing")}`;
      return;
    }

    if (membershipLoading || busyPlan) return;

    setBusyPlan(plan);

    try {
      if (membership.plan === "free") {
        const result = await authenticatedPost(
          "/api/stripe/checkout",
          { plan, interval }
        );

        if (
          typeof result.url === "string" &&
          result.url.startsWith("https://")
        ) {
          window.location.href = result.url;
          return;
        }

        throw new Error(
          "Stripe Checkout did not return a valid URL."
        );
      }

      const result = await authenticatedPost(
        "/api/stripe/change-subscription",
        {
          action: "preview",
          plan,
          interval,
        }
      );

      setPreview(result as ChangePreview);
      setPreviewPlan(plan);
      setPreviewInterval(interval);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to process your request."
      );
    } finally {
      setBusyPlan(null);
    }
  }

  async function confirmChange() {
    if (!previewPlan || !preview || busyPlan) return;

    if (
      previewPlan === "premium_plus" &&
      !PREMIUM_PLUS_AVAILABLE
    ) {
      setPreview(null);
      setPreviewPlan(null);
      setError("Premium+ is coming in Phase 2.");
      return;
    }

    const requestedPlan = previewPlan;
    const requestedInterval = previewInterval;

    setError("");
    setNotice("");
    setBusyPlan(requestedPlan);

    try {
      const result = await authenticatedPost(
        "/api/stripe/change-subscription",
        {
          action: "confirm",
          plan: requestedPlan,
          interval: requestedInterval,
        }
      );

      setPreview(null);
      setPreviewPlan(null);

      if (result.changeType === "scheduled_downgrade") {
        expectedChangeRef.current = null;
        setNotice(
          "Your membership change has been scheduled for your next renewal. Your current benefits remain active until then."
        );
      } else {
        expectedChangeRef.current = {
          plan: requestedPlan,
          interval: requestedInterval,
        };

        setNotice(
          "Your membership change was submitted. Verifying payment and updating your benefits..."
        );

        if (user && getApps().length) {
          const ref = doc(
            getFirestore(getApp()),
            "users",
            user.uid,
            "subscription",
            "current"
          );

          try {
            const snapshot = await getDocFromServer(ref);
            const data = snapshot.data();

            if (
              data &&
              (data.status === "active" ||
                data.status === "trialing") &&
              data.plan === requestedPlan &&
              data.billingInterval === requestedInterval &&
              !isPaidPlan(data.pendingPlan)
            ) {
              expectedChangeRef.current = null;
              setNotice(
                `Membership Change Successful! Your ${
                  membershipName(requestedPlan)
                } membership is now active. Your benefits are available.`
              );
            }
          } catch {
            // Firestore listener will continue checking.
          }
        }
      }
    } catch (err) {
      expectedChangeRef.current = null;
      setError(
        err instanceof Error
          ? err.message
          : "Unable to change your subscription."
      );
    } finally {
      setBusyPlan(null);
    }
  }

  const currentPlan = membership.plan;
  const loading = authLoading || membershipLoading;

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
          more personalized support as your family&apos;s
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

        <div
          style={{
            marginTop: "26px",
            padding: "16px 22px",
            borderRadius: "14px",
            background: "#EFF6FF",
            border: "1px solid #BFDBFE",
            color: "#173B52",
            fontSize: "15px",
          }}
        >
          {loading
            ? "Loading your membership..."
            : !user
              ? "Sign in to view your current membership."
              : (
                <>
                  <strong>
                    Current Membership:{" "}
                    {membershipName(currentPlan)}
                  </strong>

                  {currentPlan !== "free" &&
                    membership.billingInterval && (
                      <span>
                        {" "}·{" "}
                        {membership.billingInterval === "monthly"
                          ? "Monthly"
                          : "Annual"}{" "}
                        billing
                      </span>
                    )}

                  {membership.cancelAtPeriodEnd && (
                    <div style={{ marginTop: "6px" }}>
                      Cancellation scheduled.
                    </div>
                  )}

                  {membership.pendingPlan && (
                    <div style={{ marginTop: "6px" }}>
                      Pending change:{" "}
                      {membershipName(membership.pendingPlan)}
                    </div>
                  )}
                </>
              )}
        </div>
      </section>

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
              onClick={() => {
                setInterval(option);
                setPreview(null);
                setPreviewPlan(null);
              }}
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
              {option === "monthly" ? "Monthly" : "Annual"}
            </button>
          )
        )}
      </div>

      {error && (
        <div
          role="alert"
          style={{
            maxWidth: "850px",
            margin: "0 auto 24px",
            padding: "14px 18px",
            borderRadius: "10px",
            background: "#FEF2F2",
            color: "#B91C1C",
            border: "1px solid #FECACA",
          }}
        >
          {error}
        </div>
      )}

      {notice && (
        <div
          role="status"
          style={{
            maxWidth: "850px",
            margin: "0 auto 24px",
            padding: "14px 18px",
            borderRadius: "10px",
            background: "#F0FDF4",
            color: "#166534",
            border: "1px solid #BBF7D0",
          }}
        >
          {notice}
        </div>
      )}

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
          const definition = PLAN_DEFINITIONS[planOption];

          const isFree = planOption === "free";
          const isPremium = planOption === "premium";
          const isPremiumPlus =
            planOption === "premium_plus";

          const comingSoon =
            isPremiumPlus && !PREMIUM_PLUS_AVAILABLE;

          const isCurrent =
            !!user &&
            !loading &&
            currentPlan === planOption;

          const currentPaidSelection =
            isCurrent &&
            !isFree &&
            membership.billingInterval === interval;

          const selectedPrice = isFree
            ? 0
            : interval === "annual"
              ? definition.annualPriceCents ??
                definition.monthlyPriceCents
              : definition.monthlyPriceCents;

          const highlighted =
            !comingSoon &&
            (isCurrent || (!user && isPremium));

          const pending =
            membership.pendingPlan !== null ||
            membership.cancelAtPeriodEnd;

          let buttonLabel = "";

          if (!isFree && !comingSoon) {
            if (loading) {
              buttonLabel = "Loading...";
            } else if (currentPaidSelection) {
              buttonLabel = "Current Plan";
            } else if (
              currentPlan === planOption &&
              membership.billingInterval !== interval
            ) {
              buttonLabel = `Switch to ${
                interval === "annual"
                  ? "Annual"
                  : "Monthly"
              }`;
            } else if (
              currentPlan === "premium_plus" &&
              isPremium
            ) {
              buttonLabel = "Switch to Premium";
            } else {
              buttonLabel = "Upgrade to Premium";
            }
          }

          return (
            <section
              key={planOption}
              style={{
                position: "relative",
                display: "flex",
                flexDirection: "column",
                padding: "30px",
                borderRadius: "22px",
                border: isCurrent
                  ? "2px solid #0F766E"
                  : highlighted
                    ? "2px solid #2563EB"
                    : "1px solid #E2E8F0",
                background: comingSoon
                  ? "#F8FAFC"
                  : "#FFFFFF",
                boxShadow: highlighted
                  ? "0 16px 35px rgba(37,99,235,0.12)"
                  : "0 8px 24px rgba(15,23,42,0.05)",
              }}
            >
              {(isCurrent || comingSoon ||
                definition.badge) && (
                <div
                  style={{
                    position: "absolute",
                    top: "-13px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    padding: "6px 12px",
                    borderRadius: "999px",
                    background: isCurrent
                      ? "#0F766E"
                      : comingSoon
                        ? "#475569"
                        : "#2563EB",
                    color: "#FFFFFF",
                    fontSize: "11px",
                    fontWeight: 800,
                    whiteSpace: "nowrap",
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                  }}
                >
                  {isCurrent
                    ? "Your Current Membership"
                    : comingSoon
                      ? "Coming in Phase 2"
                      : definition.badge}
                </div>
              )}

              <div
                style={{
                  color: comingSoon
                    ? "#64748B"
                    : "#2563EB",
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
                {comingSoon
                  ? "We're preparing additional support tools and services for a future release."
                  : definition.shortDescription}
              </p>

              <div
                style={{
                  marginTop: "24px",
                  minHeight: "65px",
                }}
              >
                {comingSoon ? (
                  <div
                    style={{
                      fontSize: "23px",
                      fontWeight: 800,
                      color: "#475569",
                    }}
                  >
                    Coming Soon
                  </div>
                ) : (
                  <>
                    <div
                      style={{
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
                  </>
                )}
              </div>

              <div style={{ marginTop: "25px" }}>
                {comingSoon ? (
                  <button
                    type="button"
                    disabled
                    style={{
                      ...buttonStyle,
                      background: "#E2E8F0",
                      color: "#64748B",
                      cursor: "not-allowed",
                    }}
                  >
                    Available in Phase 2
                  </button>
                ) : isFree ? (
                  isCurrent ? (
                    <button
                      type="button"
                      disabled
                      style={{
                        ...buttonStyle,
                        background: "#E2E8F0",
                        color: "#475569",
                        cursor: "default",
                      }}
                    >
                      Current Plan
                    </button>
                  ) : (
                    <Link
                      href="/journey"
                      style={{
                        ...buttonStyle,
                        background: "#FFFFFF",
                        color: "#0F172A",
                        border: "1px solid #CBD5E1",
                        textDecoration: "none",
                      }}
                    >
                      {currentPlan === "free"
                        ? "Start Free"
                        : "Continue My Journey"}
                    </Link>
                  )
                ) : (
                  <button
                    type="button"
                    disabled={
                      loading ||
                      busyPlan !== null ||
                      currentPaidSelection ||
                      pending
                    }
                    onClick={() =>
                      handlePlanClick(planOption as PaidPlan)
                    }
                    style={{
                      ...buttonStyle,
                      background:
                        currentPaidSelection ||
                        loading ||
                        pending
                          ? "#CBD5E1"
                          : "#2563EB",
                      color:
                        currentPaidSelection ||
                        loading ||
                        pending
                          ? "#475569"
                          : "#FFFFFF",
                      cursor:
                        loading ||
                        busyPlan !== null ||
                        currentPaidSelection ||
                        pending
                          ? "not-allowed"
                          : "pointer",
                    }}
                  >
                    {busyPlan === planOption
                      ? "Processing..."
                      : pending
                        ? "Change Pending"
                        : buttonLabel}
                  </button>
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
                  {comingSoon
                    ? "Planned for Phase 2"
                    : "What's included"}
                </div>

                {comingSoon && (
                  <p
                    style={{
                      color: "#64748B",
                      fontSize: "13px",
                      lineHeight: 1.6,
                      margin: "0 0 16px",
                    }}
                  >
                    These features are planned for a future
                    release and are not yet available.
                  </p>
                )}

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
                        color: comingSoon
                          ? "#64748B"
                          : "#475569",
                        fontSize: "14px",
                        lineHeight: 1.45,
                      }}
                    >
                      <span
                        style={{
                          color: comingSoon
                            ? "#94A3B8"
                            : "#059669",
                          fontWeight: 900,
                          marginTop: "1px",
                        }}
                      >
                        {comingSoon ? "○" : "✓"}
                      </span>

                      <span>
                        {featureLabels[feature] ?? feature}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          );
        })}
      </section>

      {preview && previewPlan && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Confirm subscription change"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(15,23,42,0.65)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "480px",
              padding: "30px",
              borderRadius: "20px",
              background: "#FFFFFF",
              boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
            }}
          >
            <h2
              style={{
                marginTop: 0,
                color: "#173B52",
              }}
            >
              Confirm Membership Change
            </h2>

            <p>
              New plan:{" "}
              <strong>
                {membershipName(previewPlan)}
              </strong>
            </p>

            <p>
              Billing:{" "}
              <strong>
                {previewInterval === "monthly"
                  ? "Monthly"
                  : "Annual"}
              </strong>
            </p>

            {preview.changeType ===
            "scheduled_downgrade" ? (
              <>
                <p>
                  Your current membership remains
                  active until renewal.
                </p>

                {preview.effectiveAt && (
                  <p>
                    Effective date:{" "}
                    <strong>
                      {formatDate(preview.effectiveAt)}
                    </strong>
                  </p>
                )}
              </>
            ) : (
              <>
                <p>Estimated amount due now:</p>

                <p
                  style={{
                    fontSize: "30px",
                    fontWeight: 800,
                    color: "#173B52",
                  }}
                >
                  {preview.amountDueFormatted ??
                    "Calculated at confirmation"}
                </p>

                <p
                  style={{
                    color: "#64748B",
                    fontSize: "13px",
                  }}
                >
                  Final charges are determined by Stripe.
                  Access updates after payment verification.
                </p>
              </>
            )}

            <div
              style={{
                display: "flex",
                gap: "12px",
                marginTop: "25px",
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setPreview(null);
                  setPreviewPlan(null);
                }}
                disabled={busyPlan !== null}
                style={{
                  ...buttonStyle,
                  background: "#E2E8F0",
                  color: "#334155",
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmChange}
                disabled={busyPlan !== null}
                style={{
                  ...buttonStyle,
                  background: "#0F766E",
                }}
              >
                {busyPlan
                  ? "Processing..."
                  : "Confirm Change"}
              </button>
            </div>
          </div>
        </div>
      )}

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
          Your family&apos;s journey can evolve.
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

        {!user && (
          <Link
            href="/login?returnTo=%2Fpricing"
            style={{
              color: "#2563EB",
              fontSize: "13px",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Log In
          </Link>
        )}
      </div>
    </main>
  );
}
