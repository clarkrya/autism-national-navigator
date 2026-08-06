interface WelcomeProps {
  onBegin: () => void;
}

export default function Welcome({ onBegin }: WelcomeProps) {
  return (
    <main
      style={{
        maxWidth: "900px",
        margin: "80px auto",
        padding: "20px",
        textAlign: "center",
      }}
    >
      <h1
        style={{
          fontSize: "52px",
          color: "#0057B8",
          marginBottom: "20px",
        }}
      >
        Begin Your Journey
      </h1>

      <h2
        style={{
          fontSize: "28px",
          color: "#444",
          marginBottom: "30px",
        }}
      >
        Know What Comes Next.
      </h2>

      <p
        style={{
          fontSize: "20px",
          color: "#555",
          lineHeight: "1.8",
          maxWidth: "700px",
          margin: "0 auto 50px",
        }}
      >
        Welcome to Autism Journey Navigator.
        <br />
        <br />
        In just a few minutes, we'll learn a little about your family and
        create a personalized Family Roadmap designed specifically for your
        family's journey.
      </p>

      <button
        onClick={onBegin}
        style={{
          backgroundColor: "#0057B8",
          color: "white",
          border: "none",
          borderRadius: "10px",
          padding: "16px 36px",
          fontSize: "18px",
          cursor: "pointer",
          fontWeight: 600,
        }}
      >
        Begin My Journey →
      </button>
    </main>
  );
}