"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import type {
  VaultDocument,
  VaultDocumentCategory,
} from "../../types/vault";

import {
  VAULT_DOCUMENT_CATEGORIES,
  VAULT_DOCUMENT_CATEGORY_LABELS,
  VAULT_MAX_FILE_SIZE_MB,
} from "../../types/vault";

import {
  uploadVaultDocument,
  validateVaultFile,
} from "../../lib/vaultRepository";

type VaultUploadModalProps = {
  open: boolean;

  userId: string;

  childId: string;

  childName?: string;

  onClose: () => void;

  onUploaded: (
    document: VaultDocument
  ) => Promise<void> | void;
};

export default function VaultUploadModal({
  open,
  userId,
  childId,
  childName,
  onClose,
  onUploaded,
}: VaultUploadModalProps) {
  const fileInputRef =
    useRef<HTMLInputElement | null>(
      null
    );

  const [
    selectedFile,
    setSelectedFile,
  ] = useState<File | null>(
    null
  );

  const [
    title,
    setTitle,
  ] = useState("");

  const [
    category,
    setCategory,
  ] =
    useState<VaultDocumentCategory>(
      "medical_evaluations"
    );

  const [
    notes,
    setNotes,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");

  const [
    uploading,
    setUploading,
  ] = useState(false);

  /*
   * Reset the form whenever the modal is closed.
   *
   * This prevents a previous child's document information
   * from remaining in the form when the modal is opened
   * again later.
   */
  useEffect(() => {
    if (open) {
      return;
    }

    setSelectedFile(null);
    setTitle("");
    setCategory(
      "medical_evaluations"
    );
    setNotes("");
    setError("");
    setUploading(false);

    if (fileInputRef.current) {
      fileInputRef.current.value =
        "";
    }
  }, [open]);

  /*
   * Prevent the page behind the modal from scrolling.
   */
  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    return () => {
      document.body.style.overflow =
        previousOverflow;
    };
  }, [open]);

  if (!open) {
    return null;
  }

  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    setError("");

    const file =
      event.target.files?.[0] ??
      null;

    if (!file) {
      setSelectedFile(null);
      return;
    }

    const validation =
      validateVaultFile(file);

    if (!validation.valid) {
      setSelectedFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value =
          "";
      }

      setError(
        validation.error
      );

      return;
    }

    setSelectedFile(file);

    /*
     * If the family has not entered a title, use a cleaned
     * version of the filename as a helpful starting point.
     *
     * The user can still change it before uploading.
     */
    if (!title.trim()) {
      const suggestedTitle =
        file.name
          .replace(
            /\.[^/.]+$/,
            ""
          )
          .replace(
            /[_-]+/g,
            " "
          )
          .replace(
            /\s+/g,
            " "
          )
          .trim();

      setTitle(
        suggestedTitle
      );
    }
  }

  function handleClose() {
    if (uploading) {
      return;
    }

    onClose();
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (uploading) {
      return;
    }

    setError("");

    if (!userId.trim()) {
      setError(
        "You must be signed in to upload a document."
      );

      return;
    }

    if (!childId.trim()) {
      setError(
        "Please select a family member before uploading a document."
      );

      return;
    }

    if (!selectedFile) {
      setError(
        "Please select a document to upload."
      );

      return;
    }

    const validation =
      validateVaultFile(
        selectedFile
      );

    if (!validation.valid) {
      setError(
        validation.error
      );

      return;
    }

    if (
      title.trim().length >
      200
    ) {
      setError(
        "Document title must be 200 characters or fewer."
      );

      return;
    }

    if (
      notes.trim().length >
      2000
    ) {
      setError(
        "Notes must be 2,000 characters or fewer."
      );

      return;
    }

    setUploading(true);

    try {
      const result =
        await uploadVaultDocument(
          {
            userId,
            childId,
            file: selectedFile,
            category,
            title:
              title.trim() ||
              undefined,
            notes:
              notes.trim() ||
              undefined,
          }
        );

      await onUploaded(
        result.document
      );

      onClose();
    } catch (uploadError) {
      console.error(
        "Vault document upload failed:",
        uploadError
      );

      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "We couldn't upload this document. Please try again."
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div
      role="presentation"
      onMouseDown={(event) => {
        if (
          event.target ===
            event.currentTarget &&
          !uploading
        ) {
          handleClose();
        }
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        background:
          "rgba(31, 25, 38, 0.48)",
        overflowY: "auto",
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="vault-upload-title"
        style={{
          width: "100%",
          maxWidth: 620,
          maxHeight:
            "calc(100vh - 40px)",
          overflowY: "auto",
          borderRadius: 24,
          background: "#ffffff",
          boxShadow:
            "0 24px 70px rgba(37, 27, 50, 0.22)",
        }}
      >
        <div
          style={{
            padding:
              "24px 24px 20px",
            borderBottom:
              "1px solid rgba(91, 72, 128, 0.10)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent:
              "space-between",
            gap: 20,
          }}
        >
          <div>
            <div
              style={{
                display:
                  "inline-flex",
                alignItems:
                  "center",
                minHeight: 26,
                padding:
                  "3px 9px",
                marginBottom: 10,
                borderRadius: 999,
                background:
                  "rgba(108, 82, 160, 0.10)",
                color: "#654c91",
                fontSize: 11,
                fontWeight: 800,
                letterSpacing:
                  "0.04em",
              }}
            >
              DOCUMENT VAULT
            </div>

            <h2
              id="vault-upload-title"
              style={{
                margin: 0,
                color: "#2f2638",
                fontSize: 24,
                lineHeight: 1.2,
                fontWeight: 800,
              }}
            >
              Add a Document
            </h2>

            <p
              style={{
                margin:
                  "8px 0 0",
                color: "#746b79",
                fontSize: 14,
                lineHeight: 1.55,
              }}
            >
              {childName
                ? `Add a document to ${childName}'s secure Vault.`
                : "Add a document to this secure Vault."}
            </p>
          </div>

          <button
            type="button"
            aria-label="Close document upload"
            disabled={uploading}
            onClick={
              handleClose
            }
            style={{
              width: 40,
              height: 40,
              flexShrink: 0,
              border:
                "1px solid rgba(91, 72, 128, 0.14)",
              borderRadius: 12,
              background:
                "#ffffff",
              color: "#5f5666",
              fontSize: 22,
              lineHeight: 1,
              cursor:
                uploading
                  ? "not-allowed"
                  : "pointer",
              opacity:
                uploading
                  ? 0.55
                  : 1,
            }}
          >
            ×
          </button>
        </div>

        <form
          onSubmit={
            handleSubmit
          }
          style={{
            padding: 24,
          }}
        >
          {childName ? (
            <div
              style={{
                marginBottom: 20,
                padding:
                  "12px 14px",
                borderRadius: 14,
                background:
                  "rgba(108, 82, 160, 0.06)",
                border:
                  "1px solid rgba(108, 82, 160, 0.10)",
              }}
            >
              <div
                style={{
                  color: "#817887",
                  fontSize: 11,
                  fontWeight: 750,
                  textTransform:
                    "uppercase",
                  letterSpacing:
                    "0.04em",
                }}
              >
                Document for
              </div>

              <div
                style={{
                  marginTop: 3,
                  color: "#3b3142",
                  fontSize: 14,
                  fontWeight: 750,
                }}
              >
                {childName}
              </div>
            </div>
          ) : null}

          <div
            style={{
              marginBottom: 20,
            }}
          >
            <label
              htmlFor="vault-file"
              style={{
                display: "block",
                marginBottom: 7,
                color: "#3c3342",
                fontSize: 13,
                fontWeight: 750,
              }}
            >
              Document
            </label>

            <input
              ref={
                fileInputRef
              }
              id="vault-file"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              disabled={uploading}
              onChange={
                handleFileChange
              }
              style={{
                display: "block",
                width: "100%",
                boxSizing:
                  "border-box",
                padding: 12,
                border:
                  "1px solid rgba(91, 72, 128, 0.20)",
                borderRadius: 12,
                background:
                  "#ffffff",
                color: "#4d4452",
                fontSize: 13,
              }}
            />

            <p
              style={{
                margin:
                  "7px 0 0",
                color: "#817887",
                fontSize: 12,
                lineHeight: 1.45,
              }}
            >
              PDF, JPG, JPEG, or PNG.
              Maximum{" "}
              {
                VAULT_MAX_FILE_SIZE_MB
              }{" "}
              MB.
            </p>

            {selectedFile ? (
              <div
                style={{
                  marginTop: 10,
                  padding:
                    "10px 12px",
                  borderRadius: 11,
                  background:
                    "#f7f5fa",
                  color: "#554c5a",
                  fontSize: 12,
                  lineHeight: 1.45,
                  overflowWrap:
                    "anywhere",
                }}
              >
                Selected:{" "}
                <strong>
                  {
                    selectedFile.name
                  }
                </strong>
              </div>
            ) : null}
          </div>

          <div
            style={{
              marginBottom: 20,
            }}
          >
            <label
              htmlFor="vault-title"
              style={{
                display: "block",
                marginBottom: 7,
                color: "#3c3342",
                fontSize: 13,
                fontWeight: 750,
              }}
            >
              Document title
            </label>

            <input
              id="vault-title"
              type="text"
              value={title}
              maxLength={200}
              disabled={uploading}
              placeholder="Example: 2026 Developmental Evaluation"
              onChange={(event) =>
                setTitle(
                  event.target.value
                )
              }
              style={{
                width: "100%",
                minHeight: 44,
                boxSizing:
                  "border-box",
                padding:
                  "10px 12px",
                border:
                  "1px solid rgba(91, 72, 128, 0.20)",
                borderRadius: 12,
                background:
                  "#ffffff",
                color: "#3d3444",
                fontSize: 14,
                outline: "none",
              }}
            />

            <div
              style={{
                marginTop: 5,
                textAlign:
                  "right",
                color: "#918995",
                fontSize: 11,
              }}
            >
              {title.length}/200
            </div>
          </div>

          <div
            style={{
              marginBottom: 20,
            }}
          >
            <label
              htmlFor="vault-category"
              style={{
                display: "block",
                marginBottom: 7,
                color: "#3c3342",
                fontSize: 13,
                fontWeight: 750,
              }}
            >
              Category
            </label>

            <select
              id="vault-category"
              value={category}
              disabled={uploading}
              onChange={(event) =>
                setCategory(
                  event.target
                    .value as VaultDocumentCategory
                )
              }
              style={{
                width: "100%",
                minHeight: 44,
                boxSizing:
                  "border-box",
                padding:
                  "10px 12px",
                border:
                  "1px solid rgba(91, 72, 128, 0.20)",
                borderRadius: 12,
                background:
                  "#ffffff",
                color: "#3d3444",
                fontSize: 14,
              }}
            >
              {VAULT_DOCUMENT_CATEGORIES.map(
                (
                  categoryOption
                ) => (
                  <option
                    key={
                      categoryOption
                    }
                    value={
                      categoryOption
                    }
                  >
                    {
                      VAULT_DOCUMENT_CATEGORY_LABELS[
                        categoryOption
                      ]
                    }
                  </option>
                )
              )}
            </select>
          </div>

          <div
            style={{
              marginBottom: 20,
            }}
          >
            <label
              htmlFor="vault-notes"
              style={{
                display: "block",
                marginBottom: 7,
                color: "#3c3342",
                fontSize: 13,
                fontWeight: 750,
              }}
            >
              Notes{" "}
              <span
                style={{
                  color: "#8e8692",
                  fontWeight: 500,
                }}
              >
                (optional)
              </span>
            </label>

            <textarea
              id="vault-notes"
              value={notes}
              maxLength={2000}
              rows={4}
              disabled={uploading}
              placeholder="Add a note to help you remember what this document is for."
              onChange={(event) =>
                setNotes(
                  event.target.value
                )
              }
              style={{
                width: "100%",
                boxSizing:
                  "border-box",
                resize: "vertical",
                padding:
                  "11px 12px",
                border:
                  "1px solid rgba(91, 72, 128, 0.20)",
                borderRadius: 12,
                background:
                  "#ffffff",
                color: "#3d3444",
                fontFamily:
                  "inherit",
                fontSize: 14,
                lineHeight: 1.5,
                outline: "none",
              }}
            />

            <div
              style={{
                marginTop: 5,
                textAlign:
                  "right",
                color: "#918995",
                fontSize: 11,
              }}
            >
              {notes.length}/2000
            </div>
          </div>

          <div
            style={{
              marginBottom: 20,
              padding:
                "12px 14px",
              borderRadius: 13,
              background:
                "#f8f7fa",
              border:
                "1px solid rgba(91, 72, 128, 0.08)",
              color: "#6c6470",
              fontSize: 12,
              lineHeight: 1.55,
            }}
          >
            Your document will be
            stored in your private
            Document Vault and associated
            with the selected family
            member.
          </div>

          {error ? (
            <div
              role="alert"
              style={{
                marginBottom: 20,
                padding:
                  "12px 14px",
                borderRadius: 12,
                background:
                  "#fff2f3",
                border:
                  "1px solid rgba(162, 63, 75, 0.18)",
                color: "#913845",
                fontSize: 13,
                lineHeight: 1.5,
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
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              disabled={uploading}
              onClick={
                handleClose
              }
              style={{
                minHeight: 44,
                padding:
                  "10px 17px",
                border:
                  "1px solid rgba(91, 72, 128, 0.18)",
                borderRadius: 12,
                background:
                  "#ffffff",
                color: "#5f5666",
                fontSize: 13,
                fontWeight: 750,
                cursor:
                  uploading
                    ? "not-allowed"
                    : "pointer",
                opacity:
                  uploading
                    ? 0.55
                    : 1,
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={
                uploading ||
                !selectedFile ||
                !userId ||
                !childId
              }
              style={{
                minHeight: 44,
                padding:
                  "10px 18px",
                border: 0,
                borderRadius: 12,
                background:
                  uploading ||
                  !selectedFile ||
                  !userId ||
                  !childId
                    ? "#c8bfd6"
                    : "#654c91",
                color: "#ffffff",
                fontSize: 13,
                fontWeight: 800,
                cursor:
                  uploading ||
                  !selectedFile ||
                  !userId ||
                  !childId
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              {uploading
                ? "Uploading..."
                : "Add Document"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}