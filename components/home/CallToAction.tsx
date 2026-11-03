
import Link from "next/link";

import Button from "../ui/Button";

import styles from "./styles/CallToAction.module.css";

/*
 * ============================================================
 * AUTIVOYA — CALL TO ACTION
 * ============================================================
 *
 * Encourages families to begin their personalized journey.
 *
 * Preserves existing navigation and CSS class names.
 * ============================================================
 */

export default function CallToAction() {
  return (
    <section className={styles.section}>
      <div className={styles.wrapper}>
        <h2 className={styles.title}>
          Your Journey Starts Here
        </h2>

        <p className={styles.text}>
          Every journey is unique, and every step matters.
          Let Autivoya help you discover a clearer path
          forward. Share a little about your child,
          your family's priorities, and where you are
          in your autism journey to begin building a
          personalized roadmap with practical next steps.
        </p>

        <Link
          href="/journey"
          className={styles.button}
        >
          <Button variant="gold">
            Start My Family Journey
          </Button>
        </Link>

        <p
          style={{
            marginTop: "18px",
            marginBottom: 0,
            color: "#64748B",
            fontSize: "14px",
          }}
        >
          No account required to get started.
        </p>
      </div>
    </section>
  );
}
