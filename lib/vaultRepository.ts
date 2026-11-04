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
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";

import {
  db,
  storage,
} from "./firebase";

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
 * ============================================================
 * MYRIAD DOCUMENT VAULT REPOSITORY
 * ============================================================
 *
 * Responsibilities:
 *
 * - Validate files before upload
 * - Generate Vault document IDs
 * - Build controlled Firebase Storage paths
 * - Upload files to Firebase Storage
 * - Store document metadata in Firestore
 * - Retrieve document metadata
 * - Update trusted document metadata
 * - Generate download URLs when requested
 * - Delete Storage files and Firestore metadata
 *
 * Storage:
 *
 * vault/{userId}/{childId}/{documentId}/{fileName}
 *
 * Firestore:
 *
 * users/{userId}/children/{childId}/vaultDocuments/{documentId}
 *
 * IMPORTANT:
 *
 * Editing document details changes Firestore metadata only.
 * It does not rename, move, replace, or re-upload the
 * underlying Firebase Storage object.
 *
 * ============================================================
 */

/*
 * Firestore representation.
 *
 * uploadedAt uses a Firestore Timestamp while stored.
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

/*
 * Input accepted when editing an existing Vault document.
 *
 * Only user-editable metadata is included here.
 *
 * File identity, Storage path, MIME type, size, ownership,
 * upload date, and schema version cannot be changed through
 * this function.
 */
export interface UpdateVaultDocumentMetadataInput {
  title: string;

  category: VaultDocumentCategory;

  notes: string;
}

/*
 * Create a sufficiently unique client-generated ID.
 *
 * crypto.randomUUID() is supported by modern browsers.
 * The fallback keeps StackBlitz/local development usable
 * if randomUUID is unavailable.
 */
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

/*
 * Firebase Storage object names should not receive the
 * raw browser filename without normalization.
 *
 * We preserve the recognizable filename while removing
 * characters that could make Storage paths confusing.
 */
function sanitizeFileName(
  fileName: string
): string {
  const trimmed = fileName.trim();

  const sanitized = trimmed
    .replace(/[\/\\]/g, "_")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 180);

  return sanitized || "document";
}

/*
 * Validate a browser File before attempting an upload.
 *
 * Firebase Storage Rules remain the authoritative
 * enforcement layer. Client validation provides a better
 * user experience and prevents unnecessary upload attempts.
 */
export function validateVaultFile(
  file: File
): VaultFileValidationResult {
  if (!file) {
    return {
      valid: false,
      error:
        "Please select a document to upload.",
    };
  }

  if (file.size <= 0) {
    return {
      valid: false,
      error:
        "The selected document is empty.",
    };
  }

  if (
    file.size >
    VAULT_MAX_FILE_SIZE_BYTES
  ) {
    return {
      valid: false,
      error:
        "The selected document is larger than the 10 MB upload limit.",
    };
  }

  const mimeType =
    file.type as VaultAllowedMimeType;

  if (
    !VAULT_ALLOWED_MIME_TYPES.includes(
      mimeType
    )
  ) {
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

/*
 * Build the exact Firebase Storage path used by the
 * Security Rules.
 */
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

  const safeFileName =
    sanitizeFileName(fileName);

  return [
    "vault",
    userId,
    childId,
    documentId,
    safeFileName,
  ].join("/");
}

/*
 * Firestore metadata collection for a child's Vault.
 */
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

/*
 * Firestore metadata document reference.
 */
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

/*
 * Convert Firestore data into the normalized object used
 * throughout the application.
 */
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
 * ============================================================
 * UPLOAD DOCUMENT
 * ============================================================
 *
 * Sequence:
 *
 * 1. Validate the browser File.
 * 2. Generate a document ID.
 * 3. Upload the file to Firebase Storage.
 * 4. Write metadata to Firestore.
 *
 * If Firestore metadata creation fails after Storage
 * succeeds, we attempt to remove the uploaded Storage
 * object so the Vault does not intentionally leave an
 * orphaned file behind.
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

  if (!childId.trim()) {
    throw new Error(
      "Please select a family member before uploading a document."
    );
  }

  const validation =
    validateVaultFile(file);

  if (!validation.valid) {
    throw new Error(
      validation.error
    );
  }

  const documentId =
    createVaultDocumentId();

  const safeFileName =
    sanitizeFileName(file.name);

  const storagePath =
    buildVaultStoragePath(
      userId,
      childId,
      documentId,
      safeFileName
    );

  const storageReference = ref(
    storage,
    storagePath
  );

  /*
   * Explicitly set contentType rather than relying only
   * on filename extension.
   */
  await uploadBytes(
    storageReference,
    file,
    {
      contentType:
        validation.mimeType,
    }
  );

  const metadataReference =
    getVaultDocumentReference(
      userId,
      childId,
      documentId
    );

  const title =
    input.title?.trim();

  const notes =
    input.notes?.trim();

  const metadata = {
    id: documentId,

    userId,

    childId,

    fileName: safeFileName,

    storagePath,

    category,

    mimeType:
      validation.mimeType,

    size: file.size,

    ...(title
      ? { title }
      : {}),

    ...(notes
      ? { notes }
      : {}),

    uploadedAt:
      serverTimestamp(),

    schemaVersion:
      1 as const,
  };

  try {
    await setDoc(
      metadataReference,
      metadata
    );
  } catch (error) {
    /*
     * Best-effort cleanup.
     *
     * Preserve the original Firestore error even if
     * Storage cleanup also fails.
     */
    try {
      await deleteObject(
        storageReference
      );
    } catch (cleanupError) {
      console.error(
        "Vault upload cleanup failed:",
        cleanupError
      );
    }

    throw error;
  }

  /*
   * serverTimestamp() is resolved by Firestore after
   * the write. Date.now() gives the UI an immediate
   * normalized timestamp without requiring another read.
   */
  const document: VaultDocument = {
    id: documentId,

    userId,

    childId,

    fileName:
      safeFileName,

    storagePath,

    category,

    mimeType:
      validation.mimeType,

    size: file.size,

    ...(title
      ? { title }
      : {}),

    ...(notes
      ? { notes }
      : {}),

    uploadedAt:
      Date.now(),

    schemaVersion: 1,
  };

  return {
    document,
  };
}

/*
 * ============================================================
 * GET DOCUMENTS
 * ============================================================
 *
 * Retrieve all Vault metadata for one child.
 *
 * Files themselves are not downloaded.
 */
export async function getVaultDocuments(
  userId: string,
  childId: string
): Promise<VaultDocument[]> {
  if (
    !userId.trim() ||
    !childId.trim()
  ) {
    return [];
  }

  const vaultQuery = query(
    getVaultCollectionReference(
      userId,
      childId
    ),
    orderBy(
      "uploadedAt",
      "desc"
    )
  );

  const snapshot =
    await getDocs(
      vaultQuery
    );

  return snapshot.docs.map(
    (snapshotDocument) => {
      const data =
        snapshotDocument.data() as VaultDocumentFirestoreData;

      return normalizeVaultDocument({
        ...data,
        id: snapshotDocument.id,
      });
    }
  );
}

/*
 * ============================================================
 * UPDATE DOCUMENT METADATA
 * ============================================================
 *
 * Update user-editable information for an existing Vault
 * document.
 *
 * This operation intentionally changes Firestore metadata
 * only.
 *
 * It does NOT:
 *
 * - Replace the uploaded file
 * - Rename the Storage object
 * - Move the Storage object
 * - Change ownership
 * - Change the MIME type
 * - Change the file size
 * - Change uploadedAt
 * - Change schemaVersion
 *
 * The returned VaultDocument allows the UI to update
 * immediately without another Firestore read.
 */
export async function updateVaultDocumentMetadata(
  document: VaultDocument,
  updates: UpdateVaultDocumentMetadataInput
): Promise<VaultDocument> {
  if (
    !document.userId ||
    !document.userId.trim()
  ) {
    throw new Error(
      "This document does not contain a valid user ID."
    );
  }

  if (
    !document.childId ||
    !document.childId.trim()
  ) {
    throw new Error(
      "This document does not contain a valid family member ID."
    );
  }

  if (
    !document.id ||
    !document.id.trim()
  ) {
    throw new Error(
      "This document does not contain a valid document ID."
    );
  }

  const title =
    updates.title.trim();

  const notes =
    updates.notes.trim();

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

  /*
   * The category is typed by VaultDocumentCategory, but we
   * still perform a runtime check because browser/client
   * values should never be trusted solely because TypeScript
   * compiled them.
   */
  const validCategories: VaultDocumentCategory[] = [
    "medical_evaluations",
    "school_iep",
    "therapy",
    "insurance_benefits",
    "other",
  ];

  if (
    !validCategories.includes(
      updates.category
    )
  ) {
    throw new Error(
      "Please select a valid document category."
    );
  }

  const documentReference =
    getVaultDocumentReference(
      document.userId,
      document.childId,
      document.id
    );

  /*
   * We intentionally keep title and notes as strings.
   *
   * An empty notes string means the family removed the
   * previous note. This is preferable to leaving stale
   * notes in Firestore.
   */
  await updateDoc(
    documentReference,
    {
      title,
      category:
        updates.category,
      notes,
    }
  );

  /*
   * Return a normalized updated object so the page can
   * immediately replace the existing document in local
   * state without re-fetching the entire Vault.
   */
  return {
    ...document,
    title,
    category:
      updates.category,
    notes,
  };
}

/*
 * ============================================================
 * GET DOWNLOAD URL
 * ============================================================
 *
 * Generate a Firebase download URL only when the family
 * actually requests access to the document.
 *
 * We intentionally do not store download URLs in
 * Firestore metadata.
 */
export async function getVaultDocumentDownloadUrl(
  document: VaultDocument
): Promise<string> {
  if (
    !document.storagePath
  ) {
    throw new Error(
      "This document does not have a valid storage location."
    );
  }

  return getDownloadURL(
    ref(
      storage,
      document.storagePath
    )
  );
}

/*
 * ============================================================
 * DELETE DOCUMENT
 * ============================================================
 *
 * Storage is deleted first. Metadata is removed only
 * after Storage deletion succeeds.
 *
 * This prevents the normal successful path from leaving
 * an inaccessible Storage object with no metadata.
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

  const storageReference =
    ref(
      storage,
      document.storagePath
    );

  await deleteObject(
    storageReference
  );

  await deleteDoc(
    getVaultDocumentReference(
      document.userId,
      document.childId,
      document.id
    )
  );
}