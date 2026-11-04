/*
 * MYRIAD DOCUMENT VAULT TYPES
 *
 * Shared types for the Document Vault.
 *
 * Actual document files are stored in Firebase Storage.
 * Document metadata is stored in Firestore.
 */

/*
 * Supported document categories.
 *
 * Keep these values stable because they may be stored
 * in Firestore.
 */
export type VaultDocumentCategory =
  | "medical_evaluations"
  | "school_iep"
  | "therapy"
  | "insurance_benefits"
  | "other";

/*
 * Human-readable category labels used by the UI.
 */
export const VAULT_DOCUMENT_CATEGORY_LABELS: Record<
  VaultDocumentCategory,
  string
> = {
  medical_evaluations: "Medical & Evaluations",
  school_iep: "School & IEP",
  therapy: "Therapy",
  insurance_benefits: "Insurance & Benefits",
  other: "Other",
};

/*
 * Ordered category list for dropdowns, filters,
 * and grouped document displays.
 */
export const VAULT_DOCUMENT_CATEGORIES: VaultDocumentCategory[] = [
  "medical_evaluations",
  "school_iep",
  "therapy",
  "insurance_benefits",
  "other",
];

/*
 * MIME types permitted by the Vault.
 *
 * These should remain aligned with Firebase Storage
 * Security Rules.
 */
export type VaultAllowedMimeType =
  | "application/pdf"
  | "image/jpeg"
  | "image/png";

export const VAULT_ALLOWED_MIME_TYPES: VaultAllowedMimeType[] = [
  "application/pdf",
  "image/jpeg",
  "image/png",
];

/*
 * Maximum file size.
 *
 * This must remain aligned with Firebase Storage Rules.
 */
export const VAULT_MAX_FILE_SIZE_BYTES =
  10 * 1024 * 1024;

export const VAULT_MAX_FILE_SIZE_MB = 10;

/*
 * Metadata stored in Firestore for each uploaded
 * Vault document.
 *
 * The actual file contents are NOT stored here.
 */
export interface VaultDocument {
  /*
   * Unique document identifier.
   *
   * This should match the Firestore document ID
   * and the documentId portion of the Storage path.
   */
  id: string;

  /*
   * Firebase UID of the account that owns the document.
   */
  userId: string;

  /*
   * Saved child this document belongs to.
   */
  childId: string;

  /*
   * Original file name shown to the family.
   */
  fileName: string;

  /*
   * Firebase Storage object path.
   *
   * Example:
   *
   * vault/{userId}/{childId}/{documentId}/{fileName}
   */
  storagePath: string;

  /*
   * Organizational category selected for the document.
   */
  category: VaultDocumentCategory;

  /*
   * MIME type validated during upload.
   */
  mimeType: VaultAllowedMimeType;

  /*
   * File size in bytes.
   */
  size: number;

  /*
   * Optional family-friendly document title.
   *
   * Example:
   * "2026 Developmental Evaluation"
   */
  title?: string;

  /*
   * Optional notes entered by the family.
   *
   * Do not use this field for sensitive system metadata.
   */
  notes?: string;

  /*
   * Timestamp represented as milliseconds since Unix epoch.
   *
   * Repository code will normalize Firestore timestamps
   * into this format before returning documents to the UI.
   */
  uploadedAt: number;

  /*
   * Allows future schema changes without breaking
   * older Vault records.
   */
  schemaVersion: 1;
}

/*
 * Information required before a document upload begins.
 *
 * The repository will generate:
 * - document ID
 * - storage path
 * - upload timestamp
 */
export interface CreateVaultDocumentInput {
  userId: string;
  childId: string;
  file: File;
  category: VaultDocumentCategory;
  title?: string;
  notes?: string;
}

/*
 * Result returned after a successful Vault upload.
 */
export interface VaultUploadResult {
  document: VaultDocument;
}

/*
 * Basic validation result used before sending a file
 * to Firebase Storage.
 */
export type VaultFileValidationResult =
  | {
      valid: true;
      mimeType: VaultAllowedMimeType;
    }
  | {
      valid: false;
      error: string;
    };

/*
 * Useful when the UI groups documents by category.
 */
export type VaultDocumentsByCategory = Record<
  VaultDocumentCategory,
  VaultDocument[]
>;