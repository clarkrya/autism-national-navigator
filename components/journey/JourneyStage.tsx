import { journeyStageOptions } from "../../data/journeyStages";

interface JourneyStageProps {
  value: string;
  onChange: (value: string) => void;
}

export default function JourneyStage({
  value,
  onChange,
}: JourneyStageProps) {
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
        Which best describes your family today?
      </h1>

      <p
        style={{
          fontSize: "20px",
          color: "#555",
          marginBottom: "40px",
        }}
      >
        Choose the option that best matches where you are right now.
      </p>

      <div
        style={{
          maxWidth: "800px",
          margin: "0 auto",
          display: "grid",
          gap: "18px",
        }}
      >
        {journeyStageOptions.map((stage) => {
          const selected = value === stage.id;

          return (
            <button
              key={stage.id}
              onClick={() => onChange(stage.id)}
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
                {stage.emoji} {stage.title}
              </div>

              <div
                style={{
                  color: "#555",
                  lineHeight: "1.6",
                }}
              >
                {stage.description}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}