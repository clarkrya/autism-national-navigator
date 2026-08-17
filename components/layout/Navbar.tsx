"use client";

import Link from "next/link";

import Button from "../ui/Button";
import Container from "../ui/Container";

import styles from "../home/styles/Navbar.module.css";

export default function Navbar() {
  return (
    <header className={styles.navbar}>
      <Container>
        <div className={styles.wrapper}>

          {/* LOGO */}

          <Link
            href="/"
            className={styles.logo}
          >
            <span className={styles.logoIcon}>
              🧭
            </span>

            <div className={styles.logoText}>
              <span className={styles.logoTitle}>
                Autism Journey Navigator
              </span>

              <span className={styles.logoSubtitle}>
                Helping Families Navigate Autism
              </span>
            </div>
          </Link>

          {/* NAVIGATION */}

          <nav className={styles.navigation}>

            <Link
              href="/"
              className={styles.link}
            >
              Home
            </Link>

            <Link
              href="/login"
              className={styles.link}
            >
              Login
            </Link>

            <Link
              href="/journey"
              style={{
                textDecoration: "none",
              }}
            >
              <Button>
                Start My Journey
              </Button>
            </Link>

          </nav>

        </div>
      </Container>
    </header>
  );
}