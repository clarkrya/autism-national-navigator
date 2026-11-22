
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";

import {
  onAuthStateChanged,
  type User,
} from "firebase/auth";

import { auth } from "../../lib/firebase";
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

import {
  getChildJourneyResponses,
  type JourneyResponse,
} from "../../lib/journeyResponseRepository";

import {
  getSavedChildren,
} from "../../lib/journeyRepository";

import VaultDocumentCard from "../../components/vault/VaultDocumentCard";
import VaultUploadModal from "../../components/vault/VaultUploadModal";
import VaultDocumentDetailsModal from "../../components/document-vault/VaultDocumentDetailsModal";

const BRAND = {
  navy: "#204D6A",
  darkNavy: "#173B52",
  teal: "#58AAA7",
  darkTeal: "#317E7B",
  gold: "#F7AD3F",
  background: "#F7FAFB",
  lightTeal: "#EAF6F5",
  muted: "#647B8B",
  border: "#DCE7EC",
  white: "#FFFFFF",
};

const selectedChildStorageKey =
  "myriad-document-vault-selected-child";

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
    const profile =
      data.familyProfile &&
      typeof data.familyProfile === "object" &&
      !Array.isArray(data.familyProfile)
        ? (data.familyProfile as Record<string, unknown>)
        : {};
  
    const candidates = [
      profile.childName,
      profile.name,
      profile.firstName,
      data.childName,
      data.name,
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

function formatNoteDate(value: number): string {
  if (!value || !Number.isFinite(value)) {
    return "Date unavailable";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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

function Notice({
  children,
  error = false,
}: {
  children: React.ReactNode;
  error?: boolean;
}) {
  return (
    <div
      role={error ? "alert" : undefined}
      style={{
        padding: "13px 15px",
        borderRadius: 12,
        background: error
          ? "#FFF2F3"
          : BRAND.lightTeal,
        color: error
          ? "#913845"
          : BRAND.darkTeal,
        fontSize: 13,
        lineHeight: 1.6,
      }}
    >
      {children}
    </div>
  );
}

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

  // Saved Journey Notes are displayed separately.
  // They are never converted into Vault files.

  const [journeyNotes, setJourneyNotes] =
    useState<JourneyResponse[]>([]);

  const [notesLoading, setNotesLoading] =
    useState(false);

  const [notesError, setNotesError] =
    useState("");

  const [notesOpen, setNotesOpen] =
    useState(false);

  const [expandedNoteId, setExpandedNoteId] =
    useState<string | null>(null);

  const [notesSearch, setNotesSearch] =
    useState("");

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

  // Load family members.

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
        const savedChildren = await getSavedChildren(
          user.uid
        );

        if (cancelled) return;

        const loadedChildren: SavedChild[] =
        savedChildren.map((child) => ({
          id: child.childId,
          name:
            child.familyProfile.childName?.trim() ||
            "Family member",
        }));

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

  // Load uploaded documents.

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

  // Load Journey Notes independently.
  // A notes read error must not hide uploaded files.

  useEffect(() => {
    let cancelled = false;

    setJourneyNotes([]);
    setNotesError("");
    setNotesLoading(false);

    if (
      !user ||
      !isPremium ||
      !selectedChildId
    ) {
      return;
    }

    const ownerUserId = user.uid;
    const childId = selectedChildId;

    async function loadNotes() {
      setNotesLoading(true);

      try {
        const responses =
          await getChildJourneyResponses(
            ownerUserId,
            childId
          );

        if (cancelled) return;

        const savedResponses = responses
          .filter(
            (item) =>
              item.ownerUserId === ownerUserId &&
              item.childId === childId &&
              item.response.trim().length > 0
          )
          .sort(
            (a, b) =>
              b.updatedAt - a.updatedAt
          );

        setJourneyNotes(savedResponses);
      } catch (error) {
        console.error(
          "Unable to load Journey Notes:",
          error
        );

        if (!cancelled) {
          setJourneyNotes([]);
          setNotesError(
            "Saved Journey Notes couldn't be loaded. Please try refreshing the page."
          );
        }
      } finally {
        if (!cancelled) {
          setNotesLoading(false);
        }
      }
    }

    void loadNotes();

    return () => {
      cancelled = true;
    };
  }, [
    user,
    isPremium,
    selectedChildId,
  ]);

  // Reset presentation when switching children.

  useEffect(() => {
    setSearchTerm("");
    setCategoryFilter("all");
    setUploadOpen(false);
    setSelectedDocument(null);
    setNotesOpen(false);
    setExpandedNoteId(null);
    setNotesSearch("");
  }, [selectedChildId]);

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

  const visibleNotes = useMemo(() => {
    const term =
      notesSearch.trim().toLowerCase();

    if (!term) return journeyNotes;

    return journeyNotes.filter((note) => {
      return [
        note.taskTitle,
        note.response,
        `Stage ${note.stageNumber}`,
      ].some((value) =>
        value.toLowerCase().includes(term)
      );
    });
  }, [journeyNotes, notesSearch]);

  // Existing document actions.

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

  // Loading view.

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

  // Guest view.

  if (!isAuthenticated || !user) {
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
          <div style={premiumBadgeStyle}>
            AUTIVOYA DOCUMENT VAULT
          </div>

          <h1
            style={{
              margin: "12px 0",
              color: BRAND.darkNavy,
              fontSize: 30,
            }}
          >
            Keep important documents
            organized in one place.
          </h1>

          <p
            style={{
              color: BRAND.muted,
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
              marginTop: 12,
            }}
          >
            Sign In
          </Link>
        </section>
      </main>
    );
  }

  // Entitlement error.

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
              color: BRAND.darkNavy,
              marginTop: 0,
            }}
          >
            Document Vault
          </h1>

          <Notice error>
            {entitlementError}
          </Notice>

          <p style={{ color: BRAND.muted }}>
            Please refresh the page and try
            again before accessing your Vault.
          </p>
        </section>
      </main>
    );
  }

  // Free account view.

  if (isFree || !isPremium) {
    return (
      <main style={pageStyle}>
        <section
          style={{
            ...panelStyle,
            maxWidth: 820,
            margin: "0 auto",
            padding: 32,
          }}
        >
          <div style={premiumBadgeStyle}>
            AUTIVOYA PREMIUM FEATURE
          </div>

          <h1
            style={{
              margin: "12px 0",
              color: BRAND.darkNavy,
              fontSize: 34,
            }}
          >
            Document Vault
          </h1>

          <p
            style={{
              color: BRAND.muted,
              lineHeight: 1.65,
              maxWidth: 620,
            }}
          >
            Keep evaluations, school documents,
            therapy records, insurance
            information, and saved Journey Notes
            organized in one private place.
          </p>

          <div style={{ marginTop: 20 }}>
            <Notice>
              Premium access is required to
              upload, view, organize, and
              manage Document Vault content.
            </Notice>
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

  // Premium Document Vault.

  return (
    <main style={pageStyle}>
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
              Your family's important documents
              and Journey Notes, organized
              in one private place.
            </p>
          </div>

          <button
            type="button"
            disabled={
              !selectedChildId ||
              childrenLoading
            }
            onClick={() => setUploadOpen(true)}
            style={{
              ...primaryButtonStyle,
              minHeight: 46,
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
              marginBottom: 8,
              color: BRAND.darkNavy,
              fontSize: 13,
              fontWeight: 750,
            }}
          >
            Family member
          </label>

          {childrenLoading ? (
            <p style={{ color: BRAND.muted }}>
              Loading family members...
            </p>
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
              <p
                style={{
                  margin: 0,
                  color: BRAND.darkNavy,
                  fontWeight: 700,
                }}
              >
                No saved family members found.
              </p>

              <p
                style={{
                  color: BRAND.muted,
                  fontSize: 13,
                }}
              >
                Add a child to your family
                profile before storing
                documents.
              </p>
            </div>
          )}
        </section>

        {selectedChild ? (
          <>
            {/* SUMMARY */}

            <section
              style={{
                marginBottom: 24,
                padding: "18px 20px",
                borderRadius: 18,
                background: BRAND.lightTeal,
                border: "1px solid #D1EAE8",
                borderLeft:
                  `4px solid ${BRAND.teal}`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 16,
                }}
              >
                <div>
                  <div
                    style={{
                      color: BRAND.darkTeal,
                      fontSize: 11,
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    Viewing Vault
                  </div>

                  <div
                    style={{
                      marginTop: 4,
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
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <span style={premiumBadgeStyle}>
                    {documents.length}{" "}
                    {documents.length === 1
                      ? "document"
                      : "documents"}
                  </span>

                  <span style={premiumBadgeStyle}>
                    {journeyNotes.length}{" "}
                    {journeyNotes.length === 1
                      ? "Journey Note"
                      : "Journey Notes"}
                  </span>
                </div>
              </div>
            </section>

            {/* UPLOADED DOCUMENTS */}

            <section
              style={{
                ...panelStyle,
                padding: 22,
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                  marginBottom: 18,
                }}
              >
                <div>
                  <h2
                    style={{
                      margin: 0,
                      color: BRAND.darkNavy,
                      fontSize: 21,
                    }}
                  >
                    Uploaded Documents
                  </h2>

                  <p
                    style={{
                      margin: "5px 0 0",
                      color: BRAND.muted,
                      fontSize: 13,
                    }}
                  >
                    Evaluations, school records,
                    therapy files, and more.
                  </p>
                </div>

                <span style={premiumBadgeStyle}>
                  {documents.length} files
                </span>
              </div>

              {/* DOCUMENT SEARCH */}

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
                  marginBottom: 16,
                }}
              />

              {/* CATEGORY FILTERS */}

              <div
                aria-label="Document categories"
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  marginBottom: 22,
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
              </div>

              {documentError ? (
                <div style={{ marginBottom: 18 }}>
                  <Notice error>
                    {documentError}
                  </Notice>
                </div>
              ) : null}

              {/* DOCUMENT LIST */}

              {documentsLoading ? (
                <div
                  style={{
                    padding: "36px 12px",
                    textAlign: "center",
                    color: BRAND.muted,
                    fontSize: 14,
                  }}
                >
                  Loading documents...
                </div>
              ) : documents.length === 0 ? (
                <div
                  style={{
                    padding: "36px 20px",
                    textAlign: "center",
                    border:
                      `1px dashed ${BRAND.teal}`,
                    borderRadius: 16,
                  }}
                >
                  <div
                    style={{
                      fontSize: 28,
                      marginBottom: 10,
                    }}
                  >
                    📄
                  </div>

                  <h3
                    style={{
                      margin: 0,
                      color: BRAND.darkNavy,
                      fontSize: 18,
                    }}
                  >
                    No uploaded documents yet
                  </h3>

                  <p
                    style={{
                      color: BRAND.muted,
                      fontSize: 13,
                      lineHeight: 1.6,
                    }}
                  >
                    Keep important files for{" "}
                    {selectedChild.name} organized
                    here.
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      setUploadOpen(true)
                    }
                    style={{
                      ...primaryButtonStyle,
                      marginTop: 8,
                    }}
                  >
                    Add First Document
                  </button>
                </div>
              ) : visibleDocuments.length === 0 ? (
                <div
                  style={{
                    padding: 30,
                    textAlign: "center",
                  }}
                >
                  <h3
                    style={{
                      color: BRAND.darkNavy,
                    }}
                  >
                    No matching documents
                  </h3>

                  <p
                    style={{
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
                    style={secondaryButtonStyle}
                  >
                    Clear filters
                  </button>
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit,minmax(260px,1fr))",
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
                </div>
              )}
            </section>

            {/* SAVED JOURNEY NOTES */}

            <section
              style={{
                ...panelStyle,
                marginBottom: 24,
                overflow: "hidden",
              }}
            >
              <button
                type="button"
                aria-expanded={notesOpen}
                aria-controls="vault-journey-notes"
                onClick={() => {
                  setNotesOpen((current) => !current);
                  setExpandedNoteId(null);
                }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent:
                    "space-between",
                  gap: 14,
                  padding: 22,
                  background: BRAND.white,
                  border: "none",
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <div>
                  <h2
                    style={{
                      margin: 0,
                      color: BRAND.darkNavy,
                      fontSize: 21,
                    }}
                  >
                    Saved Journey Notes
                  </h2>

                  <p
                    style={{
                      margin: "6px 0 0",
                      color: BRAND.muted,
                      fontSize: 13,
                      lineHeight: 1.5,
                    }}
                  >
                    Written responses saved
                    from My Journey.
                  </p>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    flexShrink: 0,
                  }}
                >
                  <span style={premiumBadgeStyle}>
                    {journeyNotes.length}
                  </span>

                  <span
                    aria-hidden="true"
                    style={{
                      color: BRAND.darkTeal,
                      fontSize: 20,
                      fontWeight: 700,
                    }}
                  >
                    {notesOpen ? "−" : "+"}
                  </span>
                </div>
              </button>

              {notesOpen ? (
                <div
                  id="vault-journey-notes"
                  style={{
                    borderTop:
                      `1px solid ${BRAND.border}`,
                    padding: 20,
                  }}
                >
                  {notesError ? (
                    <div
                      style={{
                        marginBottom: 14,
                      }}
                    >
                      <Notice error>
                        {notesError}
                      </Notice>
                    </div>
                  ) : null}

                  {notesLoading ? (
                    <p
                      style={{
                        color: BRAND.muted,
                        fontSize: 13,
                      }}
                    >
                      Loading saved Journey Notes...
                    </p>
                  ) : journeyNotes.length === 0 ? (
                    <div
                      style={{
                        padding: "22px 12px",
                        textAlign: "center",
                      }}
                    >
                      <p
                        style={{
                          margin: 0,
                          color: BRAND.darkNavy,
                          fontWeight: 700,
                          fontSize: 14,
                        }}
                      >
                        No saved Journey Notes yet
                      </p>

                      <p
                        style={{
                          color: BRAND.muted,
                          fontSize: 13,
                          lineHeight: 1.6,
                        }}
                      >
                        Responses you save in
                        My Journey will appear
                        here automatically
                        when you open this page.
                      </p>
                    </div>
                  ) : (
                    <>
                      {journeyNotes.length > 5 ? (
                        <input
                          type="search"
                          aria-label="Search Journey Notes"
                          placeholder="Search Journey Notes..."
                          value={notesSearch}
                          onChange={(event) =>
                            setNotesSearch(
                              event.target.value
                            )
                          }
                          style={{
                            width: "100%",
                            minHeight: 42,
                            boxSizing: "border-box",
                            padding: "10px 13px",
                            border:
                              `1px solid ${BRAND.border}`,
                            borderRadius: 11,
                            marginBottom: 14,
                            color: BRAND.darkNavy,
                            fontSize: 13,
                          }}
                        />
                      ) : null}

                      {visibleNotes.length === 0 ? (
                        <p
                          style={{
                            color: BRAND.muted,
                            fontSize: 13,
                          }}
                        >
                          No matching Journey Notes.
                        </p>
                      ) : (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 10,
                          }}
                        >
                          {visibleNotes.map((note) => {
                            const expanded =
                              expandedNoteId ===
                              note.id;

                            return (
                              <div
                                key={note.id}
                                style={{
                                  border:
                                    `1px solid ${BRAND.border}`,
                                  borderRadius: 13,
                                  overflow: "hidden",
                                }}
                              >
                                <button
                                  type="button"
                                  aria-expanded={
                                    expanded
                                  }
                                  onClick={() =>
                                    setExpandedNoteId(
                                      expanded
                                        ? null
                                        : note.id
                                    )
                                  }
                                  style={{
                                    width: "100%",
                                    display: "flex",
                                    alignItems:
                                      "center",
                                    justifyContent:
                                      "space-between",
                                    gap: 14,
                                    padding:
                                      "15px 16px",
                                    border: "none",
                                    background:
                                      expanded
                                        ? BRAND.lightTeal
                                        : BRAND.white,
                                    textAlign: "left",
                                    cursor: "pointer",
                                  }}
                                >
                                  <div
                                    style={{
                                      minWidth: 0,
                                    }}
                                  >
                                    <div
                                      style={{
                                        color:
                                          BRAND.darkNavy,
                                        fontSize: 14,
                                        fontWeight: 750,
                                        lineHeight: 1.5,
                                        overflowWrap:
                                          "anywhere",
                                      }}
                                    >
                                      {note.taskTitle ||
                                        "Journey Note"}
                                    </div>

                                    <div
                                      style={{
                                        marginTop: 5,
                                        color:
                                          BRAND.muted,
                                        fontSize: 12,
                                        lineHeight: 1.5,
                                      }}
                                    >
                                      Stage{" "}
                                      {note.stageNumber}
                                      {" · "}
                                      Updated{" "}
                                      {formatNoteDate(
                                        note.updatedAt
                                      )}
                                    </div>
                                  </div>

                                  <span
                                    aria-hidden="true"
                                    style={{
                                      flexShrink: 0,
                                      color:
                                        BRAND.darkTeal,
                                      fontSize: 18,
                                    }}
                                  >
                                    {expanded
                                      ? "−"
                                      : "+"}
                                  </span>
                                </button>

                                {expanded ? (
                                  <div
                                    style={{
                                      padding:
                                        "16px 18px",
                                      borderTop:
                                        `1px solid ${BRAND.border}`,
                                      background:
                                        BRAND.white,
                                    }}
                                  >
                                    <div
                                      style={{
                                        color:
                                          BRAND.darkTeal,
                                        fontSize: 11,
                                        fontWeight: 800,
                                        textTransform:
                                          "uppercase",
                                        letterSpacing:
                                          "0.04em",
                                        marginBottom: 9,
                                      }}
                                    >
                                      Saved Response
                                    </div>

                                    <div
                                      style={{
                                        color:
                                          BRAND.darkNavy,
                                        fontSize: 14,
                                        lineHeight: 1.75,
                                        whiteSpace:
                                          "pre-wrap",
                                        overflowWrap:
                                          "anywhere",
                                      }}
                                    >
                                      {note.response}
                                    </div>

                                    <p
                                      style={{
                                        margin:
                                          "16px 0 0",
                                        paddingTop: 12,
                                        borderTop:
                                          `1px solid ${BRAND.border}`,
                                        color:
                                          BRAND.muted,
                                        fontSize: 12,
                                        lineHeight: 1.5,
                                      }}
                                    >
                                      This note is linked
                                      to its original
                                      Journey task.
                                      To make changes,
                                      return to My Journey.
                                    </p>
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : null}
            </section>
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
        onSave={handleSaveDocumentDetails}
        onDelete={handleDeleteDocument}
      />
    </main>
  );
}
