import "server-only";

import {
  cert,
  getApps,
  getApp,
  initializeApp,
} from "firebase-admin/app";

import {
  getAuth,
} from "firebase-admin/auth";

import {
  getFirestore,
} from "firebase-admin/firestore";


/*
 * ============================================================
 * FIREBASE ADMIN
 * ============================================================
 *
 * Server-only Firebase Admin initialization.
 *
 * IMPORTANT:
 *
 * This file must NEVER be imported into client components.
 *
 * Firebase Admin has privileged access and bypasses normal
 * Firestore Security Rules.
 *
 * Used for:
 *
 * - Verifying Firebase ID tokens
 * - Reading verified subscription records
 * - Protected server API routes
 * - Premium community actions
 * - Child deletion
 * - Future Stripe webhook processing
 * - Future moderation/admin operations
 *
 * ============================================================
 */


/*
 * ============================================================
 * ENVIRONMENT VARIABLES
 * ============================================================
 */

const projectId =
  process.env
    .FIREBASE_ADMIN_PROJECT_ID
    ?.trim();

const clientEmail =
  process.env
    .FIREBASE_ADMIN_CLIENT_EMAIL
    ?.trim();

const rawPrivateKey =
  process.env
    .FIREBASE_ADMIN_PRIVATE_KEY;


/*
 * ============================================================
 * VALIDATE REQUIRED CONFIGURATION
 * ============================================================
 */

if (
  !projectId ||
  !clientEmail ||
  !rawPrivateKey
) {
  throw new Error(
    "Firebase Admin environment variables are not configured."
  );
}


/*
 * ============================================================
 * NORMALIZE PRIVATE KEY
 * ============================================================
 *
 * Environment-variable systems may store the private key with:
 *
 * - escaped newline characters: \n
 * - surrounding double quotes
 * - surrounding single quotes
 * - extra whitespace
 *
 * Normalize those before passing the key to Firebase Admin.
 * ============================================================
 */

const privateKey =
  rawPrivateKey
    .trim()
    .replace(
      /^["']|["']$/g,
      ""
    )
    .replace(
      /\\n/g,
      "\n"
    )
    .trim();


/*
 * ============================================================
 * VALIDATE PRIVATE KEY
 * ============================================================
 */

if (
  !privateKey.includes(
    "-----BEGIN PRIVATE KEY-----"
  ) ||
  !privateKey.includes(
    "-----END PRIVATE KEY-----"
  )
) {
  throw new Error(
    "FIREBASE_ADMIN_PRIVATE_KEY is not a valid PEM private key."
  );
}


/*
 * ============================================================
 * INITIALIZE ADMIN APP
 * ============================================================
 *
 * Next.js may evaluate server modules more than once during
 * development.
 *
 * Reuse the existing Admin app when one already exists.
 * ============================================================
 */

const adminApp =
  getApps().length > 0
    ? getApp()
    : initializeApp({
        credential:
          cert({
            projectId,

            clientEmail,

            privateKey,
          }),
      });


/*
 * ============================================================
 * ADMIN SERVICES
 * ============================================================
 */

export const adminAuth =
  getAuth(
    adminApp
  );


export const adminDb =
  getFirestore(
    adminApp
  );


export default adminApp;