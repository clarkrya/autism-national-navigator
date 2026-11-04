import { NextResponse } from "next/server";

import {
  getAuthenticatedFirestoreDocument,
  requireCommunityModerator,
} from "../../../../../lib/serverSubscriptionAuth";

/*
 * ============================================================
 * COMMUNITY MODERATION REPORTS API
 * ============================================================
 *
 * GET /api/community/moderation/reports
 *
 * Only active Community moderators/admins may use this route.
 *
 * Authorization:
 *
 * Firebase ID token
 *      ↓
 * requireCommunityModerator()
 *      ↓
 * users/{uid}/communityAccess/current
 *      ↓
 * Firestore Security Rules
 *
 * No Firebase Admin SDK.
 *
 * Each moderation report is enriched with the current state of
 * the reported post/reply so the moderation queue can display
 * only actions that make sense for that content.
 *
 * Reply reports are also enriched with parentPostId so the
 * moderator can open the correct Community conversation.
 * ============================================================
 */

type ModerationReportStatus =
  | "open"
  | "reviewing"
  | "resolved"
  | "dismissed";

type ModerationReportTargetType =
  | "post"
  | "reply";

type ModerationReportReason =
  | "harassment"
  | "hate_or_abuse"
  | "misinformation"
  | "privacy"
  | "spam"
  | "unsafe_content"
  | "other";

type CommunityContentStatus =
  | "published"
  | "hidden"
  | "removed";

type CommunityContentModerationStatus =
  | "not_reviewed"
  | "reviewed"
  | "flagged"
  | "removed";

type CommunityModerationReport = {
  id: string;

  reporterId: string;

  targetType: ModerationReportTargetType;

  targetId: string;

  parentPostId: string;

  contentStatus: CommunityContentStatus | null;

  contentModerationStatus:
    | CommunityContentModerationStatus
    | null;

  targetMissing: boolean;

  reason: ModerationReportReason;

  details: string;

  status: ModerationReportStatus;

  createdAt: number;

  updatedAt: number;
};

type FirestoreRestValue =
  | {
      stringValue?: string;
    }
  | {
      integerValue?: string | number;
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
};

type FirestoreListResponse = {
  documents?: FirestoreRestDocument[];

  nextPageToken?: string;

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
  const projectId = (
    process.env
      .NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    process.env
      .FIREBASE_ADMIN_PROJECT_ID
  )?.trim();

  if (!projectId) {
    throw new Error(
      "FIREBASE_PROJECT_ID_MISSING"
    );
  }

  return projectId;
}

/*
 * ============================================================
 * FIRESTORE VALUE DECODER
 * ============================================================
 */

function decodeFirestoreValue(
  value:
    | FirestoreRestValue
    | undefined
): unknown {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return undefined;
  }

  if ("stringValue" in value) {
    return value.stringValue;
  }

  if ("integerValue" in value) {
    const raw =
      value.integerValue;

    if (typeof raw === "number") {
      return raw;
    }

    if (typeof raw === "string") {
      const parsed =
        Number(raw);

      return Number.isFinite(parsed)
        ? parsed
        : 0;
    }
  }

  if ("doubleValue" in value) {
    return value.doubleValue;
  }

  if ("booleanValue" in value) {
    return value.booleanValue;
  }

  if ("nullValue" in value) {
    return null;
  }

  if ("timestampValue" in value) {
    return value.timestampValue;
  }

  if ("mapValue" in value) {
    return decodeFirestoreFields(
      value.mapValue?.fields
    );
  }

  if ("arrayValue" in value) {
    return (
      value.arrayValue?.values ||
      []
    ).map((item) =>
      decodeFirestoreValue(item)
    );
  }

  return undefined;
}

function decodeFirestoreFields(
  fields:
    | Record<
        string,
        FirestoreRestValue
      >
    | undefined
): Record<string, unknown> {
  const decoded:
    Record<string, unknown> =
    {};

  if (!fields) {
    return decoded;
  }

  Object.entries(fields).forEach(
    ([key, value]) => {
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
 * DOCUMENT ID
 * ============================================================
 */

function getDocumentId(
  documentName:
    | string
    | undefined
): string {
  if (!documentName) {
    return "";
  }

  const parts =
    documentName.split("/");

  return (
    parts[
      parts.length - 1
    ] || ""
  );
}

/*
 * ============================================================
 * TYPE GUARDS
 * ============================================================
 */

function isReportStatus(
  value: unknown
): value is ModerationReportStatus {
  return (
    value === "open" ||
    value === "reviewing" ||
    value === "resolved" ||
    value === "dismissed"
  );
}

function isReportTargetType(
  value: unknown
): value is ModerationReportTargetType {
  return (
    value === "post" ||
    value === "reply"
  );
}

function isReportReason(
  value: unknown
): value is ModerationReportReason {
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

function isContentStatus(
  value: unknown
): value is CommunityContentStatus {
  return (
    value === "published" ||
    value === "hidden" ||
    value === "removed"
  );
}

function isContentModerationStatus(
  value: unknown
): value is CommunityContentModerationStatus {
  return (
    value === "not_reviewed" ||
    value === "reviewed" ||
    value === "flagged" ||
    value === "removed"
  );
}

/*
 * ============================================================
 * NORMALIZE REPORT
 * ============================================================
 */

function normalizeReport(
  document:
    FirestoreRestDocument
): CommunityModerationReport | null {
  const data =
    decodeFirestoreFields(
      document.fields
    );

  const id =
    getDocumentId(
      document.name
    );

  if (!id) {
    return null;
  }

  if (
    typeof data.reporterId !==
      "string" ||
    !data.reporterId
  ) {
    return null;
  }

  if (
    !isReportTargetType(
      data.targetType
    )
  ) {
    return null;
  }

  if (
    typeof data.targetId !==
      "string" ||
    !data.targetId
  ) {
    return null;
  }

  if (
    !isReportReason(
      data.reason
    )
  ) {
    return null;
  }

  if (
    !isReportStatus(
      data.status
    )
  ) {
    return null;
  }

  return {
    id,

    reporterId:
      data.reporterId,

    targetType:
      data.targetType,

    targetId:
      data.targetId,

    /*
     * Post reports already know their conversation ID.
     *
     * Reply reports receive parentPostId during enrichment.
     */

    parentPostId:
      data.targetType === "post"
        ? data.targetId
        : "",

    /*
     * These are populated from the live target document during
     * enrichment below.
     */

    contentStatus:
      null,

    contentModerationStatus:
      null,

    targetMissing:
      false,

    reason:
      data.reason,

    details:
      typeof data.details ===
        "string"
        ? data.details
        : "",

    status:
      data.status,

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
 * TARGET DOCUMENT
 * ============================================================
 *
 * Moderators are permitted by Firestore Security Rules to read
 * Community posts and replies regardless of whether they are
 * published, hidden, or removed.
 *
 * This lets the moderation queue inspect the current state of
 * the reported content without using the Admin SDK.
 * ============================================================
 */

async function getReportTargetDocument(
  report: CommunityModerationReport,
  idToken: string
): Promise<Record<string, unknown> | null> {
  const collectionName =
    report.targetType === "post"
      ? "communityPosts"
      : "communityReplies";

  const documentPath =
    `${collectionName}/${report.targetId}`;

  try {
    const document =
      await getAuthenticatedFirestoreDocument(
        documentPath,
        idToken
      );

    if (
      !document ||
      typeof document !== "object"
    ) {
      return null;
    }

    return document;
  } catch (error) {
    /*
     * A target may no longer exist because it predates the
     * current moderation architecture or was removed outside
     * the normal moderation workflow.
     *
     * Do not remove its report from the queue.
     */

    console.error(
      "Unable to resolve Community moderation target:",
      {
        targetType:
          report.targetType,

        targetId:
          report.targetId,

        error,
      }
    );

    return null;
  }
}

/*
 * ============================================================
 * ENRICH ONE REPORT
 * ============================================================
 */

async function enrichSingleReport(
  report: CommunityModerationReport,
  idToken: string
): Promise<CommunityModerationReport> {
  const target =
    await getReportTargetDocument(
      report,
      idToken
    );

  /*
   * Preserve the report even when its target cannot be found.
   */

  if (!target) {
    return {
      ...report,

      contentStatus:
        null,

      contentModerationStatus:
        null,

      targetMissing:
        true,
    };
  }

  const contentStatus =
    isContentStatus(
      target.status
    )
      ? target.status
      : null;

  const contentModerationStatus =
    isContentModerationStatus(
      target.moderationStatus
    )
      ? target.moderationStatus
      : null;

  /*
   * Post reports already have parentPostId.
   *
   * Reply documents contain their parent post in postId, so we
   * can resolve both navigation and moderation state from the
   * same authenticated Firestore read.
   */

  let parentPostId =
    report.parentPostId;

  if (
    report.targetType === "reply"
  ) {
    parentPostId =
      typeof target.postId ===
        "string"
        ? target.postId.trim()
        : "";
  }

  return {
    ...report,

    parentPostId,

    contentStatus,

    contentModerationStatus,

    targetMissing:
      false,
  };
}

/*
 * ============================================================
 * ENRICH REPORT CONTEXT
 * ============================================================
 */

async function enrichReportContext(
  reports:
    CommunityModerationReport[],
  idToken: string
): Promise<CommunityModerationReport[]> {
  return Promise.all(
    reports.map((report) =>
      enrichSingleReport(
        report,
        idToken
      )
    )
  );
}

/*
 * ============================================================
 * LOAD MODERATION REPORTS
 * ============================================================
 */

async function loadModerationReports(
  idToken: string
): Promise<CommunityModerationReport[]> {
  const projectId =
    getFirebaseProjectId();

  const params =
    new URLSearchParams({
      pageSize:
        "100",

      orderBy:
        "createdAt desc",
    });

  const endpoint =
    `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
      projectId
    )}/databases/(default)/documents/communityReports?${params.toString()}`;

  const response =
    await fetch(
      endpoint,
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

  let result:
    FirestoreListResponse =
    {};

  try {
    result =
      await response.json() as
        FirestoreListResponse;
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
      "Firestore denied Community moderation report access:",
      result.error
    );

    throw new Error(
      "FIRESTORE_PERMISSION_DENIED"
    );
  }

  if (!response.ok) {
    console.error(
      "Firestore moderation report query failed:",
      {
        status:
          response.status,

        error:
          result.error,
      }
    );

    throw new Error(
      "FIRESTORE_READ_FAILED"
    );
  }

  const reports =
    (
      result.documents ||
      []
    )
      .map(
        normalizeReport
      )
      .filter(
        (
          report
        ): report is CommunityModerationReport =>
          report !== null
      );

  /*
   * Add live content state and reply conversation context.
   */

  return enrichReportContext(
    reports,
    idToken
  );
}

/*
 * ============================================================
 * GET /api/community/moderation/reports
 * ============================================================
 */

export async function GET(
  request: Request
) {
  try {
    /*
     * Verify the Firebase user and their trusted
     * Community moderator/admin access record.
     */

    const moderator =
      await requireCommunityModerator(
        request
      );

    /*
     * Use the same authenticated Firebase ID token to read the
     * private report collection and reported content.
     *
     * Firestore Security Rules independently require
     * isCommunityModerator().
     */

    const reports =
      await loadModerationReports(
        moderator.idToken
      );

    return NextResponse.json(
      {
        success:
          true,

        role:
          moderator.role,

        reports,

        count:
          reports.length,
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
            "You must be logged in to access Community moderation.",
        },
        {
          status:
            401,
        }
      );
    }

    /*
     * Invalid/expired Firebase login.
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
     * Authenticated but not a trusted moderator/admin.
     */

    if (
      error instanceof Error &&
      error.message ===
        "COMMUNITY_MODERATOR_REQUIRED"
    ) {
      return NextResponse.json(
        {
          error:
            "You do not have permission to access Community moderation.",
        },
        {
          status:
            403,
        }
      );
    }

    /*
     * Firestore independently denied the operation.
     */

    if (
      error instanceof Error &&
      error.message ===
        "FIRESTORE_PERMISSION_DENIED"
    ) {
      return NextResponse.json(
        {
          error:
            "Firestore denied access to the Community moderation queue.",
        },
        {
          status:
            403,
        }
      );
    }

    /*
     * Firebase project configuration.
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
     * Firestore query failure.
     */

    if (
      error instanceof Error &&
      error.message ===
        "FIRESTORE_READ_FAILED"
    ) {
      return NextResponse.json(
        {
          error:
            "We couldn't load Community reports right now.",
        },
        {
          status:
            500,
        }
      );
    }

    /*
     * Unexpected failure.
     */

    console.error(
      "Community moderation reports error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "We couldn't load Community reports right now.",
      },
      {
        status:
          500,
      }
    );
  }
}