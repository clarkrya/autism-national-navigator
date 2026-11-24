
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contact Autivoya for general inquiries, account assistance, technical support, and feedback.",
};

export default function ContactPage() {
  return (
    <main
      style={{
        maxWidth: 800,
        margin: "0 auto",
        padding: "56px 24px 80px",
      }}
    >
      <h1
        style={{
          color: "#204D6A",
          fontSize: 32,
          fontWeight: 800,
          margin: "0 0 12px",
        }}
      >
        Contact Autivoya
      </h1>

      <p
        style={{
          color: "#64748B",
          fontSize: 16,
          lineHeight: 1.7,
          marginBottom: 28,
        }}
      >
        Every journey is unique, and we are here to help.
        Whether you have a question, need assistance, or
        want to share feedback, we would love to hear
        from you.
      </p>

      <section
        style={{
          background: "#FFFFFF",
          border: "1px solid #E2E8F0",
          borderRadius: 16,
          padding: 24,
        }}
      >
        <h2
          style={{
            color: "#204D6A",
            fontSize: 20,
            fontWeight: 750,
            margin: "0 0 12px",
          }}
        >
          How can we help?
        </h2>

        <ul
          style={{
            color: "#334155",
            fontSize: 14,
            lineHeight: 2,
            paddingLeft: 20,
            marginBottom: 24,
          }}
        >
          <li>General questions and inquiries</li>
          <li>Account and subscription assistance</li>
          <li>Technical support</li>
          <li>Feedback and suggestions</li>
        </ul>

        <div
          style={{
            borderTop: "1px solid #E2E8F0",
            paddingTop: 20,
          }}
        >
          <p
            style={{
              color: "#64748B",
              fontSize: 13,
              margin: "0 0 6px",
            }}
          >
            Email us
          </p>

          <a
            href="mailto:support@autivoya.com"
            style={{
              color: "#204D6A",
              fontSize: 15,
              fontWeight: 600,
              textDecoration: "underline",
              textUnderlineOffset: 3,
            }}
          >
            support@autivoya.com
          </a>
        </div>
      </section>

      <p
        style={{
          color: "#64748B",
          fontSize: 12,
          lineHeight: 1.7,
          marginTop: 20,
        }}
      >
        To protect your family's privacy, please do not
        include sensitive personal information, medical
        records, passwords, or payment information in
        your email. Autivoya support is not intended
        for medical emergencies or clinical advice.
      </p>
    </main>
  );
}
