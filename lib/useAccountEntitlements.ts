
"use client";

import {
  useCallback,
  useEffect,
  useRef,
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
 * Provides client-side subscription and feature access.
 *
 * Security protections:
 *
 * - Account-specific entitlement state.
 * - Immediate clearing of previous permissions.
 * - Stale asynchronous request protection.
 * - Fail-closed Premium authorization.
 * - Component unmount protection.
 *
 * Server authorization and Firebase Security Rules remain
 * the final security boundaries.
 */

export type AccountEntitlements = {
  plan: SubscriptionPlan;

  subscription: SubscriptionRecord | null;

  loading: boolean;

  error: string;

  canUse: (
    feature: SubscriptionFeature
  ) => boolean;

  isAuthenticated: boolean;

  isFree: boolean;

  isPremium: boolean;

  isPremiumPlus: boolean;

  refresh: () => Promise<void>;
};

/*
 * ============================================================
 * INTERNAL STATE
 * ============================================================
 */

type EntitlementState = {
  uid: string | null;

  plan: SubscriptionPlan;

  subscription: SubscriptionRecord | null;

  loading: boolean;

  error: string;
};

function createGuestState(
  loading = false
): EntitlementState {
  return {
    uid: null,
    plan: "guest",
    subscription: null,
    loading,
    error: "",
  };
}

function createAuthenticatedLoadingState(
  uid: string
): EntitlementState {
  return {
    uid,
    plan: "free",
    subscription: null,
    loading: true,
    error: "",
  };
}

/*
 * ============================================================
 * ACCOUNT ENTITLEMENTS
 * ============================================================
 */

export function useAccountEntitlements():
  AccountEntitlements {

  const [state, setState] =
    useState<EntitlementState>(
      () => createGuestState(true)
    );

  /*
   * Each new request invalidates previous requests.
   */

  const requestVersionRef =
    useRef(0);

  const mountedRef =
    useRef(false);

  /*
   * ==========================================================
   * VERIFY REQUEST OWNERSHIP
   * ==========================================================
   */

  const isCurrentRequest =
    useCallback(
      (
        requestVersion: number,
        uid: string
      ): boolean => {
        return (
          mountedRef.current &&
          requestVersionRef.current ===
            requestVersion &&
          getCurrentUser()?.uid === uid
        );
      },
      []
    );

  /*
   * ==========================================================
   * CLEAR ENTITLEMENTS
   * ==========================================================
   */

  const clearEntitlements =
    useCallback(() => {
      requestVersionRef.current += 1;

      if (!mountedRef.current) {
        return;
      }

      setState(
        createGuestState()
      );
    }, []);

  /*
   * ==========================================================
   * LOAD ACCOUNT SUBSCRIPTION
   * ==========================================================
   */

  const loadSubscription =
    useCallback(
      async (
        uid: string
      ): Promise<void> => {
        if (
          !mountedRef.current ||
          getCurrentUser()?.uid !== uid
        ) {
          return;
        }

        const requestVersion =
          ++requestVersionRef.current;

        /*
         * Immediately remove previously loaded permissions.
         */

        setState(
          createAuthenticatedLoadingState(uid)
        );

        try {
          const storedSubscription =
            await getSubscription(uid);

          if (
            !isCurrentRequest(
              requestVersion,
              uid
            )
          ) {
            return;
          }

          const effectivePlan =
            await getEffectiveSubscriptionPlan(
              uid
            );

          /*
           * Never apply permissions from an outdated
           * request or a different account.
           */

          if (
            !isCurrentRequest(
              requestVersion,
              uid
            )
          ) {
            return;
          }

          setState({
            uid,

            plan: effectivePlan,

            subscription:
              storedSubscription?.userId === uid
                ? storedSubscription
                : null,

            loading: false,

            error: "",
          });

        } catch {
          if (
            !isCurrentRequest(
              requestVersion,
              uid
            )
          ) {
            return;
          }

          console.error(
            "Unable to verify account entitlements."
          );

          /*
           * Fail closed.
           */

          setState({
            uid,
            plan: "free",
            subscription: null,
            loading: false,
            error:
              "We couldn't load your subscription information right now.",
          });
        }
      },
      [isCurrentRequest]
    );

  /*
   * ==========================================================
   * AUTHENTICATION STATE
   * ==========================================================
   */

  useEffect(() => {
    mountedRef.current = true;

    let active = true;

    const unsubscribe =
      watchAuthState(
        async (user) => {
          if (
            !active ||
            !mountedRef.current
          ) {
            return;
          }

          const currentUid =
            getCurrentUser()?.uid ?? null;

          const reportedUid =
            user?.uid ?? null;

          /*
           * Ignore outdated authentication callbacks.
           */

          if (
            currentUid !== reportedUid
          ) {
            return;
          }

          if (!user) {
            clearEntitlements();

            return;
          }

          await loadSubscription(
            user.uid
          );
        }
      );

    return () => {
      active = false;

      mountedRef.current = false;

      /*
       * Invalidate all outstanding requests.
       */

      requestVersionRef.current += 1;

      unsubscribe();
    };
  }, [
    clearEntitlements,
    loadSubscription,
  ]);

  /*
   * ==========================================================
   * REFRESH
   * ==========================================================
   */

  const refresh =
    useCallback(
      async (): Promise<void> => {
        if (!mountedRef.current) {
          return;
        }

        const user =
          getCurrentUser();

        if (!user) {
          clearEntitlements();

          return;
        }

        await loadSubscription(
          user.uid
        );
      },
      [
        clearEntitlements,
        loadSubscription,
      ]
    );

  /*
   * ==========================================================
   * EFFECTIVE ACCOUNT STATE
   * ==========================================================
   *
   * Stored permissions must belong to the currently
   * authenticated account.
   */

  const currentUid =
    getCurrentUser()?.uid ?? null;

  const accountMatches =
    state.uid === currentUid;

  const isAuthenticated =
    currentUid !== null;

  const loading =
    state.loading ||
    !accountMatches;

  const error =
    accountMatches
      ? state.error
      : "";

  const plan: SubscriptionPlan =
    !isAuthenticated
      ? "guest"
      : loading || error
        ? "free"
        : state.plan;

  const subscription =
    accountMatches &&
    !loading &&
    !error &&
    isAuthenticated
      ? state.subscription
      : null;

  /*
   * ==========================================================
   * FEATURE ACCESS
   * ==========================================================
   */

  const canUse =
    useCallback(
      (
        feature: SubscriptionFeature
      ): boolean => {
        const latestUid =
          getCurrentUser()?.uid ?? null;

        /*
         * Prevent stale callbacks from granting access
         * after an account switch.
         */

        if (
          latestUid !== currentUid ||
          loading ||
          Boolean(error)
        ) {
          return planIncludesFeature(
            latestUid ? "free" : "guest",
            feature
          );
        }

        return planIncludesFeature(
          plan,
          feature
        );
      },
      [
        currentUid,
        loading,
        error,
        plan,
      ]
    );

  /*
   * ==========================================================
   * CONVENIENCE FLAGS
   * ==========================================================
   */

  const isFree =
    isAuthenticated &&
    !loading &&
    plan === "free";

  const isPremium =
    isAuthenticated &&
    accountMatches &&
    !loading &&
    !error &&
    (
      plan === "premium" ||
      plan === "premium_plus"
    );

  const isPremiumPlus =
    isAuthenticated &&
    accountMatches &&
    !loading &&
    !error &&
    plan === "premium_plus";

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
