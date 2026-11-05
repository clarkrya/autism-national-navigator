
"use client";

import type {
  FamilyOrganizerWorkspaceChild,
} from "../../lib/familyOrganizer/familyOrganizerWorkspace";

import {
  normalizeFamilyOrganizerAccessLevel,
} from "../../lib/familyOrganizer/familyOrganizerTypes";

/*
 * ============================================================
 * AUTIVOYA — FAMILY ORGANIZER WORKSPACE SELECTOR
 * ============================================================
 *
 * Switch between:
 * - Children owned by the signed-in user
 * - Children shared through Family Team
 *
 * Always preserve ownerUserId and childId.
 *
 * Permission labels:
 * - Primary Owner
 * - Viewer
 * - Contributor
 * - Administrator
 *
 * Legacy memberships default to Viewer.
 * ============================================================
 */

interface FamilyOrganizerWorkspaceSelectorProps {
  workspaces: FamilyOrganizerWorkspaceChild[];

  selectedWorkspace: FamilyOrganizerWorkspaceChild | null;

  onSelect: (
    workspace: FamilyOrganizerWorkspaceChild
  ) => void;

  disabled?: boolean;
}

function buildWorkspaceKey(
  workspace: FamilyOrganizerWorkspaceChild
): string {
  return [
    workspace.ownerUserId,
    workspace.childId,
  ].join("::");
}

function getWorkspaceAccessLabel(
  workspace: FamilyOrganizerWorkspaceChild
): string {
  if (workspace.role !== "family_member") {
    return "Primary Owner";
  }

  const accessLevel =
    normalizeFamilyOrganizerAccessLevel(
      workspace.accessLevel
    );

  switch (accessLevel) {
    case "administrator":
      return "Administrator";

    case "contributor":
      return "Contributor";

    default:
      return "Viewer";
  }
}

function getWorkspaceAccessColors(
  workspace: FamilyOrganizerWorkspaceChild
): {
  background: string;
  color: string;
} {
  if (workspace.role !== "family_member") {
    return {
      background: "#EFF6FF",
      color: "#1D4ED8",
    };
  }

  const accessLevel =
    normalizeFamilyOrganizerAccessLevel(
      workspace.accessLevel
    );

  switch (accessLevel) {
    case "administrator":
      return {
        background: "#FDF2F8",
        color: "#9D174D",
      };

    case "contributor":
      return {
        background: "#ECFDF5",
        color: "#047857",
      };

    default:
      return {
        background: "#F5F3FF",
        color: "#6D28D9",
      };
  }
}

function WorkspaceAccessBadge({
  workspace,
}: {
  workspace: FamilyOrganizerWorkspaceChild;
}) {
  const colors =
    getWorkspaceAccessColors(workspace);

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "5px 9px",
        borderRadius: "999px",
        background: colors.background,
        color: colors.color,
        fontSize: "10px",
        fontWeight: 800,
        letterSpacing: "0.03em",
        whiteSpace: "nowrap",
      }}
    >
      {getWorkspaceAccessLabel(workspace)}
    </span>
  );
}

export default function FamilyOrganizerWorkspaceSelector({
  workspaces,
  selectedWorkspace,
  onSelect,
  disabled = false,
}: FamilyOrganizerWorkspaceSelectorProps) {
  if (workspaces.length === 0) {
    return null;
  }

  /*
   * ----------------------------------------------------------
   * SINGLE WORKSPACE
   * ----------------------------------------------------------
   */

  if (workspaces.length === 1) {
    const workspace = workspaces[0];

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
            gap: "8px",
            padding: "7px 11px",
            borderRadius: "999px",
            background: "#F8FAFC",
            border: "1px solid #E2E8F0",
          }}
        >
          <span
            style={{
              color: "#0F172A",
              fontSize: "12px",
              fontWeight: 800,
            }}
          >
            {workspace.childName}
          </span>

          <WorkspaceAccessBadge
            workspace={workspace}
          />
        </div>
      </div>
    );
  }

  /*
   * ----------------------------------------------------------
   * MULTIPLE WORKSPACES
   * ----------------------------------------------------------
   */

  const selectedKey = selectedWorkspace
    ? buildWorkspaceKey(selectedWorkspace)
    : "";

  const activeWorkspace =
    workspaces.find(
      (workspace) =>
        buildWorkspaceKey(workspace) ===
        selectedKey
    ) ?? null;

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
          const nextWorkspace =
            workspaces.find(
              (workspace) =>
                buildWorkspaceKey(workspace) ===
                event.target.value
            );

          if (nextWorkspace) {
            onSelect(nextWorkspace);
          }
        }}
        style={{
          minWidth: "210px",
          padding: "9px 36px 9px 12px",
          border: "1px solid #CBD5E1",
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
        {workspaces.map((workspace) => {
          const key =
            buildWorkspaceKey(workspace);

          const accessLabel =
            getWorkspaceAccessLabel(workspace);

          return (
            <option
              key={key}
              value={key}
            >
              {workspace.childName} — {accessLabel}
            </option>
          );
        })}
      </select>

      {activeWorkspace ? (
        <WorkspaceAccessBadge
          workspace={activeWorkspace}
        />
      ) : null}
    </div>
  );
}
