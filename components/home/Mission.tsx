
import styles from "./styles/Mission.module.css";

/*
 * ============================================================
 * AUTIVOYA — OUR MISSION
 * ============================================================
 *
 * Brand-focused mission statement.
 *
 * Preserves existing component structure and CSS classes.
 * ============================================================
 */

export default function Mission() {
  return (
    <section className={styles.section}>
      <div className={styles.wrapper}>
        <h2 className={styles.title}>
          Our Mission
        </h2>

        <p className={styles.text}>
          At Autivoya, we believe every journey is unique
          and every step matters. Our mission is to help
          families navigate the uncertainties of autism
          with clarity, confidence, and support. Through{" "}
          <span className={styles.highlight}>
            personalized guidance
          </span>
          ,{" "}
          <span className={styles.highlight}>
            trusted resources
          </span>
          , and a{" "}
          <span className={styles.highlight}>
            clear, actionable roadmap
          </span>
          , we empower families to make informed decisions,
          celebrate progress, and move forward at their
          own pace.
        </p>
      </div>
    </section>
  );
}
