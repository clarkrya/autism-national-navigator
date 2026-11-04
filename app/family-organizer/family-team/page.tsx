
"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { FormEvent, CSSProperties } from "react";

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
 * AUTIVOYA — FAMILY TEAM
 *
 * Preserves the existing family-sharing repository,
 * authentication, workspace selection, invitation creation,
 * membership removal, and owner-only access controls.
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

function getRelationshipLabel(relationship: string): string {
  return (
    RELATIONSHIPS.find((item) => item.value === relationship)
      ?.label ?? relationship
  );
}

function getErrorMessage(
  error: unknown,
  fallback: string
): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

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
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: 42,
            height: 42,
            borderRadius: 999,
            background: pending ? "#FFF3DC" : BRAND.lightTeal,
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
            {getRelationshipLabel(member.relationship)}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span
          style={{
            padding: "5px 9px",
            borderRadius: 999,
            background: pending ? "#FFF3DC" : BRAND.lightTeal,
            color: pending ? "#986018" : BRAND.darkTeal,
            fontSize: 10,
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          {pending ? "Pending" : "Active"}
        </span>

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
              cursor: busy ? "not-allowed" : "pointer",
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

  const [loadingTeam, setLoadingTeam] = useState(false);
  const [teamError, setTeamError] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");

  const [inviteRelationship, setInviteRelationship] =
    useState<FamilyOrganizerRelationship>("parent");

  const [sendingInvitation, setSendingInvitation] =
    useState(false);

  const [invitationMessage, setInvitationMessage] =
    useState("");

  const [invitationError, setInvitationError] =
    useState("");

  const [actionId, setActionId] = useState("");

  const selectedChildName = selectedWorkspace?.childName ?? "";
  const isOwner = selectedWorkspace?.role === "owner";

  /*
   * Reset messages when changing child workspaces.
   */

  useEffect(() => {
    setInvitationMessage("");
    setInvitationError("");
    setTeamError("");
  }, [
    selectedWorkspace?.ownerUserId,
    selectedWorkspace?.childId,
  ]);

  /*
   * Load existing invitations and memberships.
   */

  const loadFamilyTeam = useCallback(async () => {
    if (!currentUser || !selectedWorkspace) {
      setInvitations([]);
      setMemberships([]);
      return;
    }

    try {
      setLoadingTeam(true);
      setTeamError("");

      const [childInvitations, childMemberships] =
        await Promise.all([
          getFamilyOrganizerInvitationsForChild({
            ownerUserId: selectedWorkspace.ownerUserId,
            childId: selectedWorkspace.childId,
          }),
          getFamilyOrganizerMembershipsForChild({
            ownerUserId: selectedWorkspace.ownerUserId,
            childId: selectedWorkspace.childId,
          }),
        ]);

      setInvitations(childInvitations);
      setMemberships(childMemberships);
    } catch (error) {
      console.error("Unable to load Family Team:", error);

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
  }, [currentUser, selectedWorkspace]);

  useEffect(() => {
    void loadFamilyTeam();
  }, [loadFamilyTeam]);

  /*
   * Build pending and active member rows.
   */

  const teamRows = useMemo<TeamRow[]>(() => {
    const pendingRows = invitations
      .filter((invitation) => invitation.status === "pending")
      .map(
        (invitation): TeamRow => ({
          id: `invitation-${invitation.id}`,
          invitationId: invitation.id,
          email: invitation.invitedEmail,
          relationship: invitation.relationship,
          status: "pending",
        })
      );

    const activeRows = memberships
      .filter((membership) => membership.status === "active")
      .map((membership): TeamRow => {
        const sourceInvitation = invitations.find(
          (invitation) =>
            invitation.id === membership.invitationId
        );

        return {
          id: `membership-${membership.id}`,
          membershipId: membership.id,
          email: sourceInvitation?.invitedEmail,
          relationship: membership.relationship,
          status: "active",
        };
      });

    return [...activeRows, ...pendingRows];
  }, [invitations, memberships]);

  /*
   * Create invitation.
   *
   * This calls the existing repository function.
   * Email delivery is not assumed or confirmed here.
   */

  async function handleInviteSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!currentUser || !selectedWorkspace || !isOwner) {
      return;
    }

    const email = inviteEmail.trim().toLowerCase();

    if (!email) {
      setInvitationError("Enter an email address.");
      return;
    }

    if (
      currentUser.email &&
      email === currentUser.email.trim().toLowerCase()
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
        ownerUserId: selectedWorkspace.ownerUserId,
        childId: selectedWorkspace.childId,
        invitedEmail: email,
        relationship: inviteRelationship,
        invitedByUserId: currentUser.uid,
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
   * Cancel pending invitation.
   */

  async function handleCancelInvitation(
    invitationId: string
  ) {
    if (!isOwner) return;

    try {
      setActionId(invitationId);
      setTeamError("");

      await revokeFamilyOrganizerInvitation(invitationId);
      await loadFamilyTeam();
    } catch (error) {
      console.error("Unable to cancel invitation:", error);

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
   * Remove active member.
   */

  async function handleRemoveMembership(
    membershipId: string
  ) {
    if (!isOwner) return;

    try {
      setActionId(membershipId);
      setTeamError("");

      await revokeFamilyOrganizerMembership(membershipId);
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
      setActionId("");
    }
  }

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

        <section style={{ marginBottom: 28 }}>
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
            Coordinate with the trusted family members
            helping support your child. Each invited
            person uses their own Autivoya account.
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

              {!loadingWorkspaces && workspaceError ? (
                <div role="alert" style={styles.error}>
                  {workspaceError}
                </div>
              ) : null}

              {!loadingWorkspaces &&
              !workspaceError &&
              workspaces.length > 0 ? (
                <FamilyOrganizerWorkspaceSelector
                  workspaces={workspaces}
                  selectedWorkspace={selectedWorkspace}
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
                    Start a Journey for a child or accept
                    a Family Team invitation first.
                  </p>

                  <div
                    style={{
                      display: "flex",
                      gap: 14,
                      flexWrap: "wrap",
                      marginTop: 13,
                    }}
                  >
                    <Link href="/journey" style={styles.link}>
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
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 16,
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <h2 style={styles.title}>
                        {selectedChildName}&apos;s Family Team
                      </h2>

                      <p style={styles.body}>
                        {isOwner
                          ? "People who have access or a pending invitation appear here."
                          : "You're viewing the Family Team connected to this shared child."}
                      </p>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        style={{
                          padding: "5px 9px",
                          borderRadius: 999,
                          background: BRAND.lightTeal,
                          color: BRAND.darkTeal,
                          fontSize: 10,
                          fontWeight: 800,
                          textTransform: "uppercase",
                        }}
                      >
                        Autivoya Premium
                      </span>

                      {!isOwner ? (
                        <span
                          style={{
                            padding: "5px 9px",
                            borderRadius: 999,
                            background: BRAND.lightTeal,
                            color: BRAND.navy,
                            fontSize: 10,
                            fontWeight: 800,
                            textTransform: "uppercase",
                          }}
                        >
                          Shared Access
                        </span>
                      ) : null}
                    </div>
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
                        background: BRAND.lightTeal,
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
                          overflowWrap: "anywhere",
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

                  {/* FAMILY MEMBERS */}

                  <div style={{ marginTop: 24 }}>
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
                        {teamRows.map((member) => (
                          <TeamMemberRow
                            key={member.id}
                            member={member}
                            canManage={isOwner}
                            busy={
                              actionId ===
                              (member.invitationId ??
                                member.membershipId ??
                                "")
                            }
                            onRemove={() => {
                              if (!isOwner) return;

                              if (
                                member.status === "pending" &&
                                member.invitationId
                              ) {
                                void handleCancelInvitation(
                                  member.invitationId
                                );
                                return;
                              }

                              if (
                                member.status === "active" &&
                                member.membershipId
                              ) {
                                void handleRemoveMembership(
                                  member.membershipId
                                );
                              }
                            }}
                          />
                        ))}
                      </div>
                    ) : (
                      <div
                        style={{
                          ...styles.notice,
                          marginTop: 12,
                          background: BRAND.background,
                        }}
                      >
                        <div
                          style={{
                            color: BRAND.darkNavy,
                            fontSize: 13,
                            fontWeight: 800,
                          }}
                        >
                          No other family members are
                          connected yet.
                        </div>

                        <p
                          style={{
                            ...styles.body,
                            marginBottom: 0,
                          }}
                        >
                          {isOwner
                            ? "Invite a trusted family member below to begin sharing this child's family workspace."
                            : "The account owner manages invitations and access for this Family Team."}
                        </p>
                      </div>
                    )}

                    {teamError ? (
                      <div role="alert" style={styles.error}>
                        {teamError}
                      </div>
                    ) : null}
                  </div>
                </section>

                {/* OWNER INVITATION FORM */}

                {isOwner ? (
                  <section style={styles.card}>
                    <h2 style={styles.title}>
                      Invite a family member
                    </h2>

                    <p style={styles.body}>
                      Invite someone you trust to collaborate
                      around {selectedChildName}&apos;s
                      Autivoya Journey. They use their own
                      Autivoya account.
                    </p>

                    <form
                      onSubmit={handleInviteSubmit}
                      style={{ marginTop: 22 }}
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
                            style={styles.label}
                          >
                            Email
                          </label>

                          <input
                            id="invite-email"
                            type="email"
                            required
                            value={inviteEmail}
                            onChange={(event) => {
                              setInviteEmail(event.target.value);
                              setInvitationError("");
                              setInvitationMessage("");
                            }}
                            placeholder="family@example.com"
                            style={styles.input}
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="invite-relationship"
                            style={styles.label}
                          >
                            Relationship
                          </label>

                          <select
                            id="invite-relationship"
                            value={inviteRelationship}
                            onChange={(event) => {
                              setInviteRelationship(
                                event.target.value as
                                  FamilyOrganizerRelationship
                              );
                              setInvitationError("");
                              setInvitationMessage("");
                            }}
                            style={styles.input}
                          >
                            {RELATIONSHIPS.map((relationship) => (
                              <option
                                key={relationship.value}
                                value={relationship.value}
                              >
                                {relationship.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div
                        style={{
                          ...styles.notice,
                          marginTop: 18,
                        }}
                      >
                        The invitation connects this person
                        to the same child workspace. It does
                        not create a separate copy of the
                        child or Journey.
                      </div>

                      {invitationError ? (
                        <div role="alert" style={styles.error}>
                          {invitationError}
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
                          {invitationMessage}
                        </div>
                      ) : null}

                      <button
                        type="submit"
                        disabled={sendingInvitation}
                        style={{
                          ...styles.button,
                          marginTop: 18,
                          opacity: sendingInvitation ? 0.65 : 1,
                          cursor: sendingInvitation
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
                  <section style={styles.notice}>
                    <div
                      style={{
                        color: BRAND.darkTeal,
                        fontSize: 13,
                        fontWeight: 800,
                      }}
                    >
                      Shared Family Access
                    </div>

                    <p
                      style={{
                        ...styles.body,
                        marginBottom: 0,
                      }}
                    >
                      You have access to this child through
                      a Family Team invitation. The account
                      owner manages Family Team invitations
                      and member access.
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
                  <div
                    style={{
                      color: BRAND.darkNavy,
                      fontSize: 13,
                      fontWeight: 800,
                    }}
                  >
                    How Family Team access works
                  </div>

                  <p
                    style={{
                      ...styles.body,
                      marginBottom: 0,
                    }}
                  >
                    Family Team members use their own
                    Autivoya account while connecting to
                    the same canonical child. This keeps
                    the family working from one shared
                    child workspace instead of creating
                    separate profiles.
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
