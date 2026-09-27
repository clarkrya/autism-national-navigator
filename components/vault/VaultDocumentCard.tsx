"use client";

import {
  useState,
} from "react";

import type {
  VaultDocument,
} from "../../types/vault";

import {
  formatVaultFileSize,
  formatVaultUploadDate,
  getVaultCategoryLabel,
  getVaultDocumentDisplayTitle,
  getVaultFileTypeLabel,
} from "../../lib/vaultHelpers";

type VaultDocumentCardProps = {
  document: VaultDocument;

  onDetails: (
    document: VaultDocument
  ) => void;

  onView: (
    document: VaultDocument
  ) => Promise<void> | void;

  onDelete: (
    document: VaultDocument
  ) => Promise<void> | void;

  disabled?: boolean;
};

export default function VaultDocumentCard({
  document,
  onDetails,
  onView,
  onDelete,
  disabled = false,
}: VaultDocumentCardProps) {
  const [
    menuOpen,
    setMenuOpen,
  ] = useState(false);

  const [
    deleting,
    setDeleting,
  ] = useState(false);

  const [
    viewing,
    setViewing,
  ] = useState(false);

  const displayTitle =
    getVaultDocumentDisplayTitle(
      document
    );

  const categoryLabel =
    getVaultCategoryLabel(
      document.category
    );

  const fileSize =
    formatVaultFileSize(
      document.size
    );

  const uploadDate =
    formatVaultUploadDate(
      document.uploadedAt
    );

  const fileType =
    getVaultFileTypeLabel(
      document
    );

  function handleDetails() {
    if (
      disabled ||
      deleting ||
      viewing
    ) {
      return;
    }

    setMenuOpen(false);
    onDetails(document);
  }

  async function handleView() {
    if (
      disabled ||
      viewing ||
      deleting
    ) {
      return;
    }

    setViewing(true);
    setMenuOpen(false);

    try {
      await onView(document);
    } finally {
      setViewing(false);
    }
  }

  async function handleDelete() {
    if (
      disabled ||
      deleting ||
      viewing
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        `Delete "${displayTitle}"?\n\nThis will permanently remove the document from your Vault.`
      );

    if (!confirmed) {
      setMenuOpen(false);
      return;
    }

    setDeleting(true);
    setMenuOpen(false);

    try {
      await onDelete(document);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <article
      style={{
        position: "relative",
        border:
          "1px solid rgba(91, 72, 128, 0.16)",
        borderRadius: 18,
        background: "#ffffff",
        padding: 18,
        boxShadow:
          "0 8px 24px rgba(46, 35, 67, 0.06)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent:
            "space-between",
          gap: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 14,
            minWidth: 0,
            flex: 1,
          }}
        >
          <div
            aria-hidden="true"
            style={{
              width: 46,
              height: 46,
              borderRadius: 14,
              background:
                "rgba(108, 82, 160, 0.10)",
              display: "flex",
              alignItems: "center",
              justifyContent:
                "center",
              flexShrink: 0,
              fontSize: 13,
              fontWeight: 800,
              color: "#654c91",
            }}
          >
            {fileType}
          </div>

          <div
            style={{
              minWidth: 0,
              flex: 1,
            }}
          >
            <h3
              style={{
                margin: 0,
                color: "#2f2638",
                fontSize: 16,
                lineHeight: 1.35,
                fontWeight: 750,
                overflowWrap:
                  "anywhere",
              }}
            >
              {displayTitle}
            </h3>

            <div
              style={{
                marginTop: 7,
                display: "flex",
                flexWrap: "wrap",
                gap: 7,
                alignItems: "center",
              }}
            >
              <span
                style={{
                  display:
                    "inline-flex",
                  alignItems:
                    "center",
                  minHeight: 26,
                  padding:
                    "3px 9px",
                  borderRadius: 999,
                  background:
                    "rgba(108, 82, 160, 0.09)",
                  color: "#654c91",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {categoryLabel}
              </span>

              <span
                style={{
                  color: "#756d7c",
                  fontSize: 12,
                }}
              >
                {fileSize}
              </span>
            </div>

            <p
              style={{
                margin:
                  "8px 0 0",
                color: "#817887",
                fontSize: 12,
                lineHeight: 1.45,
              }}
            >
              Uploaded {uploadDate}
            </p>

            {document.notes ? (
              <p
                style={{
                  margin:
                    "10px 0 0",
                  color: "#655d69",
                  fontSize: 13,
                  lineHeight: 1.5,
                  overflowWrap:
                    "anywhere",
                }}
              >
                {document.notes}
              </p>
            ) : null}
          </div>
        </div>

        <div
          style={{
            position:
              "relative",
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            aria-label={`More options for ${displayTitle}`}
            aria-expanded={
              menuOpen
            }
            disabled={
              disabled ||
              deleting ||
              viewing
            }
            onClick={() =>
              setMenuOpen(
                (current) =>
                  !current
              )
            }
            style={{
              width: 38,
              height: 38,
              border:
                "1px solid rgba(91, 72, 128, 0.14)",
              borderRadius: 12,
              background:
                "#ffffff",
              color: "#5f5666",
              fontSize: 21,
              lineHeight: 1,
              cursor:
                disabled ||
                deleting ||
                viewing
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            ⋯
          </button>

          {menuOpen ? (
            <div
              style={{
                position:
                  "absolute",
                right: 0,
                top: 44,
                zIndex: 20,
                width: 170,
                padding: 6,
                border:
                  "1px solid rgba(91, 72, 128, 0.14)",
                borderRadius: 12,
                background:
                  "#ffffff",
                boxShadow:
                  "0 12px 30px rgba(46, 35, 67, 0.14)",
              }}
            >
              <button
                type="button"
                onClick={
                  handleDetails
                }
                disabled={
                  viewing ||
                  deleting
                }
                style={{
                  width:
                    "100%",
                  border: 0,
                  borderRadius:
                    8,
                  background:
                    "transparent",
                  padding:
                    "9px 10px",
                  textAlign:
                    "left",
                  color:
                    "#3d3444",
                  fontSize:
                    13,
                  fontWeight:
                    650,
                  cursor:
                    "pointer",
                }}
              >
                Document details
              </button>

              <button
                type="button"
                onClick={
                  handleView
                }
                disabled={
                  viewing ||
                  deleting
                }
                style={{
                  width:
                    "100%",
                  border: 0,
                  borderRadius:
                    8,
                  background:
                    "transparent",
                  padding:
                    "9px 10px",
                  textAlign:
                    "left",
                  color:
                    "#3d3444",
                  fontSize:
                    13,
                  fontWeight:
                    650,
                  cursor:
                    "pointer",
                }}
              >
                {viewing
                  ? "Opening..."
                  : "View document"}
              </button>

              <button
                type="button"
                onClick={
                  handleDelete
                }
                disabled={
                  deleting ||
                  viewing
                }
                style={{
                  width:
                    "100%",
                  border: 0,
                  borderRadius:
                    8,
                  background:
                    "transparent",
                  padding:
                    "9px 10px",
                  textAlign:
                    "left",
                  color:
                    "#a23f4b",
                  fontSize:
                    13,
                  fontWeight:
                    650,
                  cursor:
                    "pointer",
                }}
              >
                {deleting
                  ? "Deleting..."
                  : "Delete"}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <button
        type="button"
        onClick={handleView}
        disabled={
          disabled ||
          viewing ||
          deleting
        }
        style={{
          marginTop: 16,
          width: "100%",
          minHeight: 42,
          border:
            "1px solid rgba(101, 76, 145, 0.22)",
          borderRadius: 12,
          background:
            "rgba(108, 82, 160, 0.06)",
          color: "#654c91",
          fontSize: 13,
          fontWeight: 750,
          cursor:
            disabled ||
            viewing ||
            deleting
              ? "not-allowed"
              : "pointer",
        }}
      >
        {viewing
          ? "Opening..."
          : "View Document"}
      </button>
    </article>
  );
}