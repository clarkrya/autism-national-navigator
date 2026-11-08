
/*
 * ============================================================
 * AUTIVOYA SUBSCRIPTION TYPES
 * ============================================================
 *
 * Central definitions for subscription plans, billing status,
 * feature access, and subscription records.
 *
 * CURRENT PLANS:
 *
 * guest
 * free
 * premium
 * premium_plus
 *
 * Stripe billing integration:
 *
 * - Tracks verified subscription status
 * - Supports monthly and annual billing
 * - Supports pending subscription changes
 * - Tracks Stripe customer and subscription IDs
 * - Supports scheduled downgrades
 *
 * IMPORTANT:
 *
 * Subscription access must be verified server-side.
 * The browser must never grant itself paid access.
 * ============================================================
 */


/*
 * ============================================================
 * ACCOUNT PLANS
 * ============================================================
 */

export type SubscriptionPlan =
  | "guest"
  | "free"
  | "premium"
  | "premium_plus";


/*
 * ============================================================
 * PAID SUBSCRIPTION PLANS
 * ============================================================
 */

export type PaidSubscriptionPlan =
  | "premium"
  | "premium_plus";


/*
 * ============================================================
 * BILLING INTERVAL
 * ============================================================
 */

export type SubscriptionBillingInterval =
  | "monthly"
  | "annual";


/*
 * ============================================================
 * SUBSCRIPTION STATUS
 * ============================================================
 *
 * Represents the verified billing/account state.
 *
 * Stripe webhooks will update these values.
 */

export type SubscriptionStatus =
  | "none"
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "incomplete";


/*
 * ============================================================
 * FEATURE KEYS
 * ============================================================
 *
 * Centralized feature definitions prevent subscription logic
 * from being scattered throughout Autivoya.
 */

export type SubscriptionFeature =
  | "initial_journey"
  | "save_journey"
  | "next_journey"
  | "journey_history"
  | "community_read"
  | "community_participate"
  | "ask_navigator"
  | "advanced_resources"
  | "meeting_prep"
  | "document_vault"
  | "ai_progress_insights"
  | "family_organizer"
  | "human_navigator";


/*
 * ============================================================
 * SUBSCRIPTION RECORD
 * ============================================================
 *
 * Firestore location:
 *
 * users/{userId}/subscription/current
 *
 * This record represents the user's subscription state.
 *
 * IMPORTANT:
 *
 * Paid subscription updates must originate from trusted
 * server-side Stripe billing logic.
 *
 * Tester access is stored separately and is not modified
 * by Stripe subscription updates.
 * ============================================================
 */

export type SubscriptionRecord = {

  /*
   * ----------------------------------------------------------
   * ACCOUNT IDENTITY
   * ----------------------------------------------------------
   */

  userId: string;


  /*
   * ----------------------------------------------------------
   * CONFIRMED SUBSCRIPTION
   * ----------------------------------------------------------
   *
   * plan represents the currently granted subscription tier.
   *
   * Pending changes must not automatically modify this value.
   */

  plan: SubscriptionPlan;

  status: SubscriptionStatus;


  /*
   * ----------------------------------------------------------
   * STRIPE IDENTIFIERS
   * ----------------------------------------------------------
   */

  stripeCustomerId?: string;

  stripeSubscriptionId?: string;


  /*
   * ----------------------------------------------------------
   * CURRENT BILLING PERIOD
   * ----------------------------------------------------------
   *
   * Timestamps are stored in milliseconds.
   */

  currentPeriodStart?: number;

  currentPeriodEnd?: number;

  cancelAtPeriodEnd?: boolean;


  /*
   * ----------------------------------------------------------
   * CONFIRMED BILLING INTERVAL
   * ----------------------------------------------------------
   */

  billingInterval?: SubscriptionBillingInterval;


  /*
   * ----------------------------------------------------------
   * PENDING SUBSCRIPTION CHANGE
   * ----------------------------------------------------------
   *
   * These fields describe a requested change that has not
   * necessarily taken effect.
   *
   * Examples:
   *
   * Premium -> Premium+
   * Premium+ -> Premium
   * Monthly -> Annual
   *
   * A pending plan must never grant additional feature access.
   */

  pendingPlan?: PaidSubscriptionPlan;

  pendingBillingInterval?: SubscriptionBillingInterval;


  /*
   * ----------------------------------------------------------
   * PENDING STRIPE BILLING REFERENCES
   * ----------------------------------------------------------
   *
   * Used to track payment-dependent and scheduled changes.
   */

  pendingInvoiceId?: string;

  stripeScheduleId?: string;


  /*
   * ----------------------------------------------------------
   * RECORD TIMESTAMPS
   * ----------------------------------------------------------
   */

  createdAt: number;

  updatedAt: number;
};


/*
 * ============================================================
 * PLAN DISPLAY INFORMATION
 * ============================================================
 *
 * Product definitions used by the pricing interface.
 *
 * These are not proof of subscription ownership.
 */

export type PlanDefinition = {

  id: SubscriptionPlan;

  name: string;

  shortDescription: string;

  monthlyPriceCents: number;

  annualPriceCents: number | null;

  highlighted?: boolean;

  badge?: string;

  features: SubscriptionFeature[];

};


/*
 * ============================================================
 * PLAN DEFINITIONS
 * ============================================================
 *
 * Existing Autivoya pricing is preserved.
 *
 * Free:
 * $0
 *
 * Premium:
 * $12.99 monthly
 * $99 annually
 *
 * Premium+:
 * $39.99 monthly
 * $299 annually
 * ============================================================
 */

export const PLAN_DEFINITIONS: Record<
  SubscriptionPlan,
  PlanDefinition
> = {

  /*
   * ----------------------------------------------------------
   * GUEST
   * ----------------------------------------------------------
   */

  guest: {

    id: "guest",

    name: "Guest",

    shortDescription:
      "Explore your personalized autism journey.",

    monthlyPriceCents: 0,

    annualPriceCents: null,

    features: [
      "initial_journey",
      "community_read",
    ],

  },


  /*
   * ----------------------------------------------------------
   * FREE
   * ----------------------------------------------------------
   */

  free: {

    id: "free",

    name: "Free",

    shortDescription:
      "Save your journey and keep moving forward.",

    monthlyPriceCents: 0,

    annualPriceCents: null,

    features: [
      "initial_journey",
      "save_journey",
      "next_journey",
      "journey_history",
      "community_read",
    ],

  },


  /*
   * ----------------------------------------------------------
   * PREMIUM
   * ----------------------------------------------------------
   */

  premium: {

    id: "premium",

    name: "Premium",

    shortDescription:
      "Get deeper personalization and ongoing support tools.",

    monthlyPriceCents: 1299,

    annualPriceCents: 9900,

    highlighted: true,

    badge: "Most Popular",

    features: [
      "initial_journey",
      "save_journey",
      "next_journey",
      "journey_history",
      "community_read",
      "community_participate",
      "ask_navigator",
      "advanced_resources",
      "meeting_prep",
      "document_vault",
      "ai_progress_insights",
      "family_organizer",
    ],

  },


  /*
   * ----------------------------------------------------------
   * PREMIUM+
   * ----------------------------------------------------------
   */

  premium_plus: {

    id: "premium_plus",

    name: "Premium+",

    shortDescription:
      "Additional support when your family needs more guidance.",

    monthlyPriceCents: 3999,

    annualPriceCents: 29900,

    features: [
      "initial_journey",
      "save_journey",
      "next_journey",
      "journey_history",
      "community_read",
      "community_participate",
      "ask_navigator",
      "advanced_resources",
      "meeting_prep",
      "document_vault",
      "ai_progress_insights",
      "family_organizer",
      "human_navigator",
    ],

  },

};


/*
 * ============================================================
 * PLAN HELPERS
 * ============================================================
 */

export function getPlanDefinition(
  plan: SubscriptionPlan
): PlanDefinition {

  return PLAN_DEFINITIONS[plan];

}


/*
 * ============================================================
 * FEATURE ACCESS
 * ============================================================
 *
 * Determines whether a plan includes a feature.
 *
 * IMPORTANT:
 *
 * This does not verify whether the user owns the plan.
 *
 * Actual subscription access must be determined from
 * verified subscription records or valid tester access.
 * ============================================================
 */

export function planIncludesFeature(
  plan: SubscriptionPlan,
  feature: SubscriptionFeature
): boolean {

  return PLAN_DEFINITIONS[
    plan
  ].features.includes(feature);

}


/*
 * ============================================================
 * PAID PLAN VALIDATION
 * ============================================================
 */

export function isPaidSubscriptionPlan(
  plan: unknown
): plan is PaidSubscriptionPlan {

  return (
    plan === "premium" ||
    plan === "premium_plus"
  );

}


/*
 * ============================================================
 * BILLING INTERVAL VALIDATION
 * ============================================================
 */

export function isSubscriptionBillingInterval(
  interval: unknown
): interval is SubscriptionBillingInterval {

  return (
    interval === "monthly" ||
    interval === "annual"
  );

}


/*
 * ============================================================
 * PRICE HELPERS
 * ============================================================
 */

export function formatPlanPrice(
  cents: number
): string {

  if (cents === 0) {
    return "Free";
  }

  return (
    cents / 100
  ).toLocaleString(
    "en-US",
    {
      style: "currency",
      currency: "USD",
    }
  );

}
