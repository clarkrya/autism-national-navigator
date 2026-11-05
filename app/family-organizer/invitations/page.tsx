
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { User } from "firebase/auth";

import FamilyOrganizerPendingInvitations from "../../../components/familyOrganizer/FamilyOrganizerPendingInvitations";

import {
  getCurrentUser,
  watchAuthState,
} from "../../../lib/auth";

/*
 * ============================================================
 * AUTIVOYA — FAMILY ORGANIZER INVITATIONS
 * ============================================================
 *
 * Dedicated page for reviewing Family Team invitations.
 *
 * Invitation loading, acceptance, and decline behavior remain
 * in FamilyOrganizerPendingInvitations.
 *
 * Accepted invitations connect the authenticated Firebase UID
 * to the existing canonical child workspace.
 *
 * The child is never duplicated.
 *
 * Branding:
 * Navy:      #204D6A
 * Dark Navy: #173B52
 * Teal:      #58AAA7
 * Dark Teal: #317E7B
 * Gold:      #F7AD3F
 * ============================================================
 */

const BRAND = {
  navy: "#204D6A",
  darkNavy: "#173B52",
  teal: "#58AAA7",
  darkTeal: "#317E7B",
  gold: "#F7AD3F",
  lightTeal: "#EAF6F5",
  background: "#F7FAFB",
  white: "#FFFFFF",
  muted: "#647B8B",
  border: "#DCE7EC",
};

/*
 * ============================================================
 * SHARED STYLES
 * ============================================================
 */

const cardStyle: React.CSSProperties = {
  background: BRAND.white,
  border: `1px solid ${BRAND.border}`,
  borderRadius: 18,
  padding: 28,
  boxShadow: "0 6px 20px rgba(23, 59, 82, 0.04)",
};

const navigationLinkStyle: React.CSSProperties = {
  color: BRAND.darkTeal,
  fontSize: 14,
  fontWeight: 750,
  textDecoration: "none",
};

/*
 * ============================================================
 * FAMILY ORGANIZER INVITATIONS PAGE
 * ============================================================
 */

export default function FamilyOrganizerInvitationsPage() {
  const [currentUser, setCurrentUser] =
    useState<User | null>(getCurrentUser());

  const [authReady, setAuthReady] =
    useState(false);

  /*
   * ==========================================================
   * AUTHENTICATION
   * ==========================================================
   */

  useEffect(() => {
    const unsubscribe = watchAuthState((user) => {
      setCurrentUser(user);
      setAuthReady(true);
    });

    return unsubscribe;
  }, []);

  /*
   * ==========================================================
   * PAGE
   * ==========================================================
   */

  return (
    <main
      style={{
        minHeight: "calc(100vh - 72px)",
        background: BRAND.background,
        padding: "48px 24px 72px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 900,
          margin: "0 auto",
        }}
      >
        {/* ==================================================
            PAGE HEADER
        ================================================== */}

        <section style={{ marginBottom: 28 }}>
          {/* FAMILY ORGANIZER BADGE */}

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "6px 10px",
              borderRadius: 999,
              background: BRAND.lightTeal,
              color: BRAND.darkTeal,
              fontSize: 11,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: 16,
            }}
          >
            Autivoya Family Organizer
          </div>

          {/* PAGE TITLE */}

          <h1
            style={{
              margin: 0,
              color: BRAND.darkNavy,
              fontSize: 36,
              lineHeight: 1.15,
              fontWeight: 850,
            }}
          >
            Family Team Invitations
          </h1>

          {/* PAGE DESCRIPTION */}

          <p
            style={{
              margin: "12px 0 0",
              maxWidth: 720,
              color: BRAND.muted,
              fontSize: 16,
              lineHeight: 1.7,
            }}
          >
            Review invitations to join a
            child&apos;s shared Autivoya Family
            Organizer. You will continue
            using your own Autivoya account.
          </p>
        </section>

        {/* ==================================================
            AUTHENTICATION LOADING
        ================================================== */}

        {!authReady ? (
          <section style={cardStyle}>
            <div
              style={{
                color: BRAND.muted,
                fontSize: 14,
              }}
            >
              Loading your account...
            </div>
          </section>
        ) : null}

        {/* ==================================================
            SIGNED-OUT EXPERIENCE
        ================================================== */}

        {authReady && !currentUser ? (
          <section style={cardStyle}>
            <h2
              style={{
                margin: 0,
                color: BRAND.darkNavy,
                fontSize: 21,
                fontWeight: 800,
              }}
            >
              Sign in to view your invitations
            </h2>

            <p
              style={{
                margin: "8px 0 0",
                color: BRAND.muted,
                fontSize: 14,
                lineHeight: 1.65,
              }}
            >
              Sign in with the Autivoya account
              that uses the email address where
              your Family Team invitation was sent.
            </p>

            <Link
  href="/login?returnTo=%2Ffamily-organizer%2Finvitations"
  style={{
                display: "inline-flex",
                marginTop: 18,
                padding: "10px 16px",
                borderRadius: 10,
                background: BRAND.darkTeal,
                color: BRAND.white,
                fontSize: 13,
                fontWeight: 800,
                textDecoration: "none",
              }}
            >
              Sign In
            </Link>
          </section>
        ) : null}

        {/* ==================================================
            FAMILY TEAM INVITATIONS
        ================================================== */}

        {authReady && currentUser ? (
          <FamilyOrganizerPendingInvitations />
        ) : null}

        {/* ==================================================
            ACCOUNT SAFETY INFORMATION
        ================================================== */}

        {authReady && currentUser ? (
          <section
            style={{
              marginTop: 18,
              padding: "19px 20px",
              borderRadius: 14,
              background: BRAND.lightTeal,
              border: "1px solid #D1EAE8",
              borderLeft: `4px solid ${BRAND.teal}`,
            }}
          >
            <div
              style={{
                color: BRAND.darkTeal,
                fontSize: 13,
                fontWeight: 800,
              }}
            >
              Your account stays separate
            </div>

            <p
              style={{
                margin: "6px 0 0",
                color: BRAND.navy,
                fontSize: 12,
                lineHeight: 1.65,
              }}
            >
              Family Team members use their
              own Autivoya account. Accepting
              an invitation connects your
              account to the existing shared
              child workspace without sharing
              passwords or creating duplicate
              child information.
            </p>
          </section>
        ) : null}

        {/* ==================================================
            NAVIGATION
        ================================================== */}

        <div
          style={{
            marginTop: 28,
            display: "flex",
            flexWrap: "wrap",
            gap: 18,
          }}
        >
          <Link
            href="/family-organizer"
            style={navigationLinkStyle}
          >
            ← Family Organizer
          </Link>

          <Link
            href="/family-organizer/family-team"
            style={{
              ...navigationLinkStyle,
              color: BRAND.navy,
            }}
          >
            Family Team →
          </Link>
        </div>
      </div>
    </main>
  );
}
