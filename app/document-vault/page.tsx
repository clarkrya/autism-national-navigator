
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
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
  revokeVaultDocumentDownloadUrl,
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

const VIEW_URL_LIFETIME_MS = 10 * 60 * 1000;
const DOWNLOAD_URL_LIFETIME_MS = 60 * 1000;

type SavedChild = {
  id: string;
  name: string;
};

type VaultCategoryFilter =
  | "all"
  | VaultDocumentCategory;

type TemporaryDocumentUrl = {
  timer: number;
  documentTab: Window | null;
};

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

  /*
   * TEMPORARY DOCUMENT URL MANAGEMENT
   */

  const temporaryUrlsRef = useRef<
    Map<string, TemporaryDocumentUrl>
  >(new Map());

  const pendingDocumentTabsRef = useRef<
    Set<Window>
  >(new Set());

  const documentSessionRef = useRef(0);

  const currentOwnerRef = useRef<string | null>(
    null
  );

  const documentRequestRef = useRef(0);

  const releaseTemporaryUrl = useCallback(
    (url: string, closeTab = false) => {
      const entry =
        temporaryUrlsRef.current.get(url);

      if (entry) {
        window.clearTimeout(entry.timer);

        if (
          closeTab &&
          entry.documentTab &&
          !entry.documentTab.closed
        ) {
          try {
            entry.documentTab.close();
          } catch {
            // Browser restrictions may apply.
          }
        }
      }

      revokeVaultDocumentDownloadUrl(url);

      temporaryUrlsRef.current.delete(url);
    },
    []
  );

  const releaseAllTemporaryUrls = useCallback(
    () => {
      documentSessionRef.current += 1;

      for (
        const url of temporaryUrlsRef.current.keys()
      ) {
        releaseTemporaryUrl(url, true);
      }

      for (
        const tab of pendingDocumentTabsRef.current
      ) {
        try {
          if (!tab.closed) {
            tab.close();
          }
        } catch {
          // Browser restrictions may apply.
        }
      }

      pendingDocumentTabsRef.current.clear();
    },
    [releaseTemporaryUrl]
  );

  const trackTemporaryUrl = useCallback(
    (
      url: string,
      lifetime: number,
      documentTab: Window | null = null
    ) => {
      if (!url.startsWith("blob:")) {
        throw new Error(
          "An invalid temporary document URL was returned."
        );
      }

      const timer = window.setTimeout(() => {
        releaseTemporaryUrl(url);
      }, lifetime);

      temporaryUrlsRef.current.set(url, {
        timer,
        documentTab,
      });
    },
    [releaseTemporaryUrl]
  );

  /*
   * AUTHENTICATION AND ACCOUNT CLEANUP
   */

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        const nextOwner =
          currentUser?.uid ?? null;

        if (
          currentOwnerRef.current !== nextOwner
        ) {
          releaseAllTemporaryUrls();

          documentRequestRef.current += 1;

          setChildren([]);
          setSelectedChildId("");
          setDocuments([]);
          setJourneyNotes([]);

          setChildrenLoading(false);
          setDocumentsLoading(false);
          setNotesLoading(false);

          setDocumentError("");
          setNotesError("");

          setSelectedDocument(null);
          setUploadOpen(false);

          setNotesOpen(false);
          setExpandedNoteId(null);

          setSearchTerm("");
          setNotesSearch("");
          setCategoryFilter("all");

          currentOwnerRef.current = nextOwner;
        }

        setUser(currentUser);
        setAuthLoading(false);
      }
    );

    return () => {
      unsubscribe();

      documentRequestRef.current += 1;

      releaseAllTemporaryUrls();
    };
  }, [releaseAllTemporaryUrls]);

  useEffect(() => {
    if (
      !isAuthenticated ||
      !isPremium ||
      entitlementLoading ||
      entitlementError
    ) {
      releaseAllTemporaryUrls();

      documentRequestRef.current += 1;

      setDocuments([]);
      setJourneyNotes([]);
      setSelectedDocument(null);
      setUploadOpen(false);
      setNotesOpen(false);
      setExpandedNoteId(null);
    }
  }, [
    isAuthenticated,
    isPremium,
    entitlementLoading,
    entitlementError,
    releaseAllTemporaryUrls,
  ]);

  const canAccessVault = Boolean(
    user &&
    isAuthenticated &&
    isPremium &&
    !authLoading &&
    !entitlementLoading &&
    !entitlementError &&
    auth.currentUser?.uid === user.uid
  );

  /*
   * LOAD FAMILY MEMBERS
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
        !canAccessVault
      ) {
        setChildren([]);
        setSelectedChildId("");
        setChildrenLoading(false);
        return;
      }

      const ownerUid = user.uid;

      setChildrenLoading(true);
      setDocumentError("");

      try {
        const savedChildren =
          await getSavedChildren(ownerUid);

        if (
          cancelled ||
          auth.currentUser?.uid !== ownerUid
        ) {
          return;
        }

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
                `${selectedChildStorageKey}:${ownerUid}`
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

        if (
          !cancelled &&
          auth.currentUser?.uid === ownerUid
        ) {
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
    canAccessVault,
  ]);

  useEffect(() => {
    if (
      !user ||
      !canAccessVault ||
      !selectedChildId ||
      typeof window === "undefined"
    ) {
      return;
    }

    window.localStorage.setItem(
      `${selectedChildStorageKey}:${user.uid}`,
      selectedChildId
    );
  }, [
    user,
    selectedChildId,
    canAccessVault,
  ]);

  /*
   * LOAD UPLOADED DOCUMENTS
   */

  const loadDocuments = useCallback(
    async (
      uid: string,
      childId: string
    ) => {
      const requestId =
        ++documentRequestRef.current;

      setDocumentsLoading(true);
      setDocumentError("");
      setDocuments([]);

      try {
        const loadedDocuments =
          await getVaultDocuments(
            uid,
            childId
          );

        if (
          documentRequestRef.current !==
            requestId ||
          auth.currentUser?.uid !== uid
        ) {
          return;
        }

        setDocuments(
          sortVaultDocumentsNewestFirst(
            loadedDocuments.filter(
              (document) =>
                document.userId === uid &&
                document.childId === childId
            )
          )
        );
      } catch (error) {
        console.error(
          "Unable to load Vault documents:",
          error
        );

        if (
          documentRequestRef.current ===
            requestId &&
          auth.currentUser?.uid === uid
        ) {
          setDocuments([]);

          setDocumentError(
            "We couldn't load the documents in this Vault."
          );
        }
      } finally {
        if (
          documentRequestRef.current ===
          requestId
        ) {
          setDocumentsLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    if (
      !user ||
      !canAccessVault ||
      !selectedChildId
    ) {
      documentRequestRef.current += 1;

      setDocuments([]);
      setDocumentsLoading(false);

      return;
    }

    void loadDocuments(
      user.uid,
      selectedChildId
    );

    return () => {
      documentRequestRef.current += 1;
    };
  }, [
    user,
    canAccessVault,
    selectedChildId,
    loadDocuments,
  ]);

  /*
   * LOAD JOURNEY NOTES INDEPENDENTLY
   */

  useEffect(() => {
    let cancelled = false;

    setJourneyNotes([]);
    setNotesError("");
    setNotesLoading(false);

    if (
      !user ||
      !canAccessVault ||
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

        if (
          cancelled ||
          auth.currentUser?.uid !== ownerUserId
        ) {
          return;
        }

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

        if (
          !cancelled &&
          auth.currentUser?.uid === ownerUserId
        ) {
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
    canAccessVault,
    selectedChildId,
  ]);

  /*
   * RESET PRESENTATION WHEN SWITCHING CHILDREN
   */

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
    const ownedDocuments =
      documents.filter(
        (document) =>
          document.userId === user?.uid &&
          document.childId === selectedChildId
      );

    const filtered = filterVaultDocuments(
      ownedDocuments,
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
    user?.uid,
    selectedChildId,
  ]);

  const visibleNotes = useMemo(() => {
    const ownedNotes =
      journeyNotes.filter(
        (note) =>
          note.ownerUserId === user?.uid &&
          note.childId === selectedChildId
      );

    const term =
      notesSearch.trim().toLowerCase();

    if (!term) {
      return ownedNotes;
    }

    return ownedNotes.filter((note) => {
      return [
        note.taskTitle,
        note.response,
        `Stage ${note.stageNumber}`,
      ].some((value) =>
        value.toLowerCase().includes(term)
      );
    });
  }, [
    journeyNotes,
    notesSearch,
    user?.uid,
    selectedChildId,
  ]);

  /*
   * DOCUMENT ACTION AUTHORIZATION
   */

  function canAccessDocument(
    document: VaultDocument
  ): boolean {
    return Boolean(
      canAccessVault &&
      user &&
      auth.currentUser?.uid === user.uid &&
      document.userId === user.uid &&
      document.childId === selectedChildId
    );
  }

  function isCurrentDocumentSession(
    ownerUid: string,
    session: number
  ): boolean {
    return (
      auth.currentUser?.uid === ownerUid &&
      documentSessionRef.current === session
    );
  }

  /*
   * VIEW DOCUMENT
   *
   * Open the tab immediately from the user's tap
   * to preserve mobile browser compatibility.
   */

  async function handleViewDocument(
    document: VaultDocument
  ) {
    if (
      !user ||
      !canAccessDocument(document)
    ) {
      return;
    }

    const ownerUid = user.uid;
    const session =
      documentSessionRef.current;

    setDocumentError("");

    const documentTab = window.open(
      "about:blank",
      "_blank"
    );

    if (documentTab) {
      pendingDocumentTabsRef.current.add(
        documentTab
      );

      documentTab.opener = null;

      try {
        documentTab.document.title =
          "Opening document...";

        documentTab.document.body.textContent =
          "Opening your document...";
      } catch {
        // Some browsers restrict new-tab access.
      }
    }

    let url = "";

    try {
      url =
        await getVaultDocumentDownloadUrl(
          document
        );

      if (
        !isCurrentDocumentSession(
          ownerUid,
          session
        )
      ) {
        releaseTemporaryUrl(url);

        if (
          documentTab &&
          !documentTab.closed
        ) {
          documentTab.close();
        }

        return;
      }

      if (
        documentTab &&
        documentTab.closed
      ) {
        releaseTemporaryUrl(url);
        return;
      }

      trackTemporaryUrl(
        url,
        VIEW_URL_LIFETIME_MS,
        documentTab
      );

      if (documentTab) {
        documentTab.location.replace(url);
      } else {
        /*
         * Fallback for browsers that block
         * the new document tab.
         */

        const anchor =
          window.document.createElement("a");

        anchor.href = url;
        anchor.download =
          document.fileName ||
          document.title ||
          "document";

        anchor.rel = "noopener noreferrer";

        window.document.body.appendChild(
          anchor
        );

        anchor.click();
        anchor.remove();
      }
    } catch (error) {
      if (url) {
        releaseTemporaryUrl(url);
      }

      console.error(
        "Unable to open Vault document:",
        error
      );

      if (
        documentTab &&
        !documentTab.closed
      ) {
        documentTab.close();
      }

      if (
        isCurrentDocumentSession(
          ownerUid,
          session
        )
      ) {
        setDocumentError(
          "We couldn't open this document. Please try again."
        );
      }
    } finally {
      if (documentTab) {
        pendingDocumentTabsRef.current.delete(
          documentTab
        );
      }
    }
  }

  /*
   * DOCUMENT DETAILS
   */

  function handleDocumentDetails(
    document: VaultDocument
  ) {
    if (!canAccessDocument(document)) {
      return;
    }

    setDocumentError("");
    setSelectedDocument(document);
  }

  /*
   * DOWNLOAD DOCUMENT
   */

  async function handleDownloadDocument(
    document: VaultDocument
  ) {
    if (
      !user ||
      !canAccessDocument(document)
    ) {
      return;
    }

    const ownerUid = user.uid;

    const session =
      documentSessionRef.current;

    setDocumentError("");

    let url = "";

    try {
      url =
        await getVaultDocumentDownloadUrl(
          document
        );

      if (
        !isCurrentDocumentSession(
          ownerUid,
          session
        )
      ) {
        releaseTemporaryUrl(url);
        return;
      }

      trackTemporaryUrl(
        url,
        DOWNLOAD_URL_LIFETIME_MS
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
      if (url) {
        releaseTemporaryUrl(url);
      }

      console.error(
        "Unable to download Vault document:",
        error
      );

      if (
        isCurrentDocumentSession(
          ownerUid,
          session
        )
      ) {
        setDocumentError(
          "We couldn't download this document. Please try again."
        );
      }
    }
  }

  /*
   * SAVE DOCUMENT DETAILS
   */

  async function handleSaveDocumentDetails(
    document: VaultDocument,
    updates: {
      title: string;
      category: VaultDocumentCategory;
      notes: string;
    }
  ) {
    if (
      !user ||
      !canAccessDocument(document)
    ) {
      return;
    }

    const ownerUid = user.uid;

    const session =
      documentSessionRef.current;

    setDocumentError("");

    const updatedDocument =
      await updateVaultDocumentMetadata(
        document,
        updates
      );

    if (
      !isCurrentDocumentSession(
        ownerUid,
        session
      )
    ) {
      return;
    }

    setDocuments((current) =>
      current.map((item) =>
        item.id === updatedDocument.id &&
        item.userId === updatedDocument.userId &&
        item.childId === updatedDocument.childId
          ? updatedDocument
          : item
      )
    );

    setSelectedDocument((current) =>
      current?.id === updatedDocument.id &&
      current.userId === updatedDocument.userId &&
      current.childId === updatedDocument.childId
        ? updatedDocument
        : current
    );
  }

  /*
   * DELETE DOCUMENT
   */

  async function handleDeleteDocument(
    document: VaultDocument
  ) {
    if (
      !user ||
      !canAccessDocument(document)
    ) {
      return;
    }

    const ownerUid = user.uid;

    const session =
      documentSessionRef.current;

    setDocumentError("");

    try {
      await deleteVaultDocument(document);

      if (
        !isCurrentDocumentSession(
          ownerUid,
          session
        )
      ) {
        return;
      }

      setDocuments((current) =>
        current.filter(
          (item) =>
            !(
              item.id === document.id &&
              item.userId === document.userId &&
              item.childId === document.childId
            )
        )
      );

      setSelectedDocument((current) =>
        current?.id === document.id &&
        current.userId === document.userId &&
        current.childId === document.childId
          ? null
          : current
      );
    } catch (error) {
      console.error(
        "Unable to delete Vault document:",
        error
      );

      if (
        isCurrentDocumentSession(
          ownerUid,
          session
        )
      ) {
        setDocumentError(
          "We couldn't delete this document. Please try again."
        );
      }

      throw error;
    }
  }

  /*
   * HANDLE COMPLETED UPLOAD
   */

  async function handleUploaded(
    document: VaultDocument
  ) {
    if (!canAccessDocument(document)) {
      return;
    }

    setDocuments((current) =>
      sortVaultDocumentsNewestFirst([
        document,
        ...current.filter(
          (item) =>
            !(
              item.id === document.id &&
              item.userId === document.userId &&
              item.childId === document.childId
            )
        ),
      ])
    );

    setSearchTerm("");
    setCategoryFilter("all");
  }

  /*
   * LOADING VIEW
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

  /*
   * FREE ACCOUNT VIEW
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

  if (!canAccessVault) {
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
          Verifying Document Vault access...
        </div>
      </main>
    );
  }

  // PREMIUM DOCUMENT VAULT

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
