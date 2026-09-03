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

import {
  createPrivateKey,
} from "crypto";


/*
 * ============================================================
 * FIREBASE ADMIN
 * ============================================================
 *
 * Server-only Firebase Admin initialization.
 *
 * Firebase Admin bypasses normal Firestore security rules.
 *
 * Never import this file into a client component.
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
 * REQUIRED CONFIGURATION
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
 * PRIVATE KEY NORMALIZATION
 * ============================================================
 */

function normalizePrivateKey(
  value: string
): string {
  let key =
    value.trim();


  /*
   * ----------------------------------------------------------
   * HANDLE JSON-QUOTED VALUES
   *
   * Example:
   *
   * "-----BEGIN PRIVATE KEY-----\\nABC...\\n-----END..."
   * ----------------------------------------------------------
   */

  if (
    (
      key.startsWith(
        "\""
      ) &&
      key.endsWith(
        "\""
      )
    ) ||
    (
      key.startsWith(
        "'"
      ) &&
      key.endsWith(
        "'"
      )
    )
  ) {
    if (
      key.startsWith(
        "\""
      )
    ) {
      try {
        const parsed =
          JSON.parse(
            key
          );

        if (
          typeof parsed ===
          "string"
        ) {
          key =
            parsed;
        }

      } catch {
        key =
          key.slice(
            1,
            -1
          );
      }

    } else {
      key =
        key.slice(
          1,
          -1
        );
    }
  }


  /*
   * ----------------------------------------------------------
   * HANDLE ESCAPED WINDOWS NEWLINES
   * ----------------------------------------------------------
   */

  key =
    key.replace(
      /\\r\\n/g,
      "\n"
    );


  /*
   * ----------------------------------------------------------
   * HANDLE ESCAPED NEWLINES
   * ----------------------------------------------------------
   */

  key =
    key.replace(
      /\\n/g,
      "\n"
    );


  /*
   * ----------------------------------------------------------
   * HANDLE ESCAPED CARRIAGE RETURNS
   * ----------------------------------------------------------
   */

  key =
    key.replace(
      /\\r/g,
      ""
    );


  /*
   * ----------------------------------------------------------
   * NORMALIZE ACTUAL WINDOWS LINE ENDINGS
   * ----------------------------------------------------------
   */

  key =
    key.replace(
      /\r\n/g,
      "\n"
    );


  key =
    key.replace(
      /\r/g,
      "\n"
    );


  key =
    key.trim();


  /*
   * ----------------------------------------------------------
   * OPTIONAL BASE64-ENCODED PEM SUPPORT
   *
   * Some hosting systems store the entire PEM as base64.
   *
   * Only attempt this when the value does not already contain
   * a PEM header.
   * ----------------------------------------------------------
   */

  if (
    !key.includes(
      "-----BEGIN"
    )
  ) {
    try {
      const decoded =
        Buffer
          .from(
            key,
            "base64"
          )
          .toString(
            "utf8"
          )
          .trim();


      if (
        decoded.includes(
          "-----BEGIN"
        ) &&
        decoded.includes(
          "PRIVATE KEY-----"
        )
      ) {
        key =
          decoded
            .replace(
              /\r\n/g,
              "\n"
            )
            .replace(
              /\r/g,
              "\n"
            )
            .trim();
      }

    } catch {
      /*
       * Leave original value in place.
       *
       * Validation below will produce the useful error.
       */
    }
  }


  return key;
}


/*
 * ============================================================
 * NORMALIZED PRIVATE KEY
 * ============================================================
 */

const privateKey =
  normalizePrivateKey(
    rawPrivateKey
  );


/*
 * ============================================================
 * PEM STRUCTURE VALIDATION
 * ============================================================
 */

const hasPkcs8Header =
  privateKey.includes(
    "-----BEGIN PRIVATE KEY-----"
  ) &&
  privateKey.includes(
    "-----END PRIVATE KEY-----"
  );

const hasRsaHeader =
  privateKey.includes(
    "-----BEGIN RSA PRIVATE KEY-----"
  ) &&
  privateKey.includes(
    "-----END RSA PRIVATE KEY-----"
  );


if (
  !hasPkcs8Header &&
  !hasRsaHeader
) {
  throw new Error(
    "FIREBASE_ADMIN_PRIVATE_KEY does not contain a valid PEM private-key header and footer."
  );
}


/*
 * ============================================================
 * CRYPTO VALIDATION
 * ============================================================
 *
 * Validate the key before Firebase Admin receives it.
 *
 * IMPORTANT:
 *
 * Never log the actual private key.
 * ============================================================
 */

try {
  createPrivateKey({
    key:
      privateKey,

    format:
      "pem",
  });

} catch (
  error
) {
  console.error(
    "Firebase Admin private key failed cryptographic validation."
  );


  if (
    error instanceof Error
  ) {
    console.error(
      "Private key parser:",
      error.message
    );
  }


  throw new Error(
    "FIREBASE_ADMIN_PRIVATE_KEY is present but cannot be parsed as a valid private key. Check the environment variable formatting."
  );
}


/*
 * ============================================================
 * INITIALIZE FIREBASE ADMIN
 * ============================================================
 *
 * Next.js can evaluate server modules multiple times during
 * development, so reuse the existing Admin app.
 * ============================================================
 */

const adminApp =
  getApps().length >
  0
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