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
   * The Admin SDK has privileged access and bypasses normal
   * Firestore Security Rules, so it must only run on the server.
   *
   * We will use it for:
   *
   * - Verifying Firebase ID tokens
   * - Reading verified subscription records
   * - Authorizing Premium community actions
   * - Future Stripe webhook processing
   * - Future moderation/admin operations
   *
   * ============================================================
   */
  
  
  /*
   * ============================================================
   * ENVIRONMENT VARIABLES
   * ============================================================
   *
   * Firebase service-account credentials should be stored as
   * server-only environment variables.
   *
   * These values should NEVER use NEXT_PUBLIC_.
   *
   * Required:
   *
   * FIREBASE_ADMIN_PROJECT_ID
   * FIREBASE_ADMIN_CLIENT_EMAIL
   * FIREBASE_ADMIN_PRIVATE_KEY
   *
   * ============================================================
   */
  
  const projectId =
    process.env.FIREBASE_ADMIN_PROJECT_ID;
  
  const clientEmail =
    process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  
  const privateKey =
    process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  
  
  if (
    !projectId ||
    !clientEmail ||
    !privateKey
  ) {
  
    throw new Error(
      "Firebase Admin environment variables are not configured."
    );
  
  }
  
  
  /*
   * ============================================================
   * INITIALIZE ADMIN APP
   * ============================================================
   *
   * Next.js may load this module more than once during development.
   *
   * getApps() prevents duplicate Firebase Admin initialization.
   */
  
  const adminApp =
    getApps().length > 0
      ? getApp()
      : initializeApp({
          credential:
            cert({
              projectId,
  
              clientEmail,
  
              /*
               * Environment variables often contain escaped
               * newline characters.
               *
               * Convert them back into real line breaks.
               */
  
              privateKey:
                privateKey.replace(
                  /\\n/g,
                  "\n"
                ),
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