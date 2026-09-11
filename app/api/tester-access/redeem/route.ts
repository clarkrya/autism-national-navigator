import {
    createHash,
    timingSafeEqual,
  } from "crypto";
  
  import {
    NextResponse,
  } from "next/server";
  
  import {
    requireAuthenticatedUser,
  } from "../../../../lib/serverSubscriptionAuth";
  
  
  /*
   * ============================================================
   * TESTER ACCESS REDEMPTION API
   * ============================================================
   *
   * POST /api/tester-access/redeem
   *
   * Allows an authenticated beta tester to redeem a private
   * tester access code for temporary Premium access.
   *
   * SECURITY:
   *
   * Firebase ID token
   *      ↓
   * requireAuthenticatedUser()
   *      ↓
   * Server-only tester code comparison
   *      ↓
   * Firebase Admin runtime write
   *      ↓
   * users/{uid}/testerAccess/current
   *
   * IMPORTANT:
   *
   * - The tester code is NEVER exposed to client JavaScript.
   * - The tester code is NEVER stored in Firestore.
   * - Firestore Security Rules continue blocking users from
   *   creating or modifying their own tester entitlement.
   * - Tester access grants Premium only.
   * - Tester access does NOT grant Premium+.
   *
   * Firebase Admin is imported only at request time so this route
   * does not initialize Admin during Next.js build/page-data
   * collection.
   * ============================================================
   */
  
  
  /*
   * ============================================================
   * REQUEST TYPE
   * ============================================================
   */
  
  type RedeemTesterAccessBody = {
    code?: unknown;
  };
  
  
  /*
   * ============================================================
   * CONFIGURATION
   * ============================================================
   */
  
  function getTesterAccessCode(): string {
  
    const code =
      process.env
        .TESTER_ACCESS_CODE
        ?.trim();
  
  
    if (
      !code
    ) {
  
      throw new Error(
        "TESTER_ACCESS_CODE_MISSING"
      );
  
    }
  
  
    return code;
  }
  
  
  function getTesterAccessDays(): number {
  
    const rawValue =
      process.env
        .TESTER_ACCESS_DAYS
        ?.trim();
  
  
    /*
     * Default tester access period:
     *
     * 30 days
     */
  
    if (
      !rawValue
    ) {
  
      return 30;
  
    }
  
  
    const parsed =
      Number(
        rawValue
      );
  
  
    if (
      !Number.isInteger(
        parsed
      ) ||
      parsed < 1 ||
      parsed > 365
    ) {
  
      throw new Error(
        "TESTER_ACCESS_DAYS_INVALID"
      );
  
    }
  
  
    return parsed;
  }
  
  
  /*
   * ============================================================
   * NORMALIZE CODE
   * ============================================================
   */
  
  function normalizeTesterCode(
    value: unknown
  ): string {
  
    if (
      typeof value !==
        "string"
    ) {
  
      return "";
  
    }
  
  
    return value
      .trim();
  }
  
  
  /*
   * ============================================================
   * SECURE CODE COMPARISON
   * ============================================================
   *
   * Compare SHA-256 digests rather than comparing the original
   * strings directly.
   *
   * This also means timingSafeEqual always receives equal-length
   * buffers.
   * ============================================================
   */
  
  function testerCodesMatch(
    suppliedCode: string,
    expectedCode: string
  ): boolean {
  
    const suppliedHash =
      createHash(
        "sha256"
      )
        .update(
          suppliedCode,
          "utf8"
        )
        .digest();
  
  
    const expectedHash =
      createHash(
        "sha256"
      )
        .update(
          expectedCode,
          "utf8"
        )
        .digest();
  
  
    return timingSafeEqual(
      suppliedHash,
      expectedHash
    );
  }
  
  
  /*
   * ============================================================
   * VOUCHER ID
   * ============================================================
   *
   * This is an internal campaign identifier only.
   *
   * It is NOT the tester code.
   * ============================================================
   */
  
  function getVoucherId(): string {
  
    const configuredId =
      process.env
        .TESTER_ACCESS_VOUCHER_ID
        ?.trim();
  
  
    if (
      configuredId
    ) {
  
      return configuredId
        .slice(
          0,
          100
        );
  
    }
  
  
    return "beta-testing";
  }
  
  
  /*
   * ============================================================
   * POST /api/tester-access/redeem
   * ============================================================
   */
  
  export async function POST(
    request: Request
  ) {
  
    try {
  
      /*
       * ----------------------------------------------------------
       * VERIFY FIREBASE USER
       * ----------------------------------------------------------
       */
  
      const account =
        await requireAuthenticatedUser(
          request
        );
  
  
      /*
       * ----------------------------------------------------------
       * READ REQUEST BODY
       * ----------------------------------------------------------
       */
  
      let body:
        RedeemTesterAccessBody =
        {};
  
  
      try {
  
        body =
          await request.json() as
            RedeemTesterAccessBody;
  
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
       * ----------------------------------------------------------
       * VALIDATE CODE INPUT
       * ----------------------------------------------------------
       */
  
      const suppliedCode =
        normalizeTesterCode(
          body.code
        );
  
  
      if (
        !suppliedCode
      ) {
  
        return NextResponse.json(
          {
            error:
              "Please enter a tester access code.",
          },
          {
            status:
              400,
          }
        );
  
      }
  
  
      if (
        suppliedCode.length >
        200
      ) {
  
        return NextResponse.json(
          {
            error:
              "That tester access code is not valid.",
          },
          {
            status:
              400,
          }
        );
  
      }
  
  
      /*
       * ----------------------------------------------------------
       * LOAD SERVER-ONLY EXPECTED CODE
       * ----------------------------------------------------------
       */
  
      const expectedCode =
        getTesterAccessCode();
  
  
      /*
       * ----------------------------------------------------------
       * VERIFY TESTER CODE
       * ----------------------------------------------------------
       */
  
      if (
        !testerCodesMatch(
          suppliedCode,
          expectedCode
        )
      ) {
  
        /*
         * Deliberately do not reveal whether the code was close,
         * expired, malformed, or otherwise incorrect.
         */
  
        return NextResponse.json(
          {
            error:
              "That tester access code is not valid.",
          },
          {
            status:
              403,
          }
        );
  
      }
  
  
      /*
       * ----------------------------------------------------------
       * CALCULATE TESTER ACCESS PERIOD
       * ----------------------------------------------------------
       */
  
      const accessDays =
        getTesterAccessDays();
  
  
      const redeemedAt =
        Date.now();
  
  
      const expiresAt =
        redeemedAt +
        (
          accessDays *
          24 *
          60 *
          60 *
          1000
        );
  
  
      const voucherId =
        getVoucherId();
  
  
      /*
       * ----------------------------------------------------------
       * TRUSTED FIRESTORE WRITE
       * ----------------------------------------------------------
       *
       * This dynamic import is intentional.
       *
       * Firebase Admin is initialized only when this POST endpoint
       * actually runs, not while Next.js is compiling or collecting
       * page data.
       */
  
      const firebaseAdmin =
        await import(
          "../../../../lib/firebaseAdmin"
        );
  
  
      const adminDb =
        firebaseAdmin.adminDb;
  
  
      /*
       * The user cannot perform this write directly because
       * Firestore Security Rules deny all client writes to
       * testerAccess.
       *
       * Firebase Admin performs the trusted authorization-state
       * change after the server has verified both:
       *
       * 1. the Firebase user
       * 2. the private tester code
       */
  
      const testerAccessRef =
        adminDb
          .collection(
            "users"
          )
          .doc(
            account.uid
          )
          .collection(
            "testerAccess"
          )
          .doc(
            "current"
          );
  
  
      await testerAccessRef.set(
        {
          active:
            true,
  
          plan:
            "premium",
  
          voucherId,
  
          redeemedAt,
  
          expiresAt,
  
          updatedAt:
            redeemedAt,
        },
        {
          merge:
            true,
        }
      );
  
  
      /*
       * ----------------------------------------------------------
       * SUCCESS
       * ----------------------------------------------------------
       */
  
      return NextResponse.json(
        {
          success:
            true,
  
          plan:
            "premium",
  
          voucherId,
  
          redeemedAt,
  
          expiresAt,
  
          accessDays,
        }
      );
  
  
    } catch (error) {
  
      /*
       * ----------------------------------------------------------
       * AUTHENTICATION REQUIRED
       * ----------------------------------------------------------
       */
  
      if (
        error instanceof Error &&
        error.message ===
          "AUTH_REQUIRED"
      ) {
  
        return NextResponse.json(
          {
            error:
              "You must be logged in to redeem tester access.",
          },
          {
            status:
              401,
          }
        );
  
      }
  
  
      /*
       * ----------------------------------------------------------
       * INVALID / EXPIRED FIREBASE SESSION
       * ----------------------------------------------------------
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
       * ----------------------------------------------------------
       * FIREBASE AUTH CONFIGURATION
       * ----------------------------------------------------------
       */
  
      if (
        error instanceof Error &&
        error.message ===
          "FIREBASE_API_KEY_MISSING"
      ) {
  
        return NextResponse.json(
          {
            error:
              "Tester access is not configured correctly.",
          },
          {
            status:
              500,
          }
        );
  
      }
  
  
      /*
       * ----------------------------------------------------------
       * TESTER CODE CONFIGURATION
       * ----------------------------------------------------------
       */
  
      if (
        error instanceof Error &&
        error.message ===
          "TESTER_ACCESS_CODE_MISSING"
      ) {
  
        console.error(
          "Tester access code environment variable is missing."
        );
  
  
        return NextResponse.json(
          {
            error:
              "Tester access is not configured yet.",
          },
          {
            status:
              503,
          }
        );
  
      }
  
  
      /*
       * ----------------------------------------------------------
       * TESTER DURATION CONFIGURATION
       * ----------------------------------------------------------
       */
  
      if (
        error instanceof Error &&
        error.message ===
          "TESTER_ACCESS_DAYS_INVALID"
      ) {
  
        console.error(
          "TESTER_ACCESS_DAYS contains an invalid value."
        );
  
  
        return NextResponse.json(
          {
            error:
              "Tester access is not configured correctly.",
          },
          {
            status:
              500,
          }
        );
  
      }
  
  
      /*
       * ----------------------------------------------------------
       * FIREBASE ADMIN CONFIGURATION
       * ----------------------------------------------------------
       *
       * firebaseAdmin.ts may throw configuration/private-key
       * errors depending on how that module currently reports them.
       *
       * Do not return those internal details to the browser.
       */
  
      console.error(
        "Tester access redemption error:",
        error
      );
  
  
      return NextResponse.json(
        {
          error:
            "We couldn't activate tester access right now. Please try again later.",
        },
        {
          status:
            500,
        }
      );
  
    }
  }