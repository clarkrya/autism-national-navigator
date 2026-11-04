"use client";

import type {
  FamilyProfile,
} from "../../types/familyProfile";

/*
 * ============================================================
 * PROPS
 * ============================================================
 */

type FamilySnapshotProps = {
  familyProfile: FamilyProfile;
};

/*
 * ============================================================
 * DISPLAY VALUE
 * ============================================================
 */

function formatDisplayValue(
  value: string
) {
  if (!value) {
    return "";
  }

  const normalizedValue =
    value.trim().toLowerCase();

  const specialLabels: Record<
    string,
    string
  > = {
    aba: "ABA",
    iep: "IEP",
    ot: "OT",
    pt: "PT",
    slp: "SLP",
  };

  if (
    specialLabels[
      normalizedValue
    ]
  ) {
    return specialLabels[
      normalizedValue
    ];
  }

  return value
    .replace(
      /[-_]/g,
      " "
    )
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
}

/*
 * ============================================================
 * SNAPSHOT ITEM
 * ============================================================
 */

function SnapshotItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <div
        style={{
          color: "#64748B",
          fontSize: "12px",
          fontWeight: 800,
          letterSpacing:
            "0.05em",
          textTransform:
            "uppercase",
          marginBottom: "6px",
        }}
      >
        {label}
      </div>

      <div
        style={{
          color: "#0F172A",
          fontSize: "16px",
          fontWeight: 700,
          lineHeight: 1.4,
        }}
      >
        {value}
      </div>
    </div>
  );
}

/*
 * ============================================================
 * FAMILY SNAPSHOT
 * ============================================================
 */

export default function FamilySnapshot({
  familyProfile,
}: FamilySnapshotProps) {
  return (
    <section
      style={{
        padding: "24px",
        borderRadius: "20px",
        border:
          "1px solid #E2E8F0",
        background: "#F8FAFC",
        marginBottom: "30px",
      }}
    >
      <div
        style={{
          color: "#2563EB",
          fontSize: "12px",
          fontWeight: 800,
          letterSpacing:
            "0.08em",
          textTransform:
            "uppercase",
          marginBottom: "18px",
        }}
      >
        Your Family Snapshot
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(170px, 1fr))",
          gap: "20px",
        }}
      >
        <SnapshotItem
          label="Age"
          value={
            familyProfile.childAge
              ? `${familyProfile.childAge} years`
              : "Not provided"
          }
        />

        <SnapshotItem
          label="Location"
          value={
            familyProfile.state
              ? formatDisplayValue(
                  familyProfile.state
                )
              : "Not provided"
          }
        />

        <SnapshotItem
          label="Journey Stage"
          value={
            familyProfile.journeyStage
              ? formatDisplayValue(
                  familyProfile.journeyStage
                )
              : "Not provided"
          }
        />

        <SnapshotItem
          label="Insurance"
          value={
            familyProfile.insurance
              ? formatDisplayValue(
                  familyProfile.insurance
                )
              : "Not provided"
          }
        />
      </div>

      {familyProfile.supports?.length >
        0 && (
        <div
          style={{
            marginTop: "22px",
            paddingTop: "20px",
            borderTop:
              "1px solid #E2E8F0",
          }}
        >
          <div
            style={{
              fontSize: "13px",
              fontWeight: 700,
              color: "#475569",
              marginBottom: "9px",
            }}
          >
            Current Supports
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "7px",
            }}
          >
            {familyProfile.supports.map(
              (support) => (
                <span
                  key={support}
                  style={{
                    padding:
                      "7px 12px",
                    borderRadius:
                      "999px",
                    background:
                      "#FFFFFF",
                    border:
                      "1px solid #CBD5E1",
                    color: "#334155",
                    fontSize: "13px",
                    fontWeight: 600,
                  }}
                >
                  {formatDisplayValue(
                    support
                  )}
                </span>
              )
            )}
          </div>
        </div>
      )}

      {familyProfile.priority && (
        <div
          style={{
            marginTop: "20px",
          }}
        >
          <div
            style={{
              fontSize: "13px",
              fontWeight: 700,
              color: "#475569",
              marginBottom: "5px",
            }}
          >
            Top Priority
          </div>

          <div
            style={{
              fontSize: "17px",
              fontWeight: 700,
              color: "#0F172A",
            }}
          >
            {formatDisplayValue(
              familyProfile.priority
            )}
          </div>
        </div>
      )}
    </section>
  );
}