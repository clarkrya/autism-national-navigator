"use client";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import FamilyOrganizerWorkspaceSelector from "../../../components/familyOrganizer/FamilyOrganizerWorkspaceSelector";

import {
  useFamilyOrganizerWorkspace,
} from "../../../lib/familyOrganizer/useFamilyOrganizerWorkspace";

import {
  createFamilyOrganizerInvitation,
  getFamilyOrganizerInvitationsForChild,
  getFamilyOrganizerMembershipsForChild,
  revokeFamilyOrganizerInvitation,
  revokeFamilyOrganizerMembership,
} from "../../../lib/familyOrganizer/familyOrganizerRepository";

import type {
  FamilyOrganizerInvitation,
  FamilyOrganizerMembership,
  FamilyOrganizerRelationship,
} from "../../../lib/familyOrganizer/familyOrganizerTypes";

/*
 * ============================================================
 * FAMILY TEAM PAGE
 * ============================================================
 *
 * Family Team allows trusted family members to collaborate
 * around the SAME canonical child while using their own Myriad
 * accounts.
 *
 * IMPORTANT:
 *
 * - Child records are never duplicated.
 * - ownerUserId + childId identify the canonical child.
 * - Owners may invite and remove Family Team members.
 * - Invited family members may view the shared Family Team.
 * - Shared family members cannot manage owner-controlled access.
 * ============================================================
 */

type TeamRow = {
  id: string;

  email?: string;

  relationship: string;

  status:
    | "pending"
    | "active";

  invitationId?: string;

  membershipId?: string;
};

const RELATIONSHIPS: {
  value:
    FamilyOrganizerRelationship;

  label: string;
}[] = [
  {
    value: "parent",
    label: "Parent",
  },
  {
    value: "stepparent",
    label: "Stepparent",
  },
  {
    value: "guardian",
    label: "Guardian",
  },
  {
    value: "grandparent",
    label: "Grandparent",
  },
  {
    value: "sibling",
    label: "Sibling",
  },
  {
    value: "relative",
    label: "Other Relative",
  },
  {
    value: "caregiver",
    label: "Caregiver",
  },
  {
    value: "other",
    label: "Other",
  },
];

/*
 * ============================================================
 * HELPERS
 * ============================================================
 */

function getRelationshipLabel(
  relationship: string
): string {
  const match =
    RELATIONSHIPS.find(
      (item) =>
        item.value ===
        relationship
    );

  return (
    match?.label ??
    relationship
  );
}

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

/*
 * ============================================================
 * TEAM MEMBER ROW
 * ============================================================
 */

function TeamMemberRow({
  member,
  busy,
  canManage,
  onRemove,
}: {
  member: TeamRow;

  busy: boolean;

  canManage: boolean;

  onRemove: () => void;
}) {
  const pending =
    member.status ===
    "pending";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent:
          "space-between",
        gap: "18px",
        padding: "16px 0",
        borderBottom:
          "1px solid #E2E8F0",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "13px",
          minWidth: 0,
        }}
      >
        <div
          style={{
            width: "42px",
            height: "42px",
            borderRadius:
              "999px",
            background: pending
              ? "#FEF3C7"
              : "#DCFCE7",
            display: "flex",
            alignItems:
              "center",
            justifyContent:
              "center",
            fontSize: "18px",
            flexShrink: 0,
          }}
          aria-hidden="true"
        >
          👤
        </div>

        <div
          style={{
            minWidth: 0,
          }}
        >
          <div
            style={{
              color: "#0F172A",
              fontSize: "14px",
              fontWeight: 800,
              overflowWrap:
                "anywhere",
            }}
          >
            {member.email ||
              "Family member"}
          </div>

          <div
            style={{
              marginTop: "3px",
              color: "#64748B",
              fontSize: "12px",
              lineHeight: 1.5,
            }}
          >
            {getRelationshipLabel(
              member.relationship
            )}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            padding: "5px 9px",
            borderRadius:
              "999px",
            background: pending
              ? "#FEF3C7"
              : "#DCFCE7",
            color: pending
              ? "#92400E"
              : "#166534",
            fontSize: "10px",
            fontWeight: 800,
            textTransform:
              "uppercase",
            letterSpacing:
              "0.04em",
          }}
        >
          {pending
            ? "Pending"
            : "Active"}
        </div>

        {canManage ? (
          <button
            type="button"
            disabled={busy}
            onClick={onRemove}
            style={{
              padding:
                "7px 10px",
              borderRadius:
                "8px",
              border:
                "1px solid #FECACA",
              background:
                "#FFFFFF",
              color: "#B91C1C",
              fontSize: "11px",
              fontWeight: 800,
              cursor: busy
                ? "not-allowed"
                : "pointer",
              opacity: busy
                ? 0.6
                : 1,
            }}
          >
            {pending
              ? "Cancel"
              : "Remove"}
          </button>
        ) : null}
      </div>
    </div>
  );
}

/*
 * ============================================================
 * PAGE
 * ============================================================
 */

export default function FamilyTeamPage() {
  const {
    currentUser,
    authReady,
    loading:
      loadingWorkspaces,
    error:
      workspaceError,
    workspaces,
    selectedWorkspace,
    selectWorkspace,
  } =
    useFamilyOrganizerWorkspace();

  const [
    invitations,
    setInvitations,
  ] = useState<
    FamilyOrganizerInvitation[]
  >([]);

  const [
    memberships,
    setMemberships,
  ] = useState<
    FamilyOrganizerMembership[]
  >([]);

  const [
    loadingTeam,
    setLoadingTeam,
  ] = useState(false);

  const [
    teamError,
    setTeamError,
  ] = useState("");

  const [
    inviteEmail,
    setInviteEmail,
  ] = useState("");

  const [
    inviteRelationship,
    setInviteRelationship,
  ] =
    useState<FamilyOrganizerRelationship>(
      "parent"
    );

  const [
    sendingInvitation,
    setSendingInvitation,
  ] = useState(false);

  const [
    invitationMessage,
    setInvitationMessage,
  ] = useState("");

  const [
    invitationError,
    setInvitationError,
  ] = useState("");

  const [
    actionId,
    setActionId,
  ] = useState("");

  /*
   * ==========================================================
   * SELECTED WORKSPACE
   * ==========================================================
   */

  const selectedChildName =
    selectedWorkspace
      ?.childName ??
    "";

  const isOwner =
    selectedWorkspace
      ?.role ===
    "owner";

  /*
   * ==========================================================
   * RESET MESSAGES WHEN WORKSPACE CHANGES
   * ==========================================================
   */

  useEffect(() => {
    setInvitationMessage(
      ""
    );

    setInvitationError(
      ""
    );

    setTeamError(
      ""
    );
  }, [
    selectedWorkspace
      ?.ownerUserId,
    selectedWorkspace
      ?.childId,
  ]);

  /*
   * ==========================================================
   * LOAD FAMILY TEAM
   * ==========================================================
   */

  const loadFamilyTeam =
    useCallback(
      async () => {
        if (
          !currentUser ||
          !selectedWorkspace
        ) {
          setInvitations(
            []
          );

          setMemberships(
            []
          );

          return;
        }

        try {
          setLoadingTeam(
            true
          );

          setTeamError(
            ""
          );

          const [
            childInvitations,
            childMemberships,
          ] =
            await Promise.all([
              getFamilyOrganizerInvitationsForChild(
                {
                  ownerUserId:
                    selectedWorkspace.ownerUserId,

                  childId:
                    selectedWorkspace.childId,
                }
              ),

              getFamilyOrganizerMembershipsForChild(
                {
                  ownerUserId:
                    selectedWorkspace.ownerUserId,

                  childId:
                    selectedWorkspace.childId,
                }
              ),
            ]);

          setInvitations(
            childInvitations
          );

          setMemberships(
            childMemberships
          );
        } catch (error) {
          console.error(
            "Unable to load Family Team:",
            error
          );

          setInvitations(
            []
          );

          setMemberships(
            []
          );

          setTeamError(
            getErrorMessage(
              error,
              "We couldn't load the Family Team right now."
            )
          );
        } finally {
          setLoadingTeam(
            false
          );
        }
      },
      [
        currentUser,
        selectedWorkspace,
      ]
    );

  useEffect(() => {
    void loadFamilyTeam();
  }, [
    loadFamilyTeam,
  ]);

  /*
   * ==========================================================
   * TEAM ROWS
   * ==========================================================
   */

  const teamRows =
    useMemo<TeamRow[]>(
      () => {
        const pendingRows =
          invitations
            .filter(
              (
                invitation
              ) =>
                invitation.status ===
                "pending"
            )
            .map(
              (
                invitation
              ): TeamRow => ({
                id:
                  `invitation-${invitation.id}`,

                invitationId:
                  invitation.id,

                email:
                  invitation.invitedEmail,

                relationship:
                  invitation.relationship,

                status:
                  "pending",
              })
            );

        const activeRows =
          memberships
            .filter(
              (
                membership
              ) =>
                membership.status ===
                "active"
            )
            .map(
              (
                membership
              ): TeamRow => {
                const sourceInvitation =
                  invitations.find(
                    (
                      invitation
                    ) =>
                      invitation.id ===
                      membership.invitationId
                  );

                return {
                  id:
                    `membership-${membership.id}`,

                  membershipId:
                    membership.id,

                  email:
                    sourceInvitation
                      ?.invitedEmail,

                  relationship:
                    membership.relationship,

                  status:
                    "active",
                };
              }
            );

        return [
          ...activeRows,
          ...pendingRows,
        ];
      },
      [
        invitations,
        memberships,
      ]
    );

  /*
   * ==========================================================
   * SEND INVITATION
   * ==========================================================
   */

  async function handleInviteSubmit(
    event:
      React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      !currentUser ||
      !selectedWorkspace ||
      !isOwner
    ) {
      return;
    }

    const email =
      inviteEmail
        .trim()
        .toLowerCase();

    if (!email) {
      setInvitationError(
        "Enter an email address."
      );

      return;
    }

    if (
      currentUser.email &&
      email ===
        currentUser.email
          .trim()
          .toLowerCase()
    ) {
      setInvitationError(
        "You already own this child's Family Team."
      );

      return;
    }

    try {
      setSendingInvitation(
        true
      );

      setInvitationError(
        ""
      );

      setInvitationMessage(
        ""
      );

      await createFamilyOrganizerInvitation(
        {
          ownerUserId:
            selectedWorkspace.ownerUserId,

          childId:
            selectedWorkspace.childId,

          invitedEmail:
            email,

          relationship:
            inviteRelationship,

          invitedByUserId:
            currentUser.uid,
        }
      );

      setInviteEmail(
        ""
      );

      setInviteRelationship(
        "parent"
      );

      setInvitationMessage(
        `Invitation created for ${email}.`
      );

      await loadFamilyTeam();
    } catch (error) {
      console.error(
        "Unable to create Family Team invitation:",
        error
      );

      setInvitationError(
        getErrorMessage(
          error,
          "We couldn't create the invitation."
        )
      );
    } finally {
      setSendingInvitation(
        false
      );
    }
  }

  /*
   * ==========================================================
   * CANCEL INVITATION
   * ==========================================================
   */

  async function handleCancelInvitation(
    invitationId: string
  ) {
    if (!isOwner) {
      return;
    }

    try {
      setActionId(
        invitationId
      );

      setTeamError(
        ""
      );

      await revokeFamilyOrganizerInvitation(
        invitationId
      );

      await loadFamilyTeam();
    } catch (error) {
      console.error(
        "Unable to cancel invitation:",
        error
      );

      setTeamError(
        getErrorMessage(
          error,
          "We couldn't cancel the invitation."
        )
      );
    } finally {
      setActionId(
        ""
      );
    }
  }

  /*
   * ==========================================================
   * REMOVE ACTIVE MEMBER
   * ==========================================================
   */

  async function handleRemoveMembership(
    membershipId: string
  ) {
    if (!isOwner) {
      return;
    }

    try {
      setActionId(
        membershipId
      );

      setTeamError(
        ""
      );

      await revokeFamilyOrganizerMembership(
        membershipId
      );

      await loadFamilyTeam();
    } catch (error) {
      console.error(
        "Unable to remove Family Team member:",
        error
      );

      setTeamError(
        getErrorMessage(
          error,
          "We couldn't remove this Family Team member."
        )
      );
    } finally {
      setActionId(
        ""
      );
    }
  }

  /*
   * ==========================================================
   * RENDER
   * ==========================================================
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
            "1000px",
          margin:
            "0 auto",
        }}
      >
        {/* ==================================================
            INTRO
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
            Family Team
          </h1>

          <p
            style={{
              margin:
                "12px 0 0",
              maxWidth:
                "760px",
              color:
                "#64748B",
              fontSize:
                "16px",
              lineHeight: 1.7,
            }}
          >
            Coordinate with the
            trusted family members
            helping support your
            child. Each invited
            person uses their own
            Myriad account.
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
                  "13px",
                fontWeight: 700,
              }}
            >
              Loading your Family
              Team...
            </div>
          </section>
        ) : null}

        {/* ==================================================
            SIGN IN
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
                  "20px",
                fontWeight: 800,
              }}
            >
              Sign in to manage
              your Family Team
            </h2>

            <p
              style={{
                margin:
                  "8px 0 0",
                color:
                  "#64748B",
                fontSize:
                  "14px",
                lineHeight: 1.6,
              }}
            >
              Family Team is tied
              to your Myriad
              account and the
              child workspaces you
              own or have been
              invited to share.
            </p>

            <Link
              href="/login"
              style={{
                marginTop:
                  "18px",
                display:
                  "inline-flex",
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
            AUTHENTICATED
        =================================================== */}

        {authReady &&
        currentUser ? (
          <>
            {/* ================================================
                WORKSPACE SELECTOR
            ================================================= */}

            <section
              style={{
                background:
                  "#FFFFFF",
                border:
                  "1px solid #E2E8F0",
                borderRadius:
                  "16px",
                padding:
                  "20px",
                marginBottom:
                  "18px",
              }}
            >
              {loadingWorkspaces ? (
                <div
                  style={{
                    color:
                      "#64748B",
                    fontSize:
                      "13px",
                  }}
                >
                  Loading children...
                </div>
              ) : null}

              {!loadingWorkspaces &&
              workspaceError ? (
                <div
                  style={{
                    color:
                      "#B91C1C",
                    fontSize:
                      "12px",
                    lineHeight: 1.6,
                  }}
                >
                  {workspaceError}
                </div>
              ) : null}

              {!loadingWorkspaces &&
              !workspaceError &&
              workspaces.length >
                0 ? (
                <FamilyOrganizerWorkspaceSelector
                  workspaces={
                    workspaces
                  }
                  selectedWorkspace={
                    selectedWorkspace
                  }
                  onSelect={
                    selectWorkspace
                  }
                />
              ) : null}

              {!loadingWorkspaces &&
              !workspaceError &&
              workspaces.length ===
                0 ? (
                <div>
                  <div
                    style={{
                      color:
                        "#334155",
                      fontSize:
                        "14px",
                      fontWeight: 800,
                    }}
                  >
                    No child workspace
                    available
                  </div>

                  <div
                    style={{
                      marginTop:
                        "5px",
                      color:
                        "#64748B",
                      fontSize:
                        "12px",
                      lineHeight: 1.6,
                    }}
                  >
                    Start a Journey
                    for a child or
                    accept a Family
                    Team invitation
                    first.
                  </div>

                  <div
                    style={{
                      display:
                        "flex",
                      gap: "14px",
                      flexWrap:
                        "wrap",
                      marginTop:
                        "13px",
                    }}
                  >
                    <Link
                      href="/journey"
                      style={{
                        color:
                          "#2563EB",
                        fontSize:
                          "12px",
                        fontWeight: 800,
                        textDecoration:
                          "none",
                      }}
                    >
                      Go to My Journey
                    </Link>

                    <Link
                      href="/family-organizer/invitations"
                      style={{
                        color:
                          "#7C3AED",
                        fontSize:
                          "12px",
                        fontWeight: 800,
                        textDecoration:
                          "none",
                      }}
                    >
                      Check Invitations
                    </Link>
                  </div>
                </div>
              ) : null}
            </section>

            {/* ================================================
                SELECTED FAMILY TEAM
            ================================================= */}

            {selectedWorkspace ? (
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
                    marginBottom:
                      "18px",
                    boxShadow:
                      "0 8px 24px rgba(15, 23, 42, 0.04)",
                  }}
                >
                  <div
                    style={{
                      display:
                        "flex",
                      alignItems:
                        "center",
                      justifyContent:
                        "space-between",
                      gap: "16px",
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
                            "20px",
                          fontWeight: 800,
                        }}
                      >
                        {selectedChildName}
                        &apos;s Family Team
                      </div>

                      <div
                        style={{
                          marginTop:
                            "5px",
                          color:
                            "#64748B",
                          fontSize:
                            "13px",
                          lineHeight: 1.5,
                        }}
                      >
                        {isOwner
                          ? "People who have access or a pending invitation appear here."
                          : "You're viewing the Family Team connected to this shared child."}
                      </div>
                    </div>

                    <div
                      style={{
                        display:
                          "flex",
                        gap:
                          "8px",
                        flexWrap:
                          "wrap",
                      }}
                    >
                      <div
                        style={{
                          padding:
                            "5px 9px",
                          borderRadius:
                            "999px",
                          background:
                            "#DBEAFE",
                          color:
                            "#1D4ED8",
                          fontSize:
                            "10px",
                          fontWeight: 800,
                          textTransform:
                            "uppercase",
                          letterSpacing:
                            "0.04em",
                          whiteSpace:
                            "nowrap",
                        }}
                      >
                        Premium
                      </div>

                      {!isOwner ? (
                        <div
                          style={{
                            padding:
                              "5px 9px",
                            borderRadius:
                              "999px",
                            background:
                              "#F5F3FF",
                            color:
                              "#6D28D9",
                            fontSize:
                              "10px",
                            fontWeight: 800,
                            textTransform:
                              "uppercase",
                            letterSpacing:
                              "0.04em",
                            whiteSpace:
                              "nowrap",
                          }}
                        >
                          Shared Access
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* ==========================================
                      CURRENT USER
                  =========================================== */}

                  <div
                    style={{
                      marginTop:
                        "22px",
                      padding:
                        "17px",
                      borderRadius:
                        "13px",
                      background:
                        isOwner
                          ? "#F8FAFC"
                          : "#F5F3FF",
                      border:
                        isOwner
                          ? "1px solid #E2E8F0"
                          : "1px solid #DDD6FE",
                      display:
                        "flex",
                      alignItems:
                        "center",
                      gap:
                        "13px",
                    }}
                  >
                    <div
                      style={{
                        width:
                          "42px",
                        height:
                          "42px",
                        borderRadius:
                          "999px",
                        background:
                          isOwner
                            ? "#DBEAFE"
                            : "#EDE9FE",
                        display:
                          "flex",
                        alignItems:
                          "center",
                        justifyContent:
                          "center",
                        fontSize:
                          "18px",
                        flexShrink: 0,
                      }}
                      aria-hidden="true"
                    >
                      👤
                    </div>

                    <div
                      style={{
                        minWidth: 0,
                      }}
                    >
                      <div
                        style={{
                          color:
                            "#0F172A",
                          fontSize:
                            "14px",
                          fontWeight: 800,
                        }}
                      >
                        You
                      </div>

                      <div
                        style={{
                          marginTop:
                            "3px",
                          color:
                            "#64748B",
                          fontSize:
                            "12px",
                          lineHeight: 1.5,
                          overflowWrap:
                            "anywhere",
                        }}
                      >
                        {isOwner
                          ? "Account Owner"
                          : "Family Team Member"}

                        {currentUser.email
                          ? ` • ${currentUser.email}`
                          : ""}
                      </div>
                    </div>
                  </div>

                  {/* ==========================================
                      FAMILY MEMBERS
                  =========================================== */}

                  <div
                    style={{
                      marginTop:
                        "24px",
                    }}
                  >
                    <div
                      style={{
                        color:
                          "#334155",
                        fontSize:
                          "13px",
                        fontWeight: 800,
                      }}
                    >
                      Family members
                    </div>

                    {loadingTeam ? (
                      <div
                        style={{
                          marginTop:
                            "10px",
                          color:
                            "#64748B",
                          fontSize:
                            "12px",
                        }}
                      >
                        Loading Family
                        Team...
                      </div>
                    ) : teamRows.length >
                      0 ? (
                      <div>
                        {teamRows.map(
                          (
                            member
                          ) => (
                            <TeamMemberRow
                              key={
                                member.id
                              }
                              member={
                                member
                              }
                              canManage={
                                isOwner
                              }
                              busy={
                                actionId ===
                                (member.invitationId ??
                                  member.membershipId ??
                                  "")
                              }
                              onRemove={() => {
                                if (
                                  !isOwner
                                ) {
                                  return;
                                }

                                if (
                                  member.status ===
                                    "pending" &&
                                  member.invitationId
                                ) {
                                  void handleCancelInvitation(
                                    member.invitationId
                                  );

                                  return;
                                }

                                if (
                                  member.status ===
                                    "active" &&
                                  member.membershipId
                                ) {
                                  void handleRemoveMembership(
                                    member.membershipId
                                  );
                                }
                              }}
                            />
                          )
                        )}
                      </div>
                    ) : (
                      <div
                        style={{
                          marginTop:
                            "10px",
                          padding:
                            "18px",
                          borderRadius:
                            "12px",
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
                              "13px",
                            fontWeight: 750,
                          }}
                        >
                          No other family
                          members are
                          connected yet.
                        </div>

                        <div
                          style={{
                            marginTop:
                              "5px",
                            color:
                              "#64748B",
                            fontSize:
                              "12px",
                            lineHeight: 1.6,
                          }}
                        >
                          {isOwner
                            ? "Invite a trusted family member below to begin sharing this child's family workspace."
                            : "The account owner manages invitations and access for this Family Team."}
                        </div>
                      </div>
                    )}

                    {teamError ? (
                      <div
                        style={{
                          marginTop:
                            "12px",
                          padding:
                            "11px 13px",
                          borderRadius:
                            "9px",
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
                        {teamError}
                      </div>
                    ) : null}
                  </div>
                </section>

                {/* ==============================================
                    OWNER INVITATION FORM
                =============================================== */}

                {isOwner ? (
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
                      marginBottom:
                        "18px",
                      boxShadow:
                        "0 8px 24px rgba(15, 23, 42, 0.04)",
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
                      Invite a family
                      member
                    </h2>

                    <p
                      style={{
                        margin:
                          "7px 0 0",
                        color:
                          "#64748B",
                        fontSize:
                          "13px",
                        lineHeight: 1.65,
                        maxWidth:
                          "700px",
                      }}
                    >
                      Invite someone
                      you trust to
                      collaborate
                      around{" "}
                      {selectedChildName}
                      &apos;s Myriad
                      Journey. They use
                      their own Myriad
                      login.
                    </p>

                    <form
                      onSubmit={
                        handleInviteSubmit
                      }
                      style={{
                        marginTop:
                          "22px",
                      }}
                    >
                      <div
                        style={{
                          display:
                            "grid",
                          gridTemplateColumns:
                            "repeat(auto-fit, minmax(240px, 1fr))",
                          gap:
                            "14px",
                        }}
                      >
                        <div>
                          <label
                            htmlFor="invite-email"
                            style={{
                              display:
                                "block",
                              color:
                                "#334155",
                              fontSize:
                                "12px",
                              fontWeight: 800,
                              marginBottom:
                                "7px",
                            }}
                          >
                            Email
                          </label>

                          <input
                            id="invite-email"
                            type="email"
                            required
                            value={
                              inviteEmail
                            }
                            onChange={(
                              event
                            ) => {
                              setInviteEmail(
                                event.target
                                  .value
                              );

                              setInvitationError(
                                ""
                              );

                              setInvitationMessage(
                                ""
                              );
                            }}
                            placeholder="family@example.com"
                            style={{
                              width:
                                "100%",
                              boxSizing:
                                "border-box",
                              padding:
                                "10px 12px",
                              borderRadius:
                                "9px",
                              border:
                                "1px solid #CBD5E1",
                              background:
                                "#FFFFFF",
                              color:
                                "#0F172A",
                              fontSize:
                                "14px",
                              outline:
                                "none",
                            }}
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="invite-relationship"
                            style={{
                              display:
                                "block",
                              color:
                                "#334155",
                              fontSize:
                                "12px",
                              fontWeight: 800,
                              marginBottom:
                                "7px",
                            }}
                          >
                            Relationship
                          </label>

                          <select
                            id="invite-relationship"
                            value={
                              inviteRelationship
                            }
                            onChange={(
                              event
                            ) => {
                              setInviteRelationship(
                                event.target
                                  .value as
                                  FamilyOrganizerRelationship
                              );

                              setInvitationError(
                                ""
                              );

                              setInvitationMessage(
                                ""
                              );
                            }}
                            style={{
                              width:
                                "100%",
                              boxSizing:
                                "border-box",
                              padding:
                                "10px 12px",
                              borderRadius:
                                "9px",
                              border:
                                "1px solid #CBD5E1",
                              background:
                                "#FFFFFF",
                              color:
                                "#0F172A",
                              fontSize:
                                "14px",
                              outline:
                                "none",
                            }}
                          >
                            {RELATIONSHIPS.map(
                              (
                                relationship
                              ) => (
                                <option
                                  key={
                                    relationship.value
                                  }
                                  value={
                                    relationship.value
                                  }
                                >
                                  {
                                    relationship.label
                                  }
                                </option>
                              )
                            )}
                          </select>
                        </div>
                      </div>

                      <div
                        style={{
                          marginTop:
                            "18px",
                          padding:
                            "14px 15px",
                          borderRadius:
                            "11px",
                          background:
                            "#F8FAFC",
                          border:
                            "1px solid #E2E8F0",
                          color:
                            "#64748B",
                          fontSize:
                            "12px",
                          lineHeight: 1.65,
                        }}
                      >
                        The invitation
                        connects this
                        person to the
                        same child
                        workspace. It
                        does not create
                        a separate copy
                        of the child or
                        Journey.
                      </div>

                      {invitationError ? (
                        <div
                          style={{
                            marginTop:
                              "14px",
                            padding:
                              "11px 13px",
                            borderRadius:
                              "9px",
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
                          {
                            invitationError
                          }
                        </div>
                      ) : null}

                      {invitationMessage ? (
                        <div
                          style={{
                            marginTop:
                              "14px",
                            padding:
                              "11px 13px",
                            borderRadius:
                              "9px",
                            background:
                              "#F0FDF4",
                            border:
                              "1px solid #BBF7D0",
                            color:
                              "#166534",
                            fontSize:
                              "12px",
                            lineHeight: 1.5,
                          }}
                        >
                          {
                            invitationMessage
                          }
                        </div>
                      ) : null}

                      <button
                        type="submit"
                        disabled={
                          sendingInvitation
                        }
                        style={{
                          marginTop:
                            "18px",
                          padding:
                            "11px 17px",
                          borderRadius:
                            "10px",
                          border:
                            "none",
                          background:
                            "#2563EB",
                          color:
                            "#FFFFFF",
                          fontSize:
                            "13px",
                          fontWeight: 800,
                          cursor:
                            sendingInvitation
                              ? "not-allowed"
                              : "pointer",
                          opacity:
                            sendingInvitation
                              ? 0.65
                              : 1,
                        }}
                      >
                        {sendingInvitation
                          ? "Creating Invitation..."
                          : "Send Invitation"}
                      </button>
                    </form>
                  </section>
                ) : (
                  <section
                    style={{
                      background:
                        "#F5F3FF",
                      border:
                        "1px solid #DDD6FE",
                      borderRadius:
                        "16px",
                      padding:
                        "20px",
                      marginBottom:
                        "18px",
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
                      Shared Family
                      Access
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
                      You have access
                      to this child
                      through a Family
                      Team invitation.
                      The account owner
                      manages Family
                      Team invitations
                      and member access.
                    </p>
                  </section>
                )}

                {/* ==============================================
                    ACCESS EXPLANATION
                =============================================== */}

                <section
                  style={{
                    background:
                      "#FFFFFF",
                    border:
                      "1px solid #E2E8F0",
                    borderRadius:
                      "16px",
                    padding:
                      "20px",
                    marginBottom:
                      "18px",
                  }}
                >
                  <div
                    style={{
                      color:
                        "#334155",
                      fontSize:
                        "13px",
                      fontWeight: 800,
                    }}
                  >
                    How Family Team
                    access works
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
                    Family Team
                    members use their
                    own Myriad login
                    while connecting
                    to the same
                    canonical child.
                    This keeps the
                    family working
                    from one shared
                    child workspace
                    instead of
                    creating separate
                    profiles.
                  </p>
                </section>
              </>
            ) : null}

            {/* ================================================
                NAVIGATION
            ================================================= */}

            <div
              style={{
                marginTop:
                  "28px",
                display:
                  "flex",
                alignItems:
                  "center",
                gap:
                  "18px",
                flexWrap:
                  "wrap",
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
                ← Back to Family
                Organizer
              </Link>

              <Link
                href="/family-organizer/invitations"
                style={{
                  color:
                    "#7C3AED",
                  fontSize:
                    "13px",
                  fontWeight: 750,
                  textDecoration:
                    "none",
                }}
              >
                View My Invitations
              </Link>
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}