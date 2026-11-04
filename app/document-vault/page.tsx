
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import {
  collection,
  getDocs,
} from "firebase/firestore";

import {
  onAuthStateChanged,
  type User,
} from "firebase/auth";

import { auth, db } from "../../lib/firebase";

import { useAccountEntitlements } from "../../lib/useAccountEntitlements";

import {
  deleteVaultDocument,
  getVaultDocumentDownloadUrl,
  getVaultDocuments,
  updateVaultDocumentMetadata,
} from "../../lib/vaultRepository";

import {
  filterVaultDocuments,
  getVaultCategoryCount,
  sortVaultDocumentsNewestFirst,
} from "../../lib/vaultHelpers";

import {
  VAULT_DOCUMENT_CATEGORIES,
  VAULT_DOCUMENT_CATEGORY_LABELS,
  type VaultDocument,
  type VaultDocumentCategory,
} from "../../types/vault";

import VaultDocumentCard from "../../components/vault/VaultDocumentCard";
import VaultUploadModal from "../../components/vault/VaultUploadModal";
import VaultDocumentDetailsModal from "../../components/document-vault/VaultDocumentDetailsModal";

/*
 * AUTIVOYA DOCUMENT VAULT
 *
 * Branding:
 * Navy: #204D6A
 * Dark Navy: #173B52
 * Teal: #58AAA7
 * Gold: #F7AD3F
 *
 * Document functionality and Firebase
 * integration are preserved.
 */

const BRAND = {
  navy: "#204D6A",
  darkNavy: "#173B52",
  teal: "#58AAA7",
  darkTeal: "#317E7B",
  gold: "#F7AD3F",
  background: "#F7FAFB",
  lightTeal: "#EAF6F5",
  text: "#173B52",
  muted: "#647B8B",
  border: "#DCE7EC",
  white: "#FFFFFF",
};

const selectedChildStorageKey =
  "myriad-document-vault-selected-child";
// Keep the existing key so saved selections continue working.

type SavedChild = {
  id: string;
  name: string;
};

type VaultCategoryFilter =
  | "all"
  | VaultDocumentCategory;

function getChildDisplayName(
  data: Record<string, unknown>,
  fallback: string
): string {
  const candidates = [
    data.name,
    data.childName,
    data.firstName,
  ];

  for (const candidate of candidates) {
    if (
      typeof candidate === "string" &&
      candidate.trim()
    ) {
      return candidate.trim();
    }
  }

  return fallback;
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: BRAND.background,
  padding: "38px 20px 70px",
};

const panelStyle: React.CSSProperties = {
  background: BRAND.white,
  border: `1px solid ${BRAND.border}`,
  borderRadius: 18,
};

const primaryButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 44,
  padding: "10px 18px",
  border: "none",
  borderRadius: 12,
  background: BRAND.darkTeal,
  color: BRAND.white,
  fontSize: 13,
  fontWeight: 800,
  textDecoration: "none",
  cursor: "pointer",
};

const secondaryButtonStyle: React.CSSProperties = {
  ...primaryButtonStyle,
  background: BRAND.white,
  color: BRAND.navy,
  border: `1px solid ${BRAND.border}`,
};

const premiumBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: 27,
  padding: "4px 11px",
  borderRadius: 999,
  background: BRAND.lightTeal,
  color: BRAND.darkTeal,
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: "0.04em",
};

export default function DocumentVaultPage() {
  const {
    loading: entitlementLoading,
    error: entitlementError,
    isAuthenticated,
    isFree,
    isPremium,
  } = useAccountEntitlements();

  const [user, setUser] =
    useState<User | null>(null);

  const [authLoading, setAuthLoading] =
    useState(true);

  const [children, setChildren] =
    useState<SavedChild[]>([]);

  const [selectedChildId, setSelectedChildId] =
    useState("");

  const [childrenLoading, setChildrenLoading] =
    useState(false);

  const [documents, setDocuments] =
    useState<VaultDocument[]>([]);

  const [documentsLoading, setDocumentsLoading] =
    useState(false);

  const [documentError, setDocumentError] =
    useState("");

  const [uploadOpen, setUploadOpen] =
    useState(false);

  const [selectedDocument, setSelectedDocument] =
    useState<VaultDocument | null>(null);

  const [searchTerm, setSearchTerm] =
    useState("");

  const [categoryFilter, setCategoryFilter] =
    useState<VaultCategoryFilter>("all");

  /*
   * AUTH LISTENER
   */

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        setUser(currentUser);
        setAuthLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  /*
   * LOAD FAMILY MEMBERS
   */

  useEffect(() => {
    let cancelled = false;

    async function loadChildren() {
      if (authLoading || entitlementLoading) {
        return;
      }

      if (
        !user ||
        !isAuthenticated ||
        !isPremium
      ) {
        setChildren([]);
        setSelectedChildId("");
        return;
      }

      setChildrenLoading(true);
      setDocumentError("");

      try {
        const snapshot = await getDocs(
          collection(
            db,
            "users",
            user.uid,
            "children"
          )
        );

        if (cancelled) return;

        const loadedChildren =
          snapshot.docs.map((childDocument) => {
            const data =
              childDocument.data() as Record<
                string,
                unknown
              >;

            return {
              id: childDocument.id,
              name: getChildDisplayName(
                data,
                "Family member"
              ),
            };
          });

        setChildren(loadedChildren);

        setSelectedChildId((current) => {
          if (
            current &&
            loadedChildren.some(
              (child) => child.id === current
            )
          ) {
            return current;
          }

          if (typeof window !== "undefined") {
            const savedChildId =
              window.localStorage.getItem(
                selectedChildStorageKey
              );

            if (
              savedChildId &&
              loadedChildren.some(
                (child) =>
                  child.id === savedChildId
              )
            ) {
              return savedChildId;
            }
          }

          return loadedChildren[0]?.id ?? "";
        });
      } catch (error) {
        console.error(
          "Unable to load saved children:",
          error
        );

        if (!cancelled) {
          setChildren([]);
          setSelectedChildId("");
          setDocumentError(
            "We couldn't load your saved family members."
          );
        }
      } finally {
        if (!cancelled) {
          setChildrenLoading(false);
        }
      }
    }

    void loadChildren();

    return () => {
      cancelled = true;
    };
  }, [
    user,
    authLoading,
    entitlementLoading,
    isAuthenticated,
    isPremium,
  ]);

  /*
   * REMEMBER SELECTED FAMILY MEMBER
   */

  useEffect(() => {
    if (
      !selectedChildId ||
      typeof window === "undefined"
    ) {
      return;
    }

    window.localStorage.setItem(
      selectedChildStorageKey,
      selectedChildId
    );
  }, [selectedChildId]);

  /*
   * LOAD DOCUMENTS
   */

  const loadDocuments = useCallback(
    async (uid: string, childId: string) => {
      setDocumentsLoading(true);
      setDocumentError("");

      try {
        const loadedDocuments =
          await getVaultDocuments(
            uid,
            childId
          );

        setDocuments(
          sortVaultDocumentsNewestFirst(
            loadedDocuments
          )
        );
      } catch (error) {
        console.error(
          "Unable to load Vault documents:",
          error
        );

        setDocuments([]);

        setDocumentError(
          "We couldn't load the documents in this Vault."
        );
      } finally {
        setDocumentsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (
      !user ||
      !isPremium ||
      !selectedChildId
    ) {
      setDocuments([]);
      return;
    }

    void loadDocuments(
      user.uid,
      selectedChildId
    );
  }, [
    user,
    isPremium,
    selectedChildId,
    loadDocuments,
  ]);

  useEffect(() => {
    setSearchTerm("");
    setCategoryFilter("all");
    setUploadOpen(false);
    setSelectedDocument(null);
  }, [selectedChildId]);

  /*
   * DERIVED DATA
   */

  const selectedChild = useMemo(
    () =>
      children.find(
        (child) =>
          child.id === selectedChildId
      ) ?? null,
    [children, selectedChildId]
  );

  const visibleDocuments = useMemo(() => {
    const filtered = filterVaultDocuments(
      documents,
      searchTerm,
      categoryFilter
    );

    return sortVaultDocumentsNewestFirst(
      filtered
    );
  }, [
    documents,
    searchTerm,
    categoryFilter,
  ]);

  /*
   * DOCUMENT ACTIONS
   */

  async function handleViewDocument(
    document: VaultDocument
  ) {
    if (!isPremium) return;

    setDocumentError("");

    try {
      const url =
        await getVaultDocumentDownloadUrl(
          document
        );

      window.open(
        url,
        "_blank",
        "noopener,noreferrer"
      );
    } catch (error) {
      console.error(
        "Unable to open Vault document:",
        error
      );

      setDocumentError(
        "We couldn't open this document. Please try again."
      );
    }
  }

  function handleDocumentDetails(
    document: VaultDocument
  ) {
    if (!isPremium) return;

    setDocumentError("");
    setSelectedDocument(document);
  }

  async function handleDownloadDocument(
    document: VaultDocument
  ) {
    if (!isPremium) return;

    setDocumentError("");

    try {
      const url =
        await getVaultDocumentDownloadUrl(
          document
        );

      const anchor =
        window.document.createElement("a");

      anchor.href = url;
      anchor.download =
        document.fileName ||
        document.title ||
        "document";

      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";

      window.document.body.appendChild(
        anchor
      );

      anchor.click();
      anchor.remove();
    } catch (error) {
      console.error(
        "Unable to download Vault document:",
        error
      );

      setDocumentError(
        "We couldn't download this document. Please try again."
      );
    }
  }

  async function handleSaveDocumentDetails(
    document: VaultDocument,
    updates: {
      title: string;
      category: VaultDocumentCategory;
      notes: string;
    }
  ) {
    if (!isPremium) return;

    setDocumentError("");

    const updatedDocument =
      await updateVaultDocumentMetadata(
        document,
        updates
      );

    setDocuments((current) =>
      current.map((item) =>
        item.id === updatedDocument.id
          ? updatedDocument
          : item
      )
    );

    setSelectedDocument(updatedDocument);
  }

  async function handleDeleteDocument(
    document: VaultDocument
  ) {
    if (!isPremium) return;

    setDocumentError("");

    try {
      await deleteVaultDocument(document);

      setDocuments((current) =>
        current.filter(
          (item) => item.id !== document.id
        )
      );

      setSelectedDocument((current) =>
        current?.id === document.id
          ? null
          : current
      );
    } catch (error) {
      console.error(
        "Unable to delete Vault document:",
        error
      );

      setDocumentError(
        "We couldn't delete this document. Please try again."
      );

      throw error;
    }
  }

  async function handleUploaded(
    document: VaultDocument
  ) {
    if (!isPremium) return;

    setDocuments((current) =>
      sortVaultDocumentsNewestFirst([
        document,
        ...current.filter(
          (item) => item.id !== document.id
        ),
      ])
    );

    setSearchTerm("");
    setCategoryFilter("all");
  }

  /*
   * INITIAL LOADING
   */

  if (authLoading || entitlementLoading) {
    return (
      <main style={pageStyle}>
        <div
          style={{
            maxWidth: 1120,
            margin: "0 auto",
            color: BRAND.muted,
            fontSize: 14,
          }}
        >
          Loading Autivoya Document Vault...
        </div>
      </main>
    );
  }

  /*
   * GUEST VIEW
   */

  if (!isAuthenticated || !user) {
    return (
      <main style={pageStyle}>
        <section
          style={{
            ...panelStyle,
            maxWidth: 760,
            margin: "0 auto",
            padding: 30,
            boxShadow:
              "0 10px 30px rgba(23,59,82,0.05)",
          }}
        >
          <div style={premiumBadgeStyle}>
            AUTIVOYA DOCUMENT VAULT
          </div>

          <h1
            style={{
              margin: "12px 0 0",
              color: BRAND.darkNavy,
              fontSize: 30,
              lineHeight: 1.2,
            }}
          >
            Keep important documents
            organized in one place.
          </h1>

          <p
            style={{
              margin: "12px 0 0",
              color: BRAND.muted,
              fontSize: 15,
              lineHeight: 1.6,
            }}
          >
            Sign in to access your Autivoya
            Document Vault and your family's
            saved information.
          </p>

          <Link
            href="/login"
            style={{
              ...primaryButtonStyle,
              marginTop: 20,
            }}
          >
            Sign In
          </Link>
        </section>
      </main>
    );
  }

  /*
   * ENTITLEMENT ERROR
   */

  if (entitlementError) {
    return (
      <main style={pageStyle}>
        <section
          style={{
            ...panelStyle,
            maxWidth: 760,
            margin: "0 auto",
            padding: 30,
          }}
        >
          <h1
            style={{
              margin: 0,
              color: BRAND.darkNavy,
              fontSize: 28,
            }}
          >
            Document Vault
          </h1>

          <div
            role="alert"
            style={{
              marginTop: 16,
              padding: "13px 15px",
              borderRadius: 12,
              background: "#FFF2F3",
              color: "#913845",
              fontSize: 13,
              lineHeight: 1.55,
            }}
          >
            {entitlementError}
          </div>

          <p
            style={{
              margin: "14px 0 0",
              color: BRAND.muted,
              fontSize: 14,
              lineHeight: 1.6,
            }}
          >
            Please refresh the page and try
            again before accessing your Vault.
          </p>
        </section>
      </main>
    );
  }

  /*
   * FREE ACCOUNT
   */

  if (isFree || !isPremium) {
    return (
      <main style={pageStyle}>
        <section
          style={{
            ...panelStyle,
            maxWidth: 820,
            margin: "0 auto",
            padding: 32,
            boxShadow:
              "0 12px 34px rgba(23,59,82,0.05)",
          }}
        >
          <div style={premiumBadgeStyle}>
            AUTIVOYA PREMIUM FEATURE
          </div>

          <h1
            style={{
              margin: "12px 0 0",
              color: BRAND.darkNavy,
              fontSize:
                "clamp(28px,4vw,38px)",
              lineHeight: 1.15,
              fontWeight: 850,
            }}
          >
            Document Vault
          </h1>

          <p
            style={{
              maxWidth: 620,
              margin: "13px 0 0",
              color: BRAND.muted,
              fontSize: 15,
              lineHeight: 1.65,
            }}
          >
            Keep evaluations, school
            documents, therapy records,
            insurance information, and
            other important family documents
            organized in one private place.
          </p>

          <div
            style={{
              marginTop: 22,
              padding: 18,
              borderRadius: 16,
              background: BRAND.lightTeal,
              border:
                "1px solid #D1EAE8",
            }}
          >
            <div
              style={{
                color: BRAND.darkNavy,
                fontSize: 14,
                fontWeight: 800,
              }}
            >
              Included with Autivoya Premium
            </div>

            <p
              style={{
                margin: "7px 0 0",
                color: BRAND.muted,
                fontSize: 13,
                lineHeight: 1.6,
              }}
            >
              Premium access is required to
              upload, view, organize, and
              remove documents from
              Document Vault.
            </p>
          </div>

          <Link
            href="/pricing"
            style={{
              ...primaryButtonStyle,
              marginTop: 22,
            }}
          >
            View Premium
          </Link>
        </section>
      </main>
    );
  }

  /*
   * PREMIUM DOCUMENT VAULT
   */

  return (
    <main style={pageStyle}>
      <div
        style={{
          width: "100%",
          maxWidth: 1120,
          margin: "0 auto",
        }}
      >
        {/* PAGE HEADER */}

        <section
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 24,
            flexWrap: "wrap",
            marginBottom: 28,
          }}
        >
          <div style={{ maxWidth: 680 }}>
            <div style={premiumBadgeStyle}>
              AUTIVOYA PREMIUM SUPPORT TOOL
            </div>

            <h1
              style={{
                margin: "12px 0 0",
                color: BRAND.darkNavy,
                fontSize:
                  "clamp(30px,4vw,42px)",
                lineHeight: 1.1,
                fontWeight: 850,
              }}
            >
              Document Vault
            </h1>

            <p
              style={{
                margin: "12px 0 0",
                color: BRAND.muted,
                fontSize: 15,
                lineHeight: 1.65,
              }}
            >
              Keep important family documents
              organized in one private place.
            </p>
          </div>

          <button
            type="button"
            disabled={
              !selectedChildId ||
              childrenLoading
            }
            onClick={() =>
              setUploadOpen(true)
            }
            style={{
              ...primaryButtonStyle,
              minHeight: 46,
              padding: "11px 18px",
              fontSize: 14,
              background:
                !selectedChildId ||
                childrenLoading
                  ? "#B9D3D2"
                  : BRAND.darkTeal,
              cursor:
                !selectedChildId ||
                childrenLoading
                  ? "not-allowed"
                  : "pointer",
              boxShadow: selectedChildId
                ? "0 8px 18px rgba(49,126,123,0.18)"
                : "none",
            }}
          >
            + Add Document
          </button>
        </section>

        {/* FAMILY MEMBER SELECTOR */}

        <section
          style={{
            ...panelStyle,
            marginBottom: 22,
            padding: 20,
          }}
        >
          <label
            htmlFor="vault-child"
            style={{
              display: "block",
              marginBottom: 7,
              color: BRAND.darkNavy,
              fontSize: 13,
              fontWeight: 750,
            }}
          >
            Family member
          </label>

          {childrenLoading ? (
            <div
              style={{
                color: BRAND.muted,
                fontSize: 14,
              }}
            >
              Loading family members...
            </div>
          ) : children.length > 0 ? (
            <select
              id="vault-child"
              value={selectedChildId}
              onChange={(event) =>
                setSelectedChildId(
                  event.target.value
                )
              }
              style={{
                width: "100%",
                maxWidth: 420,
                minHeight: 44,
                boxSizing: "border-box",
                padding: "10px 12px",
                border:
                  `1px solid ${BRAND.border}`,
                borderRadius: 12,
                background: BRAND.white,
                color: BRAND.darkNavy,
                fontSize: 14,
              }}
            >
              {children.map((child) => (
                <option
                  key={child.id}
                  value={child.id}
                >
                  {child.name}
                </option>
              ))}
            </select>
          ) : (
            <div>
              <div
                style={{
                  color: BRAND.darkNavy,
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                No saved family members found.
              </div>

              <p
                style={{
                  margin: "6px 0 0",
                  color: BRAND.muted,
                  fontSize: 13,
                  lineHeight: 1.5,
                }}
              >
                Add a child to your family
                profile before storing
                documents in the Vault.
              </p>
            </div>
          )}
        </section>

        {selectedChild ? (
          <>
            {/* VAULT SUMMARY */}

            <section
              style={{
                marginBottom: 22,
                padding: "18px 20px",
                borderRadius: 18,
                background: BRAND.lightTeal,
                border:
                  "1px solid #D1EAE8",
                borderLeft:
                  `4px solid ${BRAND.teal}`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  alignItems: "center",
                  gap: 16,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div
                    style={{
                      color: BRAND.darkTeal,
                      fontSize: 11,
                      fontWeight: 800,
                      textTransform:
                        "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    Viewing Vault
                  </div>

                  <div
                    style={{
                      marginTop: 3,
                      color: BRAND.darkNavy,
                      fontSize: 18,
                      fontWeight: 800,
                    }}
                  >
                    {selectedChild.name}
                  </div>
                </div>

                <div
                  style={{
                    color: BRAND.darkTeal,
                    fontSize: 13,
                    fontWeight: 800,
                  }}
                >
                  {documents.length}{" "}
                  {documents.length === 1
                    ? "document"
                    : "documents"}
                </div>
              </div>
            </section>

            {/* DOCUMENT SEARCH */}

            <section
              style={{
                marginBottom: 18,
              }}
            >
              <input
                type="search"
                aria-label="Search documents"
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(
                    event.target.value
                  )
                }
                style={{
                  width: "100%",
                  minHeight: 46,
                  boxSizing: "border-box",
                  padding: "11px 14px",
                  border:
                    `1px solid ${BRAND.border}`,
                  borderRadius: 13,
                  background: BRAND.white,
                  color: BRAND.darkNavy,
                  fontSize: 14,
                  outlineColor: BRAND.teal,
                }}
              />
            </section>

            {/* DOCUMENT CATEGORY FILTERS */}

            <section
              aria-label="Document categories"
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                marginBottom: 24,
              }}
            >
              <button
                type="button"
                onClick={() =>
                  setCategoryFilter("all")
                }
                style={{
                  minHeight: 36,
                  padding: "7px 12px",
                  border:
                    categoryFilter === "all"
                      ? `1px solid ${BRAND.darkTeal}`
                      : `1px solid ${BRAND.border}`,
                  borderRadius: 999,
                  background:
                    categoryFilter === "all"
                      ? BRAND.darkTeal
                      : BRAND.white,
                  color:
                    categoryFilter === "all"
                      ? BRAND.white
                      : BRAND.navy,
                  fontSize: 12,
                  fontWeight: 750,
                  cursor: "pointer",
                }}
              >
                All ({documents.length})
              </button>

              {VAULT_DOCUMENT_CATEGORIES.map(
                (category) => {
                  const count =
                    getVaultCategoryCount(
                      documents,
                      category
                    );

                  const active =
                    categoryFilter === category;

                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() =>
                        setCategoryFilter(
                          category
                        )
                      }
                      style={{
                        minHeight: 36,
                        padding: "7px 12px",
                        border: active
                          ? `1px solid ${BRAND.darkTeal}`
                          : `1px solid ${BRAND.border}`,
                        borderRadius: 999,
                        background: active
                          ? BRAND.darkTeal
                          : BRAND.white,
                        color: active
                          ? BRAND.white
                          : BRAND.navy,
                        fontSize: 12,
                        fontWeight: 750,
                        cursor: "pointer",
                      }}
                    >
                      {
                        VAULT_DOCUMENT_CATEGORY_LABELS[
                          category
                        ]
                      }{" "}
                      ({count})
                    </button>
                  );
                }
              )}
            </section>

            {/* ERROR MESSAGE */}

            {documentError ? (
              <div
                role="alert"
                style={{
                  marginBottom: 20,
                  padding: "12px 14px",
                  borderRadius: 12,
                  background: "#FFF2F3",
                  border:
                    "1px solid rgba(162,63,75,0.18)",
                  color: "#913845",
                  fontSize: 13,
                  lineHeight: 1.5,
                }}
              >
                {documentError}
              </div>
            ) : null}

            {/* DOCUMENT CONTENT */}

            {documentsLoading ? (
              <section
                style={{
                  ...panelStyle,
                  padding: "42px 20px",
                  textAlign: "center",
                  color: BRAND.muted,
                  fontSize: 14,
                }}
              >
                Loading documents...
              </section>
            ) : documents.length === 0 ? (
              <section
                style={{
                  padding: "46px 24px",
                  textAlign: "center",
                  border:
                    `1px dashed ${BRAND.teal}`,
                  borderRadius: 20,
                  background: BRAND.white,
                }}
              >
                <div
                  aria-hidden="true"
                  style={{
                    width: 58,
                    height: 58,
                    margin: "0 auto 16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 18,
                    background: BRAND.lightTeal,
                    color: BRAND.darkTeal,
                    fontSize: 25,
                  }}
                >
                  📄
                </div>

                <h2
                  style={{
                    margin: 0,
                    color: BRAND.darkNavy,
                    fontSize: 19,
                  }}
                >
                  No documents yet
                </h2>

                <p
                  style={{
                    maxWidth: 460,
                    margin: "8px auto 0",
                    color: BRAND.muted,
                    fontSize: 13,
                    lineHeight: 1.55,
                  }}
                >
                  Add evaluations, school
                  documents, therapy records,
                  insurance information, or
                  other important documents
                  for {selectedChild.name}.
                </p>

                <button
                  type="button"
                  onClick={() =>
                    setUploadOpen(true)
                  }
                  style={{
                    ...primaryButtonStyle,
                    marginTop: 18,
                    minHeight: 42,
                  }}
                >
                  Add First Document
                </button>
              </section>
            ) : visibleDocuments.length === 0 ? (
              <section
                style={{
                  ...panelStyle,
                  padding: "42px 20px",
                  textAlign: "center",
                }}
              >
                <h2
                  style={{
                    margin: 0,
                    color: BRAND.darkNavy,
                    fontSize: 18,
                  }}
                >
                  No matching documents
                </h2>

                <p
                  style={{
                    margin: "8px 0 0",
                    color: BRAND.muted,
                    fontSize: 13,
                  }}
                >
                  Try another search or
                  category.
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    setCategoryFilter("all");
                  }}
                  style={{
                    ...secondaryButtonStyle,
                    marginTop: 16,
                    minHeight: 40,
                  }}
                >
                  Clear filters
                </button>
              </section>
            ) : (
              <section
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit,minmax(280px,1fr))",
                  gap: 16,
                }}
              >
                {visibleDocuments.map(
                  (document) => (
                    <VaultDocumentCard
                      key={document.id}
                      document={document}
                      onDetails={
                        handleDocumentDetails
                      }
                      onView={
                        handleViewDocument
                      }
                      onDelete={
                        handleDeleteDocument
                      }
                    />
                  )
                )}
              </section>
            )}
          </>
        ) : null}
      </div>

      {/* UPLOAD MODAL */}

      {selectedChild ? (
        <VaultUploadModal
          open={uploadOpen}
          userId={user.uid}
          childId={selectedChild.id}
          childName={selectedChild.name}
          onClose={() =>
            setUploadOpen(false)
          }
          onUploaded={handleUploaded}
        />
      ) : null}

      {/* DOCUMENT DETAILS MODAL */}

      <VaultDocumentDetailsModal
        document={selectedDocument}
        isOpen={Boolean(selectedDocument)}
        onClose={() =>
          setSelectedDocument(null)
        }
        onView={handleViewDocument}
        onDownload={handleDownloadDocument}
        onSave={
          handleSaveDocumentDetails
        }
        onDelete={
          handleDeleteDocument
        }
      />
    </main>
  );
}
