"use client";

type AccountCardProps = {
  currentUserEmail:
    string | null;

  loggingOut:
    boolean;

  onLogout:
    () => void | Promise<void>;
};

export default function AccountCard({
  currentUserEmail,
  loggingOut,
  onLogout,
}: AccountCardProps) {
  if (!currentUserEmail) {
    return null;
  }

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
            "1px solid #E2E8F0",
          background: "#FFFFFF",
          display: "flex",
          justifyContent:
            "space-between",
          alignItems: "center",
          gap: "20px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              color: "#64748B",
              fontSize: "12px",
              fontWeight: 800,
              letterSpacing:
                "0.08em",
              textTransform:
                "uppercase",
              marginBottom: "5px",
            }}
          >
            Your Account
          </div>

          <div
            style={{
              color: "#0F172A",
              fontSize: "15px",
              fontWeight: 700,
            }}
          >
            {currentUserEmail}
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          disabled={loggingOut}
          style={{
            padding: "10px 18px",
            borderRadius: "9px",
            border:
              "1px solid #CBD5E1",
            background: "#FFFFFF",
            color: "#475569",
            fontSize: "14px",
            fontWeight: 700,
            cursor: loggingOut
              ? "default"
              : "pointer",
          }}
        >
          {loggingOut
            ? "Logging Out..."
            : "Log Out"}
        </button>
      </div>
    </section>
  );
}