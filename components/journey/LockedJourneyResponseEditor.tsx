"use client";

export default function LockedJourneyResponseEditor() {
  return (
    <div
      style={{
        marginTop: 18,
        padding: 16,
        background: "#F8FAFC",
        border: "1px solid #E2E8F0",
        borderRadius: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: 8,
        }}
      >
        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "#204D6A",
          }}
        >
          🔒 My Journey Notes
        </span>

        <span
          style={{
            color: "#64748B",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          Premium Feature
        </span>
      </div>

      <p
        style={{
          fontSize: 13,
          lineHeight: 1.5,
          color: "#64748B",
          margin: "0 0 12px",
        }}
      >
        Record your progress, observations,
        questions, or next steps with
        Autivoya Premium.
      </p>

      <textarea
        disabled
        aria-label="My Journey Notes — Premium Feature"
        placeholder="Available with Autivoya Premium"
        rows={5}
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: 12,
          border: "1px solid #CBD5E1",
          borderRadius: 9,
          background: "#F1F5F9",
          color: "#64748B",
          fontSize: 14,
          lineHeight: 1.6,
          resize: "none",
          fontFamily: "inherit",
          cursor: "not-allowed",
        }}
      />

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginTop: 16,
        }}
      >
        <button
          type="button"
          disabled
          style={{
            padding: "10px 20px",
            borderRadius: 9,
            border: "1px solid #E2E8F0",
            background: "#F1F5F9",
            color: "#64748B",
            fontSize: 13,
            fontWeight: 700,
            cursor: "not-allowed",
          }}
        >
          🔒 Save Notes
        </button>
      </div>
    </div>
  );
}