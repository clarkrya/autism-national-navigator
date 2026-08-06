interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

export default function ProgressBar({
  currentStep,
  totalSteps,
}: ProgressBarProps) {
  const progress = Math.round((currentStep / totalSteps) * 100);

  return (
    <div
      style={{
        marginBottom: "50px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "10px",
          color: "#555",
          fontWeight: 600,
        }}
      >
        <span>
          Question {currentStep} of {totalSteps}
        </span>

        <span>{progress}% Complete</span>
      </div>

      <div
        style={{
          height: "12px",
          background: "#E5E7EB",
          borderRadius: "999px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${progress}%`,
            height: "100%",
            background: "#0057B8",
            transition: "width .3s ease",
          }}
        />
      </div>
    </div>
  );
}