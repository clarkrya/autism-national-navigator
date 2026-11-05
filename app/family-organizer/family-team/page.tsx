
"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type {
  CSSProperties,
  FormEvent,
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
  updateFamilyOrganizerMemberAccess,
} from "../../../lib/familyOrganizer/familyOrganizerRepository";

import type {
  FamilyOrganizerAccessLevel,
  FamilyOrganizerInvitation,
  FamilyOrganizerMembership,
  FamilyOrganizerRelationship,
} from "../../../lib/familyOrganizer/familyOrganizerTypes";

import {
  normalizeFamilyOrganizerAccessLevel,
} from "../../../lib/familyOrganizer/familyOrganizerTypes";

/*
 * ============================================================
 * AUTIVOYA — FAMILY TEAM
 * ============================================================
 *
 * Primary owner:
 * - Invite family members
 * - View pending invitations
 * - Cancel invitations
 * - View active memberships
 * - Assign member permissions
 * - Remove members
 *
 * Shared member:
 * - View their own access level
 * - Access the canonical shared workspace
 *
 * Relationship and access level are independent.
 *
 * Legacy memberships default to Viewer.
 *
 * Permission enforcement remains server-side
 * through Firestore security rules.
 * ============================================================
 */

const BRAND = {
  navy: "#204D6A",
  darkNavy: "#173B52",
  teal: "#58AAA7",
  darkTeal: "#317E7B",
  gold: "#F7AD3F",
  lightTeal: "#EAF6F5",
  background: "#F7FAFB",
  white: "#FFFFFF",
  muted: "#647B8B",
  border: "#DCE7EC",
};

const styles: Record<string, CSSProperties> = {
  card: {
    background: BRAND.white,
    border: `1px solid ${BRAND.border}`,
    borderRadius: 18,
    padding: 26,
    marginBottom: 18,
    boxShadow: "0 8px 24px rgba(23, 59, 82, 0.04)",
  },
  title: {
    margin: 0,
    color: BRAND.darkNavy,
    fontSize: 20,
    fontWeight: 800,
  },
  body: {
    color: BRAND.muted,
    fontSize: 13,
    lineHeight: 1.65,
  },
  label: {
    display: "block",
    color: BRAND.navy,
    fontSize: 12,
    fontWeight: 800,
    marginBottom: 7,
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 12px",
    borderRadius: 9,
    border: `1px solid ${BRAND.border}`,
    background: BRAND.white,
    color: BRAND.darkNavy,
    fontSize: 14,
  },
  button: {
    padding: "11px 17px",
    borderRadius: 10,
    border: "none",
    background: BRAND.darkTeal,
    color: BRAND.white,
    fontSize: 13,
    fontWeight: 800,
    cursor: "pointer",
  },
  link: {
    color: BRAND.darkTeal,
    fontSize: 13,
    fontWeight: 750,
    textDecoration: "none",
  },
  notice: {
    padding: "14px 15px",
    borderRadius: 11,
    background: BRAND.lightTeal,
    border: "1px solid #D1EAE8",
    color: BRAND.navy,
    fontSize: 12,
    lineHeight: 1.65,
  },
  error: {
    marginTop: 12,
    padding: "11px 13px",
    borderRadius: 9,
    background: "#FEF2F2",
    border: "1px solid #FECACA",
    color: "#B91C1C",
    fontSize: 12,
    lineHeight: 1.5,
  },
};

type TeamRow = {
  id: string;
  email?: string;
  relationship: string;
  status: "pending" | "active";
  accessLevel: FamilyOrganizerAccessLevel;
  invitationId?: string;
  membershipId?: string;
};

const RELATIONSHIPS: {
  value: FamilyOrganizerRelationship;
  label: string;
}[] = [
  { value: "parent", label: "Parent" },
  { value: "stepparent", label: "Stepparent" },
  { value: "guardian", label: "Guardian" },
  { value: "grandparent", label: "Grandparent" },
  { value: "sibling", label: "Sibling" },
  { value: "relative", label: "Other Relative" },
  { value: "caregiver", label: "Caregiver" },
  { value: "other", label: "Other" },
];

const ACCESS_LEVELS: {
  value: FamilyOrganizerAccessLevel;
  label: string;
  description: string;
}[] = [
  {
    value: "viewer",
    label: "Viewer",
    description: "Can view permitted shared information.",
  },
  {
    value: "contributor",
    label: "Contributor",
    description:
      "Can view shared information and make permitted progress updates once enabled.",
  },
  {
    value: "administrator",
    label: "Administrator",
    description:
      "Can manage permitted shared information once administrator workflows are enabled.",
  },
];

function getRelationshipLabel(
  relationship: string
): string {
  return (
    RELATIONSHIPS.find(
      (item) => item.value === relationship
    )?.label ?? relationship
  );
}

function getAccessLabel(
  accessLevel: FamilyOrganizerAccessLevel
): string {
  return (
    ACCESS_LEVELS.find(
      (item) => item.value === accessLevel
    )?.label ?? "Viewer"
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
 * FAMILY MEMBER ROW
 * ============================================================
 */

function TeamMemberRow({
  member,
  busy,
  canManage,
  onRemove,
  onChangeAccess,
}: {
  member: TeamRow;
  busy: boolean;
  canManage: boolean;
  onRemove: () => void;
  onChangeAccess: (
    accessLevel: FamilyOrganizerAccessLevel
  ) => void;
}) {
  const pending = member.status === "pending";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 18,
        padding: "16px 0",
        borderBottom: `1px solid ${BRAND.border}`,
        flexWrap: "wrap",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 13,
          minWidth: 0,
          flex: "1 1 220px",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: 42,
            height: 42,
            borderRadius: 999,
            background: pending
              ? "#FFF3DC"
              : BRAND.lightTeal,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            flexShrink: 0,
          }}
        >
          👤
        </div>

        <div style={{ minWidth: 0 }}>
          <div
            style={{
              color: BRAND.darkNavy,
              fontSize: 14,
              fontWeight: 800,
              overflowWrap: "anywhere",
            }}
          >
            {member.email || "Family member"}
          </div>

          <div
            style={{
              marginTop: 3,
              color: BRAND.muted,
              fontSize: 12,
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
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            padding: "5px 9px",
            borderRadius: 999,
            background: pending
              ? "#FFF3DC"
              : BRAND.lightTeal,
            color: pending
              ? "#986018"
              : BRAND.darkTeal,
            fontSize: 10,
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          {pending ? "Pending" : "Active"}
        </span>

        {pending ? (
          <span
            style={{
              padding: "5px 9px",
              borderRadius: 999,
              background: "#F5F3FF",
              color: "#6D28D9",
              fontSize: 10,
              fontWeight: 800,
            }}
          >
            Viewer on acceptance
          </span>
        ) : canManage && member.membershipId ? (
          <select
            aria-label={`Access level for ${
              member.email || "family member"
            }`}
            value={member.accessLevel}
            disabled={busy}
            onChange={(event) => {
              onChangeAccess(
                event.target.value as
                  FamilyOrganizerAccessLevel
              );
            }}
            style={{
              padding: "8px 10px",
              borderRadius: 9,
              border: `1px solid ${BRAND.border}`,
              background: BRAND.white,
              color: BRAND.darkNavy,
              fontSize: 12,
              fontWeight: 750,
              cursor: busy
                ? "not-allowed"
                : "pointer",
              opacity: busy ? 0.6 : 1,
            }}
          >
            {ACCESS_LEVELS.map((level) => (
              <option
                key={level.value}
                value={level.value}
              >
                {level.label}
              </option>
            ))}
          </select>
        ) : (
          <span
            style={{
              padding: "5px 9px",
              borderRadius: 999,
              background: "#F5F3FF",
              color: "#6D28D9",
              fontSize: 10,
              fontWeight: 800,
            }}
          >
            {getAccessLabel(member.accessLevel)}
          </span>
        )}

        {canManage ? (
          <button
            type="button"
            disabled={busy}
            onClick={onRemove}
            style={{
              padding: "7px 10px",
              borderRadius: 8,
              border: "1px solid #FECACA",
              background: BRAND.white,
              color: "#B91C1C",
              fontSize: 11,
              fontWeight: 800,
              cursor: busy
                ? "not-allowed"
                : "pointer",
              opacity: busy ? 0.6 : 1,
            }}
          >
            {pending ? "Cancel" : "Remove"}
          </button>
        ) : null}
      </div>
    </div>
  );
}

/*
 * ============================================================
 * FAMILY TEAM PAGE
 * ============================================================
 */

export default function FamilyTeamPage() {
  const {
    currentUser,
    authReady,
    loading: loadingWorkspaces,
    error: workspaceError,
    workspaces,
    selectedWorkspace,
    selectWorkspace,
  } = useFamilyOrganizerWorkspace();

  const [invitations, setInvitations] =
    useState<FamilyOrganizerInvitation[]>([]);

  const [memberships, setMemberships] =
    useState<FamilyOrganizerMembership[]>([]);

  const [loadingTeam, setLoadingTeam] =
    useState(false);

  const [teamError, setTeamError] =
    useState("");

  const [teamMessage, setTeamMessage] =
    useState("");

  const [inviteEmail, setInviteEmail] =
    useState("");

  const [
    inviteRelationship,
    setInviteRelationship,
  ] = useState<FamilyOrganizerRelationship>(
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

  const [actionId, setActionId] =
    useState("");

  const selectedChildName =
    selectedWorkspace?.childName ?? "";

  const isOwner =
    selectedWorkspace?.role === "owner" &&
    selectedWorkspace.ownerUserId ===
      currentUser?.uid;

  const currentAccessLevel =
    selectedWorkspace?.role === "owner"
      ? "Primary Owner"
      : getAccessLabel(
          normalizeFamilyOrganizerAccessLevel(
            selectedWorkspace?.accessLevel
          )
        );

  /*
   * Reset messages when switching workspaces.
   */

  useEffect(() => {
    setInvitationMessage("");
    setInvitationError("");
    setTeamError("");
    setTeamMessage("");
  }, [
    selectedWorkspace?.ownerUserId,
    selectedWorkspace?.childId,
  ]);

  /*
   * Load team data.
   *
   * Invitation and membership list reads are
   * owner-only under the current Firestore rules.
   *
   * Shared members see their own workspace
   * access without querying the owner's full
   * invitation or membership list.
   */

  const loadFamilyTeam = useCallback(
    async () => {
      if (
        !currentUser ||
        !selectedWorkspace ||
        !isOwner
      ) {
        setInvitations([]);
        setMemberships([]);
        setLoadingTeam(false);
        return;
      }

      try {
        setLoadingTeam(true);
        setTeamError("");

        const [
          childInvitations,
          childMemberships,
        ] = await Promise.all([
          getFamilyOrganizerInvitationsForChild({
            ownerUserId:
              selectedWorkspace.ownerUserId,
            childId:
              selectedWorkspace.childId,
          }),
          getFamilyOrganizerMembershipsForChild({
            ownerUserId:
              selectedWorkspace.ownerUserId,
            childId:
              selectedWorkspace.childId,
          }),
        ]);

        setInvitations(childInvitations);
        setMemberships(childMemberships);
      } catch (error) {
        console.error(
          "Unable to load Family Team:",
          error
        );

        setInvitations([]);
        setMemberships([]);

        setTeamError(
          getErrorMessage(
            error,
            "We couldn't load the Family Team right now."
          )
        );
      } finally {
        setLoadingTeam(false);
      }
    },
    [
      currentUser,
      selectedWorkspace,
      isOwner,
    ]
  );

  useEffect(() => {
    void loadFamilyTeam();
  }, [loadFamilyTeam]);

  /*
   * Build active and pending rows.
   */

  const teamRows = useMemo<TeamRow[]>(
    () => {
      const pendingRows = invitations
        .filter(
          (invitation) =>
            invitation.status === "pending"
        )
        .map(
          (invitation): TeamRow => ({
            id: `invitation-${invitation.id}`,
            invitationId: invitation.id,
            email: invitation.invitedEmail,
            relationship:
              invitation.relationship,
            status: "pending",
            accessLevel: "viewer",
          })
        );

      const activeRows = memberships
        .filter(
          (membership) =>
            membership.status === "active"
        )
        .map((membership): TeamRow => {
          const sourceInvitation =
            invitations.find(
              (invitation) =>
                invitation.id ===
                membership.invitationId
            );

          return {
            id: `membership-${membership.id}`,
            membershipId: membership.id,
            email:
              sourceInvitation?.invitedEmail,
            relationship:
              membership.relationship,
            status: "active",
            accessLevel:
              normalizeFamilyOrganizerAccessLevel(
                membership.accessLevel
              ),
          };
        });

      return [...activeRows, ...pendingRows];
    },
    [invitations, memberships]
  );

  /*
   * Create invitation.
   *
   * New invitations remain Viewer-only.
   * Owners can elevate an active member later.
   */

  async function handleInviteSubmit(
    event: FormEvent<HTMLFormElement>
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
      inviteEmail.trim().toLowerCase();

    if (!email) {
      setInvitationError(
        "Enter an email address."
      );
      return;
    }

    if (
      currentUser.email &&
      email ===
        currentUser.email.trim().toLowerCase()
    ) {
      setInvitationError(
        "You already own this child's Family Team."
      );
      return;
    }

    try {
      setSendingInvitation(true);
      setInvitationError("");
      setInvitationMessage("");

      await createFamilyOrganizerInvitation({
        ownerUserId:
          selectedWorkspace.ownerUserId,
        childId:
          selectedWorkspace.childId,
        invitedEmail: email,
        relationship: inviteRelationship,
        invitedByUserId:
          currentUser.uid,
        accessLevel: "viewer",
      });

      setInviteEmail("");
      setInviteRelationship("parent");

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
      setSendingInvitation(false);
    }
  }

  /*
   * Cancel invitation.
   */

  async function handleCancelInvitation(
    invitationId: string
  ) {
    if (!isOwner) return;

    try {
      setActionId(invitationId);
      setTeamError("");
      setTeamMessage("");

      await revokeFamilyOrganizerInvitation(
        invitationId
      );

      await loadFamilyTeam();

      setTeamMessage(
        "Invitation canceled."
      );
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
      setActionId("");
    }
  }

  /*
   * Remove active membership.
   */

  async function handleRemoveMembership(
    membershipId: string
  ) {
    if (!isOwner) return;

    try {
      setActionId(membershipId);
      setTeamError("");
      setTeamMessage("");

      await revokeFamilyOrganizerMembership(
        membershipId
      );

      await loadFamilyTeam();

      setTeamMessage(
        "Family member removed."
      );
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
      setActionId("");
    }
  }

  /*
   * Update active member access.
   *
   * Only the primary owner may invoke
   * the repository permission update.
   */

  async function handleChangeMemberAccess(
    membershipId: string,
    nextAccessLevel: FamilyOrganizerAccessLevel
  ) {
    if (
      !isOwner ||
      !currentUser ||
      !membershipId
    ) {
      return;
    }

    const membership =
      memberships.find(
        (item) =>
          item.id === membershipId
      );

    if (
      !membership ||
      membership.status !== "active"
    ) {
      return;
    }

    const previousAccessLevel =
      normalizeFamilyOrganizerAccessLevel(
        membership.accessLevel
      );

    if (
      previousAccessLevel ===
      nextAccessLevel
    ) {
      return;
    }

    try {
      setActionId(membershipId);
      setTeamError("");
      setTeamMessage("");

      await updateFamilyOrganizerMemberAccess({
        membershipId,
        accessLevel: nextAccessLevel,
        updatedByUserId:
          currentUser.uid,
      });

      await loadFamilyTeam();

      setTeamMessage(
        `Member access updated to ${getAccessLabel(
          nextAccessLevel
        )}.`
      );
    } catch (error) {
      console.error(
        "Unable to update member access:",
        error
      );

      setTeamError(
        getErrorMessage(
          error,
          "We couldn't update this member's permissions."
        )
      );

      await loadFamilyTeam();
    } finally {
      setActionId("");
    }
  }

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <main
      style={{
        minHeight: "calc(100vh - 72px)",
        background: BRAND.background,
        padding: "48px 24px 72px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1000,
          margin: "0 auto",
        }}
      >
        {/* PAGE INTRODUCTION */}

        <section
          style={{ marginBottom: 28 }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "6px 10px",
              borderRadius: 999,
              background: BRAND.lightTeal,
              color: BRAND.darkTeal,
              fontSize: 11,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: 16,
            }}
          >
            Autivoya Family Organizer
          </div>

          <h1
            style={{
              margin: 0,
              color: BRAND.darkNavy,
              fontSize: 36,
              lineHeight: 1.15,
              fontWeight: 850,
            }}
          >
            Family Team
          </h1>

          <p
            style={{
              margin: "12px 0 0",
              maxWidth: 760,
              color: BRAND.muted,
              fontSize: 16,
              lineHeight: 1.7,
            }}
          >
            Coordinate with the trusted family
            members helping support your child.
            Each invited person uses their own
            Autivoya account.
          </p>
        </section>

        {/* AUTHENTICATION LOADING */}

        {!authReady ? (
          <section style={styles.card}>
            <div style={styles.body}>
              Loading your Family Team...
            </div>
          </section>
        ) : null}

        {/* SIGNED OUT */}

        {authReady && !currentUser ? (
          <section style={styles.card}>
            <h2 style={styles.title}>
              Sign in to manage your Family Team
            </h2>

            <p style={styles.body}>
              Family Team is tied to your Autivoya
              account and the child workspaces you
              own or have been invited to share.
            </p>

            <Link
              href="/login"
              style={{
                ...styles.button,
                display: "inline-flex",
                marginTop: 12,
                textDecoration: "none",
              }}
            >
              Sign In
            </Link>
          </section>
        ) : null}

        {/* AUTHENTICATED CONTENT */}

        {authReady && currentUser ? (
          <>
            {/* WORKSPACE SELECTOR */}

            <section style={styles.card}>
              {loadingWorkspaces ? (
                <div style={styles.body}>
                  Loading children...
                </div>
              ) : null}

              {!loadingWorkspaces &&
              workspaceError ? (
                <div
                  role="alert"
                  style={styles.error}
                >
                  {workspaceError}
                </div>
              ) : null}

              {!loadingWorkspaces &&
              !workspaceError &&
              workspaces.length > 0 ? (
                <FamilyOrganizerWorkspaceSelector
                  workspaces={workspaces}
                  selectedWorkspace={
                    selectedWorkspace
                  }
                  onSelect={selectWorkspace}
                />
              ) : null}

              {!loadingWorkspaces &&
              !workspaceError &&
              workspaces.length === 0 ? (
                <div>
                  <div
                    style={{
                      color: BRAND.darkNavy,
                      fontSize: 14,
                      fontWeight: 800,
                    }}
                  >
                    No child workspace available
                  </div>

                  <p style={styles.body}>
                    Start a Journey for a child
                    or accept a Family Team
                    invitation first.
                  </p>

                  <div
                    style={{
                      display: "flex",
                      gap: 14,
                      flexWrap: "wrap",
                      marginTop: 13,
                    }}
                  >
                    <Link
                      href="/journey"
                      style={styles.link}
                    >
                      Go to My Journey
                    </Link>

                    <Link
                      href="/family-organizer/invitations"
                      style={styles.link}
                    >
                      Check Invitations
                    </Link>
                  </div>
                </div>
              ) : null}
            </section>

            {/* SELECTED FAMILY TEAM */}

            {selectedWorkspace ? (
              <>
                <section style={styles.card}>
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
                      <h2 style={styles.title}>
                        {selectedChildName}
                        &apos;s Family Team
                      </h2>

                      <p style={styles.body}>
                        {isOwner
                          ? "Manage invitations, active members, and access permissions."
                          : "View your access to this shared child workspace."}
                      </p>
                    </div>

                    <span
                      style={{
                        padding: "6px 10px",
                        borderRadius: 999,
                        background:
                          BRAND.lightTeal,
                        color: BRAND.darkTeal,
                        fontSize: 11,
                        fontWeight: 800,
                      }}
                    >
                      {currentAccessLevel}
                    </span>
                  </div>

                  {/* CURRENT USER */}

                  <div
                    style={{
                      marginTop: 22,
                      padding: 17,
                      borderRadius: 13,
                      background: isOwner
                        ? BRAND.background
                        : BRAND.lightTeal,
                      border: `1px solid ${BRAND.border}`,
                      display: "flex",
                      alignItems: "center",
                      gap: 13,
                    }}
                  >
                    <div
                      aria-hidden="true"
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 999,
                        background:
                          BRAND.lightTeal,
                        display: "flex",
                        alignItems: "center",
                        justifyContent:
                          "center",
                        fontSize: 18,
                        flexShrink: 0,
                      }}
                    >
                      👤
                    </div>

                    <div
                      style={{ minWidth: 0 }}
                    >
                      <div
                        style={{
                          color:
                            BRAND.darkNavy,
                          fontSize: 14,
                          fontWeight: 800,
                        }}
                      >
                        You
                      </div>

                      <div
                        style={{
                          marginTop: 3,
                          color: BRAND.muted,
                          fontSize: 12,
                          lineHeight: 1.5,
                          overflowWrap:
                            "anywhere",
                        }}
                      >
                        {currentAccessLevel}

                        {currentUser.email
                          ? ` • ${currentUser.email}`
                          : ""}
                      </div>
                    </div>
                  </div>

                  {/* FAMILY MEMBERS */}

                  {isOwner ? (
                    <div
                      style={{
                        marginTop: 24,
                      }}
                    >
                      <h3
                        style={{
                          margin: 0,
                          color: BRAND.navy,
                          fontSize: 13,
                          fontWeight: 800,
                        }}
                      >
                        Family members
                      </h3>

                      {loadingTeam ? (
                        <p style={styles.body}>
                          Loading Family Team...
                        </p>
                      ) : teamRows.length > 0 ? (
                        <div>
                          {teamRows.map(
                            (member) => (
                              <TeamMemberRow
                                key={member.id}
                                member={member}
                                canManage={
                                  isOwner
                                }
                                busy={
                                  actionId ===
                                  (member.invitationId ??
                                    member.membershipId ??
                                    "")
                                  ||
                                  actionId ===
                                    member.membershipId
                                }
                                onChangeAccess={(
                                  accessLevel
                                ) => {
                                  if (
                                    member.status ===
                                      "active" &&
                                    member.membershipId
                                  ) {
                                    void handleChangeMemberAccess(
                                      member.membershipId,
                                      accessLevel
                                    );
                                  }
                                }}
                                onRemove={() => {
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
                            ...styles.notice,
                            marginTop: 12,
                            background:
                              BRAND.background,
                          }}
                        >
                          No other family members
                          are connected yet.
                        </div>
                      )}

                      {teamError ? (
                        <div
                          role="alert"
                          style={styles.error}
                        >
                          {teamError}
                        </div>
                      ) : null}

                      {teamMessage ? (
                        <div
                          role="status"
                          style={{
                            ...styles.notice,
                            marginTop: 12,
                          }}
                        >
                          {teamMessage}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div
                      style={{
                        ...styles.notice,
                        marginTop: 20,
                      }}
                    >
                      Your access level is{" "}
                      <strong>
                        {currentAccessLevel}
                      </strong>
                      . The primary owner
                      controls invitations and
                      member permissions.
                    </div>
                  )}
                </section>

                {/* OWNER INVITATION FORM */}

                {isOwner ? (
                  <section
                    style={styles.card}
                  >
                    <h2
                      style={styles.title}
                    >
                      Invite a family member
                    </h2>

                    <p
                      style={styles.body}
                    >
                      Invite someone you trust
                      to collaborate around{" "}
                      {selectedChildName}
                      &apos;s Autivoya Journey.
                      They use their own
                      Autivoya account.
                    </p>

                    <form
                      onSubmit={
                        handleInviteSubmit
                      }
                      style={{
                        marginTop: 22,
                      }}
                    >
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fit, minmax(240px, 1fr))",
                          gap: 14,
                        }}
                      >
                        <div>
                          <label
                            htmlFor="invite-email"
                            style={
                              styles.label
                            }
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
                                event.target.value
                              );
                              setInvitationError(
                                ""
                              );
                              setInvitationMessage(
                                ""
                              );
                            }}
                            placeholder="family@example.com"
                            style={
                              styles.input
                            }
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="invite-relationship"
                            style={
                              styles.label
                            }
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
                                event.target.value as
                                  FamilyOrganizerRelationship
                              );
                              setInvitationError(
                                ""
                              );
                              setInvitationMessage(
                                ""
                              );
                            }}
                            style={
                              styles.input
                            }
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
                          ...styles.notice,
                          marginTop: 18,
                        }}
                      >
                        Invitations begin with
                        Viewer access. Once
                        accepted, the primary
                        owner can assign
                        Contributor or
                        Administrator access.

                        The invitation connects
                        the person to the same
                        child workspace. It does
                        not create a separate
                        child or Journey.
                      </div>

                      {invitationError ? (
                        <div
                          role="alert"
                          style={
                            styles.error
                          }
                        >
                          {
                            invitationError
                          }
                        </div>
                      ) : null}

                      {invitationMessage ? (
                        <div
                          role="status"
                          style={{
                            ...styles.notice,
                            marginTop: 14,
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
                          ...styles.button,
                          marginTop: 18,
                          opacity:
                            sendingInvitation
                              ? 0.65
                              : 1,
                          cursor:
                            sendingInvitation
                              ? "not-allowed"
                              : "pointer",
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
                    style={
                      styles.notice
                    }
                  >
                    <strong>
                      Shared Family Access
                    </strong>

                    <p
                      style={{
                        ...styles.body,
                        marginBottom: 0,
                      }}
                    >
                      You have access to
                      this child through
                      a Family Team
                      invitation.
                      The primary owner
                      manages invitations
                      and permissions.
                    </p>
                  </section>
                )}

                {/* ACCESS EXPLANATION */}

                <section
                  style={{
                    ...styles.card,
                    marginTop: 18,
                  }}
                >
                  <h3
                    style={{
                      margin: 0,
                      color:
                        BRAND.darkNavy,
                      fontSize: 14,
                      fontWeight: 800,
                    }}
                  >
                    How Family Team access works
                  </h3>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(200px, 1fr))",
                      gap: 14,
                      marginTop: 18,
                    }}
                  >
                    {ACCESS_LEVELS.map(
                      (level) => (
                        <div
                          key={
                            level.value
                          }
                          style={{
                            padding: 15,
                            borderRadius: 12,
                            background:
                              BRAND.background,
                            border: `1px solid ${BRAND.border}`,
                          }}
                        >
                          <div
                            style={{
                              color:
                                BRAND.darkNavy,
                              fontSize: 13,
                              fontWeight: 800,
                            }}
                          >
                            {
                              level.label
                            }
                          </div>

                          <p
                            style={{
                              ...styles.body,
                              marginBottom: 0,
                            }}
                          >
                            {
                              level.description
                            }
                          </p>
                        </div>
                      )
                    )}
                  </div>

                  <p
                    style={{
                      ...styles.body,
                      marginBottom: 0,
                      marginTop: 18,
                    }}
                  >
                    The primary owner retains
                    ownership and exclusive
                    deletion rights. Family
                    Team access does not grant
                    access to private Vault
                    documents, Navigator
                    conversations, or account
                    subscription settings.
                    Contributor and
                    Administrator workflows
                    will be enabled only
                    after their permissions
                    are enforced and tested.
                  </p>
                </section>
              </>
            ) : null}

            {/* NAVIGATION */}

            <div
              style={{
                marginTop: 28,
                display: "flex",
                alignItems: "center",
                gap: 18,
                flexWrap: "wrap",
              }}
            >
              <Link
                href="/family-organizer"
                style={styles.link}
              >
                ← Back to Family Organizer
              </Link>

              <Link
                href="/family-organizer/invitations"
                style={styles.link}
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
