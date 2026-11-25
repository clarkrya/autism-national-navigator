
import { NextRequest, NextResponse } from "next/server";

import { FieldValue } from "firebase-admin/firestore";

import {
  getAdminAuth,
  getAdminDb,
} from "../../../../lib/firebaseAdmin";

export const runtime = "nodejs";

/*
 * ============================================================
 * AUTIVOYA — LEGAL ACCEPTANCE API
 * ============================================================
 *
 * Records authenticated legal acceptance using Firebase Admin.
 *
 * Records are versioned and protected against client changes
 * under the current Firestore security rules.
 */

const LEGAL_VERSIONS = {
  termsOfService: "1.0",
  privacyPolicy: "1.0",
};

const VERSION_ID =
  `terms-${LEGAL_VERSIONS.termsOfService}` +
  `__privacy-${LEGAL_VERSIONS.privacyPolicy}`;

type LegalAcceptanceMethod =
  | "signup"
  | "account_update";

type LegalAcceptanceBody = {
  ageRequirementConfirmed?: unknown;
  termsAccepted?: unknown;
  privacyAcknowledged?: unknown;
  termsVersion?: unknown;
  privacyVersion?: unknown;
  acceptanceMethod?: unknown;
};

/*
 * ============================================================
 * POST — RECORD LEGAL ACCEPTANCE
 * ============================================================
 */

export async function POST(request: NextRequest) {
  try {
    /*
     * AUTHENTICATE USER
     */

    const authorization =
      request.headers.get("authorization");

    if (
      !authorization ||
      !authorization.startsWith("Bearer ")
    ) {
      return NextResponse.json(
        {
          error: "Authentication is required.",
        },
        {
          status: 401,
        }
      );
    }

    const token =
      authorization.slice(7).trim();

    if (!token) {
      return NextResponse.json(
        {
          error: "Authentication is required.",
        },
        {
          status: 401,
        }
      );
    }

    const adminAuth = getAdminAuth();

    let userId: string;

    try {
      const decodedToken =
        await adminAuth.verifyIdToken(
          token,
          true
        );

      userId = decodedToken.uid;
    } catch {
      return NextResponse.json(
        {
          error: "Invalid or expired authentication.",
        },
        {
          status: 401,
        }
      );
    }

    /*
     * VALIDATE REQUEST BODY
     */

    let rawBody: unknown;

    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json(
        {
          error: "Invalid request.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !rawBody ||
      typeof rawBody !== "object" ||
      Array.isArray(rawBody)
    ) {
      return NextResponse.json(
        {
          error: "Invalid acceptance information.",
        },
        {
          status: 400,
        }
      );
    }

    const body =
      rawBody as LegalAcceptanceBody;

    /*
     * VALIDATE LEGAL ACCEPTANCE
     */

    if (
      body.ageRequirementConfirmed !== true ||
      body.termsAccepted !== true ||
      body.privacyAcknowledged !== true
    ) {
      return NextResponse.json(
        {
          error:
            "All legal acceptance requirements must be confirmed.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * VALIDATE DOCUMENT VERSIONS
     */

    if (
      body.termsVersion !==
        LEGAL_VERSIONS.termsOfService ||
      body.privacyVersion !==
        LEGAL_VERSIONS.privacyPolicy
    ) {
      return NextResponse.json(
        {
          error:
            "The legal documents have changed. Please refresh and review the current versions.",
        },
        {
          status: 409,
        }
      );
    }

    /*
     * VALIDATE ACCEPTANCE METHOD
     */

    if (
      body.acceptanceMethod !== "signup" &&
      body.acceptanceMethod !== "account_update"
    ) {
      return NextResponse.json(
        {
          error: "Invalid acceptance method.",
        },
        {
          status: 400,
        }
      );
    }

    const acceptanceMethod: LegalAcceptanceMethod =
      body.acceptanceMethod;

    /*
     * FIRESTORE REFERENCES
     */

    const adminDb = getAdminDb();

    const acceptanceRef = adminDb
      .collection("users")
      .doc(userId)
      .collection("legalAcceptances")
      .doc(VERSION_ID);

    /*
     * ========================================================
     * CREATE VERSIONED ACCEPTANCE RECORD
     * ========================================================
     *
     * Transactions prevent duplicate submissions from
     * overwriting the original acceptance timestamp.
     */

    const alreadyAccepted =
      await adminDb.runTransaction(
        async (transaction) => {
          const existing =
            await transaction.get(
              acceptanceRef
            );

          if (existing.exists) {
            return true;
          }

          transaction.create(
            acceptanceRef,
            {
              userId,

              ageRequirementConfirmed: true,

              termsAccepted: true,

              privacyAcknowledged: true,

              termsVersion:
                LEGAL_VERSIONS.termsOfService,

              privacyVersion:
                LEGAL_VERSIONS.privacyPolicy,

              acceptedAt:
                FieldValue.serverTimestamp(),

              acceptanceMethod,

              schemaVersion: 1,
            }
          );

          return false;
        }
      );

    /*
     * SUCCESS RESPONSE
     */

    return NextResponse.json(
      {
        success: true,

        alreadyAccepted,

        versionId: VERSION_ID,

        termsVersion:
          LEGAL_VERSIONS.termsOfService,

        privacyVersion:
          LEGAL_VERSIONS.privacyPolicy,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "Legal acceptance API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to record legal acceptance. Please try again.",
      },
      {
        status: 500,
      }
    );
  }
}
