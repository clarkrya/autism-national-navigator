
interface WelcomeProps {
  onBegin: () => void;
}

export default function Welcome({
  onBegin,
}: WelcomeProps) {
  return (
    <main
      style={{
        minHeight: "calc(100vh - 150px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "50px 24px 80px",
        boxSizing: "border-box",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: "760px",
          padding: "52px 48px",
          background: "#FFFFFF",
          border: "1px solid #DCE8EA",
          borderRadius: "24px",
          boxShadow:
            "0 12px 35px rgba(32, 77, 106, 0.08)",
          textAlign: "center",
          boxSizing: "border-box",
        }}
      >
        {/* AUTIVOYA BRAND LABEL */}

        <div
          style={{
            display: "inline-block",
            marginBottom: "18px",
            padding: "7px 14px",
            borderRadius: "999px",
            background: "#EAF5F4",
            color: "#217D7A",
            fontSize: "11px",
            fontWeight: 800,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Autivoya
        </div>

        {/* PRIMARY HEADING */}

        <h1
          style={{
            margin: "0 0 10px",
            fontSize: "44px",
            lineHeight: 1.15,
            fontWeight: 800,
            color: "#204D6A",
          }}
        >
          Begin Your Journey
        </h1>

        {/* SUBHEADING */}

        <h2
          style={{
            margin: "0 0 22px",
            fontSize: "23px",
            lineHeight: 1.35,
            fontWeight: 700,
            color: "#173B52",
          }}
        >
          Know What Comes Next.
        </h2>

        {/* DESCRIPTION */}

        <p
          style={{
            margin: "0 auto",
            maxWidth: "650px",
            fontSize: "17px",
            lineHeight: 1.7,
            color: "#526779",
          }}
        >
          Tell us a little about your family and what
          matters most right now. We'll use your answers
          to create a personalized starting point for
          your journey.
        </p>

        {/* PRIMARY ACTION */}

        <button
          type="button"
          onClick={onBegin}
          style={{
            marginTop: "30px",
            padding: "14px 26px",
            border: "none",
            borderRadius: "10px",
            background: "#F7AD3F",
            color: "#173B52",
            fontSize: "16px",
            fontWeight: 800,
            cursor: "pointer",
            boxShadow:
              "0 6px 16px rgba(247, 173, 63, 0.22)",
          }}
        >
          Begin My Journey →
        </button>

        {/* ACCOUNT NOTE */}

        <p
          style={{
            margin: "14px 0 0",
            color: "#718096",
            fontSize: "13px",
            lineHeight: 1.5,
          }}
        >
          No account required to get started.
        </p>
      </section>
    </main>
  );
}
