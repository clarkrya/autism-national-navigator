import Link from "next/link";

import Button from "../ui/Button";

import styles from "./styles/Hero.module.css";

export default function Hero() {
  return (
    <section className={styles.hero}>
<div className={styles.wrapper}>        {/* LEFT COLUMN */}

        <div className={styles.content}>
          <div className={styles.eyebrow}>
            PERSONALIZED AUTISM GUIDANCE
          </div>

          <h1 className={styles.heading}>
            Navigate Autism
            <br />
            With Confidence
          </h1>

          <p className={styles.description}>
            Personalized guidance, trusted recommendations,
            and a step-by-step roadmap designed to help
            your family move forward with clarity and
            confidence.
          </p>

          <div className={styles.buttonRow}>
            <Link
              href="/journey"
              style={{
                textDecoration: "none",
              }}
            >
              <Button>
                Start My Family Journey
              </Button>
            </Link>
          </div>

          <p
            style={{
              marginTop: "14px",
              marginBottom: 0,
              color: "#64748B",
              fontSize: "14px",
            }}
          >
            Start building your journey — no account required.
          </p>

          <div className={styles.badges}>
            <div className={styles.badge}>
              ✓ Personalized Roadmap
            </div>

            <div className={styles.badge}>
              ✓ Trusted Guidance
            </div>

            <div className={styles.badge}>
              ✓ AI-Powered Support
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}

        <div className={styles.imageArea}>
  <img
    src="/images/hero-family.png"
    alt="Parent and child walking along a path with signs representing understanding, planning, action, and thriving"
    className={styles.heroImage}
  />
</div>
      </div>
    </section>
  );
}