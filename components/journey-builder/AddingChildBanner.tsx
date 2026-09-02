"use client";

interface AddingChildBannerProps {
  visible: boolean;

  previousChildName?: string;

  canCancel: boolean;

  onCancel: () => void;
}

export default function AddingChildBanner({
  visible,
  previousChildName,
  canCancel,
  onCancel,
}: AddingChildBannerProps) {
  if (!visible) {
    return null;
  }

  return (
    <div
      style={{
        maxWidth: "1050px",
        margin: "24px auto",
        padding: "0 24px",
      }}
    >
      <div
        style={{
          padding: "16px 18px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
          flexWrap: "wrap",
          border: "1px solid #BFDBFE",
          borderRadius: "14px",
          background: "#EFF6FF",
        }}
      >
        <div>
          <div
            style={{
              color: "#0F172A",
              fontWeight: 800,
              fontSize: "15px",
              marginBottom: "3px",
            }}
          >
            Adding a new child
          </div>

          <div
            style={{
              color: "#64748B",
              fontSize: "13px",
              lineHeight: 1.5,
            }}
          >
            This child won't be added to your account until you save
            their Journey.
          </div>
        </div>

        {canCancel && (
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: "10px 14px",
              borderRadius: "9px",
              border: "1px solid #CBD5E1",
              background: "#FFFFFF",
              color: "#475569",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            ← Cancel and return to{" "}
            {previousChildName || "previous child"}
          </button>
        )}
      </div>
    </div>
  );
}