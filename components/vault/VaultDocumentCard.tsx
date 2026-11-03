
"use client";

import { useState } from "react";

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

/* ============================================================
   AUTIVOYA BRAND COLORS
============================================================ */

const BRAND = {
  navy: "#204D6A",
  darkNavy: "#173B52",
  teal: "#58AAA7",
  darkTeal: "#317E7B",
  lightTeal: "#EAF6F5",
  border: "#DCE7EC",
  muted: "#647B8B",
  white: "#FFFFFF",
};

/* ============================================================
   PROPS
============================================================ */

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

/* ============================================================
   DOCUMENT CARD
============================================================ */

export default function VaultDocumentCard({
  document,
  onDetails,
  onView,
  onDelete,
  disabled = false,
}: VaultDocumentCardProps) {
  const [menuOpen, setMenuOpen] =
    useState(false);

  const [deleting, setDeleting] =
    useState(false);

  const [viewing, setViewing] =
    useState(false);

  /* ==========================================================
     DOCUMENT INFORMATION
  ========================================================== */

  const displayTitle =
    getVaultDocumentDisplayTitle(document);

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
    getVaultFileTypeLabel(document);

  /* ==========================================================
     DOCUMENT DETAILS
  ========================================================== */

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

  /* ==========================================================
     VIEW DOCUMENT
  ========================================================== */

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

  /* ==========================================================
     DELETE DOCUMENT
  ========================================================== */

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

  /* ==========================================================
     DOCUMENT CARD UI
  ========================================================== */

  return (
    <article
      style={{
        position: "relative",
        border: `1px solid ${BRAND.border}`,
        borderRadius: 18,
        background: BRAND.white,
        padding: 18,
        boxShadow:
          "0 8px 24px rgba(23, 59, 82, 0.06)",
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
        {/* DOCUMENT INFORMATION */}

        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 14,
            minWidth: 0,
            flex: 1,
          }}
        >
          {/* FILE TYPE ICON */}

          <div
            aria-hidden="true"
            style={{
              width: 46,
              height: 46,
              borderRadius: 14,
              background:
                BRAND.lightTeal,
              display: "flex",
              alignItems: "center",
              justifyContent:
                "center",
              flexShrink: 0,
              fontSize: 13,
              fontWeight: 800,
              color:
                BRAND.darkTeal,
            }}
          >
            {fileType}
          </div>

          {/* DOCUMENT TITLE AND DETAILS */}

          <div
            style={{
              minWidth: 0,
              flex: 1,
            }}
          >
            <h3
              style={{
                margin: 0,
                color:
                  BRAND.darkNavy,
                fontSize: 16,
                lineHeight: 1.35,
                fontWeight: 750,
                overflowWrap:
                  "anywhere",
              }}
            >
              {displayTitle}
            </h3>

            {/* CATEGORY AND FILE SIZE */}

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
                    BRAND.lightTeal,
                  color:
                    BRAND.darkTeal,
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {categoryLabel}
              </span>

              <span
                style={{
                  color:
                    BRAND.muted,
                  fontSize: 12,
                }}
              >
                {fileSize}
              </span>
            </div>

            {/* UPLOAD DATE */}

            <p
              style={{
                margin:
                  "8px 0 0",
                color:
                  BRAND.muted,
                fontSize: 12,
                lineHeight: 1.45,
              }}
            >
              Uploaded {uploadDate}
            </p>

            {/* DOCUMENT NOTES */}

            {document.notes ? (
              <p
                style={{
                  margin:
                    "10px 0 0",
                  color:
                    BRAND.navy,
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

        {/* ====================================================
            THREE-DOT ACTION MENU
        ==================================================== */}

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
            aria-expanded={menuOpen}
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
                `1px solid ${BRAND.border}`,
              borderRadius: 12,
              background:
                BRAND.white,
              color:
                BRAND.navy,
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

          {/* DROPDOWN MENU */}

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
                  `1px solid ${BRAND.border}`,
                borderRadius: 12,
                background:
                  BRAND.white,
                boxShadow:
                  "0 12px 30px rgba(23, 59, 82, 0.14)",
              }}
            >
              {/* DOCUMENT DETAILS */}

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
                  width: "100%",
                  border: 0,
                  borderRadius: 8,
                  background:
                    "transparent",
                  padding:
                    "9px 10px",
                  textAlign:
                    "left",
                  color:
                    BRAND.darkNavy,
                  fontSize: 13,
                  fontWeight: 650,
                  cursor:
                    "pointer",
                }}
              >
                Document details
              </button>

              {/* VIEW DOCUMENT */}

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
                  width: "100%",
                  border: 0,
                  borderRadius: 8,
                  background:
                    "transparent",
                  padding:
                    "9px 10px",
                  textAlign:
                    "left",
                  color:
                    BRAND.darkNavy,
                  fontSize: 13,
                  fontWeight: 650,
                  cursor:
                    "pointer",
                }}
              >
                {viewing
                  ? "Opening..."
                  : "View document"}
              </button>

              {/* DELETE DOCUMENT */}

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
                  width: "100%",
                  border: 0,
                  borderRadius: 8,
                  background:
                    "transparent",
                  padding:
                    "9px 10px",
                  textAlign:
                    "left",
                  color:
                    "#A23F4B",
                  fontSize: 13,
                  fontWeight: 650,
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

      {/* ======================================================
          VIEW DOCUMENT BUTTON
      ====================================================== */}

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
            `1px solid ${BRAND.teal}`,
          borderRadius: 12,
          background:
            BRAND.lightTeal,
          color:
            BRAND.darkTeal,
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
