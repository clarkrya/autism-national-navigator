import { NextResponse } from "next/server";

import {
  getAuthenticatedFirestoreDocument,
  requireCommunityModerator,
} from "../../../../../lib/serverSubscriptionAuth";


/*
 * ============================================================
 * COMMUNITY CONTENT MODERATION API
 * ============================================================
 *
 * POST /api/community/moderation/content
 *
 * Allows trusted Community moderators/admins to:
 *
 * - hide a post or reply
 * - restore a hidden/removed post or reply
 * - remove a post or reply
 *
 * SECURITY:
 *
 * Firebase ID token
 *      ↓
 * requireCommunityModerator()
 *      ↓
 * users/{uid}/communityAccess/current
 *      ↓
 * Firestore Security Rules
 *
 * Content and its audit record are written together using a
 * Firestore REST commit so the moderation action is atomic.
 *
 * No Firebase Admin SDK.
 * No private key.
 * ============================================================
 */


type CommunityContentType =
  | "post"
  | "reply";


type CommunityModerationAction =
  | "hide"
  | "restore"
  | "remove";


type CommunityContentStatus =
  | "published"
  | "hidden"
  | "removed";


type CommunityModerationStatus =
  | "not_reviewed"
  | "reviewed"
  | "flagged"
  | "removed";


type ModerationRequestBody = {
  contentType?: unknown;
  contentId?: unknown;
  action?: unknown;
  reason?: unknown;
};


type ExistingCommunityContent = {
  status?: unknown;
  moderationStatus?: unknown;
};


type FirestoreRestResponse = {
  writeResults?: unknown[];

  commitTime?: string;

  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
};


/*
 * ============================================================
 * FIREBASE PROJECT ID
 * ============================================================
 */

function getFirebaseProjectId(): string {

  const projectId =
    (
      process.env
        .NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
      process.env
        .FIREBASE_ADMIN_PROJECT_ID
    )
      ?.trim();


  if (!projectId) {

    throw new Error(
      "FIREBASE_PROJECT_ID_MISSING"
    );
  }


  return projectId;
}


/*
 * ============================================================
 * VALIDATION
 * ============================================================
 */

function isCommunityContentType(
  value: unknown
): value is CommunityContentType {

  return (
    value === "post" ||
    value === "reply"
  );
}


function isModerationAction(
  value: unknown
): value is CommunityModerationAction {

  return (
    value === "hide" ||
    value === "restore" ||
    value === "remove"
  );
}


function isContentStatus(
  value: unknown
): value is CommunityContentStatus {

  return (
    value === "published" ||
    value === "hidden" ||
    value === "removed"
  );
}


function isModerationStatus(
  value: unknown
): value is CommunityModerationStatus {

  return (
    value === "not_reviewed" ||
    value === "reviewed" ||
    value === "flagged" ||
    value === "removed"
  );
}


function isValidContentId(
  value: unknown
): value is string {

  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.trim().length <= 200
  );
}


function normalizeReason(
  value: unknown
): string {

  if (
    typeof value !== "string"
  ) {
    return "";
  }


  return value
    .trim()
    .slice(
      0,
      1000
    );
}


/*
 * ============================================================
 * COLLECTION
 * ============================================================
 */

function getContentCollection(
  contentType: CommunityContentType
): string {

  return contentType === "post"
    ? "communityPosts"
    : "communityReplies";
}


/*
 * ============================================================
 * ACTION → CONTENT STATE
 * ============================================================
 */

function getModeratedState(
  action: CommunityModerationAction
): {
  status: CommunityContentStatus;
  moderationStatus: CommunityModerationStatus;
} {

  if (
    action === "hide"
  ) {

    return {
      status:
        "hidden",

      moderationStatus:
        "flagged",
    };
  }


  if (
    action === "remove"
  ) {

    return {
      status:
        "removed",

      moderationStatus:
        "removed",
    };
  }


  return {
    status:
      "published",

    moderationStatus:
      "reviewed",
  };
}


/*
 * ============================================================
 * EXISTING CONTENT VALIDATION
 * ============================================================
 */

async function getExistingContent(
  contentType: CommunityContentType,
  contentId: string,
  idToken: string
): Promise<{
  status: CommunityContentStatus;
  moderationStatus: CommunityModerationStatus;
}> {

  const collection =
    getContentCollection(
      contentType
    );


  const content =
    await getAuthenticatedFirestoreDocument(
      `${collection}/${contentId}`,
      idToken
    ) as ExistingCommunityContent | null;


  if (!content) {

    throw new Error(
      "CONTENT_NOT_FOUND"
    );
  }


  if (
    !isContentStatus(
      content.status
    )
  ) {

    throw new Error(
      "CONTENT_STATE_INVALID"
    );
  }


  if (
    !isModerationStatus(
      content.moderationStatus
    )
  ) {

    throw new Error(
      "CONTENT_STATE_INVALID"
    );
  }


  return {
    status:
      content.status,

    moderationStatus:
      content.moderationStatus,
  };
}


/*
 * ============================================================
 * ACTION VALIDATION
 * ============================================================
 */

function validateActionAgainstCurrentState(
  action: CommunityModerationAction,
  currentStatus: CommunityContentStatus
): void {

  /*
   * Restore only makes sense for content that has already been
   * hidden or removed.
   */

  if (
    action === "restore" &&
    currentStatus === "published"
  ) {

    throw new Error(
      "CONTENT_ALREADY_PUBLISHED"
    );
  }


  if (
    action === "hide" &&
    currentStatus === "hidden"
  ) {

    throw new Error(
      "CONTENT_ALREADY_HIDDEN"
    );
  }


  if (
    action === "remove" &&
    currentStatus === "removed"
  ) {

    throw new Error(
      "CONTENT_ALREADY_REMOVED"
    );
  }
}


/*
 * ============================================================
 * AUDIT RECORD ID
 * ============================================================
 */

function createModerationRecordId(): string {

  /*
   * crypto.randomUUID() is available in the Next.js server
   * runtime and gives each audit event its own immutable ID.
   */

  return crypto.randomUUID();
}


/*
 * ============================================================
 * ATOMIC FIRESTORE COMMIT
 * ============================================================
 *
 * Write 1:
 *   Update the Community post/reply.
 *
 * Write 2:
 *   Create immutable communityModerationRecords/{recordId}.
 *
 * Firestore applies both writes together or neither write.
 * ============================================================
 */

async function commitModerationAction(
  params: {
    contentType: CommunityContentType;
    contentId: string;
    action: CommunityModerationAction;
    reason: string;
    moderatorId: string;
    idToken: string;
  }
): Promise<{
  recordId: string;
  status: CommunityContentStatus;
  moderationStatus: CommunityModerationStatus;
  updatedAt: number;
}> {

  const projectId =
    getFirebaseProjectId();


  const {
    contentType,
    contentId,
    action,
    reason,
    moderatorId,
    idToken,
  } =
    params;


  const collection =
    getContentCollection(
      contentType
    );


  const nextState =
    getModeratedState(
      action
    );


  const updatedAt =
    Date.now();


  const recordId =
    createModerationRecordId();


  const databaseRoot =
    `projects/${projectId}/databases/(default)/documents`;


  const contentDocumentName =
    `${databaseRoot}/${collection}/${contentId}`;


  const auditDocumentName =
    `${databaseRoot}/communityModerationRecords/${recordId}`;


  /*
   * The audit record's reason field is optional.
   *
   * When the moderator supplies no reason, we omit that field
   * entirely so it remains compatible with the Firestore rule.
   */

  const auditFields:
    Record<
      string,
      {
        stringValue?: string;
        integerValue?: string;
      }
    > =
    {
      contentType: {
        stringValue:
          contentType,
      },

      contentId: {
        stringValue:
          contentId,
      },

      action: {
        stringValue:
          action,
      },

      moderatorId: {
        stringValue:
          moderatorId,
      },

      createdAt: {
        integerValue:
          String(updatedAt),
      },
    };


  if (reason) {

    auditFields.reason =
      {
        stringValue:
          reason,
      };
  }


  const endpoint =
    `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
      projectId
    )}/databases/(default)/documents:commit`;


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
            writes: [
              /*
               * Update only the moderation-controlled fields.
               *
               * The update mask ensures all original author,
               * content, category, counter, and creation fields
               * remain untouched.
               */
              {
                update: {
                  name:
                    contentDocumentName,

                  fields: {
                    status: {
                      stringValue:
                        nextState.status,
                    },

                    moderationStatus: {
                      stringValue:
                        nextState.moderationStatus,
                    },

                    updatedAt: {
                      integerValue:
                        String(updatedAt),
                    },
                  },
                },

                updateMask: {
                  fieldPaths: [
                    "status",
                    "moderationStatus",
                    "updatedAt",
                  ],
                },

                /*
                 * Do not allow this write to create a missing
                 * Community content document.
                 */
                currentDocument: {
                  exists:
                    true,
                },
              },

              /*
               * Create the immutable audit record.
               *
               * exists: false guarantees that an existing audit
               * record can never be overwritten.
               */
              {
                update: {
                  name:
                    auditDocumentName,

                  fields:
                    auditFields,
                },

                currentDocument: {
                  exists:
                    false,
                },
              },
            ],
          }),

        cache:
          "no-store",
      }
    );


  let result:
    FirestoreRestResponse =
    {};


  try {

    result =
      await response.json() as
        FirestoreRestResponse;

  } catch {

    result =
      {};
  }


  if (
    response.status === 401
  ) {

    throw new Error(
      "AUTH_INVALID"
    );
  }


  if (
    response.status === 403
  ) {

    console.error(
      "Firestore denied Community content moderation action:",
      result.error
    );


    throw new Error(
      "FIRESTORE_PERMISSION_DENIED"
    );
  }


  if (
    response.status === 404
  ) {

    throw new Error(
      "CONTENT_NOT_FOUND"
    );
  }


  if (
    response.status === 409
  ) {

    console.error(
      "Firestore Community moderation commit conflict:",
      result.error
    );


    throw new Error(
      "FIRESTORE_WRITE_CONFLICT"
    );
  }


  if (!response.ok) {

    console.error(
      "Firestore Community content moderation commit failed:",
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


  return {
    recordId,

    status:
      nextState.status,

    moderationStatus:
      nextState.moderationStatus,

    updatedAt,
  };
}


/*
 * ============================================================
 * POST /api/community/moderation/content
 * ============================================================
 */

export async function POST(
  request: Request
) {

  try {

    /*
     * Verify both:
     *
     * 1. Firebase authentication
     * 2. trusted moderator/admin access
     */

    const moderator =
      await requireCommunityModerator(
        request
      );


    let body:
      ModerationRequestBody =
      {};


    try {

      body =
        await request.json() as
          ModerationRequestBody;

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
     * Validate content type.
     */

    if (
      !isCommunityContentType(
        body.contentType
      )
    ) {

      return NextResponse.json(
        {
          error:
            "A valid Community content type is required.",
        },
        {
          status:
            400,
        }
      );
    }


    /*
     * Validate content ID.
     */

    if (
      !isValidContentId(
        body.contentId
      )
    ) {

      return NextResponse.json(
        {
          error:
            "A valid Community content ID is required.",
        },
        {
          status:
            400,
        }
      );
    }


    /*
     * Validate requested moderation action.
     */

    if (
      !isModerationAction(
        body.action
      )
    ) {

      return NextResponse.json(
        {
          error:
            "A valid Community moderation action is required.",
        },
        {
          status:
            400,
        }
      );
    }


    const contentType =
      body.contentType;


    const contentId =
      body.contentId.trim();


    const action =
      body.action;


    const reason =
      normalizeReason(
        body.reason
      );


    /*
     * Load the current document first.
     *
     * This:
     *
     * - verifies it actually exists
     * - verifies its current moderation state
     * - prevents meaningless duplicate moderation actions
     */

    const currentContent =
      await getExistingContent(
        contentType,
        contentId,
        moderator.idToken
      );


    validateActionAgainstCurrentState(
      action,
      currentContent.status
    );


    /*
     * Apply the content change and audit record atomically.
     */

    const result =
      await commitModerationAction({
        contentType,

        contentId,

        action,

        reason,

        moderatorId:
          moderator.uid,

        idToken:
          moderator.idToken,
      });


    return NextResponse.json(
      {
        success:
          true,

        contentType,

        contentId,

        action,

        recordId:
          result.recordId,

        status:
          result.status,

        moderationStatus:
          result.moderationStatus,

        updatedAt:
          result.updatedAt,
      }
    );


  } catch (error) {

    /*
     * Authentication required.
     */

    if (
      error instanceof Error &&
      error.message ===
        "AUTH_REQUIRED"
    ) {

      return NextResponse.json(
        {
          error:
            "You must be logged in to manage Community content.",
        },
        {
          status:
            401,
        }
      );
    }


    /*
     * Invalid or expired Firebase login.
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
     * Authenticated but not a moderator/admin.
     */

    if (
      error instanceof Error &&
      error.message ===
        "COMMUNITY_MODERATOR_REQUIRED"
    ) {

      return NextResponse.json(
        {
          error:
            "You do not have permission to moderate Community content.",
        },
        {
          status:
            403,
        }
      );
    }


    /*
     * Firestore independently rejected the operation.
     */

    if (
      error instanceof Error &&
      error.message ===
        "FIRESTORE_PERMISSION_DENIED"
    ) {

      return NextResponse.json(
        {
          error:
            "Firestore denied this Community moderation action.",
        },
        {
          status:
            403,
        }
      );
    }


    /*
     * Content does not exist.
     */

    if (
      error instanceof Error &&
      error.message ===
        "CONTENT_NOT_FOUND"
    ) {

      return NextResponse.json(
        {
          error:
            "That Community content could not be found.",
        },
        {
          status:
            404,
        }
      );
    }


    /*
     * Existing document has an unexpected state.
     */

    if (
      error instanceof Error &&
      error.message ===
        "CONTENT_STATE_INVALID"
    ) {

      return NextResponse.json(
        {
          error:
            "That Community content has an invalid moderation state.",
        },
        {
          status:
            409,
        }
      );
    }


    /*
     * Prevent duplicate/redundant actions.
     */

    if (
      error instanceof Error &&
      error.message ===
        "CONTENT_ALREADY_PUBLISHED"
    ) {

      return NextResponse.json(
        {
          error:
            "This Community content is already published.",
        },
        {
          status:
            409,
        }
      );
    }


    if (
      error instanceof Error &&
      error.message ===
        "CONTENT_ALREADY_HIDDEN"
    ) {

      return NextResponse.json(
        {
          error:
            "This Community content is already hidden.",
        },
        {
          status:
            409,
        }
      );
    }


    if (
      error instanceof Error &&
      error.message ===
        "CONTENT_ALREADY_REMOVED"
    ) {

      return NextResponse.json(
        {
          error:
            "This Community content has already been removed.",
        },
        {
          status:
            409,
        }
      );
    }


    /*
     * Firestore write conflict.
     */

    if (
      error instanceof Error &&
      error.message ===
        "FIRESTORE_WRITE_CONFLICT"
    ) {

      return NextResponse.json(
        {
          error:
            "This Community content changed while the moderation action was being processed. Please refresh and try again.",
        },
        {
          status:
            409,
        }
      );
    }


    /*
     * Firebase configuration.
     */

    if (
      error instanceof Error &&
      error.message ===
        "FIREBASE_PROJECT_ID_MISSING"
    ) {

      return NextResponse.json(
        {
          error:
            "The Community moderation service is not configured correctly.",
        },
        {
          status:
            500,
        }
      );
    }


    /*
     * Generic Firestore write failure.
     */

    if (
      error instanceof Error &&
      error.message ===
        "FIRESTORE_WRITE_FAILED"
    ) {

      return NextResponse.json(
        {
          error:
            "We couldn't update this Community content right now.",
        },
        {
          status:
            500,
        }
      );
    }


    console.error(
      "Community content moderation error:",
      error
    );


    return NextResponse.json(
      {
        error:
          "We couldn't update this Community content right now.",
      },
      {
        status:
          500,
      }
    );
  }
}