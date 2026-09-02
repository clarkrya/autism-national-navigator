"use client";

import type {
  SavedChild,
} from "../../lib/journeyRepository";

interface ChildJourneyControlsProps {
  savedChildren: SavedChild[];
  selectedChildId: string;
  onSelectChild: (childId: string) => void;
  onAddChild: () => void;
  onRemoveChild: () => void;
}

export default function ChildJourneyControls({
  savedChildren,
  selectedChildId,
  onSelectChild,
  onAddChild,
  onRemoveChild,
}: ChildJourneyControlsProps) {
  return (
    <div
      style={{
        maxWidth: "1050px",
        margin: "24px auto 0",
        padding: "0 24px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
          flexWrap: "wrap",
          padding: "16px 18px",
          background: "#FFFFFF",
          border: "1px solid #E2E8F0",
          borderRadius: "14px",
          boxShadow: "0 4px 14px rgba(15,23,42,.05)",
        }}
      >
        <div>
          <div
            style={{
              color: "#0F172A",
              fontSize: "15px",
              fontWeight: 800,
              marginBottom: "3px",
            }}
          >
            Child Journey
          </div>

          <div
            style={{
              color: "#64748B",
              fontSize: "13px",
            }}
          >
            View another child or add a separate child journey.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          {savedChildren.length > 1 && (
            <select
              value={selectedChildId}
              onChange={(event) =>
                onSelectChild(event.target.value)
              }
              aria-label="Select child journey"
              style={{
                minWidth: "200px",
                padding: "11px 14px",
                borderRadius: "10px",
                border: "1px solid #CBD5E1",
                background: "#FFFFFF",
                color: "#0F172A",
                fontSize: "14px",
                fontWeight: 700,
              }}
            >
              {savedChildren.map((child) => (
                <option
                  key={child.childId}
                  value={child.childId}
                >
                  {child.familyProfile.childName ||
                    "Unnamed Child"}
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={onAddChild}
            style={{
              padding: "11px 15px",
              borderRadius: "10px",
              border: "1px solid #2563EB",
              background: "#FFFFFF",
              color: "#2563EB",
              fontSize: "13px",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            + Add Another Child
          </button>

          <button
            type="button"
            onClick={onRemoveChild}
            style={{
              padding: "11px 15px",
              borderRadius: "10px",
              border: "1px solid #FCA5A5",
              background: "#FFFFFF",
              color: "#B91C1C",
              fontSize: "13px",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Remove Child
          </button>
        </div>
      </div>
    </div>
  );
}