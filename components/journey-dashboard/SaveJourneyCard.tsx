"use client";

import Link from "next/link";

type SaveJourneyCardProps = {
  savingJourney:
    boolean;

  saveMessage:
    string;

  saveError:
    string;

  showSaveAccountPrompt:
    boolean;

  onSave:
    () => void | Promise<void>;
};

function AccountLinks({
  message,
}: {
  message: string;
}) {
  return (
    <div
      style={{
        marginTop: "22px",
        paddingTop: "20px",
        borderTop:
          "1px solid #BFDBFE",
      }}
    >
      <div
        style={{
          color: "#0F172A",
          fontSize: "15px",
          fontWeight: 700,
          marginBottom: "12px",
        }}
      >
        {message}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent:
            "center",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        <Link
          href="/login"
          style={{
            padding:
              "10px 18px",
            borderRadius: "9px",
            background:
              "#2563EB",
            color: "#FFFFFF",
            fontSize: "14px",
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          Log In
        </Link>

        <Link
          href="/signup"
          style={{
            padding:
              "10px 18px",
            borderRadius: "9px",
            border:
              "1px solid #2563EB",
            background:
              "#FFFFFF",
            color: "#2563EB",
            fontSize: "14px",
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          Create Free Account
        </Link>
      </div>
    </div>
  );
}

export default function SaveJourneyCard({
  savingJourney,
  saveMessage,
  saveError,
  showSaveAccountPrompt,
  onSave,
}: SaveJourneyCardProps) {
  return (
    <section
      style={{
        marginBottom: "35px",
      }}
    >
      <div
        style={{
          padding: "24px",
          borderRadius: "20px",
          border:
            "1px solid #BFDBFE",
          background: "#EFF6FF",
          textAlign: "center",
        }}
      >
        <h2
          style={{
            margin: 0,
            color: "#0F172A",
            fontSize: "23px",
            fontWeight: 800,
          }}
        >
          Want to keep your journey?
        </h2>

        <p
          style={{
            color: "#64748B",
            lineHeight: 1.6,
            margin:
              "9px auto 18px",
            maxWidth: "620px",
            fontSize: "15px",
          }}
        >
          Save your personalized
          journey so you can come back
          to it and keep moving
          forward.
        </p>

        <button
          type="button"
          onClick={onSave}
          disabled={savingJourney}
          style={{
            padding: "13px 22px",
            borderRadius: "10px",
            border: "none",
            color: "#FFFFFF",
            fontSize: "15px",
            fontWeight: 800,
            background:
              savingJourney
                ? "#93C5FD"
                : "#2563EB",
            cursor:
              savingJourney
                ? "default"
                : "pointer",
          }}
        >
          {savingJourney
            ? "Saving..."
            : "💾 Save My Journey"}
        </button>

        {saveMessage && (
          <div
            style={{
              marginTop: "15px",
              color: "#047857",
              fontSize: "14px",
              fontWeight: 700,
            }}
          >
            ✓ {saveMessage}
          </div>
        )}

        {saveError && (
          <div
            style={{
              marginTop: "15px",
              color: "#B91C1C",
              fontSize: "14px",
              lineHeight: 1.5,
            }}
          >
            {saveError}
          </div>
        )}

        {showSaveAccountPrompt && (
          <AccountLinks
            message="Create a free account or log in to save your journey."
          />
        )}
      </div>
    </section>
  );
}