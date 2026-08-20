import {
  getCurrentUser,
} from "./auth";

import type {
  SubscriptionFeature,
  SubscriptionPlan,
} from "./subscriptionTypes";

import {
  planIncludesFeature,
} from "./subscriptionTypes";


/*
 * ============================================================
 * ACCOUNT ENTITLEMENTS
 * ============================================================
 *
 * Centralizes account-level access decisions.
 *
 * This file answers:
 *
 * "What can the CURRENT user access?"
 *
 * SubscriptionTypes.ts answers:
 *
 * "What does each PLAN include?"
 *
 * Stripe will eventually provide the verified subscription
 * state. Until then:
 *
 *   Guest user       → guest
 *   Authenticated    → free
 *
 * IMPORTANT:
 *
 * Client-side entitlement checks are for product/UI behavior.
 *
 * They are NOT the final security boundary for premium data or
 * premium API functionality.
 *
 * Server-side authorization will be added before launch.
 * ============================================================
 */


/*
 * ============================================================
 * COMPATIBILITY TYPES
 * ============================================================
 *
 * These aliases preserve the names already used elsewhere in
 * the application.
 */

export type AccountPlan =
  SubscriptionPlan;

export type AccountFeature =
  SubscriptionFeature;


/*
 * ============================================================
 * CURRENT ACCOUNT PLAN
 * ============================================================
 *
 * Returns the plan associated with the current authenticated
 * session.
 *
 * CURRENT BEHAVIOR:
 *
 * Guest         → guest
 * Authenticated → free
 *
 * We intentionally do NOT allow a browser-side value to say
 * that a user is Premium.
 *
 * Once Stripe is implemented, this function will retrieve the
 * verified subscription state from the application's account
 * subscription record.
 * ============================================================
 */

export function getCurrentAccountPlan():
  AccountPlan {

  const user =
    getCurrentUser();


  if (!user) {
    return "guest";
  }


  return "free";
}


/*
 * ============================================================
 * AUTHENTICATION
 * ============================================================
 */

export function isAuthenticated():
  boolean {

  return Boolean(
    getCurrentUser()
  );
}


/*
 * ============================================================
 * PLAN CHECKS
 * ============================================================
 */

export function isFreeAccount():
  boolean {

  return (
    getCurrentAccountPlan() ===
    "free"
  );
}


export function isPremiumAccount():
  boolean {

  const plan =
    getCurrentAccountPlan();

  return (
    plan === "premium" ||
    plan === "premium_plus"
  );
}


export function isPremiumPlusAccount():
  boolean {

  return (
    getCurrentAccountPlan() ===
    "premium_plus"
  );
}


/*
 * ============================================================
 * FEATURE ACCESS
 * ============================================================
 *
 * This function uses the centralized plan definitions from
 * subscriptionTypes.ts.
 *
 * That means we no longer maintain two separate lists of which
 * features belong to Premium.
 * ============================================================
 */

export function canAccessFeature(
  feature: AccountFeature
): boolean {

  const plan =
    getCurrentAccountPlan();


  /*
   * ----------------------------------------------------------
   * GUEST
   * ----------------------------------------------------------
   */

  if (
    plan === "guest"
  ) {

    /*
     * Guests can start the initial journey.
     */

    if (
      feature ===
      "initial_journey"
    ) {

      return true;

    }


    /*
     * Guests can see/use Save My Journey, but the actual save
     * flow requires an account.
     *
     * The dashboard handles the login/signup prompt.
     */

    if (
      feature ===
      "save_journey"
    ) {

      return true;

    }


    /*
     * Guests cannot continue to the next AI-generated stage.
     *
     * This is one of our established product rules.
     */

    return false;

  }


  /*
   * ----------------------------------------------------------
   * AUTHENTICATED USER
   * ----------------------------------------------------------
   *
   * Until Stripe is connected, authenticated users are Free.
   *
   * We use the centralized plan definitions to determine the
   * features available to them.
   */

  return planIncludesFeature(
    plan,
    feature
  );
}


/*
 * ============================================================
 * NEXT JOURNEY ACCESS
 * ============================================================
 *
 * The current product decision is:
 *
 * Guest:
 *   Cannot generate another journey stage.
 *
 * Free:
 *   Can continue the journey.
 *
 * Premium:
 *   Can continue the journey.
 *
 * Premium+:
 *   Can continue the journey.
 */

export function canContinueToNextJourney():
  boolean {

  return canAccessFeature(
    "next_journey"
  );
}


/*
 * ============================================================
 * PREMIUM FEATURE CHECK
 * ============================================================
 *
 * Returns whether a feature is included in either Premium or
 * Premium+.
 *
 * This does NOT say that the current user has Premium.
 */

export function requiresPremium(
  feature: AccountFeature
): boolean {

  return (
    feature ===
      "ask_navigator" ||

    feature ===
      "advanced_resources" ||

    feature ===
      "meeting_prep" ||

    feature ===
      "document_vault" ||

    feature ===
      "ai_progress_insights" ||

    feature ===
      "family_organizer"
  );
}


/*
 * ============================================================
 * PREMIUM+ FEATURE CHECK
 * ============================================================
 *
 * Returns whether the feature requires Premium+.
 */

export function requiresPremiumPlus(
  feature: AccountFeature
): boolean {

  return (
    feature ===
    "human_navigator"
  );
}


/*
 * ============================================================
 * CURRENT USER FEATURE ACCESS
 * ============================================================
 *
 * Convenience helper for future UI components.
 *
 * Example:
 *
 * if (canUseFeature("ask_navigator")) {
 *   ...
 * }
 */

export function canUseFeature(
  feature: AccountFeature
): boolean {

  return canAccessFeature(
    feature
  );
}