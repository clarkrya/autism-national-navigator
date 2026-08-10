import styles from "./styles/Mission.module.css";

export default function Mission() {
  return (
    <section className={styles.section}>
      <div className={styles.wrapper}>
        <h2 className={styles.title}>
          Our Mission
        </h2>

        <p className={styles.text}>
          Every autism journey is unique. Our mission is
          to help families navigate each stage with
          confidence by providing{" "}
          <span className={styles.highlight}>
            personalized guidance
          </span>
          ,{" "}
          <span className={styles.highlight}>
            trusted information
          </span>
          , and a{" "}
          <span className={styles.highlight}>
            clear roadmap
          </span>{" "}
          for what comes next.
        </p>
      </div>
    </section>
  );
}