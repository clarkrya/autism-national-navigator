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
      "Complete one step at a time and revisit your roadmap whenever your child's needs or goals change.",
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
            Three simple steps to help your family navigate the autism
            journey with clarity and confidence.
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
      </div>
    </section>
  );
}