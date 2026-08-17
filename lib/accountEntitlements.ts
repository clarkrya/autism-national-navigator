import {
    getCurrentUser,
  } from "./auth";
  
  
  /*
   * ============================================================
   * ACCOUNT ENTITLEMENTS
   * ============================================================
   *
   * Centralizes access decisions for Autism Journey Navigator.
   *
   * CURRENT PRODUCT MODEL
   *
   * Guest
   *   - Can use the initial free journey
   *   - Cannot continue to the next AI journey stage
   *
   * Free Account
   *   - Can save their journey
   *   - Can continue through the account-enabled journey flow
   *
   * Premium
   *   - Future paid features
   *
   * Premium+
   *   - Future advanced / human-supported features
   *
   * IMPORTANT
   *
   * This file is intentionally small right now.
   *
   * As we add Stripe and subscription state, this becomes the
   * central entitlement layer rather than placing subscription
   * logic throughout React components.
   * ============================================================
   */
  
  
  /*
   * ============================================================
   * PLAN TYPES
   * ============================================================
   */
  
  export type AccountPlan =
    | "guest"
    | "free"
    | "premium"
    | "premium_plus";
  
  
  /*
   * ============================================================
   * FEATURE TYPES
   * ============================================================
   *
   * Keep feature names centralized so we don't end up with
   * strings such as:
   *
   * "premium"
   * "premiumFeature"
   * "canUsePremium"
   *
   * scattered throughout the application.
   */
  
  export type AccountFeature =
    | "initial_journey"
    | "save_journey"
    | "next_journey"
    | "journey_history"
    | "ask_navigator"
    | "community_read"
    | "community_participate"
    | "document_vault"
    | "meeting_prep"
    | "advanced_resources"
    | "human_navigator";
  
  
  /*
   * ============================================================
   * CURRENT USER
   * ============================================================
   *
   * Returns the user's current account plan.
   *
   * Subscription information will eventually come from the
   * authenticated user's subscription record / verified billing
   * state.
   *
   * For now:
   *
   *   No authenticated user = guest
   *   Authenticated user   = free
   *
   * We are NOT putting Premium access in the client based on
   * a manually editable value.
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
   * These are the CURRENT product rules.
   *
   * They can evolve as we build Premium.
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
  
      switch (feature) {
  
        /*
         * A visitor can use the initial free experience.
         */
  
        case "initial_journey":
          return true;
  
  
        /*
         * Guest users can see the Save button, but saving
         * permanently requires an account.
         *
         * The UI handles the account prompt.
         */
  
        case "save_journey":
          return true;
  
  
        /*
         * We decided that What's Next requires an account.
         */
  
        case "next_journey":
          return false;
  
  
        /*
         * Everything else requires an account or paid plan.
         */
  
        default:
          return false;
  
      }
  
    }
  
  
    /*
     * ----------------------------------------------------------
     * FREE ACCOUNT
     * ----------------------------------------------------------
     */
  
    if (
      plan === "free"
    ) {
  
      switch (feature) {
  
        /*
         * Core journey experience.
         */
  
        case "initial_journey":
          return true;
  
  
        case "save_journey":
          return true;
  
  
        /*
         * We allow an account holder to continue the journey.
         *
         * This can later become a Premium-gated feature once
         * we've finalized the free progression allowance.
         */
  
        case "next_journey":
          return true;
  
  
        /*
         * History is being built as a core account capability.
         */
  
        case "journey_history":
          return true;
  
  
        /*
         * Community reading can be available to account
         * holders.
         */
  
        case "community_read":
          return true;
  
  
        /*
         * Participation can be available to account holders.
         */
  
        case "community_participate":
          return true;
  
  
        /*
         * These remain Premium features.
         */
  
        case "ask_navigator":
        case "document_vault":
        case "meeting_prep":
        case "advanced_resources":
          return false;
  
  
        /*
         * Human support is Premium+ only.
         */
  
        case "human_navigator":
          return false;
  
  
        default:
          return false;
  
      }
  
    }
  
  
    /*
     * ----------------------------------------------------------
     * PREMIUM
     * ----------------------------------------------------------
     */
  
    if (
      plan === "premium"
    ) {
  
      switch (feature) {
  
        case "initial_journey":
        case "save_journey":
        case "next_journey":
        case "journey_history":
        case "ask_navigator":
        case "community_read":
        case "community_participate":
        case "document_vault":
        case "meeting_prep":
        case "advanced_resources":
  
          return true;
  
  
        case "human_navigator":
  
          return false;
  
  
        default:
  
          return false;
  
      }
  
    }
  
  
    /*
     * ----------------------------------------------------------
     * PREMIUM+
     * ----------------------------------------------------------
     */
  
    if (
      plan ===
      "premium_plus"
    ) {
  
      /*
       * Premium+ receives all currently defined features.
       */
  
      return true;
  
    }
  
  
    return false;
  }
  
  
  /*
   * ============================================================
   * NEXT JOURNEY ACCESS
   * ============================================================
   *
   * Convenience helper for the exact product behavior we're
   * implementing now.
   */
  
  export function canContinueToNextJourney():
    boolean {
  
    return canAccessFeature(
      "next_journey"
    );
  }
  
  
  /*
   * ============================================================
   * PREMIUM ACCESS
   * ============================================================
   */
  
  export function requiresPremium(
    feature: AccountFeature
  ): boolean {
  
    return (
      feature ===
        "ask_navigator" ||
  
      feature ===
        "document_vault" ||
  
      feature ===
        "meeting_prep" ||
  
      feature ===
        "advanced_resources"
    );
  
  }
  
  
  /*
   * ============================================================
   * PREMIUM+ ACCESS
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