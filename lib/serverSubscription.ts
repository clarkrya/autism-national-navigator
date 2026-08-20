import {
    adminAuth,
    adminDb,
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
   * SERVER-ONLY MODULE.
   *
   * This file is responsible for determining whether an
   * authenticated Firebase user has a verified Premium or
   * Premium+ subscription.
   *
   * It is intended for:
   *
   * - Next.js API routes
   * - Server-side operations
   * - Community write authorization
   * - Future Stripe webhook integration
   *
   * DO NOT import this file into:
   *
   * - React client components
   * - "use client" files
   * - Browser-side utilities
   *
   * ============================================================
   */
  
  
  /*
   * ============================================================
   * TYPES
   * ============================================================
   */
  
  export type VerifiedSubscription = {
    uid: string;
  
    plan: SubscriptionPlan;
  
    status: SubscriptionStatus;
  
    subscription:
      | SubscriptionRecord
      | null;
  };
  
  
  export type ServerAuthorizationResult = {
    authorized: boolean;
  
    uid: string;
  
    plan: SubscriptionPlan;
  
    status: SubscriptionStatus;
  
    subscription:
      | SubscriptionRecord
      | null;
  };
  
  
  /*
   * ============================================================
   * VERIFY FIREBASE ID TOKEN
   * ============================================================
   *
   * Takes the Authorization header from an API request:
   *
   * Authorization: Bearer <Firebase ID Token>
   *
   * and verifies it through Firebase Admin.
   *
   * Admin verification is trusted server-side verification.
   * ============================================================
   */
  
  export async function verifyFirebaseRequest(
    request: Request
  ): Promise<VerifiedSubscription> {
  
    const authorization =
      request.headers.get(
        "authorization"
      );
  
  
    if (
      !authorization ||
      !authorization
        .toLowerCase()
        .startsWith("bearer ")
    ) {
  
      throw new Error(
        "AUTH_REQUIRED"
      );
  
    }
  
  
    const idToken =
      authorization
        .slice(7)
        .trim();
  
  
    if (!idToken) {
  
      throw new Error(
        "AUTH_REQUIRED"
      );
  
    }
  
  
    let decodedToken;
  
  
    try {
  
      decodedToken =
        await adminAuth.verifyIdToken(
          idToken
        );
  
    } catch (error) {
  
      console.error(
        "Firebase ID token verification failed:",
        error
      );
  
  
      throw new Error(
        "AUTH_INVALID"
      );
  
    }
  
  
    const uid =
      decodedToken.uid;
  
  
    /*
     * ----------------------------------------------------------
     * LOAD VERIFIED SUBSCRIPTION
     * ----------------------------------------------------------
     */
  
    const subscription =
      await getServerSubscription(
        uid
      );
  
  
    /*
     * ----------------------------------------------------------
     * DETERMINE EFFECTIVE PLAN
     * ----------------------------------------------------------
     */
  
    const plan =
      getEffectiveServerPlan(
        subscription
      );
  
  
    return {
      uid,
  
      plan,
  
      status:
        subscription?.status ??
        "none",
  
      subscription,
    };
  
  }
  
  
  /*
   * ============================================================
   * GET SERVER SUBSCRIPTION
   * ============================================================
   *
   * Reads directly through Firebase Admin.
   *
   * This bypasses client Firestore rules because this is trusted
   * server-side code.
   *
   * Path:
   *
   * users/{uid}/subscription/current
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
  
  
    const subscriptionRef =
      adminDb
        .collection("users")
        .doc(uid)
        .collection("subscription")
        .doc("current");
  
  
    const snapshot =
      await subscriptionRef.get();
  
  
    if (
      !snapshot.exists
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
          : uid,
  
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
          : 0,
  
      updatedAt:
        typeof data.updatedAt ===
        "number"
          ? data.updatedAt
          : 0,
    };
  
  }
  
  
  /*
   * ============================================================
   * EFFECTIVE SERVER PLAN
   * ============================================================
   *
   * SECURITY PRINCIPLE:
   *
   * Anything other than an active/trialing verified subscription
   * falls back to Free.
   *
   * This means:
   *
   * missing subscription → Free
   * canceled             → Free
   * past_due             → Free
   * incomplete           → Free
   * invalid plan         → Free
   *
   * Premium and Premium+ are granted only when the stored
   * subscription record explicitly identifies the plan and has
   * an active/trialing status.
   * ============================================================
   */
  
  export function getEffectiveServerPlan(
    subscription:
      | SubscriptionRecord
      | null
  ): SubscriptionPlan {
  
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
   * REQUIRE AUTHENTICATED USER
   * ============================================================
   *
   * Useful for API routes that only require a login, regardless
   * of subscription level.
   * ============================================================
   */
  
  export async function requireAuthenticatedUser(
    request: Request
  ): Promise<{
    uid: string;
    email?: string;
  }> {
  
    const authorization =
      request.headers.get(
        "authorization"
      );
  
  
    if (
      !authorization ||
      !authorization
        .toLowerCase()
        .startsWith("bearer ")
    ) {
  
      throw new Error(
        "AUTH_REQUIRED"
      );
  
    }
  
  
    const idToken =
      authorization
        .slice(7)
        .trim();
  
  
    if (!idToken) {
  
      throw new Error(
        "AUTH_REQUIRED"
      );
  
    }
  
  
    try {
  
      const decodedToken =
        await adminAuth.verifyIdToken(
          idToken
        );
  
  
      return {
        uid:
          decodedToken.uid,
  
        email:
          decodedToken.email,
      };
  
    } catch (error) {
  
      console.error(
        "Firebase authentication failed:",
        error
      );
  
  
      throw new Error(
        "AUTH_INVALID"
      );
  
    }
  
  }
  
  
  /*
   * ============================================================
   * REQUIRE PREMIUM
   * ============================================================
   *
   * Use this inside a server API route when the endpoint should
   * only be accessible to Premium or Premium+ users.
   *
   * Example:
   *
   * const account =
   *   await requirePremium(request);
   *
   * account.plan
   * ============================================================
   */
  
  export async function requirePremium(
    request: Request
  ): Promise<VerifiedSubscription> {
  
    const account =
      await verifyFirebaseRequest(
        request
      );
  
  
    if (
      account.plan !==
        "premium" &&
      account.plan !==
        "premium_plus"
    ) {
  
      throw new Error(
        "PREMIUM_REQUIRED"
      );
  
    }
  
  
    return account;
  }
  
  
  /*
   * ============================================================
   * REQUIRE PREMIUM+
   * ============================================================
   *
   * Used for features reserved specifically for Premium+.
   * ============================================================
   */
  
  export async function requirePremiumPlus(
    request: Request
  ): Promise<VerifiedSubscription> {
  
    const account =
      await verifyFirebaseRequest(
        request
      );
  
  
    if (
      account.plan !==
      "premium_plus"
    ) {
  
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
  
  
  /*
   * ============================================================
   * STATUS VALIDATION
   * ============================================================
   */
  
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