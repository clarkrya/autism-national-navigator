import Link from "next/link";

import Button from "../ui/Button";

import styles from "./styles/Hero.module.css";

export default function Hero() {
  return (
    <section className={styles.hero}>
      <div className={styles.wrapper}>
        {/* LEFT COLUMN */}

        <div className={styles.content}>
          <h1 className={styles.heading}>
            Navigate Autism
            <br />
            With Confidence
          </h1>

          <p className={styles.description}>
            Personalized guidance, trusted recommendations, and a
            step-by-step roadmap that helps your family move
            forward with confidence.
          </p>

          <div className={styles.buttonRow}>
            <Link
              href="/journey"
              style={{ textDecoration: "none" }}
            >
              <Button>
                Start My Family Journey
              </Button>
            </Link>
          </div>

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
          <div className={styles.placeholder}>
            Hero Illustration
            <br />
            Coming Soon
          </div>
        </div>
      </div>
    </section>
  );
}