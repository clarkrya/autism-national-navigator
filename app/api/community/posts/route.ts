import {
  NextResponse,
} from "next/server";

import type {
  CommunityCategory,
} from "../../../../lib/communityTypes";

import {
  getAuthenticatedFirestoreDocument,
  requirePremium,
} from "../../../../lib/serverSubscriptionAuth";

/*
 * ============================================================
 * COMMUNITY POSTS API
 * ============================================================
 *
 * Community access model:
 *
 * Guest:
 *   No Community access.
 *
 * Free:
 *   Read-only.
 *
 * Premium / Premium+:
 *   May create posts and participate.
 *
 * Authentication:
 *   Firebase ID token supplied by the browser.
 *
 * Firestore access:
 *   Firebase REST API using the authenticated user's ID token.
 *
 * No Firebase Admin SDK.
 *
 * Firestore Security Rules still apply.
 * ============================================================
 */


/*
 * ============================================================
 * COLLECTION
 * ============================================================
 */

const COMMUNITY_POSTS_COLLECTION =
  "communityPosts";


/*
 * ============================================================
 * ALLOWED COMMUNITY CATEGORIES
 * ============================================================
 */

const COMMUNITY_CATEGORIES:
  CommunityCategory[] = [
    "general",
    "newly_diagnosed",
    "school",
    "therapy",
    "insurance",
    "financial_support",
    "parent_support",
    "teen_transition",
    "adult_transition",
    "siblings_family",
    "success_stories",
    "questions",
    "other",
  ];


/*
 * ============================================================
 * REQUEST TYPE
 * ============================================================
 */

type CreatePostRequest = {
  title?: unknown;

  body?: unknown;

  category?: unknown;

  isAnonymous?: unknown;
};


/*
 * ============================================================
 * FIRESTORE REST RESPONSE
 * ============================================================
 */

type FirestoreCreateResponse = {
  name?: string;

  error?: {
    code?: number;

    message?: string;

    status?: string;
  };
};


/*
 * ============================================================
 * STRING VALIDATION
 * ============================================================
 */

function getCleanString(
  value: unknown,
  maxLength: number
): string {

  if (
    typeof value !==
    "string"
  ) {

    return "";

  }


  return value
    .trim()
    .slice(
      0,
      maxLength
    );

}

/*
 * ============================================================
 * COMMUNITY DISPLAY NAME
 * ============================================================
 *
 * Reads the authenticated member's Community profile:
 *
 * users/{uid}/communityProfile/current
 *
 * Anonymous posts never expose this name.
 * ============================================================
 */

async function getCommunityDisplayName(
  uid: string,
  idToken: string
): Promise<string> {

  const profile =
    await getAuthenticatedFirestoreDocument(
      `users/${uid}/communityProfile/current`,
      idToken
    );


  if (
    !profile
  ) {

    return "Community Member";

  }


  const displayName =
    getCleanString(
      profile.displayName,
      80
    );


  if (
    !displayName
  ) {

    return "Community Member";

  }


  return displayName;

}

/*
 * ============================================================
 * CATEGORY VALIDATION
 * ============================================================
 */

function isCommunityCategory(
  value: unknown
): value is CommunityCategory {

  return (
    typeof value ===
      "string" &&
    COMMUNITY_CATEGORIES.includes(
      value as CommunityCategory
    )
  );

}


/*
 * ============================================================
 * FIREBASE ID TOKEN
 * ============================================================
 */

function getFirebaseIdToken(
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
 * FIREBASE PROJECT ID
 * ============================================================
 */

function getFirebaseProjectId():
  string {

  const projectId =
    process.env
      .NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    process.env
      .FIREBASE_ADMIN_PROJECT_ID;


  if (
    !projectId
  ) {

    console.error(
      "Firebase project ID is not configured."
    );


    throw new Error(
      "FIREBASE_CONFIG_MISSING"
    );

  }


  return projectId;

}


/*
 * ============================================================
 * CREATE FIRESTORE DOCUMENT
 * ============================================================
 */

async function createCommunityPostDocument(
  idToken: string,

  data: {
    authorId: string;

    authorDisplayName: string;

    title: string;

    body: string;

    category: CommunityCategory;

    isAnonymous: boolean;

    status: string;

    moderationStatus: string;

    replyCount: number;

    reactionCount: number;

    reportCount: number;

    isFeatured: boolean;

    isNavigatorSupported: boolean;

    createdAt: number;

    updatedAt: number;
  }
): Promise<string> {

  const projectId =
    getFirebaseProjectId();


  /*
   * ----------------------------------------------------------
   * FIRESTORE REST CREATE DOCUMENT
   * ----------------------------------------------------------
   *
   * POSTing to:
   *
   *   .../documents/communityPosts
   *
   * creates a new document in the communityPosts collection
   * with an automatically generated Firestore document ID.
   * ----------------------------------------------------------
   */

  const endpoint =
    `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
      projectId
    )}/databases/(default)/documents/${COMMUNITY_POSTS_COLLECTION}`;


  const response =
    await fetch(
      endpoint,
      {
        method:
          "POST",

        headers: {
          Authorization:
            `Bearer ${idToken}`,

          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify({
            fields: {

              authorId: {
                stringValue:
                  data.authorId,
              },

              authorDisplayName: {
                stringValue:
                  data.authorDisplayName,
              },

              title: {
                stringValue:
                  data.title,
              },

              body: {
                stringValue:
                  data.body,
              },

              category: {
                stringValue:
                  data.category,
              },

              isAnonymous: {
                booleanValue:
                  data.isAnonymous,
              },

              status: {
                stringValue:
                  data.status,
              },

              moderationStatus: {
                stringValue:
                  data.moderationStatus,
              },

              replyCount: {
                integerValue:
                  String(
                    data.replyCount
                  ),
              },

              reactionCount: {
                integerValue:
                  String(
                    data.reactionCount
                  ),
              },

              reportCount: {
                integerValue:
                  String(
                    data.reportCount
                  ),
              },

              isFeatured: {
                booleanValue:
                  data.isFeatured,
              },

              isNavigatorSupported: {
                booleanValue:
                  data.isNavigatorSupported,
              },

              createdAt: {
                integerValue:
                  String(
                    data.createdAt
                  ),
              },

              updatedAt: {
                integerValue:
                  String(
                    data.updatedAt
                  ),
              },

            },
          }),
      }
    );


  let result:
    FirestoreCreateResponse;


  try {

    result =
      await response.json() as
        FirestoreCreateResponse;

  } catch {

    throw new Error(
      "FIRESTORE_INVALID_RESPONSE"
    );

  }


  /*
   * ----------------------------------------------------------
   * AUTH FAILURE
   * ----------------------------------------------------------
   */

  if (
    response.status ===
    401
  ) {

    throw new Error(
      "AUTH_INVALID"
    );

  }


  /*
   * ----------------------------------------------------------
   * FIRESTORE RULES DENIED WRITE
   * ----------------------------------------------------------
   */

  if (
    response.status ===
    403
  ) {

    console.error(
      "Firestore denied Community post creation:",
      result.error
    );


    throw new Error(
      "FIRESTORE_PERMISSION_DENIED"
    );

  }


  /*
   * ----------------------------------------------------------
   * OTHER FIRESTORE FAILURE
   * ----------------------------------------------------------
   */

  if (
    !response.ok
  ) {

    console.error(
      "Firestore Community post creation failed:",
      {
        status:
          response.status,

        error:
          result.error,
      }
    );


    throw new Error(
      "FIRESTORE_WRITE_FAILED"
    );

  }


  /*
   * ----------------------------------------------------------
   * DOCUMENT ID
   * ----------------------------------------------------------
   */

  const documentName =
    result.name;


  if (
    !documentName
  ) {

    throw new Error(
      "FIRESTORE_INVALID_RESPONSE"
    );

  }


  const postId =
    documentName
      .split("/")
      .pop();


  if (
    !postId
  ) {

    throw new Error(
      "FIRESTORE_INVALID_RESPONSE"
    );

  }


  return postId;

}


/*
 * ============================================================
 * POST
 * ============================================================
 */

export async function POST(
  request: Request
) {

  try {

    /*
     * ========================================================
     * STEP 1 — REQUIRE PREMIUM / PREMIUM+
     * ========================================================
     *
     * Uses the same REST-based server authorization module
     * already used by Ask Your Navigator.
     */

    const account =
  await requirePremium(
    request
  );


/*
 * ========================================================
 * STEP 2 — USE VERIFIED FIREBASE USER TOKEN
 * ========================================================
 *
 * requirePremium() has already verified the Firebase
 * request and returns the authenticated user's ID token.
 *
 * Reusing that token avoids reading request.headers again
 * after asynchronous authorization work.
 */

const idToken =
  account.idToken;


    /*
     * ========================================================
     * STEP 3 — READ REQUEST BODY
     * ========================================================
     */

    let body:
      CreatePostRequest;


    try {

      body =
        await request.json() as
          CreatePostRequest;

    } catch {

      return NextResponse.json(
        {
          error:
            "Invalid request body.",
        },
        {
          status:
            400,
        }
      );

    }


    /*
     * ========================================================
     * STEP 4 — VALIDATE TITLE
     * ========================================================
     */

    const title =
      getCleanString(
        body.title,
        140
      );


    if (
      title.length <
      3
    ) {

      return NextResponse.json(
        {
          error:
            "Please enter a meaningful post title.",
        },
        {
          status:
            400,
        }
      );

    }


    /*
     * ========================================================
     * STEP 5 — VALIDATE MESSAGE
     * ========================================================
     */

    const postBody =
      getCleanString(
        body.body,
        5000
      );


    if (
      postBody.length <
      5
    ) {

      return NextResponse.json(
        {
          error:
            "Please enter a meaningful post message.",
        },
        {
          status:
            400,
        }
      );

    }


    /*
     * ========================================================
     * STEP 6 — VALIDATE CATEGORY
     * ========================================================
     */

    if (
      !isCommunityCategory(
        body.category
      )
    ) {

      return NextResponse.json(
        {
          error:
            "Please select a valid community category.",
        },
        {
          status:
            400,
        }
      );

    }


    /*
     * ========================================================
     * STEP 7 — ANONYMOUS OPTION
     * ========================================================
     */

    const isAnonymous =
      body.isAnonymous ===
      true;

/*
 * ========================================================
 * COMMUNITY IDENTITY
 * ========================================================
 */

const authorDisplayName =
  isAnonymous
    ? "Anonymous"
    : await getCommunityDisplayName(
        account.uid,
        idToken
      );
    /*
     * ========================================================
     * STEP 8 — SERVER-CONTROLLED VALUES
     * ========================================================
     *
     * Posts are published immediately so the author can see
     * the conversation after submission.
     *
     * moderationStatus remains available for future moderation
     * workflows.
     */

    const now =
      Date.now();


    /*
     * ========================================================
     * STEP 9 — FIRESTORE REST WRITE
     * ========================================================
     */

    const postId =
      await createCommunityPostDocument(
        idToken,
        {

          authorId:
            account.uid,

            authorDisplayName,

          title,

          body:
            postBody,

          category:
            body.category,

          isAnonymous,

          status:
            "published",

          moderationStatus:
            "not_reviewed",

          replyCount:
            0,

          reactionCount:
            0,

          reportCount:
            0,

          isFeatured:
            false,

          isNavigatorSupported:
            false,

          createdAt:
            now,

          updatedAt:
            now,

        }
      );


    /*
     * ========================================================
     * SUCCESS
     * ========================================================
     */

    return NextResponse.json(
      {
        success:
          true,

        postId,

        status:
          "published",

        plan:
          account.plan,
      },
      {
        status:
          201,
      }
    );


  } catch (
    error
  ) {

    /*
     * ========================================================
     * AUTHENTICATION REQUIRED
     * ========================================================
     */

    if (
      error instanceof Error &&
      error.message ===
        "AUTH_REQUIRED"
    ) {

      return NextResponse.json(
        {
          error:
            "You must be logged in to participate in the Community.",
        },
        {
          status:
            401,
        }
      );

    }


    /*
     * ========================================================
     * INVALID AUTHENTICATION
     * ========================================================
     */

    if (
      error instanceof Error &&
      error.message ===
        "AUTH_INVALID"
    ) {

      return NextResponse.json(
        {
          error:
            "Your login session is no longer valid. Please log in again.",
        },
        {
          status:
            401,
        }
      );

    }


    /*
     * ========================================================
     * PREMIUM REQUIRED
     * ========================================================
     */

    if (
      error instanceof Error &&
      error.message ===
        "PREMIUM_REQUIRED"
    ) {

      return NextResponse.json(
        {
          error:
            "Community participation is available with Premium.",
        },
        {
          status:
            403,
        }
      );

    }


    /*
     * ========================================================
     * FIRESTORE SECURITY RULES
     * ========================================================
     */

    if (
      error instanceof Error &&
      error.message ===
        "FIRESTORE_PERMISSION_DENIED"
    ) {

      return NextResponse.json(
        {
          error:
            "Your account does not currently have permission to create a Community post.",
        },
        {
          status:
            403,
        }
      );

    }


    /*
     * ========================================================
     * FIREBASE CONFIGURATION
     * ========================================================
     */

    if (
      error instanceof Error &&
      error.message ===
        "FIREBASE_CONFIG_MISSING"
    ) {

      return NextResponse.json(
        {
          error:
            "The Community service is not configured correctly.",
        },
        {
          status:
            500,
        }
      );

    }


    /*
     * ========================================================
     * UNEXPECTED ERROR
     * ========================================================
     */

    console.error(
      "Community post creation error:",
      error
    );


    return NextResponse.json(
      {
        error:
          "We couldn't create your post right now. Please try again.",
      },
      {
        status:
          500,
      }
    );

  }

}