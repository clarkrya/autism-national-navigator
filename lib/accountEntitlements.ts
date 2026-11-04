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
 * Compatibility helpers for subscription feature definitions.
 *
 * IMPORTANT:
 *
 * This file does NOT determine the current user's verified
 * subscription plan.
 *
 * Current-user entitlement state belongs in:
 *
 * - useAccountEntitlements.ts
 *
 * Server-side authorization belongs in:
 *
 * - serverSubscription.ts
 *
 * This file exists only for shared feature-definition helpers
 * and compatibility type aliases.
 * ============================================================
 */


/*
 * ============================================================
 * COMPATIBILITY TYPES
 * ============================================================
 */

export type AccountPlan =
  SubscriptionPlan;

export type AccountFeature =
  SubscriptionFeature;


/*
 * ============================================================
 * FEATURE INCLUDED IN PLAN
 * ============================================================
 *
 * Answers:
 *
 * "Does this plan include this feature?"
 *
 * It does NOT answer:
 *
 * "Does the current user have this plan?"
 * ============================================================
 */

export function planCanUseFeature(
  plan: AccountPlan,
  feature: AccountFeature
): boolean {
  return planIncludesFeature(
    plan,
    feature
  );
}


/*
 * ============================================================
 * PREMIUM FEATURE CHECK
 * ============================================================
 *
 * Returns whether the feature belongs to Premium or above.
 *
 * This does not verify the current user's subscription.
 * ============================================================
 */

export function requiresPremium(
  feature: AccountFeature
): boolean {
  return (
    feature ===
      "community_participate" ||

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
      "family_organizer" ||

    feature ===
      "human_navigator"
  );
}


/*
 * ============================================================
 * PREMIUM+ FEATURE CHECK
 * ============================================================
 */

export function requiresPremiumPlus(
  feature: AccountFeature
): boolean {
  return (
    feature ===
    "human_navigator"
  );
}