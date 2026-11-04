"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import type {
  User,
} from "firebase/auth";

import {
  getCurrentUser,
  watchAuthState,
} from "../../lib/auth";

import {
  getPendingFamilyOrganizerInvitationsForEmail,
} from "../../lib/familyOrganizer/familyOrganizerRepository";

import {
  getFamilyOrganizerSharedChildName,
} from "../../lib/familyOrganizer/familyOrganizerSharedChildRepository";

import type {
  FamilyOrganizerInvitation,
} from "../../lib/familyOrganizer/familyOrganizerTypes";

import type {
  FamilyOrganizerInvitationActionResult,
} from "../../lib/familyOrganizer/familyOrganizerInvitationActions";

import FamilyOrganizerInvitationCard from "./FamilyOrganizerInvitationCard";

/*
 * ============================================================
 * FAMILY ORGANIZER PENDING INVITATIONS
 * ============================================================
 *
 * Displays pending Family Organizer invitations for the
 * currently authenticated user's email address.
 * ============================================================
 */

interface PendingInvitationRecord {
  invitation:
    FamilyOrganizerInvitation;

  childName:
    string;
}

/*
 * ============================================================
 * ERROR MESSAGE
 * ============================================================
 */

function getErrorMessage(
  error: unknown
): string {
  if (
    error instanceof Error &&
    error.message.trim()
  ) {
    return error.message;
  }

  return "We couldn't load your Family Organizer invitations right now.";
}

/*
 * ============================================================
 * COMPONENT
 * ============================================================
 */

export default function FamilyOrganizerPendingInvitations() {
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
    loading,
    setLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    invitations,
    setInvitations,
  ] = useState<
    PendingInvitationRecord[]
  >([]);

  /*
   * ==========================================================
   * AUTH
   * ==========================================================
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
   * ==========================================================
   * LOAD INVITATIONS
   * ==========================================================
   */

  const loadInvitations =
    useCallback(
      async () => {
        if (
          !currentUser ||
          !currentUser.email
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

          setError(
            ""
          );

          const pendingInvitations =
            await getPendingFamilyOrganizerInvitationsForEmail(
              currentUser.email
            );

          const invitationRecords =
            await Promise.all(
              pendingInvitations.map(
                async (
                  invitation
                ): Promise<
                  PendingInvitationRecord
                > => {
                  let childName =
                    "this child";

                  try {
                    const resolvedChildName =
                      await getFamilyOrganizerSharedChildName(
                        currentUser.uid,
                        invitation.ownerUserId,
                        invitation.childId
                      );

                    if (
                      resolvedChildName
                    ) {
                      childName =
                        resolvedChildName;
                    }
                  } catch {
                    /*
                     * The invited user may not yet have
                     * membership access to read the canonical
                     * child. The invitation still remains
                     * valid and can be displayed.
                     */
                  }

                  return {
                    invitation,

                    childName,
                  };
                }
              )
            );

          setInvitations(
            invitationRecords
          );
        } catch (loadError) {
          console.error(
            "Unable to load Family Organizer invitations:",
            loadError
          );

          setInvitations(
            []
          );

          setError(
            getErrorMessage(
              loadError
            )
          );
        } finally {
          setLoading(
            false
          );
        }
      },
      [currentUser]
    );

  /*
   * ==========================================================
   * LOAD AFTER AUTH
   * ==========================================================
   */

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
   * ==========================================================
   * ACTION COMPLETE
   * ==========================================================
   */

  const handleComplete =
    useCallback(
      (
        result:
          FamilyOrganizerInvitationActionResult
      ) => {
        setInvitations(
          (currentInvitations) =>
            currentInvitations.filter(
              (record) =>
                record.invitation.id !==
                result.invitationId
            )
        );

        if (
          result.action ===
          "accepted"
        ) {
          window.dispatchEvent(
            new CustomEvent(
              "family-organizer-membership-changed",
              {
                detail: {
                  ownerUserId:
                    result.ownerUserId,

                  childId:
                    result.childId,

                  membershipId:
                    result.membershipId,
                },
              }
            )
          );
        }
      },
      []
    );

  /*
   * ==========================================================
   * AUTH NOT READY
   * ==========================================================
   */

  if (!authReady) {
    return null;
  }

  /*
   * ==========================================================
   * NOT SIGNED IN
   * ==========================================================
   */

  if (!currentUser) {
    return null;
  }

  /*
   * ==========================================================
   * NO EMAIL
   * ==========================================================
   */

  if (!currentUser.email) {
    return null;
  }

  /*
   * ==========================================================
   * LOADING
   * ==========================================================
   */

  if (
    loading &&
    invitations.length === 0
  ) {
    return (
      <div
        style={{
          width: "100%",
          padding: "18px",
          border:
            "1px solid #E2E8F0",
          borderRadius: "16px",
          background: "#FFFFFF",
          color: "#64748B",
          fontSize: "13px",
          fontWeight: 650,
        }}
      >
        Loading Family Team invitations...
      </div>
    );
  }

  /*
   * ==========================================================
   * ERROR
   * ==========================================================
   */

  if (
    error &&
    invitations.length === 0
  ) {
    return (
      <div
        style={{
          width: "100%",
          padding: "16px",
          borderRadius: "14px",
          background: "#FEF2F2",
          color: "#B91C1C",
          fontSize: "12px",
          lineHeight: 1.5,
          fontWeight: 650,
        }}
      >
        {error}
      </div>
    );
  }

  /*
   * ==========================================================
   * NOTHING PENDING
   * ==========================================================
   */

  if (
    invitations.length === 0
  ) {
    return null;
  }

  /*
   * ==========================================================
   * RENDER
   * ==========================================================
   */

  return (
    <section
      style={{
        width: "100%",
      }}
    >
      <div
        style={{
          marginBottom: "14px",
        }}
      >
        <h2
          style={{
            margin: "0 0 5px",
            color: "#0F172A",
            fontSize: "18px",
            lineHeight: 1.3,
            fontWeight: 850,
          }}
        >
          Family Team Invitations
        </h2>

        <p
          style={{
            margin: 0,
            color: "#64748B",
            fontSize: "12px",
            lineHeight: 1.5,
          }}
        >
          Review invitations to collaborate in a shared Family Organizer.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gap: "14px",
        }}
      >
        {invitations.map(
          ({
            invitation,
            childName,
          }) => (
            <FamilyOrganizerInvitationCard
              key={
                invitation.id
              }
              invitation={
                invitation
              }
              currentUserId={
                currentUser.uid
              }
              currentUserEmail={
                currentUser.email ??
                ""
              }
              childName={
                childName
              }
              onComplete={
                handleComplete
              }
            />
          )
        )}
      </div>
    </section>
  );
}