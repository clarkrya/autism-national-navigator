import type {
    VaultDocument,
    VaultDocumentCategory,
    VaultDocumentsByCategory,
  } from "../types/vault";
  
  import {
    VAULT_DOCUMENT_CATEGORIES,
    VAULT_DOCUMENT_CATEGORY_LABELS,
  } from "../types/vault";
  
  /*
   * ============================================================
   * DOCUMENT VAULT UI HELPERS
   * ============================================================
   *
   * Presentation-focused utilities for Document Vault.
   *
   * Firebase Storage / Firestore operations belong in
   * vaultRepository.ts — not here.
   * ============================================================
   */
  
  /*
   * Return the family-facing label for a Vault category.
   */
  export function getVaultCategoryLabel(
    category: VaultDocumentCategory
  ): string {
    return VAULT_DOCUMENT_CATEGORY_LABELS[
      category
    ];
  }
  
  /*
   * Group documents into all supported Vault categories.
   *
   * Empty categories are intentionally preserved so the UI
   * can consistently render category cards and filters.
   */
  export function groupVaultDocumentsByCategory(
    documents: VaultDocument[]
  ): VaultDocumentsByCategory {
    const grouped =
      {} as VaultDocumentsByCategory;
  
    for (const category of VAULT_DOCUMENT_CATEGORIES) {
      grouped[category] = [];
    }
  
    for (const document of documents) {
      grouped[document.category].push(
        document
      );
    }
  
    return grouped;
  }
  
  /*
   * Display title.
   *
   * Prefer the family's custom title when present.
   * Otherwise use the uploaded filename.
   */
  export function getVaultDocumentDisplayTitle(
    document: VaultDocument
  ): string {
    const title =
      document.title?.trim();
  
    if (title) {
      return title;
    }
  
    return document.fileName;
  }
  
  /*
   * Convert bytes into a readable file size.
   */
  export function formatVaultFileSize(
    bytes: number
  ): string {
    if (!Number.isFinite(bytes) || bytes <= 0) {
      return "0 KB";
    }
  
    const kilobytes =
      bytes / 1024;
  
    if (kilobytes < 1024) {
      return `${Math.max(
        1,
        Math.round(kilobytes)
      )} KB`;
    }
  
    const megabytes =
      kilobytes / 1024;
  
    return `${megabytes.toFixed(
      megabytes >= 10 ? 0 : 1
    )} MB`;
  }
  
  /*
   * Format an upload timestamp for the family-facing UI.
   */
  export function formatVaultUploadDate(
    uploadedAt: number
  ): string {
    if (
      !Number.isFinite(uploadedAt) ||
      uploadedAt <= 0
    ) {
      return "Recently uploaded";
    }
  
    const date = new Date(
      uploadedAt
    );
  
    if (
      Number.isNaN(date.getTime())
    ) {
      return "Recently uploaded";
    }
  
    return new Intl.DateTimeFormat(
      "en-US",
      {
        month: "short",
        day: "numeric",
        year: "numeric",
      }
    ).format(date);
  }
  
  /*
   * Determine a simple family-facing file type label.
   */
  export function getVaultFileTypeLabel(
    document: VaultDocument
  ): string {
    switch (document.mimeType) {
      case "application/pdf":
        return "PDF";
  
      case "image/jpeg":
        return "JPG";
  
      case "image/png":
        return "PNG";
  
      default:
        return "Document";
    }
  }
  
  /*
   * Search across the user-facing document fields.
   *
   * We intentionally do not search internal fields such as
   * userId, childId, storagePath, or documentId.
   */
  export function filterVaultDocuments(
    documents: VaultDocument[],
    searchTerm: string,
    category?: VaultDocumentCategory | "all"
  ): VaultDocument[] {
    const normalizedSearch =
      searchTerm
        .trim()
        .toLowerCase();
  
    return documents.filter(
      (document) => {
        if (
          category &&
          category !== "all" &&
          document.category !== category
        ) {
          return false;
        }
  
        if (!normalizedSearch) {
          return true;
        }
  
        const searchableText = [
          document.title,
          document.fileName,
          document.notes,
          getVaultCategoryLabel(
            document.category
          ),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
  
        return searchableText.includes(
          normalizedSearch
        );
      }
    );
  }
  
  /*
   * Sort newest uploads first.
   *
   * Use a copy so callers' arrays are never mutated.
   */
  export function sortVaultDocumentsNewestFirst(
    documents: VaultDocument[]
  ): VaultDocument[] {
    return [...documents].sort(
      (a, b) =>
        b.uploadedAt -
        a.uploadedAt
    );
  }
  
  /*
   * Return the number of documents in a category.
   */
  export function getVaultCategoryCount(
    documents: VaultDocument[],
    category: VaultDocumentCategory
  ): number {
    return documents.filter(
      (document) =>
        document.category === category
    ).length;
  }
  
  /*
   * Return the total number of populated categories.
   */
  export function getVaultPopulatedCategoryCount(
    documents: VaultDocument[]
  ): number {
    const categories =
      new Set<VaultDocumentCategory>();
  
    for (const document of documents) {
      categories.add(
        document.category
      );
    }
  
    return categories.size;
  }