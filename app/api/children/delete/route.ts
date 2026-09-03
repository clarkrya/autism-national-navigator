import {
    NextResponse,
  } from "next/server";
  
  import {
    adminAuth,
    adminDb,
  } from "../../../../lib/firebaseAdmin";
  
  
  /*
   * ============================================================
   * TYPES
   * ============================================================
   */
  
  type DeleteChildRequest = {
    childId?: string;
  };
  
  
  /*
   * ============================================================
   * JSON RESPONSE HELPERS
   * ============================================================
   */
  
  function jsonError(
    message: string,
    status: number
  ) {
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      {
        status,
      }
    );
  }
  
  
  function jsonSuccess(
    childId: string
  ) {
    return NextResponse.json(
      {
        success: true,
        childId,
      },
      {
        status: 200,
      }
    );
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
       * ----------------------------------------------------------
       * READ AUTHORIZATION HEADER
       * ----------------------------------------------------------
       */
  
      const authorization =
        request.headers.get(
          "authorization"
        );
  
  
      if (
        !authorization ||
        !authorization.startsWith(
          "Bearer "
        )
      ) {
        return jsonError(
          "Authentication is required.",
          401
        );
      }
  
  
      const idToken =
        authorization
          .slice(
            "Bearer ".length
          )
          .trim();
  
  
      if (
        !idToken
      ) {
        return jsonError(
          "Authentication token is missing.",
          401
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
        authError
      ) {
        console.error(
          "Delete child authentication failed:",
          authError
        );
  
  
        return jsonError(
          "Your session could not be verified. Please sign in again.",
          401
        );
      }
  
  
      const userId =
        decodedToken.uid;
  
  
      /*
       * ----------------------------------------------------------
       * PARSE REQUEST BODY
       * ----------------------------------------------------------
       */
  
      let body:
        DeleteChildRequest;
  
  
      try {
        body =
          await request.json();
  
      } catch (
        parseError
      ) {
        console.error(
          "Unable to parse delete child request:",
          parseError
        );
  
  
        return jsonError(
          "The delete request was invalid.",
          400
        );
      }
  
  
      const childId =
        typeof body?.childId ===
        "string"
          ? body.childId.trim()
          : "";
  
  
      if (
        !childId
      ) {
        return jsonError(
          "A child ID is required.",
          400
        );
      }
  
  
      /*
       * ----------------------------------------------------------
       * BUILD CHILD REFERENCE
       *
       * IMPORTANT:
       *
       * The authenticated user's UID is used here.
       *
       * The client does NOT choose which user's account is
       * modified.
       * ----------------------------------------------------------
       */
  
      const childRef =
        adminDb
          .collection(
            "users"
          )
          .doc(
            userId
          )
          .collection(
            "children"
          )
          .doc(
            childId
          );
  
  
      /*
       * ----------------------------------------------------------
       * VERIFY CHILD EXISTS
       * ----------------------------------------------------------
       */
  
      const childSnapshot =
        await childRef.get();
  
  
      if (
        !childSnapshot.exists
      ) {
        return jsonError(
          "This child could not be found.",
          404
        );
      }
  
  
      /*
       * ----------------------------------------------------------
       * PERMANENTLY DELETE CHILD TREE
       *
       * This recursively deletes:
       *
       * users/{uid}/children/{childId}
       *
       * including nested:
       *
       * - journeys
       * - journey history
       * - past journeys
       * - any future child-scoped subcollections
       * ----------------------------------------------------------
       */
  
      await adminDb.recursiveDelete(
        childRef
      );
  
  
      /*
       * ----------------------------------------------------------
       * SUCCESS
       * ----------------------------------------------------------
       */
  
      return jsonSuccess(
        childId
      );
  
    } catch (
      error
    ) {
      console.error(
        "Unexpected child deletion error:",
        error
      );
  
  
      /*
       * Always return JSON.
       *
       * This prevents the frontend from receiving an HTML error
       * page and then failing with:
       *
       * Unexpected token '<'
       * ----------------------------------------------------------
       */
  
      return jsonError(
        "We couldn't remove this child right now. Please try again.",
        500
      );
    }
  }