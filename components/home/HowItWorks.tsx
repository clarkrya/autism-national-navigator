
import styles from "./styles/HowItWorks.module.css";

/*
 * ============================================================
 * AUTIVOYA — HOW IT WORKS
 * ============================================================
 *
 * Three-step introduction to the family journey.
 *
 * Preserves existing layout and CSS class names.
 * ============================================================
 */

const steps = [
  {
    number: "1",
    title: "Tell Us About Your Family",
    description:
      "Share a little about your child, where you are in your autism journey, and what matters most to your family.",
  },
  {
    number: "2",
    title: "Discover Your Personalized Roadmap",
    description:
      "Autivoya helps you create a personalized roadmap with trusted guidance, helpful resources, and practical next steps tailored to your family's needs.",
  },
  {
    number: "3",
    title: "Take the Next Step With Confidence",
    description:
      "Explore your roadmap, take one step at a time, and save your journey when you're ready. Your family's path is unique, and Autivoya is here to help you navigate it.",
  },
];

export default function HowItWorks() {
  return (
    <section className={styles.section}>
      <div className={styles.wrapper}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            How Autivoya Works
          </h2>

          <p className={styles.subtitle}>
            Every journey is unique. Every step matters.
            Discover how Autivoya helps your family move
            forward with personalized guidance, trusted
            resources, and a clear path ahead.
          </p>
        </div>

        <div className={styles.grid}>
          {steps.map((step) => (
            <div
              key={step.number}
              className={styles.step}
            >
              <div className={styles.number}>
                {step.number}
              </div>

              <h3 className={styles.stepTitle}>
                {step.title}
              </h3>

              <p className={styles.stepText}>
                {step.description}
              </p>
            </div>
          ))}
        </div>

        <p
          style={{
            marginTop: "36px",
            textAlign: "center",
            color: "#64748B",
            fontSize: "15px",
          }}
        >
          Start exploring your family's journey today —
          no account required.
        </p>
      </div>
    </section>
  );
}
