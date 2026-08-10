import Link from "next/link";

import Button from "../ui/Button";

import styles from "./styles/CallToAction.module.css";

export default function CallToAction() {
  return (
    <section className={styles.section}>
      <div className={styles.wrapper}>
        <h2 className={styles.title}>
          Ready to Begin Your Journey?
        </h2>

        <p className={styles.text}>
          Take a few minutes to tell us about your child,
          your family's priorities, and where you are in
          your journey. We'll create a personalized roadmap
          to help you understand what comes next.
        </p>

        <Link
          href="/journey"
          className={styles.button}
        >
          <Button>
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