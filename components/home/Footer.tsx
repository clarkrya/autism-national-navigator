
import Image from "next/image";
import Link from "next/link";

import Container from "../ui/Container";

export default function Footer() {
  return (
    <footer
      style={{
        background: "#173B52",
        color: "#E2E8F0",
        padding: "56px 20px 32px",
      }}
    >
      <Container>
        <div style={{ textAlign: "center" }}>

          {/* AUTIVOYA LOGO — HEADER STYLE */}

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: "24px",
            }}
          >
            <Link
              href="/"
              aria-label="Autivoya home"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "10px",
                textDecoration: "none",
                background: "#FFFFFF",
                padding: "10px 16px",
                borderRadius: "8px",
              }}
            >
              <Image
                src="/autivoya-mark.png"
                alt="Autivoya logo"
                width={42}
                height={42}
                style={{
                  objectFit: "contain",
                }}
              />

              <div style={{ textAlign: "left" }}>
                <div
                  style={{
                    fontSize: "22px",
                    fontWeight: 800,
                    lineHeight: 1.1,
                    letterSpacing: "-0.5px",
                  }}
                >
                  <span style={{ color: "#204D6A" }}>
                    Autiv
                  </span>
                  <span style={{ color: "#F7AD3F" }}>
                    oya
                  </span>
                </div>

                <div
                  style={{
                    fontSize: "10px",
                    color: "#526779",
                    marginTop: "4px",
                    whiteSpace: "nowrap",
                  }}
                >
                  Every journey is unique. Every step matters.
                </div>
              </div>
            </Link>
          </div>

          {/* FOOTER DESCRIPTION */}

          <p
            style={{
              color: "#C6D8DF",
              margin: "0 auto 28px",
              maxWidth: "620px",
              lineHeight: 1.7,
              fontSize: "14px",
            }}
          >
            Personalized guidance, trusted resources,
            and meaningful next steps for families
            navigating the autism journey.
          </p>

          {/* FOOTER NAVIGATION */}

          <nav
            aria-label="Footer navigation"
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "24px",
              flexWrap: "wrap",
              marginBottom: "32px",
            }}
          >
            <Link
              href="/journey"
              style={{
                color: "#E2E8F0",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              My Journey
            </Link>

            <Link
              href="/community"
              style={{
                color: "#E2E8F0",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              Community
            </Link>

            <Link
              href="/pricing"
              style={{
                color: "#E2E8F0",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              Pricing
            </Link>

            <Link
              href="/login"
              style={{
                color: "#E2E8F0",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              Log In
            </Link>
          </nav>

          {/* COPYRIGHT */}

          <div
            style={{
              borderTop:
                "1px solid rgba(226, 232, 240, 0.2)",
              paddingTop: "24px",
            }}
          >
            <p
              style={{
                fontSize: "13px",
                color: "#C6D8DF",
                margin: 0,
              }}
            >
              © {new Date().getFullYear()} Autivoya.
              All rights reserved.
            </p>
          </div>

        </div>
      </Container>
    </footer>
  );
}
