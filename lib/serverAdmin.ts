import "server-only";

import {
  adminAuth,
} from "./firebaseAdmin";


/*
 * ============================================================
 * SERVER COMMUNITY MODERATOR AUTHORIZATION
 * ============================================================
 *
 * SERVER-ONLY MODULE.
 *
 * Protects Community moderation endpoints.
 *
 * A moderator must have a Firebase custom claim:
 *
 * admin: true
 *
 * OR
 *
 * moderator: true
 *
 * The claim is verified from the Firebase ID token using
 * Firebase Admin.
 *
 * Never determine moderator access from:
 *
 * - client-side state
 * - request body values
 * - query parameters
 * - browser-supplied email addresses
 * - user-editable Firestore profile fields
 *
 * ============================================================
 */


export type VerifiedCommunityModerator = {
  uid: string;

  email?: string;

  isAdmin: boolean;

  isModerator: boolean;
};


/*
 * ============================================================
 * REQUIRE COMMUNITY MODERATOR
 * ============================================================
 */

export async function requireCommunityModerator(
  request: Request
): Promise<VerifiedCommunityModerator> {

  /*
   * ----------------------------------------------------------
   * AUTHORIZATION HEADER
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

    throw new Error(
      "AUTH_REQUIRED"
    );

  }


  /*
   * ----------------------------------------------------------
   * FIREBASE ID TOKEN
   * ----------------------------------------------------------
   */

  const idToken =
    authorization
      .slice(7)
      .trim();


  if (
    !idToken
  ) {

    throw new Error(
      "AUTH_REQUIRED"
    );

  }


  /*
   * ----------------------------------------------------------
   * VERIFY TOKEN
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
      "Community moderator authentication failed:",
      error
    );


    throw new Error(
      "AUTH_INVALID"
    );

  }


  /*
   * ----------------------------------------------------------
   * TRUSTED FIREBASE CUSTOM CLAIMS
   * ----------------------------------------------------------
   */

  const isAdmin =
    decodedToken.admin ===
    true;


  const isModerator =
    decodedToken.moderator ===
    true;


  /*
   * ----------------------------------------------------------
   * AUTHORIZATION
   * ----------------------------------------------------------
   */

  if (
    !isAdmin &&
    !isModerator
  ) {

    throw new Error(
      "MODERATOR_REQUIRED"
    );

  }


  /*
   * ----------------------------------------------------------
   * VERIFIED MODERATOR
   * ----------------------------------------------------------
   */

  return {
    uid:
      decodedToken.uid,

    email:
      decodedToken.email,

    isAdmin,

    isModerator,
  };

}