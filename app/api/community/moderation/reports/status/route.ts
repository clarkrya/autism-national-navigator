import { NextResponse } from "next/server";

import {
  requireCommunityModerator,
} from "../../../../../../lib/serverSubscriptionAuth";


type ReportStatus =
  | "open"
  | "reviewing"
  | "resolved"
  | "dismissed";


type StatusRequestBody = {
  reportId?: unknown;
  status?: unknown;
};


type FirestoreRestResponse = {
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
};


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


function isReportStatus(
  value: unknown
): value is ReportStatus {

  return (
    value === "open" ||
    value === "reviewing" ||
    value === "resolved" ||
    value === "dismissed"
  );
}


function isValidReportId(
  value: unknown
): value is string {

  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.trim().length <= 500
  );
}


async function updateReportStatus(
  reportId: string,
  status: ReportStatus,
  idToken: string
): Promise<void> {

  const projectId =
    getFirebaseProjectId();


  const normalizedReportId =
    encodeURIComponent(
      reportId
    );


  const params =
    new URLSearchParams();


  params.append(
    "updateMask.fieldPaths",
    "status"
  );


  params.append(
    "updateMask.fieldPaths",
    "updatedAt"
  );


  const endpoint =
    `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
      projectId
    )}/databases/(default)/documents/communityReports/${normalizedReportId}?${params.toString()}`;


  const updatedAt =
    Date.now();


  const response =
    await fetch(
      endpoint,
      {
        method:
          "PATCH",

        headers: {
          Authorization:
            `Bearer ${idToken}`,

          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify({
            fields: {
              status: {
                stringValue:
                  status,
              },

              updatedAt: {
                integerValue:
                  String(updatedAt),
              },
            },
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
      "Firestore denied Community report status update:",
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
      "REPORT_NOT_FOUND"
    );
  }


  if (!response.ok) {

    console.error(
      "Firestore Community report status update failed:",
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
}


export async function POST(
  request: Request
) {

  try {

    const moderator =
      await requireCommunityModerator(
        request
      );


    let body:
      StatusRequestBody =
      {};


    try {

      body =
        await request.json() as
          StatusRequestBody;

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


    if (
      !isValidReportId(
        body.reportId
      )
    ) {

      return NextResponse.json(
        {
          error:
            "A valid report ID is required.",
        },
        {
          status:
            400,
        }
      );
    }


    if (
      !isReportStatus(
        body.status
      )
    ) {

      return NextResponse.json(
        {
          error:
            "A valid moderation status is required.",
        },
        {
          status:
            400,
        }
      );
    }


    const reportId =
      body.reportId.trim();


    await updateReportStatus(
      reportId,
      body.status,
      moderator.idToken
    );


    return NextResponse.json(
      {
        success:
          true,

        reportId,

        status:
          body.status,
      }
    );


  } catch (error) {

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
        "COMMUNITY_MODERATOR_REQUIRED"
    ) {

      return NextResponse.json(
        {
          error:
            "You do not have permission to manage Community moderation.",
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
        "FIRESTORE_PERMISSION_DENIED"
    ) {

      return NextResponse.json(
        {
          error:
            "Firestore denied this moderation action.",
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
        "REPORT_NOT_FOUND"
    ) {

      return NextResponse.json(
        {
          error:
            "That Community report could not be found.",
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


    if (
      error instanceof Error &&
      error.message ===
        "FIRESTORE_WRITE_FAILED"
    ) {

      return NextResponse.json(
        {
          error:
            "We couldn't update the Community report right now.",
        },
        {
          status:
            500,
        }
      );
    }


    console.error(
      "Community moderation status error:",
      error
    );


    return NextResponse.json(
      {
        error:
          "We couldn't update the Community report right now.",
      },
      {
        status:
          500,
      }
    );
  }
}