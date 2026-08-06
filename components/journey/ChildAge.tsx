interface ChildAgeProps {
    value: string;
    onChange: (value: string) => void;
  }
  
  const ageOptions = [
    "Under 3",
    "3 - 5",
    "6 - 12",
    "13 - 17",
    "18+",
  ];
  
  export default function ChildAge({
    value,
    onChange,
  }: ChildAgeProps) {
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
            marginBottom: "20px",
            color: "#0057B8",
          }}
        >
          How old is your child?
        </h1>
  
        <p
          style={{
            fontSize: "20px",
            color: "#555",
            marginBottom: "40px",
          }}
        >
          Select the age group that best fits your child.
        </p>
  
        <div
          style={{
            maxWidth: "500px",
            margin: "0 auto",
            display: "grid",
            gap: "16px",
          }}
        >
          {ageOptions.map((age) => {
            const selected = value === age;
  
            return (
              <button
                key={age}
                onClick={() => onChange(age)}
                style={{
                  padding: "18px",
                  borderRadius: "12px",
                  border: selected
                    ? "2px solid #0057B8"
                    : "2px solid #D1D5DB",
                  backgroundColor: selected
                    ? "#E8F1FD"
                    : "#FFFFFF",
                  cursor: "pointer",
                  fontSize: "18px",
                  fontWeight: selected ? 700 : 500,
                  transition: "all .2s ease",
                }}
              >
                {age}
              </button>
            );
          })}
        </div>
      </div>
    );
  }