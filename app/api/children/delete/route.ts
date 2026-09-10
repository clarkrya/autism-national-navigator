import {
  NextResponse,
} from "next/server";


/*
 * ============================================================
 * CHILD DELETE API
 * ============================================================
 *
 * POST /api/children/delete
 *
 * This route intentionally uses Firebase Admin for one specific
 * reason:
 *
 * Firestore does not automatically delete subcollections when a
 * parent document is deleted.
 *
 * Removing a child must remove the complete child-scoped tree,
 * including:
 *
 * - child profile
 * - active Journey
 * - Journey-specific history
 * - legacy child history
 * - past Journeys
 * - Navigator conversations/messages
 * - future child-scoped collections
 *
 * Firebase Admin recursiveDelete() provides those semantics.
 *
 * IMPORTANT:
 *
 * Firebase Admin is dynamically imported inside POST().
 *
 * This prevents Firebase Admin credential initialization during
 * Next.js build/page-data collection.
 *
 * The client still supplies a Firebase ID token, and the server
 * derives the user UID from that verified token. The client can
 * never choose another user's account.
 * ============================================================
 */


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
      success:
        false,

      error:
        message,
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
      success:
        true,

      childId,
    },
    {
      status:
        200,
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
      !authorization
        .toLowerCase()
        .startsWith(
          "bearer "
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
     * PARSE REQUEST BODY
     * ----------------------------------------------------------
     *
     * Validate the ordinary request data before loading the
     * privileged Firebase Admin module.
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
     * LOAD FIREBASE ADMIN AT REQUEST TIME
     * ----------------------------------------------------------
     *
     * Do NOT import firebaseAdmin at module scope.
     *
     * Next.js evaluates route modules while collecting build
     * information. A module-scope import would initialize Admin
     * credentials during npm run build and fail in environments
     * where the private key is intentionally unavailable or not
     * usable during the build phase.
     *
     * Dynamic import keeps that initialization inside the actual
     * deletion request.
     */

    let adminAuth;
    let adminDb;


    try {

      const firebaseAdmin =
        await import(
          "../../../../lib/firebaseAdmin"
        );


      adminAuth =
        firebaseAdmin.adminAuth;

      adminDb =
        firebaseAdmin.adminDb;

    } catch (
      adminLoadError
    ) {

      console.error(
        "Unable to initialize Firebase Admin for child deletion:",
        adminLoadError
      );


      return jsonError(
        "The child removal service is temporarily unavailable.",
        500
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


    if (
      !userId
    ) {
      return jsonError(
        "Your session could not be verified. Please sign in again.",
        401
      );
    }


    /*
     * ----------------------------------------------------------
     * BUILD CHILD REFERENCE
     * ----------------------------------------------------------
     *
     * The authenticated Firebase UID is always used.
     *
     * The request body contains only childId. It never contains a
     * user ID, so a client cannot select another user's tree.
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
     * ----------------------------------------------------------
     *
     * recursiveDelete() removes:
     *
     * users/{uid}/children/{childId}
     *
     * and every descendant document beneath it.
     *
     * This is intentionally different from deleting only the
     * parent document, which would leave Firestore subcollection
     * data behind.
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
     * page and subsequently failing while parsing the response.
     */

    return jsonError(
      "We couldn't remove this child right now. Please try again.",
      500
    );

  }
}