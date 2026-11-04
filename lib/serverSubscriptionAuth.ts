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
 * This module verifies Firebase users without relying on
 * Firebase Admin private-key parsing.
 *
 * Authentication:
 *
 * Firebase ID token
 *      ↓
 * Firebase Identity Toolkit REST API
 *
 * Firestore access:
 *
 * Firebase ID token
 *      ↓
 * Firestore REST API
 *      ↓
 * Firestore Security Rules
 *
 * Premium access may come from:
 *
 * 1. An active/trialing paid Premium subscription
 * 2. Active, unexpired Premium tester access
 *
 * Tester access NEVER grants Premium+.
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

  idToken: string;
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


type FirebaseLookupUser = {
  localId?: string;

  email?: string;
};


type FirebaseLookupResponse = {
  users?: FirebaseLookupUser[];

  error?: {
    message?: string;
  };
};


type FirestoreRestValue =
  | {
      stringValue?: string;
    }
  | {
      integerValue?:
        | string
        | number;
    }
  | {
      doubleValue?: number;
    }
  | {
      booleanValue?: boolean;
    }
  | {
      nullValue?: null;
    }
  | {
      timestampValue?: string;
    }
  | {
      mapValue?: {
        fields?: Record<
          string,
          FirestoreRestValue
        >;
      };
    }
  | {
      arrayValue?: {
        values?: FirestoreRestValue[];
      };
    };


type FirestoreRestDocument = {
  name?: string;

  fields?: Record<
    string,
    FirestoreRestValue
  >;

  createTime?: string;

  updateTime?: string;

  error?: {
    status?: string;

    message?: string;
  };
};


type TesterAccessRecord = {
  active: true;

  plan: "premium";

  voucherId?: string;

  redeemedAt?: number;

  expiresAt: number;
};


/*
 * ============================================================
 * ENVIRONMENT HELPERS
 * ============================================================
 */

function getFirebaseApiKey(): string {

  const apiKey =
    process.env
      .NEXT_PUBLIC_FIREBASE_API_KEY
      ?.trim();


  if (
    !apiKey
  ) {

    throw new Error(
      "FIREBASE_API_KEY_MISSING"
    );

  }


  return apiKey;
}


function getFirebaseProjectId(): string {

  const projectId =
    (
      process.env
        .NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
      process.env
        .FIREBASE_ADMIN_PROJECT_ID
    )
      ?.trim();


  if (
    !projectId
  ) {

    throw new Error(
      "FIREBASE_PROJECT_ID_MISSING"
    );

  }


  return projectId;
}


/*
 * ============================================================
 * AUTHORIZATION HEADER
 * ============================================================
 */

function getRequestIdToken(
  request: Request
): string {

  const authorization =
    request.headers.get(
      "authorization"
    );


  if (
    !authorization ||
    !authorization
      .toLowerCase()
      .startsWith(
        "bearer "
      )
  ) {

    throw new Error(
      "AUTH_REQUIRED"
    );

  }


  const idToken =
    authorization
      .slice(7)
      .trim();


  if (
    !idToken
  ) {

    throw new Error(
      "AUTH_REQUIRED"
    );

  }


  return idToken;
}


/*
 * ============================================================
 * VERIFY FIREBASE ID TOKEN
 * ============================================================
 */

async function lookupFirebaseUser(
  idToken: string
): Promise<{
  uid: string;

  email?: string;
}> {

  const apiKey =
    getFirebaseApiKey();


  const response =
    await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(
        apiKey
      )}`,
      {
        method:
          "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify({
            idToken,
          }),

        cache:
          "no-store",
      }
    );


  let data:
    FirebaseLookupResponse =
    {};


  try {

    data =
      (
        await response.json()
      ) as FirebaseLookupResponse;

  } catch {

    data =
      {};

  }


  if (
    !response.ok
  ) {

    console.error(
      "Firebase ID token verification failed:",
      {
        status:
          response.status,

        message:
          data.error
            ?.message,
      }
    );


    throw new Error(
      "AUTH_INVALID"
    );

  }


  const user =
    data.users?.[0];


  const uid =
    user?.localId
      ?.trim();


  if (
    !uid
  ) {

    throw new Error(
      "AUTH_INVALID"
    );

  }


  const email =
    typeof user?.email ===
      "string" &&
    user.email.trim()

      ? user.email.trim()

      : undefined;


  return {
    uid,

    email,
  };
}


/*
 * ============================================================
 * FIRESTORE REST VALUE DECODER
 * ============================================================
 */

function decodeFirestoreValue(
  value:
    FirestoreRestValue |
    undefined
): unknown {

  if (
    !value ||
    typeof value !==
      "object"
  ) {
    return undefined;
  }


  if (
    "stringValue" in
      value
  ) {

    return value.stringValue;

  }


  if (
    "integerValue" in
      value
  ) {

    const integerValue =
      value.integerValue;


    if (
      typeof integerValue ===
        "number"
    ) {
      return integerValue;
    }


    if (
      typeof integerValue ===
        "string"
    ) {

      const parsed =
        Number(
          integerValue
        );


      return Number.isFinite(
        parsed
      )
        ? parsed
        : 0;

    }

  }


  if (
    "doubleValue" in
      value
  ) {

    return value.doubleValue;

  }


  if (
    "booleanValue" in
      value
  ) {

    return value.booleanValue;

  }


  if (
    "nullValue" in
      value
  ) {

    return null;

  }


  if (
    "timestampValue" in
      value
  ) {

    return value.timestampValue;

  }


  if (
    "mapValue" in
      value
  ) {

    return decodeFirestoreFields(
      value.mapValue
        ?.fields
    );

  }


  if (
    "arrayValue" in
      value
  ) {

    return (
      value.arrayValue
        ?.values ||
      []
    ).map(
      (
        item
      ) =>
        decodeFirestoreValue(
          item
        )
    );

  }


  return undefined;
}


function decodeFirestoreFields(
  fields:
    Record<
      string,
      FirestoreRestValue
    > |
    undefined
): Record<string, unknown> {

  const decoded:
    Record<string, unknown> =
    {};


  if (
    !fields
  ) {
    return decoded;
  }


  Object.entries(
    fields
  ).forEach(
    (
      [
        key,
        value,
      ]
    ) => {

      decoded[key] =
        decodeFirestoreValue(
          value
        );

    }
  );


  return decoded;
}


/*
 * ============================================================
 * AUTHENTICATED FIRESTORE DOCUMENT
 * ============================================================
 *
 * Reads a Firestore document using the authenticated user's
 * Firebase ID token.
 *
 * Firestore Security Rules remain active.
 * ============================================================
 */

export async function getAuthenticatedFirestoreDocument(
  documentPath: string,
  idToken: string
): Promise<Record<string, unknown> | null> {

  const projectId =
    getFirebaseProjectId();


  const normalizedPath =
    documentPath
      .split("/")
      .map(
        (
          segment
        ) =>
          encodeURIComponent(
            segment
          )
      )
      .join("/");


  const url =
    `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
      projectId
    )}/databases/(default)/documents/${normalizedPath}`;


  const response =
    await fetch(
      url,
      {
        method:
          "GET",

        headers: {
          Authorization:
            `Bearer ${idToken}`,
        },

        cache:
          "no-store",
      }
    );


  if (
    response.status ===
    404
  ) {

    return null;

  }


  let data:
    FirestoreRestDocument =
    {};


  try {

    data =
      (
        await response.json()
      ) as FirestoreRestDocument;

  } catch {

    data =
      {};

  }


  if (
    response.status ===
    401
  ) {

    throw new Error(
      "AUTH_INVALID"
    );

  }


  if (
    response.status ===
    403
  ) {

    console.error(
      "Firestore REST permission denied:",
      {
        documentPath,

        status:
          data.error
            ?.status,

        message:
          data.error
            ?.message,
      }
    );


    throw new Error(
      "FIRESTORE_PERMISSION_DENIED"
    );

  }


  if (
    !response.ok
  ) {

    console.error(
      "Firestore REST document read failed:",
      {
        documentPath,

        httpStatus:
          response.status,

        status:
          data.error
            ?.status,

        message:
          data.error
            ?.message,
      }
    );


    throw new Error(
      "FIRESTORE_READ_FAILED"
    );

  }


  return decodeFirestoreFields(
    data.fields
  );
}


/*
 * ============================================================
 * SUBSCRIPTION NORMALIZATION
 * ============================================================
 */

function normalizeSubscription(
  uid: string,
  data:
    Record<string, unknown> |
    null
): SubscriptionRecord | null {

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
 * TESTER ACCESS NORMALIZATION
 * ============================================================
 */

function normalizeTesterAccess(
  data:
    Record<string, unknown> |
    null
): TesterAccessRecord | null {

  if (
    !data
  ) {
    return null;
  }


  if (
    data.active !==
      true
  ) {

    return null;

  }


  /*
   * Tester access deliberately grants Premium only.
   */

  if (
    data.plan !==
      "premium"
  ) {

    return null;

  }


  const expiresAt =
    typeof data.expiresAt ===
      "number"
      ? data.expiresAt
      : undefined;


  if (
    typeof expiresAt !==
      "number"
  ) {

    return null;

  }


  if (
    !Number.isFinite(
      expiresAt
    ) ||
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
  };
}


/*
 * ============================================================
 * COMMUNITY MODERATOR AUTHORIZATION
 * ============================================================
 */

export type CommunityModeratorRole =
  | "moderator"
  | "admin";


export type VerifiedCommunityModerator = {
  uid: string;

  email?: string;

  role: CommunityModeratorRole;

  idToken: string;
};


function isCommunityModeratorRole(
  value: unknown
): value is CommunityModeratorRole {

  return (
    value === "moderator" ||
    value === "admin"
  );
}


export async function requireCommunityModerator(
  request: Request
): Promise<VerifiedCommunityModerator> {

  const account =
    await requireAuthenticatedUser(
      request
    );


  const access =
    await getAuthenticatedFirestoreDocument(
      `users/${account.uid}/communityAccess/current`,
      account.idToken
    );


  if (
    !access
  ) {

    throw new Error(
      "COMMUNITY_MODERATOR_REQUIRED"
    );

  }


  if (
    access.active !== true
  ) {

    throw new Error(
      "COMMUNITY_MODERATOR_REQUIRED"
    );

  }


  if (
    !isCommunityModeratorRole(
      access.role
    )
  ) {

    throw new Error(
      "COMMUNITY_MODERATOR_REQUIRED"
    );

  }


  return {
    uid:
      account.uid,

    email:
      account.email,

    role:
      access.role,

    idToken:
      account.idToken,
  };
}


/*
 * ============================================================
 * VERIFY FIREBASE REQUEST
 * ============================================================
 *
 * Determines the effective server-side plan.
 *
 * Paid subscriptions take precedence.
 *
 * If no paid Premium subscription exists, an active,
 * unexpired tester entitlement may grant Premium.
 * ============================================================
 */

export async function verifyFirebaseRequest(
  request: Request
): Promise<VerifiedSubscription> {

  const idToken =
    getRequestIdToken(
      request
    );


  const user =
    await lookupFirebaseUser(
      idToken
    );


  /*
   * Both documents are owner-readable under Firestore rules.
   *
   * Read them concurrently to avoid unnecessary latency.
   */

  const [
    subscriptionData,
    testerAccessData,
  ] =
    await Promise.all([
      getAuthenticatedFirestoreDocument(
        `users/${user.uid}/subscription/current`,
        idToken
      ),

      getAuthenticatedFirestoreDocument(
        `users/${user.uid}/testerAccess/current`,
        idToken
      ),
    ]);


  const subscription =
    normalizeSubscription(
      user.uid,
      subscriptionData
    );


  const testerAccess =
    normalizeTesterAccess(
      testerAccessData
    );


  const plan =
    getEffectiveServerPlan(
      subscription,
      testerAccess
    );


  return {
    uid:
      user.uid,

    plan,

    status:
      subscription
        ?.status ??
      "none",

    subscription,

    idToken,
  };
}


/*
 * ============================================================
 * GET SERVER SUBSCRIPTION
 * ============================================================
 */

export async function getServerSubscription(
  uid: string,
  idToken: string
): Promise<SubscriptionRecord | null> {

  if (
    !uid
  ) {

    throw new Error(
      "A Firebase UID is required."
    );

  }


  if (
    !idToken
  ) {

    throw new Error(
      "A Firebase ID token is required."
    );

  }


  const data =
    await getAuthenticatedFirestoreDocument(
      `users/${uid}/subscription/current`,
      idToken
    );


  return normalizeSubscription(
    uid,
    data
  );
}


/*
 * ============================================================
 * GET SERVER TESTER ACCESS
 * ============================================================
 */

export async function getServerTesterAccess(
  uid: string,
  idToken: string
): Promise<TesterAccessRecord | null> {

  if (
    !uid
  ) {

    throw new Error(
      "A Firebase UID is required."
    );

  }


  if (
    !idToken
  ) {

    throw new Error(
      "A Firebase ID token is required."
    );

  }


  const data =
    await getAuthenticatedFirestoreDocument(
      `users/${uid}/testerAccess/current`,
      idToken
    );


  return normalizeTesterAccess(
    data
  );
}


/*
 * ============================================================
 * EFFECTIVE SERVER PLAN
 * ============================================================
 *
 * Paid Premium/Premium+ takes precedence.
 *
 * Tester access grants Premium only.
 * ============================================================
 */

export function getEffectiveServerPlan(
  subscription:
    | SubscriptionRecord
    | null,
  testerAccess:
    | TesterAccessRecord
    | null =
      null
): SubscriptionPlan {

  /*
   * ----------------------------------------------------------
   * PAID SUBSCRIPTION
   * ----------------------------------------------------------
   */

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
   * TESTER PREMIUM ACCESS
   * ----------------------------------------------------------
   */

  if (
    testerAccess &&
    testerAccess.active ===
      true &&
    testerAccess.plan ===
      "premium" &&
    testerAccess.expiresAt >
      Date.now()
  ) {

    return "premium";

  }


  /*
   * ----------------------------------------------------------
   * DEFAULT
   * ----------------------------------------------------------
   */

  return "free";
}


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

  idToken: string;
}> {

  const idToken =
    getRequestIdToken(
      request
    );


  const user =
    await lookupFirebaseUser(
      idToken
    );


  return {
    uid:
      user.uid,

    email:
      user.email,

    idToken,
  };
}


/*
 * ============================================================
 * REQUIRE PREMIUM
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
 * Tester access cannot satisfy this requirement.
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