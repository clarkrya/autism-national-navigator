import styles from "./styles/RoadmapTimeline.module.css";

const roadmap = [
  {
    title: "Medical",
    description: "Evaluation, diagnosis, and care planning.",
  },
  {
    title: "Therapy",
    description: "Identify therapies that fit your family's goals.",
  },
  {
    title: "Education",
    description: "Prepare for school services and educational support.",
  },
  {
    title: "Community",
    description: "Find local programs, recreation, and support groups.",
  },
  {
    title: "Future",
    description: "Plan for long-term independence and adult services.",
  },
];

export default function RoadmapTimeline() {
  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <div className={styles.eyebrow}>
          Your Autism Journey
        </div>

        <h2 className={styles.heading}>
          Support can look different at every stage
        </h2>

        <p className={styles.intro}>
          Your family may need support across several areas at the same
          time. These areas are not steps you need to complete in order.
        </p>
      </div>

      <div className={styles.timeline}>
        {roadmap.map((area) => (
          <div
            key={area.title}
            className={styles.step}
          >
            <div
              className={styles.circle}
              aria-hidden="true"
            />

            <h3 className={styles.title}>
              {area.title}
            </h3>

            <p className={styles.description}>
              {area.description}
            </p>
          </div>
        ))}
      </div>

      <div className={styles.disclaimer}>
        <h3 className={styles.disclaimerTitle}>
          Important Information
        </h3>

        <p className={styles.disclaimerText}>
          Myriad Autism Journey provides educational information and
          personalized guidance to help families navigate available
          resources and next steps. It is not a substitute for
          professional medical advice, diagnosis, or treatment. For
          decisions related to your child&apos;s health, treatment, or
          therapy, consult with your child&apos;s trusted physician or
          other qualified healthcare professional.
        </p>
      </div>
    </section>
  );
}