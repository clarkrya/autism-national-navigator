"use client";

import Link from "next/link";

import FamilyOrganizerPendingInvitations from "../../../components/familyOrganizer/FamilyOrganizerPendingInvitations";

import {
  getCurrentUser,
  watchAuthState,
} from "../../../lib/auth";

import {
  useEffect,
  useState,
} from "react";

import type { User } from "firebase/auth";

/*
 * ============================================================
 * FAMILY ORGANIZER INVITATIONS PAGE
 * ============================================================
 *
 * Dedicated page for reviewing Family Team invitations.
 *
 * Invitation loading, acceptance, and decline behavior live in
 * FamilyOrganizerPendingInvitations so the same invitation
 * experience can also appear on the main Family Organizer page.
 *
 * Accepted invitations connect the authenticated Firebase UID
 * to the existing canonical child workspace.
 *
 * The child is never duplicated.
 * ============================================================
 */

export default function FamilyOrganizerInvitationsPage() {
  const [
    currentUser,
    setCurrentUser,
  ] = useState<User | null>(
    getCurrentUser()
  );

  const [
    authReady,
    setAuthReady,
  ] = useState(false);

  /*
   * ============================================================
   * AUTH
   * ============================================================
   */

  useEffect(() => {
    const unsubscribe =
      watchAuthState(
        (user) => {
          setCurrentUser(
            user
          );

          setAuthReady(
            true
          );
        }
      );

    return unsubscribe;
  }, []);

  /*
   * ============================================================
   * PAGE
   * ============================================================
   */

  return (
    <main
      style={{
        minHeight:
          "calc(100vh - 72px)",
        background:
          "#F8FAFC",
        padding:
          "48px 24px 72px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth:
            "900px",
          margin:
            "0 auto",
        }}
      >
        {/* ==================================================
            HEADER
        =================================================== */}

        <section
          style={{
            marginBottom:
              "28px",
          }}
        >
          <div
            style={{
              display:
                "inline-flex",
              alignItems:
                "center",
              padding:
                "6px 10px",
              borderRadius:
                "999px",
              background:
                "#DBEAFE",
              color:
                "#1D4ED8",
              fontSize:
                "11px",
              fontWeight: 800,
              textTransform:
                "uppercase",
              letterSpacing:
                "0.05em",
              marginBottom:
                "16px",
            }}
          >
            Family Organizer
          </div>

          <h1
            style={{
              margin: 0,
              color:
                "#0F172A",
              fontSize:
                "36px",
              lineHeight: 1.15,
              fontWeight: 850,
            }}
          >
            Family Team Invitations
          </h1>

          <p
            style={{
              margin:
                "12px 0 0",
              maxWidth:
                "720px",
              color:
                "#64748B",
              fontSize:
                "16px",
              lineHeight: 1.7,
            }}
          >
            Review invitations to
            join a child&apos;s shared
            Myriad Family Organizer.
            You will continue using
            your own Myriad account.
          </p>
        </section>

        {/* ==================================================
            AUTH LOADING
        =================================================== */}

        {!authReady ? (
          <section
            style={{
              background:
                "#FFFFFF",
              border:
                "1px solid #E2E8F0",
              borderRadius:
                "18px",
              padding:
                "28px",
            }}
          >
            <div
              style={{
                color:
                  "#64748B",
                fontSize:
                  "14px",
              }}
            >
              Loading your account...
            </div>
          </section>
        ) : null}

        {/* ==================================================
            SIGNED OUT
        =================================================== */}

        {authReady &&
        !currentUser ? (
          <section
            style={{
              background:
                "#FFFFFF",
              border:
                "1px solid #E2E8F0",
              borderRadius:
                "18px",
              padding:
                "28px",
            }}
          >
            <h2
              style={{
                margin: 0,
                color:
                  "#0F172A",
                fontSize:
                  "21px",
                fontWeight: 800,
              }}
            >
              Sign in to view your
              invitations
            </h2>

            <p
              style={{
                margin:
                  "8px 0 0",
                color:
                  "#64748B",
                fontSize:
                  "14px",
                lineHeight: 1.65,
              }}
            >
              Sign in with the
              Myriad account that
              uses the email address
              where your Family Team
              invitation was sent.
            </p>

            <Link
              href="/login"
              style={{
                display:
                  "inline-flex",
                marginTop:
                  "18px",
                padding:
                  "10px 16px",
                borderRadius:
                  "10px",
                background:
                  "#2563EB",
                color:
                  "#FFFFFF",
                fontSize:
                  "13px",
                fontWeight: 800,
                textDecoration:
                  "none",
              }}
            >
              Sign In
            </Link>
          </section>
        ) : null}

        {/* ==================================================
            INVITATIONS
        =================================================== */}

        {authReady &&
        currentUser ? (
          <FamilyOrganizerPendingInvitations />
        ) : null}

        {/* ==================================================
            ACCOUNT SAFETY
        =================================================== */}

        {authReady &&
        currentUser ? (
          <section
            style={{
              marginTop:
                "18px",
              padding:
                "19px 20px",
              borderRadius:
                "14px",
              background:
                "#F5F3FF",
              border:
                "1px solid #DDD6FE",
            }}
          >
            <div
              style={{
                color:
                  "#5B21B6",
                fontSize:
                  "13px",
                fontWeight: 800,
              }}
            >
              Your account stays
              separate
            </div>

            <p
              style={{
                margin:
                  "6px 0 0",
                color:
                  "#64748B",
                fontSize:
                  "12px",
                lineHeight: 1.65,
              }}
            >
              Family Team members
              use their own Myriad
              login. Accepting an
              invitation connects
              your account to the
              existing shared child
              workspace without
              sharing passwords or
              creating duplicate
              child information.
            </p>
          </section>
        ) : null}

        {/* ==================================================
            NAVIGATION
        =================================================== */}

        <div
          style={{
            marginTop:
              "28px",
            display:
              "flex",
            flexWrap:
              "wrap",
            gap:
              "18px",
          }}
        >
          <Link
            href="/family-organizer"
            style={{
              color:
                "#2563EB",
              fontSize:
                "14px",
              fontWeight: 750,
              textDecoration:
                "none",
            }}
          >
            ← Family Organizer
          </Link>

          <Link
            href="/family-organizer/family-team"
            style={{
              color:
                "#64748B",
              fontSize:
                "14px",
              fontWeight: 750,
              textDecoration:
                "none",
            }}
          >
            Family Team →
          </Link>
        </div>
      </div>
    </main>
  );
}