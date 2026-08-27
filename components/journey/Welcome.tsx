interface WelcomeProps {
  onBegin: () => void;
}


export default function Welcome({
  onBegin,
}: WelcomeProps) {

  return (

    <main
      style={{
        minHeight:
          "calc(100vh - 150px)",

        display:
          "flex",

        alignItems:
          "center",

        justifyContent:
          "center",

        padding:
          "50px 24px 80px",

        boxSizing:
          "border-box",
      }}
    >

      <section
        style={{
          width:
            "100%",

          maxWidth:
            "760px",

          padding:
            "52px 48px",

          background:
            "#FFFFFF",

          border:
            "1px solid #E2E8F0",

          borderRadius:
            "24px",

          boxShadow:
            "0 12px 35px rgba(15, 23, 42, 0.07)",

          textAlign:
            "center",

          boxSizing:
            "border-box",
        }}
      >

        {/* ==================================================
            EYEBROW
        =================================================== */}

        <div
          style={{
            display:
              "inline-block",

            marginBottom:
              "18px",

            padding:
              "7px 12px",

            borderRadius:
              "999px",

            background:
              "#EFF6FF",

            color:
              "#2563EB",

            fontSize:
              "11px",

            fontWeight:
              800,

            letterSpacing:
              "0.06em",

            textTransform:
              "uppercase",
          }}
        >
          Myriad Autism Journey
        </div>


        {/* ==================================================
            PRIMARY HEADING
        =================================================== */}

        <h1
          style={{
            margin:
              "0 0 10px",

            fontSize:
              "44px",

            lineHeight:
              1.15,

            fontWeight:
              800,

            color:
              "#0F172A",
          }}
        >
          Begin Your Journey
        </h1>


        {/* ==================================================
            SUBHEADING
        =================================================== */}

        <h2
          style={{
            margin:
              "0 0 22px",

            fontSize:
              "23px",

            lineHeight:
              1.35,

            fontWeight:
              700,

            color:
              "#334155",
          }}
        >
          Know What Comes Next.
        </h2>


        {/* ==================================================
            DESCRIPTION
        =================================================== */}

        <p
          style={{
            margin:
              "0 auto",

            maxWidth:
              "650px",

            fontSize:
              "17px",

            lineHeight:
              1.7,

            color:
              "#64748B",
          }}
        >
          Tell us a little about your family and what
          matters most right now. We'll use your answers
          to create a personalized starting point for
          your journey.
        </p>


        {/* ==================================================
            PRIMARY ACTION
        =================================================== */}

        <button
          type="button"

          onClick={
            onBegin
          }

          style={{
            marginTop:
              "30px",

            padding:
              "14px 26px",

            border:
              "none",

            borderRadius:
              "10px",

            background:
              "#2563EB",

            color:
              "#FFFFFF",

            fontSize:
              "16px",

            fontWeight:
              800,

            cursor:
              "pointer",

            boxShadow:
              "0 6px 16px rgba(37, 99, 235, 0.18)",
          }}
        >
          Begin My Journey →
        </button>


        {/* ==================================================
            ACCOUNT NOTE
        =================================================== */}

        <p
          style={{
            margin:
              "14px 0 0",

            color:
              "#94A3B8",

            fontSize:
              "13px",

            lineHeight:
              1.5,
          }}
        >
          No account required to get started.
        </p>

      </section>

    </main>

  );

}