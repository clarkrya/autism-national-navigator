"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getCurrentUser,
  watchAuthState,
} from "./auth";

import {
  getSubscription,
  getEffectiveSubscriptionPlan,
} from "./subscriptionRepository";

import type {
  SubscriptionFeature,
  SubscriptionPlan,
  SubscriptionRecord,
} from "./subscriptionTypes";

import {
  planIncludesFeature,
} from "./subscriptionTypes";


/*
 * ============================================================
 * ACCOUNT ENTITLEMENTS HOOK
 * ============================================================
 *
 * Provides the CURRENT user's subscription and feature access
 * to client components.
 *
 * IMPORTANT:
 *
 * This hook is for UI/product behavior.
 *
 * It is NOT the final security boundary for Premium data or
 * Premium APIs.
 *
 * Server-side authorization will still be required before
 * launch for protected Premium functionality.
 * ============================================================
 */


export type AccountEntitlements = {

  /*
   * Current subscription plan.
   *
   * Guest when no user is authenticated.
   * Free when an authenticated user has no active paid plan.
   */

  plan: SubscriptionPlan;


  /*
   * Stored subscription record, when one exists.
   */

  subscription:
    | SubscriptionRecord
    | null;


  /*
   * Loading state while Firebase/auth/subscription data
   * is being resolved.
   */

  loading: boolean;


  /*
   * Any subscription loading error.
   */

  error: string;


  /*
   * Check whether the current user can use a feature.
   */

  canUse: (
    feature: SubscriptionFeature
  ) => boolean;


  /*
   * Convenience checks.
   */

  isAuthenticated: boolean;

  isFree: boolean;

  isPremium: boolean;

  isPremiumPlus: boolean;


  /*
   * Refresh subscription information manually.
   *
   * Useful after a future checkout flow returns from Stripe.
   */

  refresh: () => Promise<void>;
};


export function useAccountEntitlements():
  AccountEntitlements {

  /*
   * ==========================================================
   * STATE
   * ==========================================================
   */

  const [
    plan,
    setPlan,
  ] = useState<SubscriptionPlan>(
    "guest"
  );


  const [
    subscription,
    setSubscription,
  ] = useState<
    SubscriptionRecord | null
  >(
    null
  );


  const [
    loading,
    setLoading,
  ] = useState(true);


  const [
    error,
    setError,
  ] = useState("");


  const [
    isAuthenticated,
    setIsAuthenticated,
  ] = useState(false);


  /*
   * ==========================================================
   * LOAD SUBSCRIPTION
   * ==========================================================
   */

  const loadSubscription =
    useCallback(
      async (
        uid: string
      ) => {

        setLoading(
          true
        );

        setError("");


        try {

          /*
           * --------------------------------------------------
           * LOAD STORED SUBSCRIPTION
           * --------------------------------------------------
           */

          const storedSubscription =
            await getSubscription(
              uid
            );


          setSubscription(
            storedSubscription
          );


          /*
           * --------------------------------------------------
           * DETERMINE EFFECTIVE PLAN
           * --------------------------------------------------
           *
           * If there is no valid active/trialing Premium
           * subscription, the repository returns "free".
           */

          const effectivePlan =
            await getEffectiveSubscriptionPlan(
              uid
            );


          setPlan(
            effectivePlan
          );

        } catch (subscriptionError) {

          console.error(
            "Unable to load account subscription:",
            subscriptionError
          );


          /*
           * Fail closed.
           *
           * If subscription state cannot be verified, do not
           * grant Premium access.
           */

          setPlan(
            "free"
          );

          setSubscription(
            null
          );


          setError(
            "We couldn't load your subscription information right now."
          );

        } finally {

          setLoading(
            false
          );

        }

      },
      []
    );


  /*
   * ==========================================================
   * AUTH STATE
   * ==========================================================
   */

  useEffect(() => {

    let active = true;


    const unsubscribe =
      watchAuthState(
        async (user) => {

          if (!active) {
            return;
          }


          /*
           * ------------------------------------------------
           * GUEST
           * ------------------------------------------------
           */

          if (!user) {

            setIsAuthenticated(
              false
            );

            setPlan(
              "guest"
            );

            setSubscription(
              null
            );

            setError("");

            setLoading(
              false
            );

            return;
          }


          /*
           * ------------------------------------------------
           * AUTHENTICATED
           * ------------------------------------------------
           */

          setIsAuthenticated(
            true
          );


          await loadSubscription(
            user.uid
          );

        }
      );


    return () => {

      active = false;

      unsubscribe();

    };

  }, [
    loadSubscription,
  ]);


  /*
   * ==========================================================
   * REFRESH
   * ==========================================================
   */

  const refresh =
    useCallback(
      async () => {

        const user =
          getCurrentUser();


        /*
         * Guest has no subscription record.
         */

        if (!user) {

          setIsAuthenticated(
            false
          );

          setPlan(
            "guest"
          );

          setSubscription(
            null
          );

          setError("");

          setLoading(
            false
          );

          return;
        }


        setIsAuthenticated(
          true
        );


        await loadSubscription(
          user.uid
        );

      },
      [
        loadSubscription,
      ]
    );


  /*
   * ==========================================================
   * FEATURE ACCESS
   * ==========================================================
   *
   * Guests are handled through the same subscription plan
   * definitions.
   *
   * Free/Premium/Premium+ feature definitions live in:
   *
   * subscriptionTypes.ts
   */

  const canUse =
    useCallback(
      (
        feature: SubscriptionFeature
      ) => {

        if (
          plan === "guest"
        ) {

          /*
           * Guests only receive the features explicitly
           * defined for the guest plan.
           */

          return planIncludesFeature(
            "guest",
            feature
          );

        }


        return planIncludesFeature(
          plan,
          feature
        );

      },
      [
        plan,
      ]
    );


  /*
   * ==========================================================
   * CONVENIENCE FLAGS
   * ==========================================================
   */

  const isFree =
    useMemo(
      () =>
        plan === "free",
      [
        plan,
      ]
    );


  const isPremium =
    useMemo(
      () =>
        plan === "premium" ||
        plan === "premium_plus",
      [
        plan,
      ]
    );


  const isPremiumPlus =
    useMemo(
      () =>
        plan === "premium_plus",
      [
        plan,
      ]
    );


  /*
   * ==========================================================
   * RETURN
   * ==========================================================
   */

  return {
    plan,

    subscription,

    loading,

    error,

    canUse,

    isAuthenticated,

    isFree,

    isPremium,

    isPremiumPlus,

    refresh,
  };

}