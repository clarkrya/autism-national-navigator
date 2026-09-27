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

import {
  auth,
  db,
} from "../../lib/firebase";

import {
  useAccountEntitlements,
} from "../../lib/useAccountEntitlements";

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
 * ============================================================
 * DOCUMENT VAULT PAGE
 * ============================================================
 *
 * Premium family document organization.
 *
 * Files:
 * Firebase Storage
 *
 * Metadata:
 * users/{uid}/children/{childId}/vaultDocuments/{documentId}
 *
 * IMPORTANT:
 *
 * UI entitlement checks improve the product experience.
 *
 * Firebase Storage Rules and Firestore Rules remain the
 * actual security boundary for protected Vault data.
 *
 * ============================================================
 */

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

const VAULT_SELECTED_CHILD_STORAGE_KEY =
  "myriad-document-vault-selected-child";

export default function DocumentVaultPage() {
  /*
   * ==========================================================
   * ACCOUNT ENTITLEMENTS
   * ==========================================================
   */

  const {
    loading: entitlementLoading,
    error: entitlementError,
    isAuthenticated,
    isFree,
    isPremium,
  } = useAccountEntitlements();

  /*
   * ==========================================================
   * AUTH USER
   * ==========================================================
   */

  const [
    user,
    setUser,
  ] = useState<User | null>(
    null
  );

  const [
    authLoading,
    setAuthLoading,
  ] = useState(true);

  /*
   * ==========================================================
   * CHILDREN
   * ==========================================================
   */

  const [
    children,
    setChildren,
  ] = useState<SavedChild[]>(
    []
  );

  const [
    selectedChildId,
    setSelectedChildId,
  ] = useState("");

  const [
    childrenLoading,
    setChildrenLoading,
  ] = useState(false);

  /*
   * ==========================================================
   * DOCUMENTS
   * ==========================================================
   */

  const [
    documents,
    setDocuments,
  ] = useState<VaultDocument[]>(
    []
  );

  const [
    documentsLoading,
    setDocumentsLoading,
  ] = useState(false);

  const [
    documentError,
    setDocumentError,
  ] = useState("");

  /*
   * ==========================================================
   * UI
   * ==========================================================
   */

  const [
    uploadOpen,
    setUploadOpen,
  ] = useState(false);

  const [
    selectedDocument,
    setSelectedDocument,
  ] =
    useState<VaultDocument | null>(
      null
    );

  const [
    searchTerm,
    setSearchTerm,
  ] = useState("");

  const [
    categoryFilter,
    setCategoryFilter,
  ] =
    useState<VaultCategoryFilter>(
      "all"
    );

  /*
   * ==========================================================
   * AUTH LISTENER
   * ==========================================================
   */

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
        auth,
        (currentUser) => {
          setUser(currentUser);
          setAuthLoading(false);
        }
      );

    return unsubscribe;
  }, []);

  /*
   * ==========================================================
   * LOAD CHILDREN
   * ==========================================================
   */

  useEffect(() => {
    let cancelled = false;

    async function loadChildren() {
      if (
        authLoading ||
        entitlementLoading
      ) {
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
        const snapshot =
          await getDocs(
            collection(
              db,
              "users",
              user.uid,
              "children"
            )
          );

        if (cancelled) {
          return;
        }

        const loadedChildren =
          snapshot.docs.map(
            (childDocument) => {
              const data =
                childDocument.data() as Record<
                  string,
                  unknown
                >;

              return {
                id: childDocument.id,
                name:
                  getChildDisplayName(
                    data,
                    "Family member"
                  ),
              };
            }
          );

        setChildren(
          loadedChildren
        );

        setSelectedChildId(
          (current) => {
            /*
             * Keep the current child if
             * it is still valid.
             */
            if (
              current &&
              loadedChildren.some(
                (child) =>
                  child.id ===
                  current
              )
            ) {
              return current;
            }

            /*
             * Restore the last child
             * selected in Document Vault.
             */
            if (
              typeof window !==
              "undefined"
            ) {
              const savedChildId =
                window.localStorage.getItem(
                  VAULT_SELECTED_CHILD_STORAGE_KEY
                );

              if (
                savedChildId &&
                loadedChildren.some(
                  (child) =>
                    child.id ===
                    savedChildId
                )
              ) {
                return savedChildId;
              }
            }

            /*
             * Fall back to the first
             * available child.
             */
            return (
              loadedChildren[0]
                ?.id ?? ""
            );
          }
        );
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
          setChildrenLoading(
            false
          );
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
   * ==========================================================
   * REMEMBER SELECTED CHILD
   * ==========================================================
   */

  useEffect(() => {
    if (
      !selectedChildId ||
      typeof window === "undefined"
    ) {
      return;
    }

    window.localStorage.setItem(
      VAULT_SELECTED_CHILD_STORAGE_KEY,
      selectedChildId
    );
  }, [selectedChildId]);

  /*
   * ==========================================================
   * LOAD VAULT DOCUMENTS
   * ==========================================================
   */

  const loadDocuments =
    useCallback(
      async (
        uid: string,
        childId: string
      ) => {
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
          setDocumentsLoading(
            false
          );
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

  /*
   * Reset local Vault UI state whenever
   * the family switches children.
   */

  useEffect(() => {
    setSearchTerm("");
    setCategoryFilter("all");
    setUploadOpen(false);
    setSelectedDocument(null);
  }, [selectedChildId]);

  /*
   * ==========================================================
   * DERIVED STATE
   * ==========================================================
   */

  const selectedChild =
    useMemo(
      () =>
        children.find(
          (child) =>
            child.id ===
            selectedChildId
        ) ?? null,
      [
        children,
        selectedChildId,
      ]
    );

  const visibleDocuments =
    useMemo(() => {
      const filtered =
        filterVaultDocuments(
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
   * ==========================================================
   * DOCUMENT ACTIONS
   * ==========================================================
   */

  async function handleViewDocument(
    document: VaultDocument
  ) {
    if (!isPremium) {
      return;
    }

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
    if (!isPremium) {
      return;
    }

    setDocumentError("");
    setSelectedDocument(document);
  }

  async function handleDownloadDocument(
    document: VaultDocument
  ) {
    if (!isPremium) {
      return;
    }

    setDocumentError("");

    try {
      const url =
        await getVaultDocumentDownloadUrl(
          document
        );

      const anchor =
        window.document.createElement(
          "a"
        );

      anchor.href = url;

      anchor.download =
        document.fileName ||
        document.title ||
        "document";

      anchor.target = "_blank";
      anchor.rel =
        "noopener noreferrer";

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
    if (!isPremium) {
      return;
    }

    setDocumentError("");

    const updatedDocument =
      await updateVaultDocumentMetadata(
        document,
        updates
      );

    setDocuments((current) =>
      current.map((item) =>
        item.id ===
        updatedDocument.id
          ? updatedDocument
          : item
      )
    );

    setSelectedDocument(
      updatedDocument
    );
  }

  async function handleDeleteDocument(
    document: VaultDocument
  ) {
    if (!isPremium) {
      return;
    }

    setDocumentError("");

    try {
      await deleteVaultDocument(
        document
      );

      setDocuments(
        (current) =>
          current.filter(
            (item) =>
              item.id !==
              document.id
          )
      );

      setSelectedDocument(
        (current) =>
          current?.id ===
          document.id
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
    if (!isPremium) {
      return;
    }

    setDocuments(
      (current) =>
        sortVaultDocumentsNewestFirst(
          [
            document,
            ...current.filter(
              (item) =>
                item.id !==
                document.id
            ),
          ]
        )
    );

    setSearchTerm("");
    setCategoryFilter("all");
  }

  /*
   * ==========================================================
   * INITIAL LOADING
   * ==========================================================
   */

  if (
    authLoading ||
    entitlementLoading
  ) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#fbfafc",
          padding: "48px 20px",
        }}
      >
        <div
          style={{
            maxWidth: 1120,
            margin: "0 auto",
            color: "#756d7c",
            fontSize: 14,
          }}
        >
          Loading Document Vault...
        </div>
      </main>
    );
  }

  /*
   * ==========================================================
   * GUEST
   * ==========================================================
   */

  if (
    !isAuthenticated ||
    !user
  ) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#fbfafc",
          padding: "48px 20px",
        }}
      >
        <section
          style={{
            maxWidth: 760,
            margin: "0 auto",
            padding: 30,
            border:
              "1px solid rgba(91, 72, 128, 0.12)",
            borderRadius: 22,
            background: "#ffffff",
            boxShadow:
              "0 10px 30px rgba(46, 35, 67, 0.05)",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              minHeight: 27,
              padding: "3px 10px",
              marginBottom: 12,
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

          <h1
            style={{
              margin: 0,
              color: "#2f2638",
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
              color: "#716877",
              fontSize: 15,
              lineHeight: 1.6,
            }}
          >
            Sign in to access Document
            Vault and your family's saved
            information.
          </p>

          <Link
            href="/login"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 44,
              marginTop: 20,
              padding: "10px 18px",
              borderRadius: 12,
              background: "#654c91",
              color: "#ffffff",
              fontSize: 13,
              fontWeight: 800,
              textDecoration: "none",
            }}
          >
            Sign In
          </Link>
        </section>
      </main>
    );
  }

  /*
   * ==========================================================
   * ENTITLEMENT ERROR
   * ==========================================================
   */

  if (entitlementError) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#fbfafc",
          padding: "48px 20px",
        }}
      >
        <section
          style={{
            maxWidth: 760,
            margin: "0 auto",
            padding: 30,
            border:
              "1px solid rgba(162, 63, 75, 0.16)",
            borderRadius: 22,
            background: "#ffffff",
          }}
        >
          <h1
            style={{
              margin: 0,
              color: "#2f2638",
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
              background: "#fff2f3",
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
              color: "#716877",
              fontSize: 14,
              lineHeight: 1.6,
            }}
          >
            Please refresh the page and try
            again before accessing your
            Vault.
          </p>
        </section>
      </main>
    );
  }

  /*
   * ==========================================================
   * FREE ACCOUNT
   * ==========================================================
   */

  if (
    isFree ||
    !isPremium
  ) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#fbfafc",
          padding: "48px 20px",
        }}
      >
        <section
          style={{
            maxWidth: 820,
            margin: "0 auto",
            padding: 32,
            border:
              "1px solid rgba(91, 72, 128, 0.12)",
            borderRadius: 24,
            background: "#ffffff",
            boxShadow:
              "0 12px 34px rgba(46, 35, 67, 0.06)",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              minHeight: 27,
              padding: "3px 10px",
              marginBottom: 12,
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
            PREMIUM FEATURE
          </div>

          <h1
            style={{
              margin: 0,
              color: "#2f2638",
              fontSize:
                "clamp(28px, 4vw, 38px)",
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
              color: "#716877",
              fontSize: 15,
              lineHeight: 1.65,
            }}
          >
            Keep evaluations, school
            documents, therapy records,
            insurance information, and
            other important family
            documents organized in one
            private place.
          </p>

          <div
            style={{
              marginTop: 22,
              padding: 18,
              borderRadius: 16,
              background:
                "rgba(108, 82, 160, 0.06)",
              border:
                "1px solid rgba(108, 82, 160, 0.10)",
            }}
          >
            <div
              style={{
                color: "#3d3444",
                fontSize: 14,
                fontWeight: 800,
              }}
            >
              Included with Premium
            </div>

            <p
              style={{
                margin: "7px 0 0",
                color: "#716877",
                fontSize: 13,
                lineHeight: 1.6,
              }}
            >
              Premium access is required
              to upload, view, organize,
              and remove documents from
              Document Vault.
            </p>
          </div>

          <Link
            href="/pricing"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 44,
              marginTop: 22,
              padding: "10px 18px",
              borderRadius: 12,
              background: "#654c91",
              color: "#ffffff",
              fontSize: 13,
              fontWeight: 800,
              textDecoration: "none",
            }}
          >
            View Premium
          </Link>
        </section>
      </main>
    );
  }

  /*
   * ==========================================================
   * PREMIUM VAULT
   * ==========================================================
   */

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#fbfafc",
        padding: "38px 20px 64px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1120,
          margin: "0 auto",
        }}
      >
        {/* HEADER */}

        <section
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent:
              "space-between",
            gap: 24,
            flexWrap: "wrap",
            marginBottom: 28,
          }}
        >
          <div
            style={{
              maxWidth: 680,
            }}
          >
            <div
              style={{
                display:
                  "inline-flex",
                alignItems: "center",
                minHeight: 27,
                padding: "3px 10px",
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
              PREMIUM SUPPORT TOOL
            </div>

            <h1
              style={{
                margin: 0,
                color: "#2f2638",
                fontSize:
                  "clamp(30px, 4vw, 42px)",
                lineHeight: 1.1,
                fontWeight: 850,
              }}
            >
              Document Vault
            </h1>

            <p
              style={{
                margin: "12px 0 0",
                color: "#716877",
                fontSize: 15,
                lineHeight: 1.65,
              }}
            >
              Keep important family
              documents organized in one
              private place.
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
              minHeight: 46,
              padding: "11px 18px",
              border: 0,
              borderRadius: 13,
              background:
                !selectedChildId ||
                childrenLoading
                  ? "#c8bfd6"
                  : "#654c91",
              color: "#ffffff",
              fontSize: 14,
              fontWeight: 800,
              cursor:
                !selectedChildId ||
                childrenLoading
                  ? "not-allowed"
                  : "pointer",
              boxShadow:
                selectedChildId
                  ? "0 8px 18px rgba(101, 76, 145, 0.18)"
                  : "none",
            }}
          >
            + Add Document
          </button>
        </section>

        {/* CHILD SELECTOR */}

        <section
          style={{
            marginBottom: 22,
            padding: 20,
            border:
              "1px solid rgba(91, 72, 128, 0.12)",
            borderRadius: 18,
            background: "#ffffff",
          }}
        >
          <label
            htmlFor="vault-child"
            style={{
              display: "block",
              marginBottom: 7,
              color: "#3d3444",
              fontSize: 13,
              fontWeight: 750,
            }}
          >
            Family member
          </label>

          {childrenLoading ? (
            <div
              style={{
                color: "#7b7280",
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
                boxSizing:
                  "border-box",
                padding: "10px 12px",
                border:
                  "1px solid rgba(91, 72, 128, 0.20)",
                borderRadius: 12,
                background: "#ffffff",
                color: "#3d3444",
                fontSize: 14,
              }}
            >
              {children.map(
                (child) => (
                  <option
                    key={child.id}
                    value={child.id}
                  >
                    {child.name}
                  </option>
                )
              )}
            </select>
          ) : (
            <div>
              <div
                style={{
                  color: "#4d4452",
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                No saved family members
                found.
              </div>

              <p
                style={{
                  margin: "6px 0 0",
                  color: "#817887",
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
                background:
                  "rgba(108, 82, 160, 0.07)",
                border:
                  "1px solid rgba(108, 82, 160, 0.10)",
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
                      color: "#817887",
                      fontSize: 11,
                      fontWeight: 800,
                      textTransform:
                        "uppercase",
                      letterSpacing:
                        "0.04em",
                    }}
                  >
                    Viewing Vault
                  </div>

                  <div
                    style={{
                      marginTop: 3,
                      color: "#3a3041",
                      fontSize: 18,
                      fontWeight: 800,
                    }}
                  >
                    {selectedChild.name}
                  </div>
                </div>

                <div
                  style={{
                    color: "#654c91",
                    fontSize: 13,
                    fontWeight: 750,
                  }}
                >
                  {documents.length}{" "}
                  {documents.length === 1
                    ? "document"
                    : "documents"}
                </div>
              </div>
            </section>

            {/* SEARCH */}

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
                  boxSizing:
                    "border-box",
                  padding: "11px 14px",
                  border:
                    "1px solid rgba(91, 72, 128, 0.16)",
                  borderRadius: 13,
                  background: "#ffffff",
                  color: "#3d3444",
                  fontSize: 14,
                  outline: "none",
                }}
              />
            </section>

            {/* CATEGORY FILTERS */}

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
                  setCategoryFilter(
                    "all"
                  )
                }
                style={{
                  minHeight: 36,
                  padding: "7px 12px",
                  border:
                    categoryFilter ===
                    "all"
                      ? "1px solid #654c91"
                      : "1px solid rgba(91, 72, 128, 0.14)",
                  borderRadius: 999,
                  background:
                    categoryFilter ===
                    "all"
                      ? "#654c91"
                      : "#ffffff",
                  color:
                    categoryFilter ===
                    "all"
                      ? "#ffffff"
                      : "#62596a",
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
                    categoryFilter ===
                    category;

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
                        padding:
                          "7px 12px",
                        border: active
                          ? "1px solid #654c91"
                          : "1px solid rgba(91, 72, 128, 0.14)",
                        borderRadius: 999,
                        background: active
                          ? "#654c91"
                          : "#ffffff",
                        color: active
                          ? "#ffffff"
                          : "#62596a",
                        fontSize: 12,
                        fontWeight: 750,
                        cursor:
                          "pointer",
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

            {/* ERROR */}

            {documentError ? (
              <div
                role="alert"
                style={{
                  marginBottom: 20,
                  padding: "12px 14px",
                  borderRadius: 12,
                  background: "#fff2f3",
                  border:
                    "1px solid rgba(162, 63, 75, 0.18)",
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
                  padding:
                    "42px 20px",
                  textAlign: "center",
                  border:
                    "1px solid rgba(91, 72, 128, 0.10)",
                  borderRadius: 18,
                  background: "#ffffff",
                  color: "#817887",
                  fontSize: 14,
                }}
              >
                Loading documents...
              </section>
            ) : documents.length === 0 ? (
              <section
                style={{
                  padding:
                    "46px 24px",
                  textAlign: "center",
                  border:
                    "1px dashed rgba(91, 72, 128, 0.22)",
                  borderRadius: 20,
                  background: "#ffffff",
                }}
              >
                <div
                  aria-hidden="true"
                  style={{
                    width: 58,
                    height: 58,
                    margin:
                      "0 auto 16px",
                    display: "flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "center",
                    borderRadius: 18,
                    background:
                      "rgba(108, 82, 160, 0.09)",
                    color: "#654c91",
                    fontSize: 25,
                  }}
                >
                  📄
                </div>

                <h2
                  style={{
                    margin: 0,
                    color: "#3d3444",
                    fontSize: 19,
                  }}
                >
                  No documents yet
                </h2>

                <p
                  style={{
                    maxWidth: 460,
                    margin:
                      "8px auto 0",
                    color: "#817887",
                    fontSize: 13,
                    lineHeight: 1.55,
                  }}
                >
                  Add evaluations, school
                  documents, therapy
                  records, insurance
                  information, or other
                  important documents for{" "}
                  {selectedChild.name}.
                </p>

                <button
                  type="button"
                  onClick={() =>
                    setUploadOpen(true)
                  }
                  style={{
                    marginTop: 18,
                    minHeight: 42,
                    padding:
                      "9px 16px",
                    border: 0,
                    borderRadius: 12,
                    background:
                      "#654c91",
                    color: "#ffffff",
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  Add First Document
                </button>
              </section>
            ) : visibleDocuments.length ===
              0 ? (
              <section
                style={{
                  padding:
                    "42px 20px",
                  textAlign: "center",
                  border:
                    "1px solid rgba(91, 72, 128, 0.10)",
                  borderRadius: 18,
                  background: "#ffffff",
                }}
              >
                <h2
                  style={{
                    margin: 0,
                    color: "#3d3444",
                    fontSize: 18,
                  }}
                >
                  No matching documents
                </h2>

                <p
                  style={{
                    margin: "8px 0 0",
                    color: "#817887",
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
                    setCategoryFilter(
                      "all"
                    );
                  }}
                  style={{
                    marginTop: 16,
                    minHeight: 40,
                    padding:
                      "8px 14px",
                    border:
                      "1px solid rgba(101, 76, 145, 0.22)",
                    borderRadius: 11,
                    background:
                      "#ffffff",
                    color: "#654c91",
                    fontSize: 12,
                    fontWeight: 750,
                    cursor: "pointer",
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
                    "repeat(auto-fit, minmax(280px, 1fr))",
                  gap: 16,
                }}
              >
                {visibleDocuments.map(
                  (document) => (
                    <VaultDocumentCard
                      key={document.id}
                      document={
                        document
                      }
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
          childId={
            selectedChild.id
          }
          childName={
            selectedChild.name
          }
          onClose={() =>
            setUploadOpen(false)
          }
          onUploaded={
            handleUploaded
          }
        />
      ) : null}

      {/* DOCUMENT DETAILS MODAL */}

      <VaultDocumentDetailsModal
        document={selectedDocument}
        isOpen={Boolean(
          selectedDocument
        )}
        onClose={() =>
          setSelectedDocument(null)
        }
        onView={
          handleViewDocument
        }
        onDownload={
          handleDownloadDocument
        }
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