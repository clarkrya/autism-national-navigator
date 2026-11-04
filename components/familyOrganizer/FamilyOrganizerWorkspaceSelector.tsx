"use client";

import type {
  FamilyOrganizerWorkspaceChild,
} from "../../lib/familyOrganizer/familyOrganizerWorkspace";

/*
 * ============================================================
 * FAMILY ORGANIZER WORKSPACE SELECTOR
 * ============================================================
 *
 * Lets a user switch between:
 *
 * - children they own
 * - children shared with them through Family Team
 *
 * Selection preserves BOTH ownerUserId and childId.
 * ============================================================
 */

interface FamilyOrganizerWorkspaceSelectorProps {
  workspaces:
    FamilyOrganizerWorkspaceChild[];

  selectedWorkspace:
    FamilyOrganizerWorkspaceChild | null;

  onSelect:
    (
      workspace:
        FamilyOrganizerWorkspaceChild
    ) => void;

  disabled?: boolean;
}

/*
 * ============================================================
 * WORKSPACE KEY
 * ============================================================
 */

function buildWorkspaceKey(
  workspace:
    FamilyOrganizerWorkspaceChild
): string {
  return [
    workspace.ownerUserId,
    workspace.childId,
  ].join("::");
}

/*
 * ============================================================
 * COMPONENT
 * ============================================================
 */

export default function FamilyOrganizerWorkspaceSelector({
  workspaces,
  selectedWorkspace,
  onSelect,
  disabled = false,
}: FamilyOrganizerWorkspaceSelectorProps) {
  /*
   * ----------------------------------------------------------
   * NO WORKSPACES
   * ----------------------------------------------------------
   */

  if (
    workspaces.length === 0
  ) {
    return null;
  }

  /*
   * ----------------------------------------------------------
   * ONE WORKSPACE
   * ----------------------------------------------------------
   */

  if (
    workspaces.length === 1
  ) {
    const workspace =
      workspaces[0];

    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            color: "#64748B",
            fontSize: "12px",
            fontWeight: 700,
          }}
        >
          Family Organizer for
        </div>

        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "7px",
            padding: "7px 11px",
            borderRadius: "999px",
            background:
              workspace.role ===
              "family_member"
                ? "#F5F3FF"
                : "#EFF6FF",
            color:
              workspace.role ===
              "family_member"
                ? "#6D28D9"
                : "#1D4ED8",
            fontSize: "12px",
            fontWeight: 800,
          }}
        >
          <span>
            {workspace.childName}
          </span>

          {workspace.role ===
          "family_member" ? (
            <span
              style={{
                fontSize: "9px",
                textTransform:
                  "uppercase",
                letterSpacing:
                  "0.04em",
                opacity: 0.8,
              }}
            >
              Shared
            </span>
          ) : null}
        </div>
      </div>
    );
  }

  /*
   * ----------------------------------------------------------
   * MULTIPLE WORKSPACES
   * ----------------------------------------------------------
   */

  const selectedKey =
    selectedWorkspace
      ? buildWorkspaceKey(
          selectedWorkspace
        )
      : "";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        flexWrap: "wrap",
      }}
    >
      <label
        htmlFor="family-organizer-workspace"
        style={{
          color: "#64748B",
          fontSize: "12px",
          fontWeight: 700,
        }}
      >
        Family Organizer for
      </label>

      <select
        id="family-organizer-workspace"
        value={selectedKey}
        disabled={disabled}
        onChange={(event) => {
          const nextKey =
            event.target.value;

          const nextWorkspace =
            workspaces.find(
              (workspace) =>
                buildWorkspaceKey(
                  workspace
                ) === nextKey
            );

          if (nextWorkspace) {
            onSelect(
              nextWorkspace
            );
          }
        }}
        style={{
          minWidth: "210px",
          padding: "9px 36px 9px 12px",
          border:
            "1px solid #CBD5E1",
          borderRadius: "10px",
          background: disabled
            ? "#F1F5F9"
            : "#FFFFFF",
          color: "#0F172A",
          fontSize: "13px",
          fontWeight: 750,
          cursor: disabled
            ? "not-allowed"
            : "pointer",
          outline: "none",
        }}
      >
        {workspaces.map(
          (workspace) => {
            const key =
              buildWorkspaceKey(
                workspace
              );

            const label =
              workspace.role ===
              "family_member"
                ? `${workspace.childName} — Shared`
                : workspace.childName;

            return (
              <option
                key={key}
                value={key}
              >
                {label}
              </option>
            );
          }
        )}
      </select>

      {selectedWorkspace?.role ===
      "family_member" ? (
        <span
          style={{
            padding: "5px 8px",
            borderRadius: "999px",
            background: "#F5F3FF",
            color: "#6D28D9",
            fontSize: "9px",
            fontWeight: 850,
            textTransform:
              "uppercase",
            letterSpacing:
              "0.05em",
          }}
        >
          Shared Family Access
        </span>
      ) : null}
    </div>
  );
}