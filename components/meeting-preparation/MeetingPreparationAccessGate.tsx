"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useAccountEntitlements } from "../../lib/useAccountEntitlements";

const BRAND = {
  navy: "#204D6A",
  darkNavy: "#173B52",
  darkTeal: "#317E7B",
  lightTeal: "#EAF6F5",
  background: "#F7FAFB",
  muted: "#647B8B",
  border: "#DCE7EC",
  white: "#FFFFFF",
};

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: BRAND.background,
  padding: "38px 20px 70px",
};

const panelStyle: React.CSSProperties = {
  maxWidth: 820,
  margin: "0 auto",
  padding: 32,
  background: BRAND.white,
  border: `1px solid ${BRAND.border}`,
  borderRadius: 18,
};

const badgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: 27,
  padding: "4px 11px",
  borderRadius: 999,
  background: BRAND.lightTeal,
  color: BRAND.darkTeal,
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: "0.04em",
};

const buttonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 44,
  padding: "10px 18px",
  border: "none",
  borderRadius: 12,
  background: BRAND.darkTeal,
  color: BRAND.white,
  fontSize: 13,
  fontWeight: 800,
  textDecoration: "none",
  cursor: "pointer",
  marginTop: 22,
};

export default function MeetingPreparationAccessGate({
  children,
}: {
  children: ReactNode;
}) {
  const {
    loading,
    error,
    isAuthenticated,
    isPremium,
  } = useAccountEntitlements();

  if (loading) {
    return (
      <main style={pageStyle}>
        <div
          role="status"
          style={{
            maxWidth: 1120,
            margin: "0 auto",
            color: BRAND.muted,
            fontSize: 14,
          }}
        >
          Loading Autivoya Meeting Preparation...
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main style={pageStyle}>
        <section style={panelStyle}>
          <div style={badgeStyle}>
            AUTIVOYA MEETING PREPARATION
          </div>

          <h1
            style={{
              margin: "12px 0",
              color: BRAND.darkNavy,
              fontSize: 30,
            }}
          >
            Prepare for important meetings
            with confidence.
          </h1>

          <p
            style={{
              color: BRAND.muted,
              lineHeight: 1.65,
            }}
          >
            Sign in to prepare for appointments
            and meetings using your family's
            saved Journey.
          </p>

          <Link
            href="/login?returnTo=%2Fmeeting-preparation"
            style={buttonStyle}
          >
            Sign In
          </Link>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main style={pageStyle}>
        <section style={panelStyle}>
          <h1
            style={{
              color: BRAND.darkNavy,
              marginTop: 0,
            }}
          >
            Meeting Preparation
          </h1>

          <div
            role="alert"
            style={{
              padding: "13px 15px",
              borderRadius: 12,
              background: "#FFF2F3",
              color: "#913845",
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            {error}
          </div>

          <p style={{ color: BRAND.muted }}>
            Please refresh the page and try again.
          </p>
        </section>
      </main>
    );
  }

  if (!isPremium) {
    return (
      <main style={pageStyle}>
        <section style={panelStyle}>
          <div style={badgeStyle}>
            AUTIVOYA PREMIUM FEATURE
          </div>

          <h1
            style={{
              margin: "12px 0",
              color: BRAND.darkNavy,
              fontSize: 34,
            }}
          >
            Meeting Preparation
          </h1>

          <p
            style={{
              color: BRAND.muted,
              lineHeight: 1.65,
              maxWidth: 620,
            }}
          >
            Prepare for medical appointments,
            school meetings, therapy sessions,
            and other important conversations
            with personalized guidance based
            on your family's Journey.
          </p>

          <div
            style={{
              marginTop: 20,
              padding: "13px 15px",
              borderRadius: 12,
              background: BRAND.lightTeal,
              color: BRAND.darkTeal,
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            Premium access is required to use
            personalized Meeting Preparation,
            recommended questions, preparation
            checklists, and saved Journey Notes.
          </div>

          <Link
            href="/pricing"
            style={buttonStyle}
          >
            View Premium
          </Link>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}