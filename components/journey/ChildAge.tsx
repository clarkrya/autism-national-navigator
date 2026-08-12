"use client";

interface ChildAgeProps {
  value: string;
  onChange: (value: string) => void;
}

export default function ChildAge({
  value,
  onChange,
}: ChildAgeProps) {
  return (
    <div
      style={{
        maxWidth: "650px",
        margin: "0 auto",
        textAlign: "center",
      }}
    >
      <h2
        style={{
          fontSize: "42px",
          lineHeight: 1.2,
          fontWeight: 800,
          color: "#2563EB",
          marginBottom: "14px",
        }}
      >
        How old is your child?
      </h2>

      <p
        style={{
          fontSize: "18px",
          color: "#475569",
          marginBottom: "30px",
        }}
      >
        Select your child's age.
      </p>

      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        style={{
          width: "100%",
          padding: "18px 20px",
          borderRadius: "12px",
          border: "2px solid #CBD5E1",
          background: "#FFFFFF",
          color: value
            ? "#0F172A"
            : "#64748B",
          fontSize: "18px",
          fontWeight: 600,
          cursor: "pointer",
          outline: "none",
          appearance: "auto",
        }}
      >
        <option value="" disabled>
          Select age
        </option>

        {Array.from(
          { length: 17 },
          (_, index) => index + 1
        ).map((age) => (
          <option
            key={age}
            value={String(age)}
          >
            {age}
          </option>
        ))}

        <option value="18">
          18+
        </option>
      </select>
    </div>
  );
}