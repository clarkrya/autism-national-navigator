import {
    NextResponse,
  } from "next/server";
  
  import {
    adminAuth,
  } from "../../../../lib/firebaseAdmin";
  
  
  /*
   * ============================================================
   * ONE-TIME ADMIN BOOTSTRAP ROUTE
   * ============================================================
   *
   * TEMPORARY ROUTE.
   *
   * Purpose:
   *   Assign the first trusted Firebase admin custom claim.
   *
   * SECURITY:
   *   Requires:
   *
   *   1. A valid Firebase ID token
   *   2. A server-only bootstrap secret
   *
   * After the first admin has been created successfully:
   *
   *   DELETE THIS ROUTE.
   *
   * ============================================================
   */
  
  
  export async function POST(
    request: Request
  ) {
  
    try {
  
      /*
       * ----------------------------------------------------------
       * VERIFY BOOTSTRAP SECRET
       * ----------------------------------------------------------
       */
  
      const configuredSecret =
        process.env
          .COMMUNITY_ADMIN_BOOTSTRAP_SECRET;
  
  
      if (
        !configuredSecret
      ) {
  
        console.error(
          "COMMUNITY_ADMIN_BOOTSTRAP_SECRET is not configured."
        );
  
  
        return NextResponse.json(
          {
            success:
              false,
  
            error:
              "BOOTSTRAP_NOT_CONFIGURED",
          },
          {
            status:
              500,
          }
        );
  
      }
  
  
      const suppliedSecret =
        request.headers.get(
          "x-bootstrap-secret"
        );
  
  
      if (
        !suppliedSecret ||
        suppliedSecret !==
          configuredSecret
      ) {
  
        return NextResponse.json(
          {
            success:
              false,
  
            error:
              "BOOTSTRAP_FORBIDDEN",
          },
          {
            status:
              403,
          }
        );
  
      }
  
  
      /*
       * ----------------------------------------------------------
       * REQUIRE FIREBASE AUTHORIZATION TOKEN
       * ----------------------------------------------------------
       */
  
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
  
        return NextResponse.json(
          {
            success:
              false,
  
            error:
              "AUTH_REQUIRED",
          },
          {
            status:
              401,
          }
        );
  
      }
  
  
      const idToken =
        authorization
          .slice(7)
          .trim();
  
  
      if (
        !idToken
      ) {
  
        return NextResponse.json(
          {
            success:
              false,
  
            error:
              "AUTH_REQUIRED",
          },
          {
            status:
              401,
          }
        );
  
      }
  
  
      /*
       * ----------------------------------------------------------
       * VERIFY FIREBASE USER
       * ----------------------------------------------------------
       */
  
      let decodedToken;
  
  
      try {
  
        decodedToken =
          await adminAuth.verifyIdToken(
            idToken
          );
  
      } catch (
        error
      ) {
  
        console.error(
          "Admin bootstrap authentication failed:",
          error
        );
  
  
        return NextResponse.json(
          {
            success:
              false,
  
            error:
              "AUTH_INVALID",
          },
          {
            status:
              401,
          }
        );
  
      }
  
  
      /*
       * ----------------------------------------------------------
       * PRESERVE EXISTING CUSTOM CLAIMS
       * ----------------------------------------------------------
       */
  
      const userRecord =
        await adminAuth.getUser(
          decodedToken.uid
        );
  
  
      const existingClaims =
        userRecord.customClaims ??
        {};
  
  
      /*
       * ----------------------------------------------------------
       * ASSIGN ADMIN CLAIM
       * ----------------------------------------------------------
       */
  
      await adminAuth.setCustomUserClaims(
        decodedToken.uid,
        {
          ...existingClaims,
  
          admin:
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
  
          uid:
            decodedToken.uid,
  
          email:
            decodedToken.email ??
            null,
  
          admin:
            true,
  
          message:
            "Admin claim assigned. Sign out and sign back in to refresh your Firebase token.",
        },
        {
          status:
            200,
        }
      );
  
    } catch (
      error
    ) {
  
      console.error(
        "Admin bootstrap failed:",
        error
      );
  
  
      return NextResponse.json(
        {
          success:
            false,
  
          error:
            "ADMIN_BOOTSTRAP_FAILED",
        },
        {
          status:
            500,
        }
      );
  
    }
  
  }