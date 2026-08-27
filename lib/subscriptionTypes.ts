/*
 * ============================================================
 * SUBSCRIPTION TYPES
 * ============================================================
 *
 * Defines the product's subscription plans and feature model.
 *
 * CURRENT PLANS
 *
 * guest
 * free
 * premium
 * premium_plus
 *
 * This file does NOT connect to Stripe.
 *
 * Stripe/subscription verification will be added later.
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
 * SUBSCRIPTION STATUS
 * ============================================================
 *
 * This represents the billing/account state.
 *
 * We are defining it now so Stripe can plug into it later.
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
 * Keep feature names centralized.
 *
 * This prevents subscription logic from being scattered
 * throughout the application.
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
 * This is the shape we will eventually store for an account.
 *
 * Stripe will eventually provide the verified billing state.
 *
 * IMPORTANT:
 *
 * The browser should NOT be trusted to set premium status.
 *
 * Later, the server/webhook will update this record.
 */

export type SubscriptionRecord = {
  userId: string;

  plan: SubscriptionPlan;

  status: SubscriptionStatus;

  /*
   * Stripe customer/subscription IDs will eventually live here.
   */

  stripeCustomerId?: string;

  stripeSubscriptionId?: string;

  currentPeriodStart?: number;

  currentPeriodEnd?: number;

  cancelAtPeriodEnd?: boolean;

  createdAt: number;

  updatedAt: number;
};


/*
 * ============================================================
 * PLAN DISPLAY INFORMATION
 * ============================================================
 *
 * Used by the future pricing/upgrade UI.
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
 * These are PRODUCT definitions, not billing records.
 *
 * Prices are planning values only until we connect Stripe.
 */

export const PLAN_DEFINITIONS:
  Record<
    SubscriptionPlan,
    PlanDefinition
  > = {

  guest: {
    id:
      "guest",

    name:
      "Guest",

    shortDescription:
      "Explore your personalized autism journey.",

    monthlyPriceCents:
      0,

    annualPriceCents:
      null,

    features: [
      "initial_journey",
      "community_read",
    ],
  },


  free: {
    id:
      "free",

    name:
      "Free",

    shortDescription:
      "Save your journey and keep moving forward.",

    monthlyPriceCents:
      0,

    annualPriceCents:
      null,

    features: [
      "initial_journey",
      "save_journey",
      "next_journey",
      "journey_history",
      "community_read",
    ],
  },


  premium: {
    id:
      "premium",

    name:
      "Premium",

    shortDescription:
      "Get deeper personalization and ongoing support tools.",

    monthlyPriceCents:
      1299,

    annualPriceCents:
      9900,

    highlighted:
      true,

    badge:
      "Most Popular",

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


  premium_plus: {
    id:
      "premium_plus",

    name:
      "Premium+",

    shortDescription:
      "Additional support when your family needs more guidance.",

    monthlyPriceCents:
      3999,

    annualPriceCents:
      29900,

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

  return PLAN_DEFINITIONS[
    plan
  ];
}


/*
 * ============================================================
 * FEATURE ACCESS
 * ============================================================
 *
 * This answers:
 *
 * "Does this plan include this feature?"
 *
 * It does NOT determine whether the current user actually owns
 * that plan.
 */

export function planIncludesFeature(
  plan: SubscriptionPlan,
  feature: SubscriptionFeature
): boolean {

  return PLAN_DEFINITIONS[
    plan
  ].features.includes(
    feature
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
      style:
        "currency",

      currency:
        "USD",
    }
  );
}