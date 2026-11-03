
"use client";

import {
  useEffect,
  useState,
} from "react";

import type {
  VaultDocument,
  VaultDocumentCategory,
} from "../../types/vault";

/*
 * AUTIVOYA BRAND COLORS
 */

const BRAND = {
  navy: "#204D6A",
  darkNavy: "#173B52",
  teal: "#58AAA7",
  darkTeal: "#317E7B",
  gold: "#F7AD3F",
  lightTeal: "#EAF6F5",
  background: "#F7FAFB",
  white: "#FFFFFF",
  muted: "#647B8B",
  border: "#DCE7EC",
};

type VaultDocumentDetailsModalProps = {
  document: VaultDocument | null;
  isOpen: boolean;
  onClose: () => void;
  onView: (document: VaultDocument) => void;
  onDownload: (document: VaultDocument) => void;
  onSave: (
    document: VaultDocument,
    updates: {
      title: string;
      category: VaultDocumentCategory;
      notes: string;
    }
  ) => Promise<void>;
  onDelete: (
    document: VaultDocument
  ) => Promise<void>;
};

const CATEGORY_OPTIONS: {
  value: VaultDocumentCategory;
  label: string;
}[] = [
  {
    value: "medical_evaluations",
    label: "Medical & Evaluations",
  },
  {
    value: "school_iep",
    label: "School & IEP",
  },
  {
    value: "therapy",
    label: "Therapy",
  },
  {
    value: "insurance_benefits",
    label: "Insurance & Benefits",
  },
  {
    value: "other",
    label: "Other",
  },
];

/*
 * HELPERS
 */

function formatFileSize(
  bytes?: number
): string {
  if (!bytes || bytes <= 0) {
    return "";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kilobytes = bytes / 1024;

  if (kilobytes < 1024) {
    return `${Math.round(kilobytes)} KB`;
  }

  const megabytes = kilobytes / 1024;

  return `${megabytes.toFixed(1)} MB`;
}

function getCategoryLabel(
  category: VaultDocumentCategory
): string {
  return (
    CATEGORY_OPTIONS.find(
      (option) =>
        option.value === category
    )?.label ?? "Other"
  );
}

/*
 * SHARED STYLES
 */

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 7,
  fontSize: 13,
  fontWeight: 800,
  color: BRAND.darkNavy,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "12px 13px",
  border: `1px solid ${BRAND.border}`,
  borderRadius: 11,
  background: BRAND.white,
  color: BRAND.darkNavy,
  fontSize: 14,
  fontFamily: "inherit",
  outlineColor: BRAND.teal,
};

const counterStyle: React.CSSProperties = {
  marginTop: 5,
  textAlign: "right",
  fontSize: 11,
  color: BRAND.muted,
};

const primaryButtonStyle: React.CSSProperties = {
  minHeight: 42,
  padding: "10px 18px",
  border: 0,
  borderRadius: 11,
  background: BRAND.darkTeal,
  color: BRAND.white,
  fontSize: 14,
  fontWeight: 800,
  cursor: "pointer",
};

const secondaryButtonStyle: React.CSSProperties = {
  minHeight: 42,
  padding: "10px 16px",
  border: `1px solid ${BRAND.border}`,
  borderRadius: 11,
  background: BRAND.white,
  color: BRAND.navy,
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
};

const dangerButtonStyle: React.CSSProperties = {
  minHeight: 42,
  padding: "10px 16px",
  border: "1px solid #F3C9C9",
  borderRadius: 11,
  background: "#FFF7F7",
  color: "#B42318",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
};

/*
 * DOCUMENT DETAILS MODAL
 */

export default function VaultDocumentDetailsModal({
  document,
  isOpen,
  onClose,
  onView,
  onDownload,
  onSave,
  onDelete,
}: VaultDocumentDetailsModalProps) {
  const [isEditing, setIsEditing] =
    useState(false);

  const [title, setTitle] =
    useState("");

  const [category, setCategory] =
    useState<VaultDocumentCategory>(
      "other"
    );

  const [notes, setNotes] =
    useState("");

  const [isSaving, setIsSaving] =
    useState(false);

  const [isDeleting, setIsDeleting] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  /*
   * RESET WHEN DOCUMENT CHANGES
   */

  useEffect(() => {
    if (!document) {
      return;
    }

    setTitle(document.title ?? "");
    setCategory(document.category);
    setNotes(document.notes ?? "");
    setIsEditing(false);
    setIsSaving(false);
    setIsDeleting(false);
    setError(null);
  }, [document]);

  /*
   * ESCAPE KEY SUPPORT
   */

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(
      event: KeyboardEvent
    ) {
      if (event.key === "Escape") {
        if (isSaving || isDeleting) {
          return;
        }

        onClose();
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [
    isOpen,
    isSaving,
    isDeleting,
    onClose,
  ]);

  if (!isOpen || !document) {
    return null;
  }

  const fileSize =
    formatFileSize(document.size);

  const categoryLabel =
    getCategoryLabel(
      document.category
    );

  const hasNotes =
    Boolean(document.notes?.trim());

  const canSave =
    title.trim().length > 0 &&
    title.trim().length <= 200 &&
    notes.length <= 2000 &&
    !isSaving &&
    !isDeleting;

  /*
   * SAVE DOCUMENT DETAILS
   */

  async function handleSave() {
    if (!canSave) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSave(document, {
        title: title.trim(),
        category,
        notes: notes.trim(),
      });

      setIsEditing(false);
    } catch (saveError) {
      console.error(
        "Unable to update Vault document:",
        saveError
      );

      setError(
        saveError instanceof Error
          ? saveError.message
          : "We could not update this document. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  }

  /*
   * DELETE DOCUMENT
   */

  async function handleDelete() {
    const confirmed =
      window.confirm(
        `Delete "${document.title}" from the Document Vault? This cannot be undone.`
      );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      await onDelete(document);
      onClose();
    } catch (deleteError) {
      console.error(
        "Unable to delete Vault document:",
        deleteError
      );

      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "We could not delete this document. Please try again."
      );

      setIsDeleting(false);
    }
  }

  /*
   * CANCEL EDITING
   */

  function handleCancelEdit() {
    setTitle(document.title ?? "");
    setCategory(document.category);
    setNotes(document.notes ?? "");
    setError(null);
    setIsEditing(false);
  }

  /*
   * MODAL UI
   */

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        background:
          "rgba(23, 59, 82, 0.50)",
      }}
      onMouseDown={(event) => {
        if (
          event.target ===
            event.currentTarget &&
          !isSaving &&
          !isDeleting
        ) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="vault-document-details-title"
        style={{
          width: "100%",
          maxWidth: 620,
          maxHeight: "90vh",
          overflowY: "auto",
          borderRadius: 24,
          background: BRAND.white,
          boxShadow:
            "0 24px 70px rgba(23, 59, 82, 0.22)",
        }}
      >
        {/* HEADER */}

        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent:
              "space-between",
            gap: 20,
            padding: "24px 24px 18px",
            borderBottom:
              `1px solid ${BRAND.border}`,
          }}
        >
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                minHeight: 26,
                padding: "3px 10px",
                marginBottom: 10,
                borderRadius: 999,
                background:
                  BRAND.lightTeal,
                color:
                  BRAND.darkTeal,
                fontSize: 11,
                fontWeight: 800,
                letterSpacing:
                  "0.04em",
                textTransform:
                  "uppercase",
              }}
            >
              AUTIVOYA DOCUMENT VAULT
            </div>

            <h2
              id="vault-document-details-title"
              style={{
                margin: 0,
                fontSize: 24,
                lineHeight: 1.25,
                fontWeight: 800,
                color:
                  BRAND.darkNavy,
              }}
            >
              Document Details
            </h2>
          </div>

          <button
            type="button"
            aria-label="Close document details"
            disabled={
              isSaving ||
              isDeleting
            }
            onClick={onClose}
            style={{
              width: 40,
              height: 40,
              flexShrink: 0,
              border:
                `1px solid ${BRAND.border}`,
              borderRadius: 12,
              background:
                BRAND.white,
              fontSize: 24,
              lineHeight: 1,
              cursor:
                isSaving ||
                isDeleting
                  ? "not-allowed"
                  : "pointer",
              color: BRAND.navy,
            }}
          >
            ×
          </button>
        </div>

        {/* CONTENT */}

        <div
          style={{
            padding: 24,
          }}
        >
          {!isEditing ? (
            <>
              {/* DOCUMENT SUMMARY */}

              <div
                style={{
                  padding: 18,
                  marginBottom: 20,
                  border:
                    "1px solid #D1EAE8",
                  borderRadius: 16,
                  background:
                    BRAND.lightTeal,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: 14,
                    alignItems:
                      "flex-start",
                  }}
                >
                  <div
                    style={{
                      minWidth: 48,
                      height: 48,
                      display: "flex",
                      alignItems:
                        "center",
                      justifyContent:
                        "center",
                      borderRadius: 12,
                      background:
                        BRAND.white,
                      border:
                        "1px solid #D1EAE8",
                      color:
                        BRAND.darkTeal,
                      fontSize: 13,
                      fontWeight: 800,
                    }}
                  >
                    {document.fileName
                      .split(".")
                      .pop()
                      ?.toUpperCase() ||
                      "FILE"}
                  </div>

                  <div
                    style={{
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        marginBottom: 6,
                        fontSize: 18,
                        fontWeight: 800,
                        color:
                          BRAND.darkNavy,
                        wordBreak:
                          "break-word",
                      }}
                    >
                      {document.title}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 8,
                        alignItems:
                          "center",
                        color:
                          BRAND.muted,
                        fontSize: 13,
                      }}
                    >
                      <span>
                        {categoryLabel}
                      </span>

                      {fileSize ? (
                        <>
                          <span>•</span>
                          <span>
                            {fileSize}
                          </span>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              {/* NOTES */}

              <div
                style={{
                  marginBottom: 22,
                }}
              >
                <div
                  style={{
                    marginBottom: 8,
                    fontSize: 13,
                    fontWeight: 800,
                    color:
                      BRAND.darkNavy,
                  }}
                >
                  Notes
                </div>

                <div
                  style={{
                    minHeight: 80,
                    padding: 14,
                    border:
                      `1px solid ${BRAND.border}`,
                    borderRadius: 12,
                    background:
                      BRAND.background,
                    color: hasNotes
                      ? BRAND.darkNavy
                      : BRAND.muted,
                    fontSize: 14,
                    lineHeight: 1.6,
                    whiteSpace:
                      "pre-wrap",
                  }}
                >
                  {hasNotes
                    ? document.notes
                    : "No notes added."}
                </div>
              </div>

              {/* ERROR */}

              {error ? (
                <div
                  role="alert"
                  style={{
                    marginBottom: 18,
                    padding: 12,
                    border:
                      "1px solid #FECACA",
                    borderRadius: 10,
                    background:
                      "#FEF2F2",
                    color: "#B91C1C",
                    fontSize: 13,
                  }}
                >
                  {error}
                </div>
              ) : null}

              {/* VIEW AND DOWNLOAD */}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(2, minmax(0, 1fr))",
                  gap: 10,
                  marginBottom: 18,
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    onView(document)
                  }
                  disabled={isDeleting}
                  style={
                    secondaryButtonStyle
                  }
                >
                  View Document
                </button>

                <button
                  type="button"
                  onClick={() =>
                    onDownload(document)
                  }
                  disabled={isDeleting}
                  style={
                    secondaryButtonStyle
                  }
                >
                  Download
                </button>
              </div>

              {/* DELETE AND EDIT */}

              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  onClick={
                    handleDelete
                  }
                  disabled={isDeleting}
                  style={{
                    ...dangerButtonStyle,
                    opacity:
                      isDeleting
                        ? 0.6
                        : 1,
                  }}
                >
                  {isDeleting
                    ? "Deleting..."
                    : "Delete Document"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setIsEditing(true);
                  }}
                  disabled={isDeleting}
                  style={
                    primaryButtonStyle
                  }
                >
                  Edit Details
                </button>
              </div>
            </>
          ) : (
            <>
              {/* EDIT DOCUMENT TITLE */}

              <div
                style={{
                  marginBottom: 18,
                }}
              >
                <label
                  htmlFor="vault-document-title"
                  style={labelStyle}
                >
                  Document title
                </label>

                <input
                  id="vault-document-title"
                  value={title}
                  maxLength={200}
                  onChange={(event) =>
                    setTitle(
                      event.target.value
                    )
                  }
                  disabled={isSaving}
                  style={inputStyle}
                />

                <div
                  style={counterStyle}
                >
                  {title.length}/200
                </div>
              </div>

              {/* EDIT CATEGORY */}

              <div
                style={{
                  marginBottom: 18,
                }}
              >
                <label
                  htmlFor="vault-document-category"
                  style={labelStyle}
                >
                  Category
                </label>

                <select
                  id="vault-document-category"
                  value={category}
                  onChange={(event) =>
                    setCategory(
                      event.target
                        .value as VaultDocumentCategory
                    )
                  }
                  disabled={isSaving}
                  style={inputStyle}
                >
                  {CATEGORY_OPTIONS.map(
                    (option) => (
                      <option
                        key={
                          option.value
                        }
                        value={
                          option.value
                        }
                      >
                        {option.label}
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* EDIT NOTES */}

              <div
                style={{
                  marginBottom: 18,
                }}
              >
                <label
                  htmlFor="vault-document-notes"
                  style={labelStyle}
                >
                  Notes{" "}
                  <span
                    style={{
                      fontWeight: 500,
                      color:
                        BRAND.muted,
                    }}
                  >
                    (optional)
                  </span>
                </label>

                <textarea
                  id="vault-document-notes"
                  value={notes}
                  maxLength={2000}
                  rows={6}
                  onChange={(event) =>
                    setNotes(
                      event.target.value
                    )
                  }
                  disabled={isSaving}
                  placeholder="Add a note to help you remember what this document is for."
                  style={{
                    ...inputStyle,
                    resize: "vertical",
                    minHeight: 130,
                  }}
                />

                <div
                  style={counterStyle}
                >
                  {notes.length}/2000
                </div>
              </div>

              {/* ERROR */}

              {error ? (
                <div
                  role="alert"
                  style={{
                    marginBottom: 18,
                    padding: 12,
                    border:
                      "1px solid #FECACA",
                    borderRadius: 10,
                    background:
                      "#FEF2F2",
                    color: "#B91C1C",
                    fontSize: 13,
                  }}
                >
                  {error}
                </div>
              ) : null}

              {/* CANCEL AND SAVE */}

              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "flex-end",
                  gap: 10,
                }}
              >
                <button
                  type="button"
                  onClick={
                    handleCancelEdit
                  }
                  disabled={isSaving}
                  style={
                    secondaryButtonStyle
                  }
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={
                    handleSave
                  }
                  disabled={!canSave}
                  style={{
                    ...primaryButtonStyle,
                    opacity: canSave
                      ? 1
                      : 0.55,
                    cursor: canSave
                      ? "pointer"
                      : "not-allowed",
                  }}
                >
                  {isSaving
                    ? "Saving..."
                    : "Save Changes"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
