import {
    doc,
    getDoc,
    setDoc,
  } from "firebase/firestore";
  
  import {
    db,
  } from "./firebase";
  
  import type {
    SubscriptionRecord,
    SubscriptionPlan,
    SubscriptionStatus,
  } from "./subscriptionTypes";
  
  
  /*
   * ============================================================
   * SUBSCRIPTION REPOSITORY
   * ============================================================
   *
   * Responsible for reading and writing the user's subscription
   * record.
   *
   * Firestore:
   *
   * users/{userId}/subscription/current
   *
   * IMPORTANT:
   *
   * This repository is the data layer only.
   *
   * The client should NOT be allowed to promote itself to
   * Premium by writing this document directly.
   *
   * When Stripe is connected, subscription updates should come
   * through a trusted server/webhook process.
   * ============================================================
   */
  
  
  /*
   * ============================================================
   * CURRENT SUBSCRIPTION REFERENCE
   * ============================================================
   */
  
  function getSubscriptionRef(
    userId: string
  ) {
  
    if (!userId) {
  
      throw new Error(
        "A user ID is required to access subscription data."
      );
  
    }
  
  
    return doc(
      db,
      "users",
      userId,
      "subscription",
      "current"
    );
  }
  
  
  /*
   * ============================================================
   * GET SUBSCRIPTION
   * ============================================================
   *
   * Returns the stored subscription record.
   *
   * Returns null when no subscription record exists.
   * ============================================================
   */
  
  export async function getSubscription(
    userId: string
  ): Promise<SubscriptionRecord | null> {
  
    const subscriptionRef =
      getSubscriptionRef(
        userId
      );
  
  
    const snapshot =
      await getDoc(
        subscriptionRef
      );
  
  
    if (
      !snapshot.exists()
    ) {
  
      return null;
  
    }
  
  
    const data =
      snapshot.data();
  
  
    if (
      !data
    ) {
  
      return null;
  
    }
  
  
    return {
      userId:
        typeof data.userId ===
        "string"
          ? data.userId
          : userId,
  
      plan:
        isValidPlan(
          data.plan
        )
          ? data.plan
          : "free",
  
      status:
        isValidSubscriptionStatus(
          data.status
        )
          ? data.status
          : "none",
  
      stripeCustomerId:
        typeof data.stripeCustomerId ===
        "string"
          ? data.stripeCustomerId
          : undefined,
  
      stripeSubscriptionId:
        typeof data.stripeSubscriptionId ===
        "string"
          ? data.stripeSubscriptionId
          : undefined,
  
      currentPeriodStart:
        typeof data.currentPeriodStart ===
        "number"
          ? data.currentPeriodStart
          : undefined,
  
      currentPeriodEnd:
        typeof data.currentPeriodEnd ===
        "number"
          ? data.currentPeriodEnd
          : undefined,
  
      cancelAtPeriodEnd:
        typeof data.cancelAtPeriodEnd ===
        "boolean"
          ? data.cancelAtPeriodEnd
          : undefined,
  
      createdAt:
        typeof data.createdAt ===
        "number"
          ? data.createdAt
          : Date.now(),
  
      updatedAt:
        typeof data.updatedAt ===
        "number"
          ? data.updatedAt
          : Date.now(),
    };
  
  }
  
  
  /*
   * ============================================================
   * SAVE SUBSCRIPTION
   * ============================================================
   *
   * This function exists so our application has one central
   * method for storing subscription records.
   *
   * IMPORTANT:
   *
   * We are not calling this from a Premium button or allowing
   * users to choose their own plan.
   *
   * Later, this should be called by trusted server-side billing
   * logic after Stripe verifies the subscription.
   * ============================================================
   */
  
  export async function saveSubscription(
    subscription: SubscriptionRecord
  ): Promise<void> {
  
    if (
      !subscription.userId
    ) {
  
      throw new Error(
        "A user ID is required to save subscription data."
      );
  
    }
  
  
    const subscriptionRef =
      getSubscriptionRef(
        subscription.userId
      );
  
  
    await setDoc(
      subscriptionRef,
      {
        ...subscription,
  
        updatedAt:
          Date.now(),
      },
      {
        merge:
          true,
      }
    );
  
  }
  
  
  /*
   * ============================================================
   * GET EFFECTIVE PLAN
   * ============================================================
   *
   * Determines the plan currently associated with the stored
   * subscription record.
   *
   * SAFETY RULE:
   *
   * If there is no valid active/trialing subscription, the user
   * falls back to Free.
   *
   * This prevents an invalid or incomplete subscription record
   * from accidentally granting Premium access.
   * ============================================================
   */
  
  export async function getEffectiveSubscriptionPlan(
    userId: string
  ): Promise<SubscriptionPlan> {
  
    const subscription =
      await getSubscription(
        userId
      );
  
  
    if (
      !subscription
    ) {
  
      return "free";
  
    }
  
  
    if (
      subscription.status !==
        "active" &&
      subscription.status !==
        "trialing"
    ) {
  
      return "free";
  
    }
  
  
    if (
      subscription.plan ===
        "premium" ||
      subscription.plan ===
        "premium_plus"
    ) {
  
      return subscription.plan;
  
    }
  
  
    return "free";
  }
  
  
  /*
   * ============================================================
   * VALIDATION HELPERS
   * ============================================================
   */
  
  function isValidPlan(
    value: unknown
  ): value is SubscriptionPlan {
  
    return (
      value ===
        "guest" ||
      value ===
        "free" ||
      value ===
        "premium" ||
      value ===
        "premium_plus"
    );
  
  }
  
  
  function isValidSubscriptionStatus(
    value: unknown
  ): value is SubscriptionStatus {
  
    return (
      value ===
        "none" ||
      value ===
        "active" ||
      value ===
        "trialing" ||
      value ===
        "past_due" ||
      value ===
        "canceled" ||
      value ===
        "incomplete"
    );
  
  }