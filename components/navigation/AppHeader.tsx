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
  watchAuthState,
} from "../../lib/auth";


/*
 * ============================================================
 * APP HEADER
 * ============================================================
 *
 * Single global navigation for Myriad Autism Journey.
 *
 * Guest:
 *   My Journey
 *   Support Tools
 *   Community
 *   Log In ▾
 *
 * Authenticated:
 *   My Journey
 *   Support Tools
 *   Community
 *   Account ▾
 *
 * Support Tools:
 *   Ask Your Navigator
 *   Future Premium tools shown as Coming Soon
 *
 * Human Navigator is intentionally NOT directly accessible.
 * Human support will only be offered through Ask Your Navigator
 * after the AI determines escalation may be appropriate.
 *
 * The header remains sticky while the user scrolls.
 * ============================================================
 */


type NavigationLinkProps = {
  href: string;
  label: string;
  onClick?: () => void;
};


type OpenMenu =
  | "support"
  | "account"
  | null;


/*
 * ============================================================
 * STANDARD NAVIGATION LINK
 * ============================================================
 */

function NavigationLink({
  href,
  label,
  onClick,
}: NavigationLinkProps) {

  return (

    <Link
      href={href}

      onClick={onClick}

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
 * COMING SOON SUPPORT TOOL
 * ============================================================
 */

function ComingSoonTool({
  title,
  description,
}: {
  title: string;
  description: string;
}) {

  return (

    <div
      aria-disabled="true"

      style={{
        padding:
          "10px 11px",

        borderRadius:
          "9px",

        opacity:
          0.72,
      }}
    >

      <div
        style={{
          display:
            "flex",

          alignItems:
            "center",

          justifyContent:
            "space-between",

          gap:
            "10px",
        }}
      >

        <span
          style={{
            color:
              "#334155",

            fontSize:
              "13px",

            fontWeight:
              750,
          }}
        >
          {title}
        </span>


        <span
          style={{
            flexShrink:
              0,

            padding:
              "3px 7px",

            borderRadius:
              "999px",

            background:
              "#F1F5F9",

            color:
              "#64748B",

            fontSize:
              "9px",

            fontWeight:
              800,

            textTransform:
              "uppercase",

            letterSpacing:
              "0.04em",
          }}
        >
          Coming Soon
        </span>

      </div>


      <div
        style={{
          marginTop:
            "3px",

          color:
            "#64748B",

          fontSize:
            "10px",

          lineHeight:
            1.4,
        }}
      >
        {description}
      </div>

    </div>

  );

}


/*
 * ============================================================
 * APP HEADER
 * ============================================================
 */

export default function AppHeader() {

  /*
   * ==========================================================
   * AUTH STATE
   * ==========================================================
   */

  const [
    currentUserEmail,
    setCurrentUserEmail,
  ] = useState<
    string | null
  >(null);


  /*
   * ==========================================================
   * DROPDOWN STATE
   * ==========================================================
   */

  const [
    openMenu,
    setOpenMenu,
  ] = useState<OpenMenu>(
    null
  );


  /*
   * ==========================================================
   * LOGOUT STATE
   * ==========================================================
   */

  const [
    loggingOut,
    setLoggingOut,
  ] = useState(false);


  /*
   * ==========================================================
   * AUTH LISTENER
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


    return () => {

      unsubscribe();

    };

  }, []);


  /*
   * ==========================================================
   * CLOSE MENUS ON OUTSIDE CLICK
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
          "[data-header-menu]"
        )
      ) {

        setOpenMenu(
          null
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
   * CLOSE MENUS WITH ESCAPE
   * ==========================================================
   */

  useEffect(() => {

    function handleEscape(
      event: KeyboardEvent
    ) {

      if (
        event.key ===
        "Escape"
      ) {

        setOpenMenu(
          null
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


  /*
   * ==========================================================
   * LOGOUT
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


      setOpenMenu(
        null
      );


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
   * MENU HELPERS
   * ==========================================================
   */

  function closeMenus() {

    setOpenMenu(
      null
    );

  }


  function toggleSupportMenu() {

    setOpenMenu(
      (
        current
      ) =>
        current ===
          "support"
          ? null
          : "support"
    );

  }


  function toggleAccountMenu() {

    setOpenMenu(
      (
        current
      ) =>
        current ===
          "account"
          ? null
          : "account"
    );

  }


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
          href="/"

          onClick={
            closeMenus
          }

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

            onClick={
              closeMenus
            }
          />


          {/* ==================================================
              SUPPORT TOOLS DROPDOWN
          =================================================== */}

          <div
            data-header-menu

            style={{
              position:
                "relative",
            }}
          >

            <button
              type="button"

              aria-expanded={
                openMenu ===
                "support"
              }

              aria-haspopup="menu"

              onClick={
                toggleSupportMenu
              }

              style={{
                display:
                  "flex",

                alignItems:
                  "center",

                gap:
                  "6px",

                border:
                  "none",

                background:
                  openMenu ===
                    "support"
                    ? "#EFF6FF"
                    : "transparent",

                color:
                  "#334155",

                padding:
                  "8px 10px",

                borderRadius:
                  "8px",

                fontSize:
                  "14px",

                fontWeight:
                  700,

                cursor:
                  "pointer",

                whiteSpace:
                  "nowrap",
              }}
            >

              <span>
                Support Tools
              </span>


              <span
                aria-hidden="true"

                style={{
                  fontSize:
                    "9px",
                }}
              >
                {openMenu ===
                  "support"
                  ? "▲"
                  : "▼"}
              </span>

            </button>


            {openMenu ===
              "support" && (

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
                    "340px",

                  maxWidth:
                    "calc(100vw - 32px)",

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
                        "#0F172A",

                      fontSize:
                        "13px",

                      fontWeight:
                        800,
                    }}
                  >
                    Support Tools
                  </div>


                  <div
                    style={{
                      marginTop:
                        "4px",

                      color:
                        "#64748B",

                      fontSize:
                        "10px",

                      lineHeight:
                        1.45,
                    }}
                  >
                    Personalized tools to support your family's journey.
                  </div>

                </div>


                {/* ==========================================
                    ASK YOUR NAVIGATOR
                =========================================== */}

                <Link
                  href="/navigator"

                  role="menuitem"

                  onClick={
                    closeMenus
                  }

                  style={{
                    display:
                      "block",

                    padding:
                      "11px",

                    borderRadius:
                      "9px",

                    background:
                      "#EFF6FF",

                    textDecoration:
                      "none",
                  }}
                >

                  <div
                    style={{
                      display:
                        "flex",

                      alignItems:
                        "center",

                      justifyContent:
                        "space-between",

                      gap:
                        "10px",
                    }}
                  >

                    <span
                      style={{
                        color:
                          "#1D4ED8",

                        fontSize:
                          "13px",

                        fontWeight:
                          800,
                      }}
                    >
                      Ask Your Navigator
                    </span>


                    <span
                      style={{
                        flexShrink:
                          0,

                        padding:
                          "3px 7px",

                        borderRadius:
                          "999px",

                        background:
                          "#DBEAFE",

                        color:
                          "#1D4ED8",

                        fontSize:
                          "9px",

                        fontWeight:
                          800,

                        textTransform:
                          "uppercase",

                        letterSpacing:
                          "0.04em",
                      }}
                    >
                      Premium
                    </span>

                  </div>


                  <div
                    style={{
                      marginTop:
                        "4px",

                      color:
                        "#475569",

                      fontSize:
                        "10px",

                      lineHeight:
                        1.45,
                    }}
                  >
                    Get personalized guidance based on your family's journey.
                  </div>

                </Link>


                {/* ==========================================
                    FUTURE PREMIUM TOOLS
                =========================================== */}

                <ComingSoonTool
                  title="Advanced Personalized Resources"
                  description="More tailored resources based on your family's needs."
                />


                <ComingSoonTool
                  title="Meeting Preparation"
                  description="Prepare questions, priorities, and talking points."
                />


                <ComingSoonTool
                  title="Document Vault"
                  description="Organize important family, medical, and school documents."
                />


                <ComingSoonTool
                  title="AI Progress Insights"
                  description="See patterns and progress across your family's journey."
                />


                <ComingSoonTool
                  title="Family Organizer"
                  description="Keep important tasks, information, and next steps together."
                />



              </div>

            )}

          </div>


          <NavigationLink
            href="/community"
            label="Community"

            onClick={
              closeMenus
            }
          />


          {/* ==================================================
              AUTHENTICATED USER
          =================================================== */}

          {currentUserEmail ? (

            <div
              data-header-menu

              style={{
                position:
                  "relative",

                marginLeft:
                  "4px",
              }}
            >

              <button
                type="button"

                aria-expanded={
                  openMenu ===
                  "account"
                }

                aria-haspopup="menu"

                onClick={
                  toggleAccountMenu
                }

                style={{
                  display:
                    "flex",

                  alignItems:
                    "center",

                  gap:
                    "7px",

                  border:
                    "1px solid #2563EB",

                  background:
                    "#2563EB",

                  color:
                    "#FFFFFF",

                  padding:
                    "9px 14px",

                  borderRadius:
                    "9px",

                  fontSize:
                    "14px",

                  fontWeight:
                    800,

                  cursor:
                    "pointer",

                  whiteSpace:
                    "nowrap",
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
                  {openMenu ===
                    "account"
                    ? "▲"
                    : "▼"}
                </span>

              </button>


              {openMenu ===
                "account" && (

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
                      {
                        currentUserEmail
                      }
                    </div>

                  </div>


                  <Link
                    href="/journey"

                    role="menuitem"

                    onClick={
                      closeMenus
                    }

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

                    onClick={
                      closeMenus
                    }

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
                    Pricing
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
                    {
                      loggingOut
                        ? "Logging out..."
                        : "Log Out"
                    }
                  </button>

                </div>

              )}

            </div>

          ) : (

            /*
             * ==================================================
             * GUEST LOGIN DROPDOWN
             * ==================================================
             */

            <div
              data-header-menu

              style={{
                position:
                  "relative",

                marginLeft:
                  "4px",
              }}
            >

              <button
                type="button"

                aria-expanded={
                  openMenu ===
                  "account"
                }

                aria-haspopup="menu"

                onClick={
                  toggleAccountMenu
                }

                style={{
                  display:
                    "flex",

                  alignItems:
                    "center",

                  gap:
                    "7px",

                  border:
                    "1px solid #2563EB",

                  background:
                    "#2563EB",

                  color:
                    "#FFFFFF",

                  padding:
                    "9px 14px",

                  borderRadius:
                    "9px",

                  fontSize:
                    "14px",

                  fontWeight:
                    800,

                  cursor:
                    "pointer",

                  whiteSpace:
                    "nowrap",
                }}
              >

                <span>
                  Log In
                </span>


                <span
                  aria-hidden="true"

                  style={{
                    fontSize:
                      "10px",
                  }}
                >
                  {openMenu ===
                    "account"
                    ? "▲"
                    : "▼"}
                </span>

              </button>


              {openMenu ===
                "account" && (

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
                      "220px",

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
                  }}
                >

                  <Link
                    href="/login"

                    role="menuitem"

                    onClick={
                      closeMenus
                    }

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
                    Log In
                  </Link>


                  <Link
                    href="/pricing"

                    role="menuitem"

                    onClick={
                      closeMenus
                    }

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
                    Pricing
                  </Link>


                  <Link
                    href="/signup"

                    role="menuitem"

                    onClick={
                      closeMenus
                    }

                    style={{
                      display:
                        "block",

                      padding:
                        "10px 11px",

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

          )}

        </nav>

      </div>

    </header>

  );

}