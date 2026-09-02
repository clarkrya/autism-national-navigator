"use client";


/*
 * ============================================================
 * START NEW JOURNEY MODAL
 * ============================================================
 *
 * Confirmation dialog used before restarting the selected
 * child's Journey.
 *
 * IMPORTANT:
 *
 * This component does NOT archive or modify Journey data.
 *
 * JourneyBuilder remains responsible for:
 *
 * - determining the selected child
 * - archiving the current Journey
 * - resetting Journey state
 * - handling errors
 *
 * This component only presents the confirmation UI.
 * ============================================================
 */


type StartNewJourneyModalProps = {

  visible:
    boolean;

  childName:
    string;

  starting:
    boolean;

  onCancel:
    () => void;

  onConfirm:
    () => void | Promise<void>;

};


/*
 * ============================================================
 * COMPONENT
 * ============================================================
 */

export default function StartNewJourneyModal({
  visible,
  childName,
  starting,
  onCancel,
  onConfirm,
}: StartNewJourneyModalProps) {

  /*
   * ----------------------------------------------------------
   * HIDDEN
   * ----------------------------------------------------------
   */

  if (
    !visible
  ) {

    return null;

  }


  const displayChildName =
    childName.trim() ||
    "this child";


  /*
   * ----------------------------------------------------------
   * RENDER
   * ----------------------------------------------------------
   */

  return (

    <div
      role="dialog"

      aria-modal="true"

      aria-labelledby="start-new-journey-title"

      style={{
        position:
          "fixed",

        inset:
          0,

        zIndex:
          1000,

        display:
          "flex",

        alignItems:
          "center",

        justifyContent:
          "center",

        padding:
          "24px",

        background:
          "rgba(15, 23, 42, 0.48)",
      }}
    >

      <div
        style={{
          width:
            "100%",

          maxWidth:
            "520px",

          padding:
            "30px",

          background:
            "#FFFFFF",

          borderRadius:
            "20px",

          border:
            "1px solid #E2E8F0",

          boxShadow:
            "0 24px 60px rgba(15,23,42,.20)",

          textAlign:
            "left",
        }}
      >

        {/* ===================================================
            ICON
        ==================================================== */}

        <div
          style={{
            width:
              "46px",

            height:
              "46px",

            display:
              "flex",

            alignItems:
              "center",

            justifyContent:
              "center",

            borderRadius:
              "50%",

            background:
              "#EFF6FF",

            fontSize:
              "22px",

            marginBottom:
              "18px",
          }}
        >
          🧭
        </div>


        {/* ===================================================
            TITLE
        ==================================================== */}

        <h2
          id="start-new-journey-title"

          style={{
            margin:
              "0 0 12px",

            color:
              "#0F172A",

            fontSize:
              "24px",

            fontWeight:
              800,
          }}
        >
          Start a new journey for{" "}
          {displayChildName}?
        </h2>


        {/* ===================================================
            DESCRIPTION
        ==================================================== */}

        <p
          style={{
            margin:
              "0 0 22px",

            color:
              "#64748B",

            fontSize:
              "15px",

            lineHeight:
              1.7,
          }}
        >
          This will restart{" "}
          {displayChildName}'s personalized
          journey from the beginning. The
          previous journey will be moved to
          Past Journeys so you can still
          reference it later.
        </p>


        {/* ===================================================
            CHILD PROFILE NOTE
        ==================================================== */}

        <div
          style={{
            padding:
              "14px 16px",

            marginBottom:
              "24px",

            borderRadius:
              "12px",

            background:
              "#F8FAFC",

            border:
              "1px solid #E2E8F0",

            color:
              "#475569",

            fontSize:
              "13px",

            lineHeight:
              1.6,
          }}
        >
          This does not create another child.{" "}
          {displayChildName} will keep the same
          child profile.
        </div>


        {/* ===================================================
            ACTIONS
        ==================================================== */}

        <div
          style={{
            display:
              "flex",

            justifyContent:
              "flex-end",

            gap:
              "10px",

            flexWrap:
              "wrap",
          }}
        >

          {/* -------------------------------------------------
              CANCEL
          -------------------------------------------------- */}

          <button
            type="button"

            disabled={
              starting
            }

            onClick={
              onCancel
            }

            style={{
              padding:
                "11px 17px",

              borderRadius:
                "9px",

              border:
                "1px solid #CBD5E1",

              background:
                "#FFFFFF",

              color:
                "#475569",

              fontSize:
                "14px",

              fontWeight:
                700,

              cursor:
                starting
                  ? "not-allowed"
                  : "pointer",

              opacity:
                starting
                  ? 0.6
                  : 1,
            }}
          >
            Cancel
          </button>


          {/* -------------------------------------------------
              CONFIRM
          -------------------------------------------------- */}

          <button
            type="button"

            disabled={
              starting
            }

            onClick={
              onConfirm
            }

            style={{
              padding:
                "11px 17px",

              borderRadius:
                "9px",

              border:
                "none",

              background:
                "#2563EB",

              color:
                "#FFFFFF",

              fontSize:
                "14px",

              fontWeight:
                800,

              cursor:
                starting
                  ? "not-allowed"
                  : "pointer",

              opacity:
                starting
                  ? 0.7
                  : 1,
            }}
          >

            {
              starting
                ? "Starting..."
                : "Start New Journey"
            }

          </button>

        </div>

      </div>

    </div>

  );

}