"use client";


/*
 * ============================================================
 * REMOVE CHILD MODAL
 * ============================================================
 *
 * Confirmation dialog used before permanently removing
 * a child and all Journey data associated with that child.
 *
 * This component is presentation-only.
 *
 * JourneyBuilder remains responsible for:
 *
 * - determining the selected child
 * - calling the delete API
 * - refreshing saved children
 * - loading another child after deletion
 * - handling deletion errors
 * ============================================================
 */


type RemoveChildModalProps = {
  visible:
    boolean;

  childName:
    string;

  removing:
    boolean;

  error:
    string | null;

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

export default function RemoveChildModal({
  visible,
  childName,
  removing,
  error,
  onCancel,
  onConfirm,
}: RemoveChildModalProps) {
  if (
    !visible
  ) {
    return null;
  }


  const displayChildName =
    childName.trim() ||
    "this child";


  return (
    <div
      role="dialog"

      aria-modal="true"

      aria-labelledby="remove-child-title"

      style={{
        position:
          "fixed",

        inset:
          0,

        zIndex:
          1100,

        display:
          "flex",

        alignItems:
          "center",

        justifyContent:
          "center",

        padding:
          "24px",

        background:
          "rgba(15, 23, 42, 0.55)",
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
        }}
      >
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
              "#FEF2F2",

            color:
              "#B91C1C",

            fontSize:
              "20px",

            fontWeight:
              800,

            marginBottom:
              "18px",
          }}
        >
          !
        </div>


        <h2
          id="remove-child-title"

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
          Remove{" "}
          {displayChildName}?
        </h2>


        <p
          style={{
            margin:
              "0 0 18px",

            color:
              "#64748B",

            fontSize:
              "15px",

            lineHeight:
              1.7,
          }}
        >
          This will permanently remove this child and all of
          their saved Journey information from your account.
        </p>


        <div
          style={{
            padding:
              "14px 16px",

            marginBottom:
              "22px",

            borderRadius:
              "12px",

            background:
              "#FEF2F2",

            border:
              "1px solid #FECACA",

            color:
              "#991B1B",

            fontSize:
              "13px",

            lineHeight:
              1.6,

            fontWeight:
              700,
          }}
        >
          This includes the current Journey, Journey History,
          and Past Journeys. This action cannot be undone.
        </div>


        {
          error && (
            <div
              style={{
                marginBottom:
                  "18px",

                color:
                  "#B91C1C",

                fontSize:
                  "13px",

                lineHeight:
                  1.5,
              }}
            >
              {error}
            </div>
          )
        }


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
          <button
            type="button"

            disabled={
              removing
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
                removing
                  ? "not-allowed"
                  : "pointer",

              opacity:
                removing
                  ? 0.6
                  : 1,
            }}
          >
            Cancel
          </button>


          <button
            type="button"

            disabled={
              removing
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
                "#DC2626",

              color:
                "#FFFFFF",

              fontSize:
                "14px",

              fontWeight:
                800,

              cursor:
                removing
                  ? "not-allowed"
                  : "pointer",

              opacity:
                removing
                  ? 0.7
                  : 1,
            }}
          >
            {
              removing
                ? "Removing..."
                : "Remove Child Permanently"
            }
          </button>
        </div>
      </div>
    </div>
  );
}