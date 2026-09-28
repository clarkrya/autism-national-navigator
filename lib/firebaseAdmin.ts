import "server-only";

import {
  cert,
  getApps,
  getApp,
  initializeApp,
  type App,
} from "firebase-admin/app";

import {
  getAuth,
  type Auth,
} from "firebase-admin/auth";

import {
  getFirestore,
  type Firestore,
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
 * IMPORTANT:
 *
 * Firebase Admin initialization is LAZY.
 *
 * Merely importing this module does not require Admin
 * credentials to be available or valid.
 *
 * Credentials are validated only when a server operation
 * actually requests Firebase Admin.
 * ============================================================
 */

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
   * Handle JSON-quoted values.
   */

  if (
    key.startsWith("\"") &&
    key.endsWith("\"")
  ) {
    try {
      const parsed =
        JSON.parse(key);

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
  } else if (
    key.startsWith("'") &&
    key.endsWith("'")
  ) {
    key =
      key.slice(
        1,
        -1
      );
  }

  /*
   * Normalize escaped and real line endings.
   */

  key =
    key
      .replace(
        /\\r\\n/g,
        "\n"
      )
      .replace(
        /\\n/g,
        "\n"
      )
      .replace(
        /\\r/g,
        ""
      )
      .replace(
        /\r\n/g,
        "\n"
      )
      .replace(
        /\r/g,
        "\n"
      )
      .trim();

  /*
   * Support a base64-encoded PEM.
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
       * Validation below will handle an invalid value.
       */
    }
  }

  return key;
}

/*
 * ============================================================
 * ADMIN APP
 * ============================================================
 */

let cachedAdminApp:
  App | null = null;

function getFirebaseAdminApp():
  App {
  if (cachedAdminApp) {
    return cachedAdminApp;
  }

  if (
    getApps().length >
    0
  ) {
    cachedAdminApp =
      getApp();

    return cachedAdminApp;
  }

  /*
   * Read environment variables only when Admin is actually
   * needed.
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

  if (
    !projectId ||
    !clientEmail ||
    !rawPrivateKey
  ) {
    throw new Error(
      "Firebase Admin environment variables are not configured."
    );
  }

  const privateKey =
    normalizePrivateKey(
      rawPrivateKey
    );

  /*
   * Validate PEM structure.
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
   * Cryptographically validate the key without logging it.
   */

  try {
    createPrivateKey({
      key:
        privateKey,

      format:
        "pem",
    });
  } catch (error) {
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

  cachedAdminApp =
    initializeApp({
      credential:
        cert({
          projectId,
          clientEmail,
          privateKey,
        }),
    });

  return cachedAdminApp;
}

/*
 * ============================================================
 * LAZY ADMIN SERVICES
 * ============================================================
 */

export function getAdminAuth():
  Auth {
  return getAuth(
    getFirebaseAdminApp()
  );
}

export function getAdminDb():
  Firestore {
  return getFirestore(
    getFirebaseAdminApp()
  );
}

export default getFirebaseAdminApp;