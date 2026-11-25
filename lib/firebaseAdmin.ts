
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
  getStorage,
  type Storage,
} from "firebase-admin/storage";

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
 * Firebase Admin initialization is LAZY.
 *
 * Credentials are validated only when a server operation
 * actually requests Firebase Admin.
 */

/*
 * ============================================================
 * PRIVATE KEY NORMALIZATION
 * ============================================================
 */

function normalizePrivateKey(
  value: string
): string {
  let key = value.trim();

  if (
    key.startsWith("\"") &&
    key.endsWith("\"")
  ) {
    try {
      const parsed = JSON.parse(key);

      if (typeof parsed === "string") {
        key = parsed;
      }
    } catch {
      key = key.slice(1, -1);
    }
  } else if (
    key.startsWith("'") &&
    key.endsWith("'")
  ) {
    key = key.slice(1, -1);
  }

  key = key
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();

  /*
   * Support a base64-encoded PEM.
   */

  if (!key.includes("-----BEGIN")) {
    try {
      const decoded = Buffer
        .from(key, "base64")
        .toString("utf8")
        .trim();

      if (
        decoded.includes("-----BEGIN") &&
        decoded.includes("PRIVATE KEY-----")
      ) {
        key = decoded
          .replace(/\r\n/g, "\n")
          .replace(/\r/g, "\n")
          .trim();
      }
    } catch {
      /*
       * Validation below handles invalid values.
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

let cachedAdminApp: App | null = null;

function getFirebaseAdminApp(): App {
  if (cachedAdminApp) {
    return cachedAdminApp;
  }

  if (getApps().length > 0) {
    cachedAdminApp = getApp();

    return cachedAdminApp;
  }

  /*
   * Read environment variables only when Admin is needed.
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
    normalizePrivateKey(rawPrivateKey);

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
   * Cryptographically validate the key.
   * Never log private key contents.
   */

  try {
    createPrivateKey({
      key: privateKey,
      format: "pem",
    });
  } catch {
    console.error(
      "Firebase Admin private key failed cryptographic validation."
    );

    throw new Error(
      "FIREBASE_ADMIN_PRIVATE_KEY is present but cannot be parsed as a valid private key. Check the environment variable formatting."
    );
  }

  cachedAdminApp = initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });

  return cachedAdminApp;
}

/*
 * ============================================================
 * LAZY ADMIN AUTHENTICATION
 * ============================================================
 */

export function getAdminAuth(): Auth {
  return getAuth(
    getFirebaseAdminApp()
  );
}

/*
 * ============================================================
 * LAZY ADMIN FIRESTORE
 * ============================================================
 */

export function getAdminDb(): Firestore {
  return getFirestore(
    getFirebaseAdminApp()
  );
}

/*
 * ============================================================
 * LAZY ADMIN STORAGE
 * ============================================================
 */

export function getAdminStorage(): Storage {
  return getStorage(
    getFirebaseAdminApp()
  );
}

/*
 * ============================================================
 * PRIVATE DOCUMENT VAULT STORAGE BUCKET
 * ============================================================
 */

export function getAdminStorageBucket() {
  const bucketName =
    process.env
      .FIREBASE_ADMIN_STORAGE_BUCKET
      ?.trim() ||
    process.env
      .NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
      ?.trim();

  if (!bucketName) {
    throw new Error(
      "Firebase Storage bucket is not configured."
    );
  }

  if (
    bucketName.includes("/") ||
    bucketName.includes("\\") ||
    bucketName.includes(":") ||
    /\s/.test(bucketName)
  ) {
    throw new Error(
      "Firebase Storage bucket configuration is invalid."
    );
  }

  return getAdminStorage().bucket(
    bucketName
  );
}

export default getFirebaseAdminApp;
