
import "server-only";

import {
  getAdminAuth,
  getAdminDb,
} from "./firebaseAdmin";

import type {
  SubscriptionPlan,
  SubscriptionRecord,
  SubscriptionStatus,
} from "./subscriptionTypes";

/*
 * ============================================================
 * SERVER SUBSCRIPTION AUTHORIZATION
 * ============================================================
 *
 * Trusted server-side authorization for Autivoya.
 *
 * Premium access may be granted through:
 *
 * 1. A valid, unexpired paid subscription.
 * 2. A valid, unexpired Premium tester entitlement.
 *
 * Tester access never grants Premium+.
 *
 * Firebase Admin services are initialized lazily.
 */

/*
 * TYPES
 */

export type VerifiedSubscription = {
  uid: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  subscription: SubscriptionRecord | null;
};

export type ServerAuthorizationResult = {
  authorized: boolean;
  uid: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  subscription: SubscriptionRecord | null;
};

export type ServerTesterAccess = {
  active: true;
  plan: "premium";
  expiresAt: number;
};

/*
 * ============================================================
 * REQUIRE AUTHENTICATED USER
 * ============================================================
 */

export async function requireAuthenticatedUser(
  request: Request
): Promise<{
  uid: string;
  email?: string;
}> {
  const authorization =
    request.headers.get("authorization");

  if (
    !authorization ||
    !authorization
      .toLowerCase()
      .startsWith("bearer ")
  ) {
    throw new Error("AUTH_REQUIRED");
  }

  const idToken =
    authorization.slice(7).trim();

  if (!idToken) {
    throw new Error("AUTH_REQUIRED");
  }

  const adminAuth = getAdminAuth();

  try {
    /*
     * The second argument enables revoked-token
     * and disabled-account verification.
     */

    const decodedToken =
      await adminAuth.verifyIdToken(
        idToken,
        true
      );

    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
    };
  } catch {
    console.error(
      "Firebase authentication verification failed."
    );

    throw new Error("AUTH_INVALID");
  }
}

/*
 * ============================================================
 * GET SERVER SUBSCRIPTION
 * ============================================================
 */

export async function getServerSubscription(
  uid: string
): Promise<SubscriptionRecord | null> {
  if (!uid) {
    throw new Error(
      "A Firebase UID is required."
    );
  }

  const adminDb = getAdminDb();

  const subscriptionRef = adminDb
    .collection("users")
    .doc(uid)
    .collection("subscription")
    .doc("current");

  const snapshot =
    await subscriptionRef.get();

  if (!snapshot.exists) {
    return null;
  }

  const data = snapshot.data();

  if (!data) {
    return null;
  }

  /*
   * Reject subscription records explicitly associated
   * with a different account.
   */

  if (
    data.userId !== undefined &&
    data.userId !== uid
  ) {
    return null;
  }

  return {
    userId: uid,

    plan: isValidPlan(data.plan)
      ? data.plan
      : "free",

    status: isValidSubscriptionStatus(
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
        "number" &&
      Number.isFinite(data.currentPeriodStart)
        ? data.currentPeriodStart
        : undefined,

    currentPeriodEnd:
      typeof data.currentPeriodEnd ===
        "number" &&
      Number.isFinite(data.currentPeriodEnd)
        ? data.currentPeriodEnd
        : undefined,

    cancelAtPeriodEnd:
      typeof data.cancelAtPeriodEnd ===
      "boolean"
        ? data.cancelAtPeriodEnd
        : undefined,

    createdAt:
      typeof data.createdAt === "number"
        ? data.createdAt
        : 0,

    updatedAt:
      typeof data.updatedAt === "number"
        ? data.updatedAt
        : 0,
  };
}

/*
 * ============================================================
 * GET EFFECTIVE PAID SUBSCRIPTION PLAN
 * ============================================================
 *
 * Stripe subscription timestamps are stored in milliseconds.
 *
 * Missing, invalid, or expired billing periods fail closed.
 */

export function getEffectiveServerPlan(
  subscription: SubscriptionRecord | null
): SubscriptionPlan {
  if (!subscription) {
    return "free";
  }

  if (
    subscription.status !== "active" &&
    subscription.status !== "trialing"
  ) {
    return "free";
  }

  if (
    subscription.plan !== "premium" &&
    subscription.plan !== "premium_plus"
  ) {
    return "free";
  }

  const expiresAt =
    subscription.currentPeriodEnd;

  if (
    typeof expiresAt !== "number" ||
    !Number.isSafeInteger(expiresAt) ||
    expiresAt <= Date.now()
  ) {
    return "free";
  }

  return subscription.plan;
}

/*
 * ============================================================
 * GET SERVER TESTER ACCESS
 * ============================================================
 *
 * Tester access is read directly through Firebase Admin.
 *
 * Tester access grants Premium only.
 */

export async function getServerTesterAccess(
  uid: string
): Promise<ServerTesterAccess | null> {
  if (!uid) {
    throw new Error(
      "A Firebase UID is required."
    );
  }

  const adminDb = getAdminDb();

  const testerAccessRef = adminDb
    .collection("users")
    .doc(uid)
    .collection("testerAccess")
    .doc("current");

  const snapshot =
    await testerAccessRef.get();

  if (!snapshot.exists) {
    return null;
  }

  const data = snapshot.data();

  if (!data) {
    return null;
  }

  if (
    data.active !== true ||
    data.plan !== "premium"
  ) {
    return null;
  }

  if (
    typeof data.expiresAt !== "number" ||
    !Number.isSafeInteger(data.expiresAt) ||
    data.expiresAt <= Date.now()
  ) {
    return null;
  }

  return {
    active: true,
    plan: "premium",
    expiresAt: data.expiresAt,
  };
}

/*
 * ============================================================
 * GET EFFECTIVE SERVER ACCOUNT PLAN
 * ============================================================
 *
 * Paid subscriptions take precedence over tester access.
 */

export async function getEffectiveServerAccountPlan(
  uid: string,
  subscription: SubscriptionRecord | null
): Promise<SubscriptionPlan> {
  if (!uid) {
    throw new Error(
      "A Firebase UID is required."
    );
  }

  if (
    subscription &&
    subscription.userId !== uid
  ) {
    throw new Error(
      "SUBSCRIPTION_OWNER_MISMATCH"
    );
  }

  const paidPlan =
    getEffectiveServerPlan(subscription);

  if (
    paidPlan === "premium" ||
    paidPlan === "premium_plus"
  ) {
    return paidPlan;
  }

  const testerAccess =
    await getServerTesterAccess(uid);

  if (
    testerAccess &&
    testerAccess.expiresAt > Date.now()
  ) {
    return "premium";
  }

  return "free";
}

/*
 * ============================================================
 * VERIFY FIREBASE REQUEST
 * ============================================================
 *
 * Authenticates the request and determines the user's
 * effective server-side entitlement.
 */

export async function verifyFirebaseRequest(
  request: Request
): Promise<VerifiedSubscription> {
  const account =
    await requireAuthenticatedUser(request);

  const uid = account.uid;

  const subscription =
    await getServerSubscription(uid);

  const plan =
    await getEffectiveServerAccountPlan(
      uid,
      subscription
    );

  return {
    uid,

    plan,

    /*
     * Status reflects the stored paid subscription.
     * Effective access is determined by plan.
     */

    status:
      subscription?.status ?? "none",

    subscription,
  };
}

/*
 * ============================================================
 * REQUIRE PREMIUM
 * ============================================================
 *
 * Allows:
 *
 * - Valid paid Premium
 * - Valid paid Premium+
 * - Valid Premium tester access
 */

export async function requirePremium(
  request: Request
): Promise<VerifiedSubscription> {
  const account =
    await verifyFirebaseRequest(request);

  if (
    account.plan !== "premium" &&
    account.plan !== "premium_plus"
  ) {
    throw new Error("PREMIUM_REQUIRED");
  }

  return account;
}

/*
 * ============================================================
 * REQUIRE PREMIUM+
 * ============================================================
 *
 * Only a valid paid Premium+ subscription qualifies.
 */

export async function requirePremiumPlus(
  request: Request
): Promise<VerifiedSubscription> {
  const account =
    await verifyFirebaseRequest(request);

  if (account.plan !== "premium_plus") {
    throw new Error(
      "PREMIUM_PLUS_REQUIRED"
    );
  }

  return account;
}

/*
 * ============================================================
 * PLAN VALIDATION
 * ============================================================
 */

function isValidPlan(
  value: unknown
): value is SubscriptionPlan {
  return (
    value === "guest" ||
    value === "free" ||
    value === "premium" ||
    value === "premium_plus"
  );
}

/*
 * ============================================================
 * STATUS VALIDATION
 * ============================================================
 */

function isValidSubscriptionStatus(
  value: unknown
): value is SubscriptionStatus {
  return (
    value === "none" ||
    value === "active" ||
    value === "trialing" ||
    value === "past_due" ||
    value === "canceled" ||
    value === "incomplete"
  );
}
