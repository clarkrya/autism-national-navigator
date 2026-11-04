import { priorityOptions } from "../../data/priorities";

interface PriorityProps {
  value: string;
  onChange: (value: string) => void;
}

export default function Priority({
  value,
  onChange,
}: PriorityProps) {
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
        What is your biggest priority right now?
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
        Choose the area where you&apos;d like the most help. We&apos;ll
        personalize your journey based on your answer.
      </p>

      <div
        style={{
          maxWidth: "800px",
          margin: "0 auto",
          display: "grid",
          gap: "18px",
        }}
      >
        {priorityOptions.map((priority) => {
          const selected =
            value === priority.id;

          return (
            <button
              key={priority.id}
              type="button"
              onClick={() =>
                onChange(priority.id)
              }
              aria-pressed={selected}
              style={{
                textAlign: "left",
                padding: "22px",
                borderRadius: "14px",
                border: selected
                  ? "2px solid #0057B8"
                  : "2px solid #D1D5DB",
                backgroundColor: selected
                  ? "#E8F1FD"
                  : "#FFFFFF",
                cursor: "pointer",
                transition: "all .2s ease",
              }}
            >
              <div
                style={{
                  fontSize: "22px",
                  fontWeight: 700,
                  marginBottom: "8px",
                }}
              >
                {priority.icon}{" "}
                {priority.title}
              </div>

              <div
                style={{
                  color: "#555",
                  lineHeight: "1.6",
                }}
              >
                {priority.description}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}