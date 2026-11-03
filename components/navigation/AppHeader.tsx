
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { signOut } from "firebase/auth";
import { auth } from "../../lib/firebase";
import { watchAuthState } from "../../lib/auth";

type OpenMenu = "support" | "account" | null;

type NavigationLinkProps = {
  href: string;
  label: string;
  onClick?: () => void;
};

type SupportTool = {
  title: string;
  description: string;
  href: string;
};

/*
 * ============================================================
 * AUTIVOYA BRAND COLORS
 * ============================================================
 */

const COLORS = {
  navy: "#204D6A",
  teal: "#58AAA7",
  gold: "#F7AD3F",
  text: "#334155",
  muted: "#64748B",
  border: "#E2E8F0",
  lightTeal: "#EAF7F5",
};

/*
 * ============================================================
 * AUTIVOYA SUPPORT TOOLS
 * ============================================================
 *
 * Updated display names only.
 * All existing destination URLs are preserved.
 * ============================================================
 */

const supportTools: SupportTool[] = [
  {
    title: "Ask Your Autivoya Navigator",
    description:
      "Get personalized answers and guidance based on your family's journey.",
    href: "/navigator",
  },
  {
    title: "Autivoya Personalized Resources",
    description:
      "Discover tailored resources based on your family's needs.",
    href: "/resources",
  },
  {
    title: "Meeting Preparation",
    description:
      "Prepare questions, priorities, and talking points based on your family's current journey.",
    href: "/meeting-preparation",
  },
  {
    title: "Document Vault",
    description:
      "Securely organize important family, medical, school, and support documents.",
    href: "/document-vault",
  },
  {
    title: "Autivoya Progress Insights",
    description:
      "See patterns and progress across your family's journey.",
    href: "/progress-insights",
  },
  {
    title: "Family Organizer",
    description:
      "Coordinate your family team, shared calendar, and support contacts.",
    href: "/family-organizer",
  },
];

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
        color: COLORS.text,
        fontSize: "14px",
        fontWeight: 700,
        textDecoration: "none",
        whiteSpace: "nowrap",
        padding: "8px 10px",
        borderRadius: "8px",
      }}
    >
      {label}
    </Link>
  );
}

/*
 * ============================================================
 * SUPPORT TOOL LINK
 * ============================================================
 */

function SupportToolLink({
  tool,
  onClick,
}: {
  tool: SupportTool;
  onClick: () => void;
}) {
  // Identify the featured tool by its destination,
  // so renaming it does not remove its highlight.

  const featured = tool.href === "/navigator";

  return (
    <Link
      href={tool.href}
      role="menuitem"
      onClick={onClick}
      style={{
        display: "block",
        padding: "11px",
        borderRadius: "9px",
        background: featured
          ? COLORS.lightTeal
          : "transparent",
        textDecoration: "none",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "10px",
        }}
      >
        <span
          style={{
            color: featured
              ? COLORS.navy
              : COLORS.text,
            fontSize: "13px",
            fontWeight: featured ? 800 : 750,
          }}
        >
          {tool.title}
        </span>

        <span
          style={{
            flexShrink: 0,
            padding: "3px 7px",
            borderRadius: "999px",
            background: COLORS.lightTeal,
            color: COLORS.navy,
            fontSize: "9px",
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          Premium
        </span>
      </div>

      <div
        style={{
          marginTop: "4px",
          color: COLORS.muted,
          fontSize: "10px",
          lineHeight: 1.45,
        }}
      >
        {tool.description}
      </div>
    </Link>
  );
}

/*
 * ============================================================
 * AUTIVOYA APPLICATION HEADER
 * ============================================================
 */

export default function AppHeader() {
  const [currentUserEmail, setCurrentUserEmail] =
    useState<string | null>(null);

  const [openMenu, setOpenMenu] =
    useState<OpenMenu>(null);

  const [loggingOut, setLoggingOut] =
    useState(false);

  /*
   * ==========================================================
   * AUTHENTICATION STATE
   * ==========================================================
   */

  useEffect(() => {
    const unsubscribe = watchAuthState((user) => {
      setCurrentUserEmail(user?.email ?? null);
    });

    return () => unsubscribe();
  }, []);

  /*
   * ==========================================================
   * CLOSE MENUS WHEN CLICKING OUTSIDE
   * ==========================================================
   */

  useEffect(() => {
    function handleDocumentClick(event: MouseEvent) {
      const target = event.target;

      if (
        target instanceof Element &&
        !target.closest("[data-header-menu]")
      ) {
        setOpenMenu(null);
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
   * CLOSE MENUS WITH ESCAPE KEY
   * ==========================================================
   */

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenMenu(null);
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
   * MENU CONTROLS
   * ==========================================================
   */

  function closeMenus() {
    setOpenMenu(null);
  }

  function toggleSupportMenu() {
    setOpenMenu((current) =>
      current === "support" ? null : "support"
    );
  }

  function toggleAccountMenu() {
    setOpenMenu((current) =>
      current === "account" ? null : "account"
    );
  }

  /*
   * ==========================================================
   * LOGOUT
   * ==========================================================
   */

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      await signOut(auth);
      setOpenMenu(null);
      window.location.href = "/";
    } catch (error) {
      console.error("Logout error:", error);
      setLoggingOut(false);
    }
  }

  /*
   * ==========================================================
   * SHARED MENU STYLES
   * ==========================================================
   */

  const menuStyle: React.CSSProperties = {
    position: "absolute",
    right: 0,
    top: "calc(100% + 8px)",
    background: "#FFFFFF",
    border: `1px solid ${COLORS.border}`,
    borderRadius: "14px",
    boxShadow:
      "0 12px 30px rgba(15, 23, 42, 0.12)",
    padding: "8px",
    overflow: "hidden",
    zIndex: 1001,
  };

  const dropdownButtonStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "7px",
    border: `1px solid ${COLORS.navy}`,
    background: COLORS.navy,
    color: "#FFFFFF",
    padding: "9px 14px",
    borderRadius: "9px",
    fontSize: "14px",
    fontWeight: 800,
    cursor: "pointer",
    whiteSpace: "nowrap",
  };

  const accountLinkStyle: React.CSSProperties = {
    display: "block",
    padding: "10px 11px",
    borderRadius: "8px",
    color: COLORS.text,
    fontSize: "14px",
    fontWeight: 700,
    textDecoration: "none",
  };

  /*
   * ==========================================================
   * HEADER RENDER
   * ==========================================================
   */

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 1000,
        width: "100%",
        background: "rgba(255, 255, 255, 0.97)",
        borderBottom: `1px solid ${COLORS.border}`,
        backdropFilter: "blur(10px)",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "0 24px",
          minHeight: "72px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "20px",
        }}
      >
        {/* ==================================================
            AUTIVOYA LOGO AND BRAND
        ================================================== */}

        <Link
          href="/"
          onClick={closeMenus}
          aria-label="Autivoya home"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            color: COLORS.navy,
            textDecoration: "none",
            minWidth: 0,
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              overflow: "hidden",
            }}
          >
            <Image
              src="/autivoya-mark.png"
              alt="Autivoya family journey symbol"
              width={48}
              height={48}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
              }}
              priority
            />
          </div>

          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: "22px",
                fontWeight: 850,
                lineHeight: 1.15,
                color: COLORS.navy,
                whiteSpace: "nowrap",
                letterSpacing: "-0.5px",
              }}
            >
              Autiv
              <span style={{ color: COLORS.gold }}>
                oya
              </span>
            </div>

            <div
              style={{
                marginTop: "3px",
                fontSize: "10px",
                lineHeight: 1.2,
                color: COLORS.muted,
                whiteSpace: "nowrap",
              }}
            >
              Every journey is unique. Every step matters.
            </div>
          </div>
        </Link>

        {/* ==================================================
            MAIN NAVIGATION
        ================================================== */}

        <nav
          aria-label="Main navigation"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: "4px",
            flexWrap: "wrap",
          }}
        >
          <NavigationLink
            href="/journey"
            label="My Journey"
            onClick={closeMenus}
          />

          {/* ================================================
              SUPPORT TOOLS DROPDOWN
          ================================================ */}

          <div
            data-header-menu
            style={{ position: "relative" }}
          >
            <button
              type="button"
              aria-expanded={openMenu === "support"}
              aria-haspopup="menu"
              onClick={toggleSupportMenu}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                border: "none",
                background:
                  openMenu === "support"
                    ? COLORS.lightTeal
                    : "transparent",
                color: COLORS.text,
                padding: "8px 10px",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: 700,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              <span>Support Tools</span>

              <span
                aria-hidden="true"
                style={{ fontSize: "9px" }}
              >
                {openMenu === "support" ? "▲" : "▼"}
              </span>
            </button>

            {openMenu === "support" && (
              <div
                role="menu"
                style={{
                  ...menuStyle,
                  width: "340px",
                  maxWidth: "calc(100vw - 32px)",
                }}
              >
                {/* AUTIVOYA SUPPORT TOOLS HEADING */}

                <div
                  style={{
                    padding: "10px 11px 12px",
                    borderBottom: "1px solid #F1F5F9",
                    marginBottom: "4px",
                  }}
                >
                  <div
                    style={{
                      color: COLORS.navy,
                      fontSize: "13px",
                      fontWeight: 800,
                    }}
                  >
                    Autivoya Support Tools
                  </div>

                  <div
                    style={{
                      marginTop: "4px",
                      color: COLORS.muted,
                      fontSize: "10px",
                      lineHeight: 1.45,
                    }}
                  >
                    Personalized tools to support your
                    family's journey.
                  </div>
                </div>

                {/* PREMIUM FEATURE LINKS */}

                {supportTools.map((tool) => (
                  <SupportToolLink
                    key={tool.href}
                    tool={tool}
                    onClick={closeMenus}
                  />
                ))}
              </div>
            )}
          </div>

          {/* COMMUNITY */}

          <NavigationLink
            href="/community"
            label="Community"
            onClick={closeMenus}
          />

          {/* ================================================
              ACCOUNT DROPDOWN
          ================================================ */}

          <div
            data-header-menu
            style={{
              position: "relative",
              marginLeft: "4px",
            }}
          >
            <button
              type="button"
              aria-expanded={openMenu === "account"}
              aria-haspopup="menu"
              onClick={toggleAccountMenu}
              style={dropdownButtonStyle}
            >
              <span>
                {currentUserEmail ? "Account" : "Log In"}
              </span>

              <span
                aria-hidden="true"
                style={{ fontSize: "10px" }}
              >
                {openMenu === "account" ? "▲" : "▼"}
              </span>
            </button>

            {openMenu === "account" && (
              <div
                role="menu"
                style={{
                  ...menuStyle,
                  width: currentUserEmail
                    ? "250px"
                    : "220px",
                }}
              >
                {currentUserEmail ? (
                  <>
                    {/* SIGNED-IN USER */}

                    <div
                      style={{
                        padding: "10px 11px 12px",
                        borderBottom:
                          "1px solid #F1F5F9",
                        marginBottom: "4px",
                      }}
                    >
                      <div
                        style={{
                          color: COLORS.muted,
                          fontSize: "11px",
                          fontWeight: 800,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          marginBottom: "4px",
                        }}
                      >
                        Signed in as
                      </div>

                      <div
                        style={{
                          color: COLORS.navy,
                          fontSize: "13px",
                          fontWeight: 700,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {currentUserEmail}
                      </div>
                    </div>

                    <Link
                      href="/journey"
                      role="menuitem"
                      onClick={closeMenus}
                      style={accountLinkStyle}
                    >
                      My Journey
                    </Link>

                    <Link
                      href="/pricing"
                      role="menuitem"
                      onClick={closeMenus}
                      style={accountLinkStyle}
                    >
                      Pricing
                    </Link>

                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleLogout}
                      disabled={loggingOut}
                      style={{
                        width: "100%",
                        display: "block",
                        textAlign: "left",
                        border: "none",
                        background: "transparent",
                        padding: "10px 11px",
                        borderRadius: "8px",
                        color: "#B91C1C",
                        fontSize: "14px",
                        fontWeight: 700,
                        cursor: loggingOut
                          ? "default"
                          : "pointer",
                      }}
                    >
                      {loggingOut
                        ? "Logging out..."
                        : "Log Out"}
                    </button>
                  </>
                ) : (
                  <>
                    {/* SIGNED-OUT USER */}

                    <Link
                      href="/login"
                      role="menuitem"
                      onClick={closeMenus}
                      style={accountLinkStyle}
                    >
                      Log In
                    </Link>

                    <Link
                      href="/signup"
                      role="menuitem"
                      onClick={closeMenus}
                      style={{
                        ...accountLinkStyle,
                        color: COLORS.navy,
                        fontWeight: 800,
                      }}
                    >
                      Create Free Account
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
