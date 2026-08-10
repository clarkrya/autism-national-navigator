import styles from "./styles/HowItWorks.module.css";

const steps = [
  {
    number: "1",
    title: "Tell Us About Your Family",
    description:
      "Answer a few simple questions about your child, current journey stage, and your family's priorities.",
  },
  {
    number: "2",
    title: "Receive Your Personalized Roadmap",
    description:
      "We'll create a customized roadmap with practical next steps designed specifically for your family's journey.",
  },
  {
    number: "3",
    title: "Move Forward With Confidence",
    description:
      "Review your roadmap, focus on one step at a time, and save your journey when you're ready.",
  },
];

export default function HowItWorks() {
  return (
    <section className={styles.section}>
      <div className={styles.wrapper}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            How It Works
          </h2>

          <p className={styles.subtitle}>
            Three simple steps to help your family
            navigate the autism journey with clarity
            and confidence.
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
          Start exploring your journey today — no account required.
        </p>
      </div>
    </section>
  );
}