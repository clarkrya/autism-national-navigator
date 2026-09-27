"use client";

import {
  useEffect,
  useState,
} from "react";

import type {
  VaultDocument,
  VaultDocumentCategory,
} from "../../types/vault";

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

  onDelete: (document: VaultDocument) => Promise<void>;
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

function formatFileSize(bytes?: number): string {
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
      (option) => option.value === category
    )?.label ?? "Other"
  );
}

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
    useState<VaultDocumentCategory>("other");

  const [notes, setNotes] =
    useState("");

  const [isSaving, setIsSaving] =
    useState(false);

  const [isDeleting, setIsDeleting] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

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

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(
      event: KeyboardEvent
    ) {
      if (event.key === "Escape") {
        if (
          isSaving ||
          isDeleting
        ) {
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

  if (
    !isOpen ||
    !document
  ) {
    return null;
  }

  const fileSize =
  formatFileSize(document.size);

  const categoryLabel =
    getCategoryLabel(document.category);

  const hasNotes =
    Boolean(document.notes?.trim());

  const canSave =
    title.trim().length > 0 &&
    title.trim().length <= 200 &&
    notes.length <= 2000 &&
    !isSaving &&
    !isDeleting;

  async function handleSave() {
    if (!canSave) {
      return;
    }

    setIsSaving(true);
    setError(null);
    
    if (!document) {
      return;
    }

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

  async function handleDelete() {
    
    if (!document) {
      return;
    }

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

  function handleCancelEdit() {
    if (!document) {
      return;
    }
    
    setTitle(document.title ?? "");
    setCategory(document.category);
    setNotes(document.notes ?? "");
    setError(null);
    setIsEditing(false);
  }

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
          "rgba(15, 23, 42, 0.48)",
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
          borderRadius: 20,
          background: "#ffffff",
          boxShadow:
            "0 24px 70px rgba(15, 23, 42, 0.22)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 20,
            padding: "24px 24px 18px",
            borderBottom:
              "1px solid #e5e7eb",
          }}
        >
          <div>
            <div
              style={{
                marginBottom: 6,
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: "0.06em",
                color: "#6d45a5",
                textTransform: "uppercase",
              }}
            >
              Document Vault
            </div>

            <h2
              id="vault-document-details-title"
              style={{
                margin: 0,
                fontSize: 24,
                lineHeight: 1.25,
                color: "#172033",
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
              border: 0,
              background: "transparent",
              fontSize: 26,
              lineHeight: 1,
              cursor:
                isSaving ||
                isDeleting
                  ? "not-allowed"
                  : "pointer",
              color: "#64748b",
            }}
          >
            ×
          </button>
        </div>

        <div
          style={{
            padding: 24,
          }}
        >
          {!isEditing ? (
            <>
              <div
                style={{
                  padding: 18,
                  marginBottom: 20,
                  border:
                    "1px solid #e7e1ef",
                  borderRadius: 16,
                  background: "#faf8fc",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: 14,
                    alignItems: "flex-start",
                  }}
                >
                  <div
                    style={{
                      minWidth: 48,
                      height: 48,
                      display: "flex",
                      alignItems: "center",
                      justifyContent:
                        "center",
                      borderRadius: 12,
                      background: "#f0eafb",
                      color: "#6d45a5",
                      fontSize: 13,
                      fontWeight: 800,
                    }}
                  >
                    {document.fileName
  .split(".")
  .pop()
  ?.toUpperCase() || "FILE"}
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
                        color: "#172033",
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
                        alignItems: "center",
                        color: "#64748b",
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
                    color: "#334155",
                  }}
                >
                  Notes
                </div>

                <div
                  style={{
                    minHeight: 80,
                    padding: 14,
                    border:
                      "1px solid #e5e7eb",
                    borderRadius: 12,
                    color: hasNotes
                      ? "#334155"
                      : "#94a3b8",
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

              {error ? (
                <div
                  role="alert"
                  style={{
                    marginBottom: 18,
                    padding: 12,
                    border:
                      "1px solid #fecaca",
                    borderRadius: 10,
                    background: "#fef2f2",
                    color: "#b91c1c",
                    fontSize: 13,
                  }}
                >
                  {error}
                </div>
              ) : null}

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
                  style={secondaryButtonStyle}
                >
                  View Document
                </button>

                <button
                  type="button"
                  onClick={() =>
                    onDownload(document)
                  }
                  disabled={isDeleting}
                  style={secondaryButtonStyle}
                >
                  Download
                </button>
              </div>

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
                  onClick={handleDelete}
                  disabled={isDeleting}
                  style={{
                    ...dangerButtonStyle,
                    opacity: isDeleting
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
                  style={primaryButtonStyle}
                >
                  Edit Details
                </button>
              </div>
            </>
          ) : (
            <>
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
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </option>
                    )
                  )}
                </select>
              </div>

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
                      color: "#64748b",
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

              {error ? (
                <div
                  role="alert"
                  style={{
                    marginBottom: 18,
                    padding: 12,
                    border:
                      "1px solid #fecaca",
                    borderRadius: 10,
                    background: "#fef2f2",
                    color: "#b91c1c",
                    fontSize: 13,
                  }}
                >
                  {error}
                </div>
              ) : null}

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
                  style={secondaryButtonStyle}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSave}
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

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 7,
  fontSize: 13,
  fontWeight: 800,
  color: "#334155",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "12px 13px",
  border: "1px solid #d8dee9",
  borderRadius: 11,
  background: "#ffffff",
  color: "#172033",
  fontSize: 14,
  outline: "none",
};

const counterStyle: React.CSSProperties = {
  marginTop: 5,
  textAlign: "right",
  fontSize: 11,
  color: "#94a3b8",
};

const primaryButtonStyle: React.CSSProperties = {
  minHeight: 42,
  padding: "10px 18px",
  border: 0,
  borderRadius: 11,
  background: "#6d45a5",
  color: "#ffffff",
  fontSize: 14,
  fontWeight: 800,
  cursor: "pointer",
};

const secondaryButtonStyle: React.CSSProperties = {
  minHeight: 42,
  padding: "10px 16px",
  border: "1px solid #d8dee9",
  borderRadius: 11,
  background: "#ffffff",
  color: "#4b5563",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
};

const dangerButtonStyle: React.CSSProperties = {
  minHeight: 42,
  padding: "10px 16px",
  border: "1px solid #fecaca",
  borderRadius: 11,
  background: "#fff7f7",
  color: "#b42318",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
};