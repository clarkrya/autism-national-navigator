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
 * Tester access:
 *
 * users/{userId}/testerAccess/current
 *
 * IMPORTANT:
 *
 * This repository is the client-side data layer only.
 *
 * The client must NOT be allowed to promote itself to Premium
 * by directly writing either:
 *
 * - subscription/current
 * - testerAccess/current
 *
 * Paid subscription updates should come from trusted
 * server-side billing logic.
 *
 * Tester access should come from the protected tester
 * redemption API.
 *
 * Tester access grants Premium only.
 * It never grants Premium+.
 * ============================================================
 */


/*
 * ============================================================
 * TESTER ACCESS TYPE
 * ============================================================
 */

export type TesterAccessRecord = {
  active: true;

  plan: "premium";

  voucherId?: string;

  redeemedAt?: number;

  expiresAt: number;

  updatedAt?: number;
};


/*
 * ============================================================
 * CURRENT SUBSCRIPTION REFERENCE
 * ============================================================
 */

function getSubscriptionRef(
  userId: string
) {

  if (
    !userId
  ) {

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
 * CURRENT TESTER ACCESS REFERENCE
 * ============================================================
 */

function getTesterAccessRef(
  userId: string
) {

  if (
    !userId
  ) {

    throw new Error(
      "A user ID is required to access tester data."
    );

  }


  return doc(
    db,
    "users",
    userId,
    "testerAccess",
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
 * GET TESTER ACCESS
 * ============================================================
 *
 * Reads tester access granted through the protected tester
 * redemption API.
 *
 * A valid tester entitlement must:
 *
 * - exist
 * - be active
 * - grant Premium only
 * - contain a numeric expiration
 * - not be expired
 *
 * Returns null when any of those conditions are not met.
 * ============================================================
 */

export async function getTesterAccess(
  userId: string
): Promise<TesterAccessRecord | null> {

  const testerAccessRef =
    getTesterAccessRef(
      userId
    );


  const snapshot =
    await getDoc(
      testerAccessRef
    );


  if (
    !snapshot.exists()
  ) {

    return null;

  }


  const data =
    snapshot.data();


  /*
   * Tester access must be explicitly active.
   */

  if (
    !data ||
    data.active !== true
  ) {

    return null;

  }


  /*
   * Tester access intentionally grants Premium only.
   *
   * Premium+ remains reserved for a real Premium+
   * subscription.
   */

  if (
    data.plan !==
      "premium"
  ) {

    return null;

  }


  /*
   * Expiration is required.
   *
   * A tester entitlement without a valid numeric expiration
   * must fail closed rather than remain active indefinitely.
   */

  if (
    typeof data.expiresAt !==
      "number"
  ) {

    return null;

  }


  const expiresAt =
    data.expiresAt;


  if (
    !Number.isFinite(
      expiresAt
    )
  ) {

    return null;

  }


  /*
   * Expired tester access must not grant Premium.
   */

  if (
    expiresAt <=
      Date.now()
  ) {

    return null;

  }


  return {
    active:
      true,

    plan:
      "premium",

    voucherId:
      typeof data.voucherId ===
        "string"
        ? data.voucherId
        : undefined,

    redeemedAt:
      typeof data.redeemedAt ===
        "number"
        ? data.redeemedAt
        : undefined,

    expiresAt,

    updatedAt:
      typeof data.updatedAt ===
        "number"
        ? data.updatedAt
        : undefined,
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
 *
 * Firestore Security Rules currently prevent client-side
 * writes to subscription/current.
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
 * Determines the user's effective plan.
 *
 * Access can come from:
 *
 * 1. A valid active/trialing paid subscription
 * 2. A valid active Premium tester entitlement
 *
 * Paid access takes precedence.
 *
 * SAFETY RULE:
 *
 * If neither source grants Premium access, the user falls
 * back to Free.
 * ============================================================
 */

export async function getEffectiveSubscriptionPlan(
  userId: string
): Promise<SubscriptionPlan> {

  /*
   * ----------------------------------------------------------
   * CHECK PAID SUBSCRIPTION
   * ----------------------------------------------------------
   */

  const subscription =
    await getSubscription(
      userId
    );


  if (
    subscription &&
    (
      subscription.status ===
        "active" ||
      subscription.status ===
        "trialing"
    ) &&
    (
      subscription.plan ===
        "premium" ||
      subscription.plan ===
        "premium_plus"
    )
  ) {

    return subscription.plan;

  }


  /*
   * ----------------------------------------------------------
   * CHECK TESTER ACCESS
   * ----------------------------------------------------------
   */

  const testerAccess =
    await getTesterAccess(
      userId
    );


  if (
    testerAccess
  ) {

    return "premium";

  }


  /*
   * ----------------------------------------------------------
   * DEFAULT TO FREE
   * ----------------------------------------------------------
   */

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