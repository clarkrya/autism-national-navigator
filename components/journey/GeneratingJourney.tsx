"use client";

export default function GeneratingJourney() {
  return (
    <div
      style={{
        minHeight: "60vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "60px 20px",
      }}
    >
      <div
        style={{
          maxWidth: "650px",
          width: "100%",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: "80px",
            height: "80px",
            margin: "0 auto 30px",
            borderRadius: "50%",
            background:
              "linear-gradient(135deg, #2563EB, #14B8A6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            animation: "pulse 2s ease-in-out infinite",
          }}
        >
          <span
            style={{
              fontSize: "36px",
            }}
          >
            ✨
          </span>
        </div>

        <h1
          style={{
            fontSize: "38px",
            fontWeight: 800,
            color: "#0F172A",
            marginBottom: "16px",
          }}
        >
          Creating Your Personalized Journey
        </h1>

        <p
          style={{
            fontSize: "19px",
            lineHeight: 1.7,
            color: "#64748B",
            maxWidth: "560px",
            margin: "0 auto",
          }}
        >
          We're looking at your family's answers and
          identifying the most meaningful next steps
          for your journey.
        </p>

        <div
          style={{
            marginTop: "35px",
            height: "8px",
            background: "#E2E8F0",
            borderRadius: "999px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: "45%",
              background:
                "linear-gradient(90deg, #2563EB, #14B8A6)",
              borderRadius: "999px",
              animation:
                "loading 1.8s ease-in-out infinite",
            }}
          />
        </div>

        <p
          style={{
            marginTop: "18px",
            fontSize: "14px",
            color: "#94A3B8",
          }}
        >
          This may take a few moments.
        </p>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%,
          100% {
            transform: scale(1);
            opacity: 1;
          }

          50% {
            transform: scale(1.05);
            opacity: 0.85;
          }
        }

        @keyframes loading {
          0% {
            transform: translateX(-100%);
          }

          50% {
            transform: translateX(100%);
          }

          100% {
            transform: translateX(220%);
          }
        }
      `}</style>
    </div>
  );
}