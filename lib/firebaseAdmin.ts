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
 * ============================================================
 */


/*
 * ============================================================
 * ENVIRONMENT VARIABLES
 * ============================================================
 */

const projectId =
  process.env.FIREBASE_ADMIN_PROJECT_ID?.trim();

const clientEmail =
  process.env.FIREBASE_ADMIN_CLIENT_EMAIL?.trim();

const rawPrivateKey =
  process.env.FIREBASE_ADMIN_PRIVATE_KEY;


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
 * Handles:
 *
 * - literal \n sequences
 * - surrounding single/double quotes
 * - leading/trailing whitespace
 *
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