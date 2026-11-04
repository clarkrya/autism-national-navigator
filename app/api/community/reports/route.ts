import { NextResponse } from "next/server";

import {
  getAuthenticatedFirestoreDocument,
  requireAuthenticatedUser,
} from "../../../../lib/serverSubscriptionAuth";


/*
 * ============================================================
 * COMMUNITY REPORTS API
 * ============================================================
 *
 * Reporting is a Community safety feature.
 *
 * Guest:
 *   Cannot report.
 *
 * Free:
 *   May report published posts and replies.
 *
 * Premium / Premium+:
 *   May report published posts and replies.
 *
 * Reports are stored at:
 *
 * communityReports/{reportId}
 *
 * Deterministic report ID:
 *
 * {uid}_{targetType}_{targetId}
 *
 * This allows only one report from the same account for the
 * same Community target.
 *
 * No Firebase Admin SDK.
 *
 * Firestore Security Rules remain active.
 * ============================================================
 */


type ReportTargetType =
  | "post"
  | "reply";


type ReportReason =
  | "harassment"
  | "hate_or_abuse"
  | "misinformation"
  | "privacy"
  | "spam"
  | "unsafe_content"
  | "other";


type ReportRequest = {
  targetType?: unknown;
  targetId?: unknown;
  reason?: unknown;
  details?: unknown;
};


type FirestoreWriteResponse = {
  name?: string;

  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
};


/*
 * ============================================================
 * VALIDATION
 * ============================================================
 */

function getCleanString(
  value: unknown,
  maxLength: number
): string {

  if (typeof value !== "string") {
    return "";
  }

  return value
    .trim()
    .slice(0, maxLength);
}


function isReportTargetType(
  value: unknown
): value is ReportTargetType {

  return (
    value === "post" ||
    value === "reply"
  );
}


function isReportReason(
  value: unknown
): value is ReportReason {

  return (
    value === "harassment" ||
    value === "hate_or_abuse" ||
    value === "misinformation" ||
    value === "privacy" ||
    value === "spam" ||
    value === "unsafe_content" ||
    value === "other"
  );
}


/*
 * ============================================================
 * FIREBASE PROJECT ID
 * ============================================================
 */

function getFirebaseProjectId(): string {

  const projectId =
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    process.env.FIREBASE_ADMIN_PROJECT_ID;

  if (!projectId) {

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
 * REPORT DOCUMENT ID
 * ============================================================
 *
 * This format intentionally matches the Firestore rule:
 *
 * {uid}_{targetType}_{targetId}
 *
 * Target IDs are encoded before being placed into the document
 * ID so unusual characters cannot alter the Firestore path.
 * ============================================================
 */

function createReportId(
  uid: string,
  targetType: ReportTargetType,
  targetId: string
): string {
  return `${uid}_${targetType}_${targetId}`;
}


/*
 * ============================================================
 * VERIFY TARGET
 * ============================================================
 *
 * Reports may only reference Community content that currently
 * exists and is published.
 * ============================================================
 */

async function requirePublishedTarget(
  targetType: ReportTargetType,
  targetId: string,
  idToken: string
): Promise<void> {

  const documentPath =
    targetType === "post"
      ? `communityPosts/${targetId}`
      : `communityReplies/${targetId}`;

  const target =
    await getAuthenticatedFirestoreDocument(
      documentPath,
      idToken
    );

  if (
    !target ||
    target.status !== "published"
  ) {

    throw new Error(
      "TARGET_NOT_FOUND"
    );
  }
}


/*
 * ============================================================
 * CREATE REPORT
 * ============================================================
 */

async function saveCommunityReport(
  reportId: string,
  idToken: string,
  data: {
    reporterId: string;
    targetType: ReportTargetType;
    targetId: string;
    reason: ReportReason;
    details: string;
    status: "open";
    createdAt: number;
    updatedAt: number;
  }
): Promise<"created" | "existing"> {

  const projectId =
    getFirebaseProjectId();

  /*
   * We cannot read communityReports with the user's token because
   * reports are intentionally private under Firestore rules.
   *
   * Instead, creation uses the deterministic document ID.
   *
   * Firestore returns 409 if this account already reported the
   * same target.
   */

  const endpoint =
    `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
      projectId
    )}/databases/(default)/documents/communityReports?documentId=${encodeURIComponent(
      reportId
    )}`;

  const response =
    await fetch(
      endpoint,
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${idToken}`,

          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify({
            fields: {

              reporterId: {
                stringValue:
                  data.reporterId,
              },

              targetType: {
                stringValue:
                  data.targetType,
              },

              targetId: {
                stringValue:
                  data.targetId,
              },

              reason: {
                stringValue:
                  data.reason,
              },

              details: {
                stringValue:
                  data.details,
              },

              status: {
                stringValue:
                  data.status,
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
    FirestoreWriteResponse = {};

  try {

    result =
      await response.json() as
        FirestoreWriteResponse;

  } catch {

    result = {};
  }


  /*
   * The deterministic document already exists.
   *
   * Treat this as an idempotent report instead of creating
   * another report.
   */

  if (response.status === 409) {
    return "existing";
  }


  if (response.status === 401) {

    throw new Error(
      "AUTH_INVALID"
    );
  }


  if (response.status === 403) {

    console.error(
      "Firestore denied Community report creation:",
      result.error
    );

    throw new Error(
      "FIRESTORE_PERMISSION_DENIED"
    );
  }


  if (!response.ok) {

    console.error(
      "Firestore Community report creation failed:",
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


  return "created";
}


/*
 * ============================================================
 * POST /api/community/reports
 * ============================================================
 */

export async function POST(
  request: Request
) {

  try {

    /*
     * ========================================================
     * REQUIRE AUTHENTICATED MEMBER
     * ========================================================
     *
     * Reporting intentionally does NOT require Premium.
     */

    const account =
      await requireAuthenticatedUser(
        request
      );

    /*
     * Reuse the already verified Firebase ID token.
     */

    const idToken =
      account.idToken;


    /*
     * ========================================================
     * REQUEST BODY
     * ========================================================
     */

    let body:
      ReportRequest;

    try {

      body =
        await request.json() as
          ReportRequest;

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
     * TARGET TYPE
     * ========================================================
     */

    if (
      !isReportTargetType(
        body.targetType
      )
    ) {

      return NextResponse.json(
        {
          error:
            "A valid Community report target is required.",
        },
        {
          status:
            400,
        }
      );
    }

    const targetType =
      body.targetType;


    /*
     * ========================================================
     * TARGET ID
     * ========================================================
     */

    const targetId =
      getCleanString(
        body.targetId,
        200
      );

    if (!targetId) {

      return NextResponse.json(
        {
          error:
            "A Community content ID is required.",
        },
        {
          status:
            400,
        }
      );
    }


    /*
     * ========================================================
     * REPORT REASON
     * ========================================================
     */

    if (
      !isReportReason(
        body.reason
      )
    ) {

      return NextResponse.json(
        {
          error:
            "Please select a valid reason for your report.",
        },
        {
          status:
            400,
        }
      );
    }

    const reason =
      body.reason;


    /*
     * ========================================================
     * OPTIONAL DETAILS
     * ========================================================
     */

    const details =
      getCleanString(
        body.details,
        1000
      );


    /*
     * ========================================================
     * VERIFY TARGET
     * ========================================================
     */

    await requirePublishedTarget(
      targetType,
      targetId,
      idToken
    );


    /*
     * ========================================================
     * REPORT ID
     * ========================================================
     */

    const reportId =
      createReportId(
        account.uid,
        targetType,
        targetId
      );


    /*
     * ========================================================
     * CREATE REPORT
     * ========================================================
     */

    const now =
      Date.now();

    const result =
      await saveCommunityReport(
        reportId,
        idToken,
        {
          reporterId:
            account.uid,

          targetType,

          targetId,

          reason,

          details,

          status:
            "open",

          createdAt:
            now,

          updatedAt:
            now,
        }
      );


    /*
     * ========================================================
     * EXISTING REPORT
     * ========================================================
     */

    if (
      result === "existing"
    ) {

      return NextResponse.json(
        {
          success:
            true,

          alreadyReported:
            true,

          message:
            "You've already reported this Community content.",

          targetType,

          targetId,
        }
      );
    }


    /*
     * ========================================================
     * SUCCESS
     * ========================================================
     */

    return NextResponse.json(
      {
        success:
          true,

        alreadyReported:
          false,

        message:
          "Thank you. Your report has been submitted for review.",

        targetType,

        targetId,
      },
      {
        status:
          201,
      }
    );


  } catch (error) {

    /*
     * ========================================================
     * AUTH REQUIRED
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
            "You must be logged in to report Community content.",
        },
        {
          status:
            401,
        }
      );
    }


    /*
     * ========================================================
     * INVALID AUTH
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
     * TARGET NOT FOUND
     * ========================================================
     */

    if (
      error instanceof Error &&
      error.message ===
        "TARGET_NOT_FOUND"
    ) {

      return NextResponse.json(
        {
          error:
            "That Community content is no longer available.",
        },
        {
          status:
            404,
        }
      );
    }


    /*
     * ========================================================
     * FIRESTORE RULES
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
            "Your account does not currently have permission to submit this report.",
        },
        {
          status:
            403,
        }
      );
    }


    /*
     * ========================================================
     * FIREBASE CONFIG
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
     * FIRESTORE WRITE FAILURE
     * ========================================================
     */

    if (
      error instanceof Error &&
      error.message ===
        "FIRESTORE_WRITE_FAILED"
    ) {

      return NextResponse.json(
        {
          error:
            "We couldn't submit your report right now. Please try again.",
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
      "Community report error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "We couldn't submit your report right now. Please try again.",
      },
      {
        status:
          500,
      }
    );
  }
}