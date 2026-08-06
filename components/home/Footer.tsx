import Container from "../ui/Container";

export default function Footer() {
  return (
    <footer
      style={{
        background: "#0F172A",
        color: "#CBD5E1",
        padding: "40px 20px",
        marginTop: "60px",
      }}
    >
      <Container size="large">
        <div
          style={{
            textAlign: "center",
          }}
        >
          <h3
            style={{
              color: "white",
              marginBottom: "14px",
            }}
          >
            Autism Journey Navigator
          </h3>

          <p
            style={{
              color: "#CBD5E1",
              marginBottom: "18px",
            }}
          >
            Personalized guidance. Trusted resources. One step at a time.
          </p>

          <p
            style={{
              fontSize: "14px",
              color: "#94A3B8",
            }}
          >
            © {new Date().getFullYear()} Autism Journey Navigator. All rights reserved.
          </p>
        </div>
      </Container>
    </footer>
  );
}