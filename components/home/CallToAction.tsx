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
          Every family's autism journey is unique. Take a few minutes to
          tell us about your child and your priorities, and we'll create
          a personalized roadmap designed to help you move forward with
          confidence.
        </p>

        <Link
          href="/journey"
          className={styles.button}
        >
          <Button>
            Start My Family Journey
          </Button>
        </Link>
      </div>
    </section>
  );
}