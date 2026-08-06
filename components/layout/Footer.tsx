import Link from "next/link";

import styles from "./styles/Footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.wrapper}>
        <div className={styles.top}>
          <div className={styles.brand}>
            <div className={styles.logo}>
              Autism Journey Navigator
            </div>

            <p className={styles.description}>
              Helping families navigate autism with confidence through
              personalized guidance, trusted information, and practical
              next steps tailored to every unique journey.
            </p>
          </div>

          <div className={styles.links}>
            <h3>Quick Links</h3>

            <ul>
              <li>
                <Link href="/">Home</Link>
              </li>

              <li>
                <Link href="/journey">
                  Start My Journey
                </Link>
              </li>

              <li>
                <Link href="/about">
                  About
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className={styles.bottom}>
          © 2026 Autism Journey Navigator. Built to help families move
          forward with confidence.
        </div>
      </div>
    </footer>
  );
}