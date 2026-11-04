
import Link from "next/link";
import Image from "next/image";

import Button from "../ui/Button";

import styles from "./styles/Hero.module.css";

/*
 * ============================================================
 * AUTIVOYA — HOMEPAGE HERO
 * ============================================================
 *
 * Preserves:
 * - Existing homepage layout
 * - Journey Builder navigation
 * - Shared Button component
 * - Existing family illustration
 * - Responsive styling through Hero.module.css
 * ============================================================
 */

export default function Hero() {
  return (
    <section className={styles.hero}>
      <div className={styles.wrapper}>
        {/* LEFT COLUMN */}

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
            Every journey is unique. Autivoya provides
            personalized guidance, trusted resources, and
            a step-by-step roadmap to help your family
            move forward with clarity and confidence.
          </p>

          <div className={styles.buttonRow}>
            <Link
              href="/journey"
              style={{
                textDecoration: "none",
              }}
            >
              <Button variant="gold">
  Start My Family Journey
</Button>
            </Link>
          </div>

          <p
            style={{
              marginTop: "14px",
              marginBottom: 0,
              color: "#FFFFFF",
              opacity: 0.9,
              fontSize: "14px",
              lineHeight: 1.5,
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
          <Image
            src="/images/hero-family.png"
            alt="Parent and child walking along a path with signs representing understanding, planning, action, and thriving"
            className={styles.heroImage}
            width={800}
            height={600}
            priority
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        </div>
      </div>
    </section>
  );
}
