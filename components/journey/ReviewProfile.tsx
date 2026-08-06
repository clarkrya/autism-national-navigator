interface ReviewProfileProps {
    childName: string;
    childAge: string;
    state: string;
    journeyStage: string;
    supports: string[];
    priority: string;
  }
  
  export default function ReviewProfile({
    childName,
    childAge,
    state,
    journeyStage,
    supports,
    priority,
  }: ReviewProfileProps) {
    return (
      <div
        style={{
          maxWidth: "850px",
          margin: "0 auto",
          padding: "40px 20px",
        }}
      >
        <h1
          style={{
            fontSize: "42px",
            color: "#0057B8",
            textAlign: "center",
            marginBottom: "10px",
          }}
        >
          Review Your Family Profile
        </h1>
  
        <p
          style={{
            textAlign: "center",
            color: "#555",
            fontSize: "20px",
            marginBottom: "40px",
          }}
        >
          Please review your information before we build your personalized roadmap.
        </p>
  
        <div
          style={{
            display: "grid",
            gap: "20px",
          }}
        >
          <ProfileCard
            title="👦 Child"
            value={childName}
          />
  
          <ProfileCard
            title="🎂 Age"
            value={childAge}
          />
  
          <ProfileCard
            title="📍 State"
            value={state}
          />
  
          <ProfileCard
            title="🧩 Journey Stage"
            value={journeyStage}
          />
  
          <ProfileCard
            title="🤝 Current Supports"
            value={
              supports.length > 0
                ? supports.join(", ")
                : "None Yet"
            }
          />
  
          <ProfileCard
            title="⭐ Biggest Priority"
            value={priority}
          />
        </div>
  
        <div
          style={{
            marginTop: "50px",
            textAlign: "center",
          }}
        >
          <button
            style={{
              backgroundColor: "#0057B8",
              color: "white",
              border: "none",
              borderRadius: "12px",
              padding: "18px 40px",
              fontSize: "20px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            ✨ Build My Family Roadmap
          </button>
        </div>
      </div>
    );
  }
  
  interface CardProps {
    title: string;
    value: string;
  }
  
  function ProfileCard({
    title,
    value,
  }: CardProps) {
    return (
      <div
        style={{
          border: "1px solid #E5E7EB",
          borderRadius: "14px",
          padding: "22px",
          backgroundColor: "#FFFFFF",
          boxShadow: "0 2px 8px rgba(0,0,0,.05)",
        }}
      >
        <div
          style={{
            fontSize: "16px",
            color: "#6B7280",
            marginBottom: "8px",
            fontWeight: 600,
          }}
        >
          {title}
        </div>
  
        <div
          style={{
            fontSize: "22px",
            fontWeight: 700,
            color: "#111827",
          }}
        >
          {value}
        </div>
      </div>
    );
  }