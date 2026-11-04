"use client";

interface InsuranceQuestionProps {
  value: string;
  onChange: (value: string) => void;
}

const insuranceOptions = [
  {
    value: "private",
    title: "Private Insurance",
    description:
      "Insurance through an employer, individual plan, or another private health plan.",
  },
  {
    value: "medicaid",
    title: "Medicaid",
    description:
      "My child is covered by Medicaid or a Medicaid managed-care plan.",
  },
  {
    value: "none",
    title: "No Insurance",
    description:
      "My child does not currently have health insurance.",
  },
];

export default function InsuranceQuestion({
  value,
  onChange,
}: InsuranceQuestionProps) {
  return (
    <div
      style={{
        maxWidth: "650px",
        margin: "0 auto",
      }}
    >
      <h2
        style={{
          fontSize: "36px",
          fontWeight: 800,
          color: "#0F172A",
          marginBottom: "12px",
        }}
      >
        What type of insurance does your child have?
      </h2>

      <p
        style={{
          fontSize: "18px",
          lineHeight: 1.7,
          color: "#64748B",
          marginBottom: "28px",
        }}
      >
        This helps us personalize recommendations related to
        services, coverage, and available resources.
      </p>

      <div
        style={{
          display: "grid",
          gap: "16px",
        }}
      >
        {insuranceOptions.map((option) => {
          const selected =
            value === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() =>
                onChange(option.value)
              }
              style={{
                width: "100%",
                textAlign: "left",
                padding: "24px",
                borderRadius: "16px",

                border: selected
                  ? "2px solid #2563EB"
                  : "1px solid #CBD5E1",

                background: selected
                  ? "#EFF6FF"
                  : "#FFFFFF",

                cursor: "pointer",

                boxShadow: selected
                  ? "0 6px 18px rgba(37, 99, 235, 0.12)"
                  : "0 2px 8px rgba(15, 23, 42, 0.04)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "16px",
                }}
              >
                <div
                  style={{
                    width: "22px",
                    height: "22px",
                    minWidth: "22px",

                    borderRadius: "50%",

                    border: selected
                      ? "6px solid #2563EB"
                      : "2px solid #CBD5E1",

                    background: "#FFFFFF",
                    marginTop: "2px",
                    boxSizing: "border-box",
                  }}
                />

                <div>
                  <h3
                    style={{
                      margin: 0,
                      marginBottom: "6px",
                      fontSize: "21px",
                      fontWeight: 700,
                      color: "#0F172A",
                    }}
                  >
                    {option.title}
                  </h3>

                  <p
                    style={{
                      margin: 0,
                      fontSize: "16px",
                      lineHeight: 1.6,
                      color: "#64748B",
                    }}
                  >
                    {option.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <p
        style={{
          marginTop: "20px",
          fontSize: "14px",
          color: "#94A3B8",
          lineHeight: 1.5,
        }}
      >
        You can update your insurance information later if your
        coverage changes.
      </p>
    </div>
  );
}