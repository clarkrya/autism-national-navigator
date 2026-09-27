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
    VaultFileValidationResult,
    VaultUploadResult,
  } from "../types/vault";
  
  import {
    VAULT_ALLOWED_MIME_TYPES,
    VAULT_MAX_FILE_SIZE_BYTES,
  } from "../types/vault";
  
  /*
   * MYRIAD DOCUMENT VAULT REPOSITORY
   *
   * Responsibilities:
   *
   * - Validate files before upload
   * - Generate Vault document IDs
   * - Build controlled Firebase Storage paths
   * - Upload files to Firebase Storage
   * - Store document metadata in Firestore
   * - Retrieve document metadata
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
  function sanitizeFileName(fileName: string): string {
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
  
    const safeFileName = sanitizeFileName(fileName);
  
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
   * Upload a new document.
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
  
    /*
     * Explicitly set contentType rather than relying only
     * on filename extension.
     */
    await uploadBytes(
      storageReference,
      file,
      {
        contentType: validation.mimeType,
      }
    );
  
    const metadataReference =
      getVaultDocumentReference(
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
        await deleteObject(storageReference);
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
  
    return {
      document,
    };
  }
  
  /*
   * Retrieve all Vault metadata for one child.
   *
   * Files themselves are not downloaded.
   */
  export async function getVaultDocuments(
    userId: string,
    childId: string
  ): Promise<VaultDocument[]> {
    if (!userId.trim() || !childId.trim()) {
      return [];
    }
  
    const vaultQuery = query(
      getVaultCollectionReference(
        userId,
        childId
      ),
      orderBy("uploadedAt", "desc")
    );
  
    const snapshot = await getDocs(
      vaultQuery
    );
  
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
   * Generate a Firebase download URL only when the family
   * actually requests access to the document.
   *
   * We intentionally do not store download URLs in
   * Firestore metadata.
   */
  export async function getVaultDocumentDownloadUrl(
    document: VaultDocument
  ): Promise<string> {
    if (!document.storagePath) {
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
   * Delete a Vault document.
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
  
    const storageReference = ref(
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