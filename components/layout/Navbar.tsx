"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { signOut } from "firebase/auth";

import Button from "../ui/Button";
import Container from "../ui/Container";

import { auth } from "../../lib/firebase";
import { watchAuthState } from "../../lib/auth";

import styles from "../home/styles/Navbar.module.css";

export default function Navbar() {
  const [isLoggedIn, setIsLoggedIn] =
    useState(false);

  const [loggingOut, setLoggingOut] =
    useState(false);

  useEffect(() => {
    const unsubscribe =
      watchAuthState((user) => {
        setIsLoggedIn(!!user);
      });

    return () => {
      unsubscribe();
    };
  }, []);

  async function handleLogout() {
    setLoggingOut(true);

    try {
      await signOut(auth);

      /*
       * Send the user away from the authenticated
       * journey after logging out.
       */

      window.location.href = "/";

    } catch (error) {
      console.error(
        "Logout error:",
        error
      );

      setLoggingOut(false);
    }
  }

  return (
    <header className={styles.navbar}>
      <Container>
        <div className={styles.wrapper}>

          {/* LOGO */}

          <Link
            href="/"
            className={styles.logo}
          >
            <span
              className={styles.logoIcon}
            >
              🧭
            </span>

            <div
              className={styles.logoText}
            >
              <span
                className={styles.logoTitle}
              >
                Autism Journey Navigator
              </span>

              <span
                className={styles.logoSubtitle}
              >
                Helping Families Navigate Autism
              </span>
            </div>
          </Link>


          {/* NAVIGATION */}

          <nav
            className={styles.navigation}
          >

            <Link
              href="/"
              className={styles.link}
            >
              Home
            </Link>


            {/* AUTHENTICATED USER */}

            {isLoggedIn ? (
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className={styles.link}
                style={{
                  border: "none",
                  background: "transparent",
                  padding: 0,
                  cursor: loggingOut
                    ? "default"
                    : "pointer",
                  font: "inherit",
                }}
              >
                {loggingOut
                  ? "Logging out..."
                  : "Log Out"}
              </button>
            ) : (
              /* RETURNING USER */

              <Link
                href="/login"
                className={styles.link}
              >
                Login
              </Link>
            )}


            {/* NEW USERS */}

            <Link
              href="/journey"
              style={{
                textDecoration:
                  "none",
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