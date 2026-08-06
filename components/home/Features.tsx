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
      "Navigate each step with evidence-based recommendations and carefully organized information.",
  },
  {
    title: "State-Specific Support",
    description:
      "Access guidance tailored to your state so you can quickly find programs and services that apply to your family.",
  },
  {
    title: "Built for Families",
    description:
      "Designed to reduce stress by presenting one meaningful next step at a time instead of overwhelming choices.",
  },
];

export default function Features() {
  return (
    <section className={styles.features}>
      <div className={styles.wrapper}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            What You'll Receive
          </h2>

          <p className={styles.subtitle}>
            Autism Journey Navigator provides personalized guidance
            designed to help your family confidently navigate every
            stage of the autism journey.
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
      </div>
    </section>
  );
}