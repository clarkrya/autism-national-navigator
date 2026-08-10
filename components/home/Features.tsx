import styles from "./styles/Features.module.css";

const features = [
  {
    title: "Personalized Roadmap",
    description:
      "Receive a customized roadmap based on your child's age, journey stage, and family's priorities.",
  },
  {
    title: "Trusted Guidance",
    description:
      "Navigate each step with organized, easy-to-understand guidance designed to help your family move forward with confidence.",
  },
  {
    title: "State-Specific Support",
    description:
      "Find guidance tailored to your state so you can identify programs, services, and resources that may apply to your family.",
  },
  {
    title: "One Step at a Time",
    description:
      "Focus on the next meaningful step instead of sorting through an overwhelming list of information and resources.",
  },
];

export default function Features() {
  return (
<section className={styles.features}>      <div className={styles.wrapper}>
        <div className={styles.header}>
          
          <h2 className={styles.title}>
            Guidance Built Around Your Family
          </h2>

          <p className={styles.subtitle}>
            Autism Journey Navigator creates a personalized
            starting point based on your family's needs,
            priorities, and journey stage.
          </p>
        </div>

        <div className={styles.grid}>
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className={styles.card}
            >
              <div className={styles.icon}>
                {index + 1}
              </div>

              <h3 className={styles.cardTitle}>
                {feature.title}
              </h3>

              <p className={styles.cardText}>
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        <p
          style={{
            marginTop: "32px",
            textAlign: "center",
            color: "#64748B",
            fontSize: "15px",
          }}
        >
          No account required to get started.
        </p>
      </div>
    </section>
  );
}