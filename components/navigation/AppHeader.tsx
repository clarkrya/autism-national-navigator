"use client";

import {
  useEffect,
  useState,
} from "react";

import Link from "next/link";

import {
  signOut,
} from "firebase/auth";

import {
  auth,
} from "../../lib/firebase";

import {
  getCurrentUser,
  watchAuthState,
} from "../../lib/auth";


/*
 * ============================================================
 * APP HEADER
 * ============================================================
 *
 * Shared navigation for Myriad Autism Journey.
 *
 * NAVIGATION
 *
 * Guest:
 *   My Journey
 *   Community
 *   Pricing
 *   Log In
 *
 * Authenticated:
 *   My Journey
 *   Community
 *   Pricing
 *   Account
 *
 * Logout is intentionally located inside the Account menu
 * rather than being presented as the primary way to leave a
 * section.
 *
 * ============================================================
 */


/*
 * ============================================================
 * NAVIGATION LINK
 * ============================================================
 */

type NavigationLinkProps = {
  href: string;

  label: string;
};


function NavigationLink({
  href,
  label,
}: NavigationLinkProps) {

  return (

    <Link
      href={href}

      style={{
        color:
          "#334155",

        fontSize:
          "14px",

        fontWeight:
          700,

        textDecoration:
          "none",

        whiteSpace:
          "nowrap",

        padding:
          "8px 10px",

        borderRadius:
          "8px",
      }}
    >
      {label}
    </Link>

  );

}


/*
 * ============================================================
 * APP HEADER
 * ============================================================
 */

export default function AppHeader() {

  const [
    currentUserEmail,
    setCurrentUserEmail,
  ] = useState<
    string | null
  >(null);


  const [
    accountMenuOpen,
    setAccountMenuOpen,
  ] = useState(false);


  const [
    loggingOut,
    setLoggingOut,
  ] = useState(false);


  /*
   * ==========================================================
   * AUTH STATE
   * ==========================================================
   */

  useEffect(() => {

    const unsubscribe =
      watchAuthState(
        (user) => {

          setCurrentUserEmail(
            user?.email ??
              null
          );

        }
      );


    /*
     * Keep the header in sync with Firebase authentication.
     */

    return () => {

      unsubscribe();

    };

  }, []);


  /*
   * ==========================================================
   * LOG OUT
   * ==========================================================
   */

  async function handleLogout() {

    if (
      loggingOut
    ) {

      return;

    }


    setLoggingOut(
      true
    );


    try {

      await signOut(
        auth
      );


      setAccountMenuOpen(
        false
      );


      /*
       * Return to the public landing page after logout.
       */

      window.location.href =
        "/";

    } catch (
      error
    ) {

      console.error(
        "Logout error:",
        error
      );


      setLoggingOut(
        false
      );

    }

  }


  /*
   * ==========================================================
   * CLOSE ACCOUNT MENU WHEN CLICKING OUTSIDE
   * ==========================================================
   */

  useEffect(() => {

    function handleDocumentClick(
      event: MouseEvent
    ) {

      const target =
        event.target as
          HTMLElement |
          null;


      if (
        !target
      ) {

        return;

      }


      if (
        !target.closest(
          "[data-account-menu]"
        )
      ) {

        setAccountMenuOpen(
          false
        );

      }

    }


    document.addEventListener(
      "click",
      handleDocumentClick
    );


    return () => {

      document.removeEventListener(
        "click",
        handleDocumentClick
      );

    };

  }, []);


  /*
   * ==========================================================
   * HEADER
   * ==========================================================
   */

  return (

    <header
      style={{
        position:
          "sticky",

        top:
          0,

        zIndex:
          1000,

        width:
          "100%",

        background:
          "rgba(255, 255, 255, 0.97)",

        borderBottom:
          "1px solid #E2E8F0",

        backdropFilter:
          "blur(10px)",
      }}
    >

      <div
        style={{
          maxWidth:
            "1200px",

          margin:
            "0 auto",

          padding:
            "0 24px",

          minHeight:
            "72px",

          display:
            "flex",

          alignItems:
            "center",

          justifyContent:
            "space-between",

          gap:
            "20px",
        }}
      >

        {/* ==================================================
            BRAND
        =================================================== */}

        <Link
          href="/journey"

          style={{
            display:
              "flex",

            alignItems:
              "center",

            gap:
              "10px",

            color:
              "#0F172A",

            textDecoration:
              "none",

            minWidth:
              0,
          }}
        >

          <div
            style={{
              width:
                "38px",

              height:
                "38px",

              borderRadius:
                "11px",

              background:
                "#EFF6FF",

              display:
                "flex",

              alignItems:
                "center",

              justifyContent:
                "center",

              fontSize:
                "21px",

              flexShrink:
                0,
            }}
          >
            🧭
          </div>


          <div
            style={{
              minWidth:
                0,
            }}
          >

            <div
              style={{
                fontSize:
                  "15px",

                fontWeight:
                  850,

                lineHeight:
                  1.2,

                color:
                  "#0F172A",

                whiteSpace:
                  "nowrap",
              }}
            >
              Myriad Autism Journey
            </div>


            <div
              style={{
                marginTop:
                  "3px",

                fontSize:
                  "10px",

                lineHeight:
                  1.2,

                color:
                  "#64748B",

                whiteSpace:
                  "nowrap",
              }}
            >
              Embracing the countless ways we thrive.
            </div>

          </div>

        </Link>


        {/* ==================================================
            NAVIGATION
        =================================================== */}

        <nav
          aria-label="Main navigation"

          style={{
            display:
              "flex",

            alignItems:
              "center",

            justifyContent:
              "flex-end",

            gap:
              "4px",

            flexWrap:
              "wrap",
          }}
        >

          <NavigationLink
            href="/journey"
            label="My Journey"
          />


          <NavigationLink
            href="/community"
            label="Community"
          />


          <NavigationLink
            href="/pricing"
            label="Pricing"
          />


          {/* ==================================================
              AUTHENTICATED USER
          =================================================== */}

          {currentUserEmail ? (

            <div
              data-account-menu
              style={{
                position:
                  "relative",

                marginLeft:
                  "4px",
              }}
            >

              <button
                type="button"

                onClick={() => {

                  setAccountMenuOpen(
                    (current) =>
                      !current
                  );

                }}

                aria-expanded={
                  accountMenuOpen
                }

                aria-haspopup="menu"

                style={{
                  display:
                    "flex",

                  alignItems:
                    "center",

                  gap:
                    "7px",

                  border:
                    "1px solid #CBD5E1",

                  background:
                    "#FFFFFF",

                  color:
                    "#334155",

                  padding:
                    "8px 11px",

                  borderRadius:
                    "9px",

                  fontSize:
                    "14px",

                  fontWeight:
                    700,

                  cursor:
                    "pointer",
                }}
              >

                <span>
                  Account
                </span>


                <span
                  aria-hidden="true"
                  style={{
                    fontSize:
                      "10px",
                  }}
                >
                  {accountMenuOpen
                    ? "▲"
                    : "▼"}
                </span>

              </button>


              {accountMenuOpen && (

                <div
                  role="menu"

                  style={{
                    position:
                      "absolute",

                    right:
                      0,

                    top:
                      "calc(100% + 8px)",

                    width:
                      "250px",

                    background:
                      "#FFFFFF",

                    border:
                      "1px solid #E2E8F0",

                    borderRadius:
                      "14px",

                    boxShadow:
                      "0 12px 30px rgba(15, 23, 42, 0.12)",

                    padding:
                      "8px",

                    overflow:
                      "hidden",
                  }}
                >

                  <div
                    style={{
                      padding:
                        "10px 11px 12px",

                      borderBottom:
                        "1px solid #F1F5F9",

                      marginBottom:
                        "4px",
                    }}
                  >

                    <div
                      style={{
                        color:
                          "#64748B",

                        fontSize:
                          "11px",

                        fontWeight:
                          800,

                        textTransform:
                          "uppercase",

                        letterSpacing:
                          "0.06em",

                        marginBottom:
                          "4px",
                      }}
                    >
                      Signed in as
                    </div>


                    <div
                      style={{
                        color:
                          "#0F172A",

                        fontSize:
                          "13px",

                        fontWeight:
                          700,

                        overflow:
                          "hidden",

                        textOverflow:
                          "ellipsis",

                        whiteSpace:
                          "nowrap",
                      }}
                    >
                      {currentUserEmail}
                    </div>

                  </div>


                  <Link
                    href="/journey"

                    role="menuitem"

                    onClick={() => {

                      setAccountMenuOpen(
                        false
                      );

                    }}

                    style={{
                      display:
                        "block",

                      padding:
                        "10px 11px",

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
                    My Journey
                  </Link>


                  <Link
                    href="/pricing"

                    role="menuitem"

                    onClick={() => {

                      setAccountMenuOpen(
                        false
                      );

                    }}

                    style={{
                      display:
                        "block",

                      padding:
                        "10px 11px",

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
                    My Subscription
                  </Link>


                  <button
                    type="button"

                    role="menuitem"

                    onClick={
                      handleLogout
                    }

                    disabled={
                      loggingOut
                    }

                    style={{
                      width:
                        "100%",

                      display:
                        "block",

                      textAlign:
                        "left",

                      border:
                        "none",

                      background:
                        "transparent",

                      padding:
                        "10px 11px",

                      borderRadius:
                        "8px",

                      color:
                        "#B91C1C",

                      fontSize:
                        "14px",

                      fontWeight:
                        700,

                      cursor:
                        loggingOut
                          ? "default"
                          : "pointer",
                    }}
                  >
                    {loggingOut
                      ? "Logging out..."
                      : "Log Out"}
                  </button>

                </div>

              )}

            </div>

          ) : (

            /* ==================================================
               GUEST
            =================================================== */

            <Link
              href={
                `/login?returnTo=${encodeURIComponent(
                  typeof window !==
                  "undefined"
                    ? window.location.pathname
                    : "/journey"
                )}`
              }

              style={{
                padding:
                  "9px 15px",

                borderRadius:
                  "9px",

                background:
                  "#2563EB",

                color:
                  "#FFFFFF",

                fontSize:
                  "14px",

                fontWeight:
                  800,

                textDecoration:
                  "none",

                whiteSpace:
                  "nowrap",
              }}
            >
              Log In
            </Link>

          )}

        </nav>

      </div>

    </header>

  );

}