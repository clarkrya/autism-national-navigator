
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from "firebase/firestore";

import {
  deleteObject,
  getBlob,
  ref,
  uploadBytesResumable,
} from "firebase/storage";

import { auth, db, storage } from "./firebase";

import type {
  CreateVaultDocumentInput,
  VaultAllowedMimeType,
  VaultDocument,
  VaultDocumentCategory,
  VaultFileValidationResult,
  VaultUploadResult,
} from "../types/vault";

import {
  VAULT_ALLOWED_MIME_TYPES,
  VAULT_MAX_FILE_SIZE_BYTES,
} from "../types/vault";

/*
 * AUTIVOYA DOCUMENT VAULT REPOSITORY
 *
 * Storage:
 * vault/{userId}/{childId}/{documentId}/{fileName}
 *
 * Firestore:
 * users/{userId}/children/{childId}/vaultDocuments/{documentId}
 *
 * Security:
 * - Authenticated document retrieval
 * - Account ownership validation
 * - Premium access enforced through Firebase rules
 * - Temporary browser-generated document URLs
 *
 * Mobile upload improvements:
 * - Resumable Firebase Storage uploads
 * - Upload progress monitoring
 * - Stalled upload detection
 * - Overall upload timeout
 * - Clear upload errors
 *
 * Existing document schema and paths are preserved.
 */

interface VaultDocumentFirestoreData {
  id: string;
  userId: string;
  childId: string;
  fileName: string;
  storagePath: string;
  category: VaultDocument["category"];
  mimeType: VaultAllowedMimeType;
  size: number;
  title?: string;
  notes?: string;
  uploadedAt: Timestamp | null;
  schemaVersion: 1;
}

export interface UpdateVaultDocumentMetadataInput {
  title: string;
  category: VaultDocumentCategory;
  notes: string;
}

const UPLOAD_STALL_TIMEOUT_MS = 45000;
const UPLOAD_TOTAL_TIMEOUT_MS = 180000;

function createVaultDocumentId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return [
    Date.now().toString(36),
    Math.random().toString(36).slice(2, 12),
  ].join("-");
}

function sanitizeFileName(fileName: string): string {
  const sanitized = fileName
    .trim()
    .replace(/[\/\\]/g, "_")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 180);

  return sanitized || "document";
}

function requireVaultOwner(userId: string): void {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error(
      "You must be signed in to access the Document Vault."
    );
  }

  if (currentUser.uid !== userId) {
    throw new Error(
      "You do not have permission to access this Document Vault."
    );
  }
}

export function validateVaultFile(
  file: File
): VaultFileValidationResult {
  if (!file) {
    return {
      valid: false,
      error: "Please select a document to upload.",
    };
  }

  if (file.size <= 0) {
    return {
      valid: false,
      error: "The selected document is empty.",
    };
  }

  if (file.size > VAULT_MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error:
        "The selected document is larger than the 10 MB upload limit.",
    };
  }

  const mimeType = file.type as VaultAllowedMimeType;

  if (!VAULT_ALLOWED_MIME_TYPES.includes(mimeType)) {
    return {
      valid: false,
      error:
        "This file type is not supported. Please upload a PDF, JPG, JPEG, or PNG file.",
    };
  }

  return {
    valid: true,
    mimeType,
  };
}

export function buildVaultStoragePath(
  userId: string,
  childId: string,
  documentId: string,
  fileName: string
): string {
  if (!userId.trim()) {
    throw new Error(
      "A valid user ID is required to create a Vault storage path."
    );
  }

  if (!childId.trim()) {
    throw new Error(
      "A valid child ID is required to create a Vault storage path."
    );
  }

  if (!documentId.trim()) {
    throw new Error(
      "A valid document ID is required to create a Vault storage path."
    );
  }

  return [
    "vault",
    userId,
    childId,
    documentId,
    sanitizeFileName(fileName),
  ].join("/");
}

function validateDocumentStoragePath(
  document: VaultDocument
): void {
  if (
    !document.userId ||
    !document.childId ||
    !document.id ||
    !document.storagePath
  ) {
    throw new Error(
      "This document does not have a valid storage location."
    );
  }

  const pathParts = document.storagePath.split("/");

  if (
    pathParts.length !== 5 ||
    pathParts[0] !== "vault" ||
    pathParts[1] !== document.userId ||
    pathParts[2] !== document.childId ||
    pathParts[3] !== document.id ||
    !pathParts[4] ||
    pathParts[4] === "." ||
    pathParts[4] === ".."
  ) {
    throw new Error(
      "This document has an invalid Vault storage path."
    );
  }
}

function getVaultCollectionReference(
  userId: string,
  childId: string
) {
  return collection(
    db,
    "users",
    userId,
    "children",
    childId,
    "vaultDocuments"
  );
}

function getVaultDocumentReference(
  userId: string,
  childId: string,
  documentId: string
) {
  return doc(
    db,
    "users",
    userId,
    "children",
    childId,
    "vaultDocuments",
    documentId
  );
}

function normalizeVaultDocument(
  data: VaultDocumentFirestoreData
): VaultDocument {
  return {
    id: data.id,
    userId: data.userId,
    childId: data.childId,
    fileName: data.fileName,
    storagePath: data.storagePath,
    category: data.category,
    mimeType: data.mimeType,
    size: data.size,
    title: data.title,
    notes: data.notes,
    uploadedAt:
      data.uploadedAt instanceof Timestamp
        ? data.uploadedAt.toMillis()
        : 0,
    schemaVersion: 1,
  };
}

/*
 * MONITORED STORAGE UPLOAD
 *
 * Uses Firebase's resumable upload API.
 * Detects an upload that stops making progress.
 * Cancels stalled transfers and reports an error.
 */

function uploadFileWithMonitoring(
  storageReference: ReturnType<typeof ref>,
  file: File,
  mimeType: VaultAllowedMimeType
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const uploadTask = uploadBytesResumable(
      storageReference,
      file,
      { contentType: mimeType }
    );

    let settled = false;

    let stallTimer: ReturnType<typeof setTimeout> | null =
      null;

    let totalTimer: ReturnType<typeof setTimeout> | null =
      null;

    let lastTransferred = 0;

    function clearTimers() {
      if (stallTimer !== null) {
        clearTimeout(stallTimer);
        stallTimer = null;
      }

      if (totalTimer !== null) {
        clearTimeout(totalTimer);
        totalTimer = null;
      }
    }

    function finish(error?: Error) {
      if (settled) {
        return;
      }

      settled = true;
      clearTimers();

      if (error) {
        uploadTask.cancel();
        reject(error);
      } else {
        resolve();
      }
    }

    function resetStallTimer() {
      if (stallTimer !== null) {
        clearTimeout(stallTimer);
      }

      stallTimer = setTimeout(() => {
        finish(
          new Error(
            "The document upload stopped responding. Please check your internet connection and try again."
          )
        );
      }, UPLOAD_STALL_TIMEOUT_MS);
    }

    totalTimer = setTimeout(() => {
      finish(
        new Error(
          "The document upload took too long. Please try again using a stable internet connection."
        )
      );
    }, UPLOAD_TOTAL_TIMEOUT_MS);

    resetStallTimer();

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        if (settled) {
          return;
        }

        if (
          snapshot.bytesTransferred >
          lastTransferred
        ) {
          lastTransferred = snapshot.bytesTransferred;
          resetStallTimer();
        }
      },
      (error) => {
        if (settled) {
          return;
        }

        const firebaseCode =
          (error as { code?: string }).code || "";

        if (firebaseCode === "storage/unauthorized") {
          finish(
            new Error(
              "You do not have permission to upload this document. Please verify your Premium access and try again."
            )
          );
          return;
        }

        if (firebaseCode === "storage/quota-exceeded") {
          finish(
            new Error(
              "Document storage is temporarily unavailable because the storage limit has been reached."
            )
          );
          return;
        }

        if (
          firebaseCode === "storage/retry-limit-exceeded"
        ) {
          finish(
            new Error(
              "The upload could not complete because of a network issue. Please try again."
            )
          );
          return;
        }

        finish(
          error instanceof Error
            ? error
            : new Error(
                "The document could not be uploaded. Please try again."
              )
        );
      },
      () => {
        finish();
      }
    );
  });
}

/*
 * UPLOAD DOCUMENT
 *
 * 1. Validate account ownership.
 * 2. Validate file.
 * 3. Upload to Firebase Storage.
 * 4. Save metadata to Firestore.
 * 5. Return the saved document.
 */

export async function uploadVaultDocument(
  input: CreateVaultDocumentInput
): Promise<VaultUploadResult> {
  const {
    userId,
    childId,
    file,
    category,
  } = input;

  if (!userId.trim()) {
    throw new Error(
      "You must be signed in to upload a document."
    );
  }

  requireVaultOwner(userId);

  if (!childId.trim()) {
    throw new Error(
      "Please select a family member before uploading a document."
    );
  }

  const validation = validateVaultFile(file);

  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const documentId = createVaultDocumentId();
  const safeFileName = sanitizeFileName(file.name);

  const storagePath = buildVaultStoragePath(
    userId,
    childId,
    documentId,
    safeFileName
  );

  const storageReference = ref(
    storage,
    storagePath
  );

  await uploadFileWithMonitoring(
    storageReference,
    file,
    validation.mimeType
  );

  const metadataReference = getVaultDocumentReference(
    userId,
    childId,
    documentId
  );

  const title = input.title?.trim();
  const notes = input.notes?.trim();

  const metadata = {
    id: documentId,
    userId,
    childId,
    fileName: safeFileName,
    storagePath,
    category,
    mimeType: validation.mimeType,
    size: file.size,
    ...(title ? { title } : {}),
    ...(notes ? { notes } : {}),
    uploadedAt: serverTimestamp(),
    schemaVersion: 1 as const,
  };

  try {
    requireVaultOwner(userId);

    await setDoc(
      metadataReference,
      metadata
    );
  } catch (error) {
    try {
      await deleteObject(storageReference);
    } catch (cleanupError) {
      console.error(
        "Vault upload cleanup failed:",
        cleanupError
      );
    }

    throw error;
  }

  const document: VaultDocument = {
    id: documentId,
    userId,
    childId,
    fileName: safeFileName,
    storagePath,
    category,
    mimeType: validation.mimeType,
    size: file.size,
    ...(title ? { title } : {}),
    ...(notes ? { notes } : {}),
    uploadedAt: Date.now(),
    schemaVersion: 1,
  };

  return { document };
}

/*
 * GET DOCUMENTS
 *
 * Firestore security rules enforce Premium access.
 */

export async function getVaultDocuments(
  userId: string,
  childId: string
): Promise<VaultDocument[]> {
  if (!userId.trim() || !childId.trim()) {
    return [];
  }

  requireVaultOwner(userId);

  const vaultQuery = query(
    getVaultCollectionReference(
      userId,
      childId
    ),
    orderBy("uploadedAt", "desc")
  );

  const snapshot = await getDocs(vaultQuery);

  requireVaultOwner(userId);

  return snapshot.docs.map((snapshotDocument) => {
    const data =
      snapshotDocument.data() as VaultDocumentFirestoreData;

    return normalizeVaultDocument({
      ...data,
      id: snapshotDocument.id,
    });
  });
}

/*
 * UPDATE DOCUMENT METADATA
 *
 * Does not modify the underlying Storage file.
 */

export async function updateVaultDocumentMetadata(
  document: VaultDocument,
  updates: UpdateVaultDocumentMetadataInput
): Promise<VaultDocument> {
  if (!document.userId?.trim()) {
    throw new Error(
      "This document does not contain a valid user ID."
    );
  }

  requireVaultOwner(document.userId);

  if (!document.childId?.trim()) {
    throw new Error(
      "This document does not contain a valid family member ID."
    );
  }

  if (!document.id?.trim()) {
    throw new Error(
      "This document does not contain a valid document ID."
    );
  }

  const title = updates.title.trim();
  const notes = updates.notes.trim();

  if (!title) {
    throw new Error(
      "Please enter a document title."
    );
  }

  if (title.length > 200) {
    throw new Error(
      "Document titles must be 200 characters or fewer."
    );
  }

  if (notes.length > 2000) {
    throw new Error(
      "Document notes must be 2,000 characters or fewer."
    );
  }

  const validCategories: VaultDocumentCategory[] = [
    "medical_evaluations",
    "school_iep",
    "therapy",
    "insurance_benefits",
    "other",
  ];

  if (!validCategories.includes(updates.category)) {
    throw new Error(
      "Please select a valid document category."
    );
  }

  await updateDoc(
    getVaultDocumentReference(
      document.userId,
      document.childId,
      document.id
    ),
    {
      title,
      category: updates.category,
      notes,
    }
  );

  return {
    ...document,
    title,
    category: updates.category,
    notes,
  };
}

/*
 * AUTHENTICATED DOCUMENT RETRIEVAL
 *
 * Retrieves file content through Firebase Storage.
 *
 * Firebase Storage rules enforce:
 * - Authentication
 * - Account ownership
 * - Premium or eligible tester access
 * - Child ownership
 *
 * No persistent Firebase download URL is requested.
 */

export async function getVaultDocumentBlob(
  document: VaultDocument
): Promise<Blob> {
  requireVaultOwner(document.userId);

  validateDocumentStoragePath(document);

  const storageReference = ref(
    storage,
    document.storagePath
  );

  const fileBlob = await getBlob(
    storageReference,
    VAULT_MAX_FILE_SIZE_BYTES
  );

  /*
   * Recheck account ownership after retrieval
   * in case the authenticated account changed
   * while the request was in progress.
   */

  requireVaultOwner(document.userId);

  if (fileBlob.size <= 0) {
    throw new Error(
      "The requested document is empty."
    );
  }

  if (
    fileBlob.size > VAULT_MAX_FILE_SIZE_BYTES
  ) {
    throw new Error(
      "The requested document exceeds the permitted file size."
    );
  }

  const storedMimeType = document.mimeType;

if (!VAULT_ALLOWED_MIME_TYPES.includes(storedMimeType)) {
  throw new Error(
    "The requested document has an unsupported file type."
  );
}

const header = new Uint8Array(
  await fileBlob.slice(0, 8).arrayBuffer()
);

const isPdf =
  header[0] === 0x25 &&
  header[1] === 0x50 &&
  header[2] === 0x44 &&
  header[3] === 0x46 &&
  header[4] === 0x2d;

const isJpeg =
  header[0] === 0xff &&
  header[1] === 0xd8 &&
  header[2] === 0xff;

const isPng = [
  0x89, 0x50, 0x4e, 0x47,
  0x0d, 0x0a, 0x1a, 0x0a,
].every((byte, index) => header[index] === byte);

const matchesFileType =
  (storedMimeType === "application/pdf" && isPdf) ||
  (storedMimeType === "image/jpeg" && isJpeg) ||
  (storedMimeType === "image/png" && isPng);

if (!matchesFileType) {
  throw new Error(
    "The document content does not match its registered file type."
  );
}

requireVaultOwner(document.userId);

return new Blob([fileBlob], {
  type: storedMimeType,
});
}

/*
 * GET TEMPORARY DOCUMENT URL
 *
 * Preserves the existing Document Vault page interface.
 *
 * The returned URL is a browser-local object URL,
 * not a persistent Firebase download URL.
 *
 * The calling component is responsible for releasing
 * the object URL when it is no longer needed.
 */

export async function getVaultDocumentDownloadUrl(
  document: VaultDocument
): Promise<string> {
  const fileBlob =
    await getVaultDocumentBlob(document);

  return URL.createObjectURL(fileBlob);
}

/*
 * RELEASE TEMPORARY DOCUMENT URL
 *
 * Used by the Document Vault page to release
 * browser memory after viewing or downloading.
 */

export function revokeVaultDocumentDownloadUrl(
  url: string
): void {
  if (
    typeof url === "string" &&
    url.startsWith("blob:")
  ) {
    URL.revokeObjectURL(url);
  }
}

/*
 * DELETE DOCUMENT
 *
 * Delete Storage first, then Firestore metadata.
 */

export async function deleteVaultDocument(
  document: VaultDocument
): Promise<void> {
  if (
    !document.userId ||
    !document.childId ||
    !document.id ||
    !document.storagePath
  ) {
    throw new Error(
      "This document does not contain the information required for deletion."
    );
  }

  requireVaultOwner(document.userId);

  validateDocumentStoragePath(document);

  const storageReference = ref(
    storage,
    document.storagePath
  );

  try {
    await deleteObject(storageReference);
  } catch (error) {
    const firebaseCode =
      (error as { code?: string }).code || "";

    /*
     * If the file has already been removed,
     * continue with metadata cleanup.
     */

    if (firebaseCode !== "storage/object-not-found") {
      throw error;
    }
  }

  requireVaultOwner(document.userId);

  await deleteDoc(
    getVaultDocumentReference(
      document.userId,
      document.childId,
      document.id
    )
  );
}
