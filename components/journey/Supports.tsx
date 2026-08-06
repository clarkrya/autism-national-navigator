import { supportOptions } from "../../data/supports";

interface SupportsProps {
  value: string[];
  onChange: (value: string[]) => void;
}

export default function Supports({
  value,
  onChange,
}: SupportsProps) {
  function toggleSupport(id: string) {
    // "None Yet" clears everything else
    if (id === "none") {
      onChange(["none"]);
      return;
    }

    let updated = value.filter((item) => item !== "none");

    if (updated.includes(id)) {
      updated = updated.filter((item) => item !== id);
    } else {
      updated = [...updated, id];
    }

    onChange(updated);
  }

  return (
    <div
      style={{
        textAlign: "center",
        padding: "40px 20px",
      }}
    >
      <h1
        style={{
          fontSize: "42px",
          color: "#0057B8",
          marginBottom: "20px",
        }}
      >
        Let's understand your child's current support network
      </h1>

      <p
        style={{
          fontSize: "20px",
          color: "#555",
          marginBottom: "40px",
          maxWidth: "700px",
          marginLeft: "auto",
          marginRight: "auto",
        }}
      >
        Select all supports your child currently receives.
        If your child is not receiving services yet,
        choose <strong>None Yet</strong>.
      </p>

      <div
        style={{
          maxWidth: "750px",
          margin: "0 auto",
          display: "grid",
          gap: "16px",
        }}
      >
        {supportOptions.map((support) => {
          const selected = value.includes(support.id);

          return (
            <button
              key={support.id}
              onClick={() => toggleSupport(support.id)}
              style={{
                textAlign: "left",
                padding: "18px 20px",
                borderRadius: "12px",
                border: selected
                  ? "2px solid #0057B8"
                  : "2px solid #D1D5DB",
                backgroundColor: selected
                  ? "#E8F1FD"
                  : "#FFFFFF",
                cursor: "pointer",
                transition: "all .2s ease",
                fontSize: "18px",
                fontWeight: selected ? 700 : 500,
              }}
            >
              {selected ? "✓ " : ""}
              {support.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}