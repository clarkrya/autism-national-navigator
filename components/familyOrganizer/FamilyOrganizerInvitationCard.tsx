"use client";

import {
  useState,
} from "react";

import type {
  FamilyOrganizerInvitation,
} from "../../lib/familyOrganizer/familyOrganizerTypes";

import {
  respondToFamilyOrganizerInvitation,
  type FamilyOrganizerInvitationActionResult,
} from "../../lib/familyOrganizer/familyOrganizerInvitationActions";

/*
 * ============================================================
 * FAMILY ORGANIZER INVITATION CARD
 * ============================================================
 */

interface FamilyOrganizerInvitationCardProps {
  invitation:
    FamilyOrganizerInvitation;

  currentUserId: string;

  currentUserEmail: string;

  childName?: string;

  onComplete?: (
    result:
      FamilyOrganizerInvitationActionResult
  ) => void;
}

/*
 * ============================================================
 * RELATIONSHIP LABEL
 * ============================================================
 */

function formatRelationship(
  relationship: string
): string {
  switch (relationship) {
    case "parent":
      return "Parent";

    case "stepparent":
      return "Stepparent";

    case "guardian":
      return "Guardian";

    case "grandparent":
      return "Grandparent";

    case "sibling":
      return "Sibling";

    case "relative":
      return "Relative";

    case "caregiver":
      return "Caregiver";

    case "other":
      return "Other";

    default:
      return relationship;
  }
}

/*
 * ============================================================
 * COMPONENT
 * ============================================================
 */

export default function FamilyOrganizerInvitationCard({
  invitation,
  currentUserId,
  currentUserEmail,
  childName,
  onComplete,
}: FamilyOrganizerInvitationCardProps) {
  const [
    workingAction,
    setWorkingAction,
  ] = useState<
    "accept" |
    "decline" |
    null
  >(null);

  const [
    error,
    setError,
  ] = useState("");

  /*
   * ==========================================================
   * RESPOND
   * ==========================================================
   */

  async function handleResponse(
    action:
      | "accept"
      | "decline"
  ) {
    if (workingAction) {
      return;
    }

    setWorkingAction(
      action
    );

    setError("");

    try {
      const result =
        await respondToFamilyOrganizerInvitation(
          {
            action,

            invitationId:
              invitation.id,

            currentUserId,

            currentUserEmail,
          }
        );

      onComplete?.(
        result
      );
    } catch (responseError) {
      console.error(
        "Unable to respond to Family Organizer invitation:",
        responseError
      );

      setError(
        responseError instanceof Error
          ? responseError.message
          : "We couldn't update this invitation right now."
      );
    } finally {
      setWorkingAction(
        null
      );
    }
  }

  /*
   * ==========================================================
   * DISPLAY NAME
   * ==========================================================
   */

  const displayChildName =
    childName?.trim() ||
    "this child";

  const relationshipLabel =
    formatRelationship(
      invitation.relationship
    );

  /*
   * ==========================================================
   * RENDER
   * ==========================================================
   */

  return (
    <div
      style={{
        width: "100%",
        border:
          "1px solid #E2E8F0",
        borderRadius: "18px",
        background: "#FFFFFF",
        padding: "20px",
        boxShadow:
          "0 8px 24px rgba(15, 23, 42, 0.06)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems:
            "flex-start",
          justifyContent:
            "space-between",
          gap: "16px",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            flex: "1 1 320px",
          }}
        >
          <div
            style={{
              display:
                "inline-flex",
              alignItems:
                "center",
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
              fontWeight:
                850,
              textTransform:
                "uppercase",
              letterSpacing:
                "0.05em",
              marginBottom:
                "10px",
            }}
          >
            Family Team Invitation
          </div>

          <h3
            style={{
              margin:
                "0 0 8px",
              color:
                "#0F172A",
              fontSize:
                "18px",
              lineHeight:
                1.3,
              fontWeight:
                850,
            }}
          >
            You&apos;ve been invited to help support{" "}
            {displayChildName}
          </h3>

          <p
            style={{
              margin: 0,
              color:
                "#475569",
              fontSize:
                "13px",
              lineHeight:
                1.6,
            }}
          >
            Accepting this invitation will add{" "}
            {displayChildName} to your Family Organizer so you can collaborate using your own Myriad account.
          </p>
        </div>

        <div
          style={{
            display:
              "flex",
            flexDirection:
              "column",
            alignItems:
              "flex-end",
            gap: "6px",
          }}
        >
          <span
            style={{
              color:
                "#64748B",
              fontSize:
                "10px",
              fontWeight:
                700,
              textTransform:
                "uppercase",
              letterSpacing:
                "0.04em",
            }}
          >
            Relationship
          </span>

          <span
            style={{
              padding:
                "6px 10px",
              borderRadius:
                "999px",
              background:
                "#F8FAFC",
              color:
                "#334155",
              fontSize:
                "12px",
              fontWeight:
                800,
              border:
                "1px solid #E2E8F0",
            }}
          >
            {relationshipLabel}
          </span>
        </div>
      </div>

      {error ? (
        <div
          role="alert"
          style={{
            marginTop:
              "16px",
            padding:
              "10px 12px",
            borderRadius:
              "10px",
            background:
              "#FEF2F2",
            color:
              "#B91C1C",
            fontSize:
              "12px",
            lineHeight:
              1.5,
            fontWeight:
              650,
          }}
        >
          {error}
        </div>
      ) : null}

      <div
        style={{
          display: "flex",
          justifyContent:
            "flex-end",
          gap: "10px",
          marginTop:
            "18px",
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          disabled={
            workingAction !==
            null
          }
          onClick={() => {
            void handleResponse(
              "decline"
            );
          }}
          style={{
            border:
              "1px solid #CBD5E1",
            borderRadius:
              "10px",
            background:
              "#FFFFFF",
            color:
              "#475569",
            padding:
              "10px 16px",
            fontSize:
              "12px",
            fontWeight:
              800,
            cursor:
              workingAction
                ? "not-allowed"
                : "pointer",
            opacity:
              workingAction
                ? 0.6
                : 1,
          }}
        >
          {workingAction ===
          "decline"
            ? "Declining..."
            : "Decline"}
        </button>

        <button
          type="button"
          disabled={
            workingAction !==
            null
          }
          onClick={() => {
            void handleResponse(
              "accept"
            );
          }}
          style={{
            border: "none",
            borderRadius:
              "10px",
            background:
              "#6D28D9",
            color:
              "#FFFFFF",
            padding:
              "10px 18px",
            fontSize:
              "12px",
            fontWeight:
              850,
            cursor:
              workingAction
                ? "not-allowed"
                : "pointer",
            opacity:
              workingAction
                ? 0.7
                : 1,
          }}
        >
          {workingAction ===
          "accept"
            ? "Accepting..."
            : "Accept Invitation"}
        </button>
      </div>
    </div>
  );
}