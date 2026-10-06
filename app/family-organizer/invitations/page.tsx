"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { User } from "firebase/auth";

import {
  getCurrentUser,
  watchAuthState,
} from "../../../lib/auth";

import {
  acceptFamilyOrganizerInvitation,
  declineFamilyOrganizerInvitation,
  getPendingFamilyOrganizerInvitationsForEmail,
} from "../../../lib/familyOrganizer/familyOrganizerRepository";

import type {
  FamilyOrganizerInvitation,
  FamilyOrganizerRelationship,
} from "../../../lib/familyOrganizer/familyOrganizerTypes";

/*
 * ============================================================
 * FAMILY ORGANIZER INVITATIONS
 * ============================================================
 *
 * Allows an authenticated Myriad user to review invitations
 * sent to the email address associated with their account.
 *
 * Accepted invitations connect the authenticated Firebase UID
 * to the existing canonical child workspace.
 *
 * The child is NOT duplicated.
 * ============================================================
 */

const RELATIONSHIP_LABELS: Record<
  FamilyOrganizerRelationship,
  string
> = {
  parent: "Parent",
  stepparent: "Stepparent",
  guardian: "Guardian",
  grandparent: "Grandparent",
  sibling: "Sibling",
  relative: "Other Relative",
  caregiver: "Caregiver",
  other: "Other",
};

function getErrorMessage(
  error: unknown,
  fallback: string
): string {
  if (
    error instanceof Error &&
    error.message.trim()
  ) {
    return error.message;
  }

  return fallback;
}

function formatInvitationDate(
  timestamp: number
): string {
  if (
    !Number.isFinite(timestamp) ||
    timestamp <= 0
  ) {
    return "";
  }

  try {
    return new Intl.DateTimeFormat(
      undefined,
      {
        month: "short",
        day: "numeric",
        year: "numeric",
      }
    ).format(
      new Date(timestamp)
    );
  } catch {
    return "";
  }
}

export default function FamilyOrganizerInvitationsPage() {
  const [
    currentUser,
    setCurrentUser,
  ] = useState<User | null>(
    getCurrentUser()
  );

  const [
    authReady,
    setAuthReady,
  ] = useState(false);

  const [
    invitations,
    setInvitations,
  ] = useState<
    FamilyOrganizerInvitation[]
  >([]);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    loadError,
    setLoadError,
  ] = useState("");

  const [
    actionInvitationId,
    setActionInvitationId,
  ] = useState("");

  const [
    actionMessage,
    setActionMessage,
  ] = useState("");

  const [
    actionError,
    setActionError,
  ] = useState("");

  /*
   * ============================================================
   * AUTH
   * ============================================================
   */

  useEffect(() => {
    const unsubscribe =
      watchAuthState(
        (user) => {
          setCurrentUser(
            user
          );

          setAuthReady(
            true
          );
        }
      );

    return unsubscribe;
  }, []);

  /*
   * ============================================================
   * ACCOUNT EMAIL
   * ============================================================
   */

  const accountEmail =
    useMemo(
      () =>
        currentUser?.email
          ?.trim()
          .toLowerCase() ??
        "",
      [currentUser]
    );

  /*
   * ============================================================
   * LOAD PENDING INVITATIONS
   * ============================================================
   */

  const loadInvitations =
    useCallback(
      async () => {
        if (
          !currentUser ||
          !accountEmail
        ) {
          setInvitations(
            []
          );

          return;
        }

        try {
          setLoading(
            true
          );

          setLoadError(
            ""
          );

          const results =
            await getPendingFamilyOrganizerInvitationsForEmail(
              accountEmail
            );

          setInvitations(
            results
          );
        } catch (error) {
          console.error(
            "Unable to load Family Organizer invitations:",
            error
          );

          setLoadError(
            getErrorMessage(
              error,
              "We couldn't load your Family Team invitations right now."
            )
          );
        } finally {
          setLoading(
            false
          );
        }
      },
      [
        currentUser,
        accountEmail,
      ]
    );

  useEffect(() => {
    if (!authReady) {
      return;
    }

    void loadInvitations();
  }, [
    authReady,
    loadInvitations,
  ]);

  /*
   * ============================================================
   * PENDING INVITATIONS
   * ============================================================
   */

  const pendingInvitations =
    useMemo(
      () =>
        invitations.filter(
          (invitation) =>
            invitation.status ===
            "pending"
        ),
      [invitations]
    );

  /*
   * ============================================================
   * ACCEPT INVITATION
   * ============================================================
   */

  async function handleAccept(
    invitation:
      FamilyOrganizerInvitation
  ) {
    if (
      !currentUser ||
      !accountEmail
    ) {
      return;
    }

    try {
      setActionInvitationId(
        invitation.id
      );

      setActionMessage(
        ""
      );

      setActionError(
        ""
      );

      await acceptFamilyOrganizerInvitation(
        {
          invitation,

          acceptingUserId:
            currentUser.uid,

          acceptingUserEmail:
            accountEmail,
        }
      );

      setActionMessage(
        "Invitation accepted. This child is now connected to your Family Organizer."
      );

      await loadInvitations();
    } catch (error) {
      console.error(
        "Unable to accept Family Organizer invitation:",
        error
      );

      setActionError(
        getErrorMessage(
          error,
          "We couldn't accept this invitation."
        )
      );
    } finally {
      setActionInvitationId(
        ""
      );
    }
  }

  /*
   * ============================================================
   * DECLINE INVITATION
   * ============================================================
   */

  async function handleDecline(
    invitation:
      FamilyOrganizerInvitation
  ) {
    if (
      !currentUser ||
      !accountEmail
    ) {
      return;
    }

    try {
      setActionInvitationId(
        invitation.id
      );

      setActionMessage(
        ""
      );

      setActionError(
        ""
      );

      await declineFamilyOrganizerInvitation(
        invitation.id
      );

      setActionMessage(
        "Invitation declined."
      );

      await loadInvitations();
    } catch (error) {
      console.error(
        "Unable to decline Family Organizer invitation:",
        error
      );

      setActionError(
        getErrorMessage(
          error,
          "We couldn't decline this invitation."
        )
      );
    } finally {
      setActionInvitationId(
        ""
      );
    }
  }

  /*
   * ============================================================
   * PAGE
   * ============================================================
   */

  return (
    <main
      style={{
        minHeight:
          "calc(100vh - 72px)",
        background:
          "#F8FAFC",
        padding:
          "48px 24px 72px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth:
            "900px",
          margin:
            "0 auto",
        }}
      >
        {/* ==================================================
            HEADER
        =================================================== */}

        <section
          style={{
            marginBottom:
              "28px",
          }}
        >
          <div
            style={{
              display:
                "inline-flex",
              alignItems:
                "center",
              padding:
                "6px 10px",
              borderRadius:
                "999px",
              background:
                "#DBEAFE",
              color:
                "#1D4ED8",
              fontSize:
                "11px",
              fontWeight: 800,
              textTransform:
                "uppercase",
              letterSpacing:
                "0.05em",
              marginBottom:
                "16px",
            }}
          >
            Family Organizer
          </div>

          <h1
            style={{
              margin: 0,
              color:
                "#0F172A",
              fontSize:
                "36px",
              lineHeight: 1.15,
              fontWeight: 850,
            }}
          >
            Family Team Invitations
          </h1>

          <p
            style={{
              margin:
                "12px 0 0",
              maxWidth:
                "720px",
              color:
                "#64748B",
              fontSize:
                "16px",
              lineHeight: 1.7,
            }}
          >
            Review invitations to
            join a child's shared
            Myriad Family Organizer.
            You will continue using
            your own Myriad account.
          </p>
        </section>

        {/* ==================================================
            AUTH LOADING
        =================================================== */}

        {!authReady ? (
          <section
            style={{
              background:
                "#FFFFFF",
              border:
                "1px solid #E2E8F0",
              borderRadius:
                "18px",
              padding:
                "28px",
            }}
          >
            <div
              style={{
                color:
                  "#64748B",
                fontSize:
                  "14px",
              }}
            >
              Loading your account...
            </div>
          </section>
        ) : null}

        {/* ==================================================
            SIGNED OUT
        =================================================== */}

        {authReady &&
        !currentUser ? (
          <section
            style={{
              background:
                "#FFFFFF",
              border:
                "1px solid #E2E8F0",
              borderRadius:
                "18px",
              padding:
                "28px",
            }}
          >
            <h2
              style={{
                margin: 0,
                color:
                  "#0F172A",
                fontSize:
                  "21px",
                fontWeight: 800,
              }}
            >
              Sign in to view your
              invitations
            </h2>

            <p
              style={{
                margin:
                  "8px 0 0",
                color:
                  "#64748B",
                fontSize:
                  "14px",
                lineHeight: 1.65,
              }}
            >
              Sign in with the
              Myriad account that
              uses the email address
              where your Family Team
              invitation was sent.
            </p>

            <Link
              href="/login"
              style={{
                display:
                  "inline-flex",
                marginTop:
                  "18px",
                padding:
                  "10px 16px",
                borderRadius:
                  "10px",
                background:
                  "#2563EB",
                color:
                  "#FFFFFF",
                fontSize:
                  "13px",
                fontWeight: 800,
                textDecoration:
                  "none",
              }}
            >
              Sign In
            </Link>
          </section>
        ) : null}

        {/* ==================================================
            NO EMAIL
        =================================================== */}

        {authReady &&
        currentUser &&
        !accountEmail ? (
          <section
            style={{
              background:
                "#FFFFFF",
              border:
                "1px solid #E2E8F0",
              borderRadius:
                "18px",
              padding:
                "28px",
            }}
          >
            <h2
              style={{
                margin: 0,
                color:
                  "#0F172A",
                fontSize:
                  "20px",
                fontWeight: 800,
              }}
            >
              Email address required
            </h2>

            <p
              style={{
                margin:
                  "8px 0 0",
                color:
                  "#64748B",
                fontSize:
                  "13px",
                lineHeight: 1.65,
              }}
            >
              Family Team
              invitations are
              matched to the email
              address associated
              with your Myriad
              account.
            </p>
          </section>
        ) : null}

        {/* ==================================================
            INVITATIONS
        =================================================== */}

        {authReady &&
        currentUser &&
        accountEmail ? (
          <>
            <section
              style={{
                background:
                  "#FFFFFF",
                border:
                  "1px solid #E2E8F0",
                borderRadius:
                  "18px",
                padding:
                  "26px",
                boxShadow:
                  "0 8px 24px rgba(15, 23, 42, 0.04)",
              }}
            >
              <div
                style={{
                  display:
                    "flex",
                  justifyContent:
                    "space-between",
                  alignItems:
                    "flex-start",
                  gap:
                    "16px",
                  flexWrap:
                    "wrap",
                }}
              >
                <div>
                  <h2
                    style={{
                      margin: 0,
                      color:
                        "#0F172A",
                      fontSize:
                        "21px",
                      fontWeight: 800,
                    }}
                  >
                    Pending
                    Invitations
                  </h2>

                  <p
                    style={{
                      margin:
                        "6px 0 0",
                      color:
                        "#64748B",
                      fontSize:
                        "12px",
                      lineHeight: 1.6,
                    }}
                  >
                    Invitations for{" "}
                    {accountEmail}
                  </p>
                </div>

                <div
                  style={{
                    padding:
                      "5px 9px",
                    borderRadius:
                      "999px",
                    background:
                      "#EFF6FF",
                    color:
                      "#1D4ED8",
                    fontSize:
                      "10px",
                    fontWeight: 800,
                    textTransform:
                      "uppercase",
                    letterSpacing:
                      "0.04em",
                  }}
                >
                  {pendingInvitations.length}{" "}
                  Pending
                </div>
              </div>

              {loading ? (
                <div
                  style={{
                    marginTop:
                      "24px",
                    color:
                      "#64748B",
                    fontSize:
                      "13px",
                  }}
                >
                  Loading
                  invitations...
                </div>
              ) : null}

              {!loading &&
              loadError ? (
                <div
                  style={{
                    marginTop:
                      "20px",
                    padding:
                      "13px 14px",
                    borderRadius:
                      "10px",
                    background:
                      "#FEF2F2",
                    border:
                      "1px solid #FECACA",
                    color:
                      "#B91C1C",
                    fontSize:
                      "12px",
                    lineHeight: 1.5,
                  }}
                >
                  {loadError}
                </div>
              ) : null}

              {!loading &&
              !loadError &&
              pendingInvitations.length ===
                0 ? (
                <div
                  style={{
                    marginTop:
                      "22px",
                    padding:
                      "22px",
                    borderRadius:
                      "13px",
                    background:
                      "#F8FAFC",
                    border:
                      "1px solid #E2E8F0",
                  }}
                >
                  <div
                    style={{
                      color:
                        "#334155",
                      fontSize:
                        "14px",
                      fontWeight: 800,
                    }}
                  >
                    No pending
                    invitations
                  </div>

                  <div
                    style={{
                      marginTop:
                        "6px",
                      color:
                        "#64748B",
                      fontSize:
                        "12px",
                      lineHeight: 1.6,
                    }}
                  >
                    When someone
                    invites you to
                    their child's
                    Family Team, the
                    invitation will
                    appear here.
                  </div>
                </div>
              ) : null}

              {!loading &&
              !loadError &&
              pendingInvitations.length >
                0 ? (
                <div
                  style={{
                    marginTop:
                      "22px",
                    display:
                      "grid",
                    gap:
                      "14px",
                  }}
                >
                  {pendingInvitations.map(
                    (
                      invitation
                    ) => {
                      const busy =
                        actionInvitationId ===
                        invitation.id;

                      const createdDate =
                        formatInvitationDate(
                          invitation.createdAt
                        );

                      return (
                        <article
                          key={
                            invitation.id
                          }
                          style={{
                            padding:
                              "20px",
                            borderRadius:
                              "14px",
                            border:
                              "1px solid #E2E8F0",
                            background:
                              "#FFFFFF",
                          }}
                        >
                          <div
                            style={{
                              display:
                                "flex",
                              justifyContent:
                                "space-between",
                              alignItems:
                                "flex-start",
                              gap:
                                "16px",
                              flexWrap:
                                "wrap",
                            }}
                          >
                            <div>
                              <div
                                style={{
                                  color:
                                    "#0F172A",
                                  fontSize:
                                    "16px",
                                  fontWeight: 800,
                                }}
                              >
                                Family Team
                                Invitation
                              </div>

                              <div
                                style={{
                                  marginTop:
                                    "6px",
                                  color:
                                    "#64748B",
                                  fontSize:
                                    "12px",
                                  lineHeight: 1.6,
                                }}
                              >
                                Relationship:{" "}
                                <strong
                                  style={{
                                    color:
                                      "#334155",
                                  }}
                                >
                                  {
                                    RELATIONSHIP_LABELS[
                                      invitation
                                        .relationship
                                    ]
                                  }
                                </strong>
                              </div>

                              {createdDate ? (
                                <div
                                  style={{
                                    marginTop:
                                      "3px",
                                    color:
                                      "#94A3B8",
                                    fontSize:
                                      "11px",
                                  }}
                                >
                                  Invited{" "}
                                  {
                                    createdDate
                                  }
                                </div>
                              ) : null}
                            </div>

                            <div
                              style={{
                                padding:
                                  "5px 9px",
                                borderRadius:
                                  "999px",
                                background:
                                  "#FEF3C7",
                                color:
                                  "#92400E",
                                fontSize:
                                  "10px",
                                fontWeight: 800,
                                textTransform:
                                  "uppercase",
                                letterSpacing:
                                  "0.04em",
                              }}
                            >
                              Pending
                            </div>
                          </div>

                          <div
                            style={{
                              marginTop:
                                "17px",
                              padding:
                                "13px",
                              borderRadius:
                                "10px",
                              background:
                                "#F8FAFC",
                              color:
                                "#475569",
                              fontSize:
                                "12px",
                              lineHeight: 1.6,
                            }}
                          >
                            Accepting gives
                            your Myriad
                            account access to
                            the same child's
                            shared Family
                            Organizer. It does
                            not create a
                            second child
                            profile.
                          </div>

                          <div
                            style={{
                              marginTop:
                                "17px",
                              display:
                                "flex",
                              flexWrap:
                                "wrap",
                              gap:
                                "10px",
                            }}
                          >
                            <button
                              type="button"
                              disabled={
                                busy
                              }
                              onClick={() =>
                                void handleAccept(
                                  invitation
                                )
                              }
                              style={{
                                padding:
                                  "10px 16px",
                                border:
                                  "none",
                                borderRadius:
                                  "9px",
                                background:
                                  busy
                                    ? "#CBD5E1"
                                    : "#2563EB",
                                color:
                                  busy
                                    ? "#64748B"
                                    : "#FFFFFF",
                                fontSize:
                                  "12px",
                                fontWeight: 800,
                                cursor:
                                  busy
                                    ? "not-allowed"
                                    : "pointer",
                              }}
                            >
                              {busy
                                ? "Working..."
                                : "Accept Invitation"}
                            </button>

                            <button
                              type="button"
                              disabled={
                                busy
                              }
                              onClick={() =>
                                void handleDecline(
                                  invitation
                                )
                              }
                              style={{
                                padding:
                                  "10px 16px",
                                borderRadius:
                                  "9px",
                                border:
                                  "1px solid #CBD5E1",
                                background:
                                  "#FFFFFF",
                                color:
                                  "#475569",
                                fontSize:
                                  "12px",
                                fontWeight: 800,
                                cursor:
                                  busy
                                    ? "not-allowed"
                                    : "pointer",
                                opacity:
                                  busy
                                    ? 0.6
                                    : 1,
                              }}
                            >
                              Decline
                            </button>
                          </div>
                        </article>
                      );
                    }
                  )}
                </div>
              ) : null}
            </section>

            {/* ==================================================
                ACTION MESSAGES
            =================================================== */}

            {actionMessage ? (
              <div
                style={{
                  marginTop:
                    "16px",
                  padding:
                    "13px 15px",
                  borderRadius:
                    "11px",
                  background:
                    "#F0FDF4",
                  border:
                    "1px solid #BBF7D0",
                  color:
                    "#166534",
                  fontSize:
                    "12px",
                  fontWeight: 700,
                  lineHeight: 1.5,
                }}
              >
                {actionMessage}
              </div>
            ) : null}

            {actionError ? (
              <div
                style={{
                  marginTop:
                    "16px",
                  padding:
                    "13px 15px",
                  borderRadius:
                    "11px",
                  background:
                    "#FEF2F2",
                  border:
                    "1px solid #FECACA",
                  color:
                    "#B91C1C",
                  fontSize:
                    "12px",
                  lineHeight: 1.5,
                }}
              >
                {actionError}
              </div>
            ) : null}

            {/* ==================================================
                ACCOUNT SAFETY
            =================================================== */}

            <section
              style={{
                marginTop:
                  "18px",
                padding:
                  "19px 20px",
                borderRadius:
                  "14px",
                background:
                  "#F5F3FF",
                border:
                  "1px solid #DDD6FE",
              }}
            >
              <div
                style={{
                  color:
                    "#5B21B6",
                  fontSize:
                    "13px",
                  fontWeight: 800,
                }}
              >
                Your account stays
                separate
              </div>

              <p
                style={{
                  margin:
                    "6px 0 0",
                  color:
                    "#64748B",
                  fontSize:
                    "12px",
                  lineHeight: 1.65,
                }}
              >
                Family Team members
                use their own Myriad
                login. Accepting an
                invitation connects
                your account to the
                existing shared child
                workspace without
                sharing passwords or
                creating duplicate
                child information.
              </p>
            </section>
          </>
        ) : null}

        {/* ==================================================
            NAVIGATION
        =================================================== */}

        <div
          style={{
            marginTop:
              "28px",
            display:
              "flex",
            flexWrap:
              "wrap",
            gap:
              "18px",
          }}
        >
          <Link
            href="/family-organizer"
            style={{
              color:
                "#2563EB",
              fontSize:
                "14px",
              fontWeight: 750,
              textDecoration:
                "none",
            }}
          >
            ← Family Organizer
          </Link>

          <Link
            href="/family-organizer/family-team"
            style={{
              color:
                "#64748B",
              fontSize:
                "14px",
              fontWeight: 750,
              textDecoration:
                "none",
            }}
          >
            Family Team →
          </Link>
        </div>
      </div>
    </main>
  );
}