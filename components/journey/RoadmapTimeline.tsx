import styles from "./styles/RoadmapTimeline.module.css";

const roadmap = [
  {
    title: "Medical",
    description: "Evaluation, diagnosis, and care planning.",
    status: "completed",
  },
  {
    title: "Therapy",
    description: "Identify therapies that fit your family's goals.",
    status: "completed",
  },
  {
    title: "Education",
    description: "Prepare for school services and educational support.",
    status: "current",
  },
  {
    title: "Community",
    description: "Find local programs, recreation, and support groups.",
    status: "upcoming",
  },
  {
    title: "Future",
    description: "Plan for long-term independence and adult services.",
    status: "upcoming",
  },
];

export default function RoadmapTimeline() {
  return (
    <section className={styles.section}>
      <div className={styles.timeline}>
        {roadmap.map((step, index) => (
          <div
            key={step.title}
            className={styles.step}
          >
            <div
              className={`${styles.circle} ${
                step.status === "completed"
                  ? styles.completed
                  : step.status === "current"
                  ? styles.current
                  : ""
              }`}
            >
              {step.status === "completed"
                ? "✓"
                : index + 1}
            </div>

            <h3 className={styles.title}>
              {step.title}
            </h3>

            <p className={styles.description}>
              {step.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}