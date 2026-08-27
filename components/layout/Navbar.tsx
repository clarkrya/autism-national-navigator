"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import Link from "next/link";

import Container from "../ui/Container";

import styles from "../home/styles/Navbar.module.css";


export default function Navbar() {

  const [
    loginMenuOpen,
    setLoginMenuOpen,
  ] = useState(false);


  const menuRef =
    useRef<HTMLDivElement | null>(
      null
    );


  /*
   * ============================================================
   * CLOSE DROPDOWN WHEN CLICKING OUTSIDE
   * ============================================================
   */

  useEffect(() => {

    function handleOutsideClick(
      event: MouseEvent
    ) {

      if (
        menuRef.current &&
        !menuRef.current.contains(
          event.target as Node
        )
      ) {

        setLoginMenuOpen(
          false
        );

      }

    }


    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );


    return () => {

      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );

    };

  }, []);


  /*
   * ============================================================
   * CLOSE DROPDOWN WITH ESCAPE
   * ============================================================
   */

  useEffect(() => {

    function handleEscape(
      event: KeyboardEvent
    ) {

      if (
        event.key ===
        "Escape"
      ) {

        setLoginMenuOpen(
          false
        );

      }

    }


    document.addEventListener(
      "keydown",
      handleEscape
    );


    return () => {

      document.removeEventListener(
        "keydown",
        handleEscape
      );

    };

  }, []);


  return (

    <header
      className={styles.navbar}

      style={{
        position:
          "sticky",

        top:
          0,

        zIndex:
          1000,

        background:
          "#FFFFFF",

        boxShadow:
          "0 1px 8px rgba(15, 23, 42, 0.06)",
      }}
    >

      <Container>

        <div
          className={styles.wrapper}
        >

          {/* ==================================================
              BRAND
          =================================================== */}

          <Link
            href="/"
            className={styles.logo}

            onClick={() =>
              setLoginMenuOpen(
                false
              )
            }
          >

            <span
              className={styles.logoIcon}
              aria-hidden="true"
            >
              🧭
            </span>


            <div
              className={styles.logoText}
            >

              <span
                className={styles.logoTitle}
              >
                Myriad Autism Journey
              </span>


              <span
                className={styles.logoSubtitle}
              >
                Embracing the countless ways we thrive.
              </span>

            </div>

          </Link>


          {/* ==================================================
              NAVIGATION
          =================================================== */}

          <nav
            className={styles.navigation}
            aria-label="Main navigation"
          >

            <Link
              href="/journey"
              className={styles.link}

              onClick={() =>
                setLoginMenuOpen(
                  false
                )
              }
            >
              My Journey
            </Link>


            <Link
              href="/community"
              className={styles.link}

              onClick={() =>
                setLoginMenuOpen(
                  false
                )
              }
            >
              Community
            </Link>


            {/* ================================================
                LOGIN DROPDOWN
            ================================================= */}

            <div
              ref={
                menuRef
              }

              style={{
                position:
                  "relative",
              }}
            >

              <button
                type="button"

                aria-haspopup="menu"

                aria-expanded={
                  loginMenuOpen
                }

                onClick={() =>
                  setLoginMenuOpen(
                    (
                      current
                    ) =>
                      !current
                  )
                }

                style={{
                  border:
                    "none",

                  background:
                    loginMenuOpen
                      ? "#EFF6FF"
                      : "transparent",

                  color:
                    "#334155",

                  fontSize:
                    "14px",

                  fontWeight:
                    800,

                  padding:
                    "8px 10px",

                  borderRadius:
                    "8px",

                  cursor:
                    "pointer",
                }}
              >
                Log In
                <span
                  aria-hidden="true"
                  style={{
                    marginLeft:
                      "6px",

                    fontSize:
                      "11px",
                  }}
                >
                  ▾
                </span>
              </button>


              {loginMenuOpen && (

                <div
                  role="menu"

                  style={{
                    position:
                      "absolute",

                    top:
                      "calc(100% + 10px)",

                    right:
                      0,

                    minWidth:
                      "170px",

                    padding:
                      "8px",

                    borderRadius:
                      "12px",

                    border:
                      "1px solid #E2E8F0",

                    background:
                      "#FFFFFF",

                    boxShadow:
                      "0 12px 30px rgba(15, 23, 42, 0.12)",
                  }}
                >

                  <Link
                    href="/login"

                    role="menuitem"

                    onClick={() =>
                      setLoginMenuOpen(
                        false
                      )
                    }

                    style={{
                      display:
                        "block",

                      padding:
                        "10px 12px",

                      borderRadius:
                        "8px",

                      color:
                        "#334155",

                      fontSize:
                        "14px",

                      fontWeight:
                        700,

                      textDecoration:
                        "none",
                    }}
                  >
                    Log In
                  </Link>


                  <Link
                    href="/pricing"

                    role="menuitem"

                    onClick={() =>
                      setLoginMenuOpen(
                        false
                      )
                    }

                    style={{
                      display:
                        "block",

                      marginTop:
                        "2px",

                      padding:
                        "10px 12px",

                      borderRadius:
                        "8px",

                      color:
                        "#334155",

                      fontSize:
                        "14px",

                      fontWeight:
                        700,

                      textDecoration:
                        "none",
                    }}
                  >
                    Pricing
                  </Link>


                  <Link
                    href="/signup"

                    role="menuitem"

                    onClick={() =>
                      setLoginMenuOpen(
                        false
                      )
                    }

                    style={{
                      display:
                        "block",

                      marginTop:
                        "2px",

                      padding:
                        "10px 12px",

                      borderRadius:
                        "8px",

                      color:
                        "#2563EB",

                      fontSize:
                        "14px",

                      fontWeight:
                        800,

                      textDecoration:
                        "none",
                    }}
                  >
                    Create Free Account
                  </Link>

                </div>

              )}

            </div>

          </nav>

        </div>

      </Container>

    </header>

  );

}