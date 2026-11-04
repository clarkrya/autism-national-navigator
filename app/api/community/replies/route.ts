import {
  NextResponse,
} from "next/server";

import {
  getAuthenticatedFirestoreDocument,
  requirePremium,
} from "../../../../lib/serverSubscriptionAuth";


/*
 * ============================================================
 * COMMUNITY REPLIES API
 * ============================================================
 *
 * Guest:
 *   No Community participation.
 *
 * Free:
 *   Read-only.
 *
 * Premium / Premium+:
 *   May create replies.
 *
 * Identity:
 *
 * Anonymous checked:
 *   "Anonymous"
 *
 * Anonymous not checked:
 *   Community profile displayName
 *
 * Fallback:
 *   "Community Member"
 *
 * Authentication:
 *   Firebase ID token supplied by the browser.
 *
 * Firestore:
 *   Firebase REST API using the authenticated user's ID token.
 *
 * No Firebase Admin SDK.
 * Firestore Security Rules remain active.
 * ============================================================
 */


const COMMUNITY_REPLIES_COLLECTION =
  "communityReplies";


type CreateReplyRequest = {
  postId?: unknown;

  body?: unknown;

  isAnonymous?: unknown;
};


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
 * CLEAN STRING
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
 * FIRESTORE DOCUMENT URL
 * ============================================================
 */

function getFirestoreDocumentUrl(
  collectionName: string,
  documentId: string
): string {

  const projectId =
    getFirebaseProjectId();


  return (
    `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
      projectId
    )}/databases/(default)/documents/${encodeURIComponent(
      collectionName
    )}/${encodeURIComponent(
      documentId
    )}`
  );

}


/*
 * ============================================================
 * COMMUNITY DISPLAY NAME
 * ============================================================
 *
 * Reads:
 *
 * users/{uid}/communityProfile/current
 *
 * using the already-verified Firebase ID token.
 *
 * We do not trust a display name supplied by the browser.
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
 * VERIFY PUBLISHED PARENT POST
 * ============================================================
 */

async function requirePublishedPost(
  postId: string,
  idToken: string
): Promise<void> {

  /*
   * Use the shared authenticated Firestore helper rather than
   * creating a second authentication path.
   */

  const post =
    await getAuthenticatedFirestoreDocument(
      `communityPosts/${postId}`,
      idToken
    );


  if (
    !post ||
    post.status !==
      "published"
  ) {

    throw new Error(
      "POST_NOT_FOUND"
    );

  }

}


/*
 * ============================================================
 * CREATE REPLY DOCUMENT
 * ============================================================
 */

async function createCommunityReplyDocument(
  idToken: string,

  data: {
    postId: string;

    authorId: string;

    authorDisplayName: string;

    body: string;

    isAnonymous: boolean;

    status: string;

    moderationStatus: string;

    reactionCount: number;

    reportCount: number;

    createdAt: number;

    updatedAt: number;
  }
): Promise<string> {

  const projectId =
    getFirebaseProjectId();


  const endpoint =
    `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
      projectId
    )}/databases/(default)/documents/${COMMUNITY_REPLIES_COLLECTION}`;


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

              postId: {
                stringValue:
                  data.postId,
              },

              authorId: {
                stringValue:
                  data.authorId,
              },

              authorDisplayName: {
                stringValue:
                  data.authorDisplayName,
              },

              body: {
                stringValue:
                  data.body,
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
      "Firestore denied Community reply creation:",
      result.error
    );


    throw new Error(
      "FIRESTORE_PERMISSION_DENIED"
    );

  }


  if (
    !response.ok
  ) {

    console.error(
      "Firestore Community reply creation failed:",
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


  const documentName =
    result.name;


  if (
    !documentName
  ) {

    throw new Error(
      "FIRESTORE_INVALID_RESPONSE"
    );

  }


  const replyId =
    documentName
      .split("/")
      .pop();


  if (
    !replyId
  ) {

    throw new Error(
      "FIRESTORE_INVALID_RESPONSE"
    );

  }


  return replyId;

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
     * REQUIRE PREMIUM
     * ========================================================
     */

    const account =
      await requirePremium(
        request
      );


    /*
     * Reuse the ID token returned by requirePremium().
     *
     * Do not reread request.headers after authentication.
     */

    const idToken =
      account.idToken;


    /*
     * ========================================================
     * REQUEST BODY
     * ========================================================
     */

    let body:
      CreateReplyRequest;


    try {

      body =
        await request.json() as
          CreateReplyRequest;

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
     * POST ID
     * ========================================================
     */

    const postId =
      getCleanString(
        body.postId,
        200
      );


    if (
      !postId
    ) {

      return NextResponse.json(
        {
          error:
            "A Community conversation is required.",
        },
        {
          status:
            400,
        }
      );

    }


    /*
     * ========================================================
     * REPLY BODY
     * ========================================================
     */

    const replyBody =
      getCleanString(
        body.body,
        5000
      );


    if (
      replyBody.length <
      2
    ) {

      return NextResponse.json(
        {
          error:
            "Please enter a meaningful reply.",
        },
        {
          status:
            400,
        }
      );

    }


    /*
     * ========================================================
     * ANONYMOUS
     * ========================================================
     */

    const isAnonymous =
      body.isAnonymous ===
      true;


    /*
     * ========================================================
     * VERIFY PARENT CONVERSATION
     * ========================================================
     */

    await requirePublishedPost(
      postId,
      idToken
    );


    /*
     * ========================================================
     * RESOLVE DISPLAY NAME
     * ========================================================
     *
     * Only read the Community profile when the member chose
     * to post publicly.
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
     * CREATE REPLY
     * ========================================================
     */

    const now =
      Date.now();


    const replyId =
      await createCommunityReplyDocument(
        idToken,
        {
          postId,

          authorId:
            account.uid,

          authorDisplayName,

          body:
            replyBody,

          isAnonymous,

          status:
            "published",

          moderationStatus:
            "not_reviewed",

          reactionCount:
            0,

          reportCount:
            0,

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

        replyId,

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


    if (
      error instanceof Error &&
      error.message ===
        "POST_NOT_FOUND"
    ) {

      return NextResponse.json(
        {
          error:
            "That Community conversation is no longer available.",
        },
        {
          status:
            404,
        }
      );

    }


    if (
      error instanceof Error &&
      error.message ===
        "FIRESTORE_PERMISSION_DENIED"
    ) {

      return NextResponse.json(
        {
          error:
            "Your account does not currently have permission to reply to this Community conversation.",
        },
        {
          status:
            403,
        }
      );

    }


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


    console.error(
      "Community reply creation error:",
      error
    );


    return NextResponse.json(
      {
        error:
          "We couldn't add your reply right now. Please try again.",
      },
      {
        status:
          500,
      }
    );

  }

}