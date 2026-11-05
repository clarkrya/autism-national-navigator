
"use client";

import { FormEvent, useState } from "react";

import Link from "next/link";

import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import {
  createUserWithEmailAndPassword,
} from "firebase/auth";

import {
  doc,
  setDoc,
} from "firebase/firestore";

import {
  auth,
  db,
} from "../../lib/firebase";

import {
  getPendingJourney,
  clearPendingJourney,
} from "../../lib/journeyStorage";

/*
 * ============================================================
 * AUTIVOYA — SIGNUP PAGE
 * ============================================================
 *
 * Creates a free Autivoya account.
 *
 * Preserves:
 * - Firebase email/password authentication
 * - Password confirmation and validation
 * - Pending Journey persistence
 * - Existing Firestore document structure
 * - Existing Firebase error handling
 * - Autivoya branding and layout
 * - Return navigation
 *
 * Improvements:
 * - Stronger internal redirect validation
 * - Family Team invitation return navigation
 * - Prevents unrelated Journey creation during
 *   Family Team invitation registration
 *
 * ============================================================
 */

const BRAND = {
  navy: "#204D6A",
  darkNavy: "#173B52",
  teal: "#58AAA7",
  darkTeal: "#278482",
  gold: "#F7AD3F",
  lightTeal: "#EAF6F5",
  background: "#F7FAFB",
  white: "#FFFFFF",
  muted: "#647B8B",
  border: "#DCE7EC",
};

/*
 * ============================================================
 * SAFE RETURN DESTINATION
 * ============================================================
 *
 * Only internal application paths are accepted.
 *
 * Examples:
 * /journey
 * /community
 * /pricing
 * /family-organizer/invitations
 *
 * Reject:
 * - External URLs
 * - Protocol-relative URLs
 * - Backslashes
 * - Control characters
 *
 * Default: /journey
 *
 * ============================================================
 */

function getSafeReturnTo(
  value: string | null
): string {
  const fallback = "/journey";

  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    /[\u0000-\u001F\u007F]/.test(value)
  ) {
    return fallback;
  }

  return value;
}

/*
 * ============================================================
 * SHARED FIELD STYLES
 * ============================================================
 */

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 7,
  color: BRAND.navy,
  fontSize: 14,
  fontWeight: 700,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "13px 14px",
  borderRadius: 10,
  border: `1px solid ${BRAND.border}`,
  background: BRAND.white,
  fontSize: 16,
  color: BRAND.darkNavy,
  outlineColor: BRAND.teal,
};

/*
 * ============================================================
 * PAGE
 * ============================================================
 */

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  /*
   * ============================================================
   * RETURN DESTINATION
   * ============================================================
   */

  const returnTo = getSafeReturnTo(
    searchParams.get("returnTo")
  );

  /*
   * ============================================================
   * FAMILY TEAM INVITATION DETECTION
   * ============================================================
   *
   * Invitation-based registration should not create
   * a separate Journey from locally stored data.
   *
   * The invited member must eventually access the
   * original owner's canonical child workspace.
   *
   * ============================================================
   */

  const isFamilyInvitation =
    returnTo === "/family-organizer/invitations" ||
    returnTo.startsWith(
      "/family-organizer/invitations?"
    ) ||
    returnTo.startsWith(
      "/family-organizer/invitations/"
    );

  /*
   * ============================================================
   * FORM STATE
   * ============================================================
   */

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  /*
   * ============================================================
   * NAVIGATION LABEL
   * ============================================================
   */

  const backLabel =
    returnTo === "/community"
      ? "← Back to Community"
      : returnTo.startsWith("/community/")
        ? "← Back to Conversation"
        : isFamilyInvitation
          ? "← Back to Invitations"
          : "← Back";

  /*
   * ============================================================
   * LOGIN URL
   * ============================================================
   *
   * Preserve the original return destination when
   * switching from signup to login.
   */

  const loginUrl =
    `/login?returnTo=${encodeURIComponent(returnTo)}`;

  /*
   * ============================================================
   * BACK NAVIGATION
   * ============================================================
   */

  function handleBack() {
    router.replace(returnTo);
  }

  /*
   * ============================================================
   * SIGN UP
   * ============================================================
   */

  async function handleSignup(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setMessage("");
    setLoading(true);

    /*
     * ==========================================================
     * PASSWORD VALIDATION
     * ==========================================================
     */

    if (password.length < 6) {
      setError(
        "Your password must be at least 6 characters."
      );
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      setLoading(false);
      return;
    }

    try {
      /*
       * ========================================================
       * CREATE FIREBASE ACCOUNT
       * ========================================================
       */

      const credential =
        await createUserWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );

      const user = credential.user;

      /*
       * ========================================================
       * CHECK FOR PENDING JOURNEY
       * ========================================================
       *
       * Normal signup:
       * Restore the user's locally stored Journey.
       *
       * Family Team invitation signup:
       * Do not create a separate Journey.
       *
       * Existing pending Journey data is not deleted
       * when signing up through an invitation.
       *
       * ========================================================
       */

      const pendingJourney = isFamilyInvitation
        ? null
        : getPendingJourney();

      /*
       * ========================================================
       * SAVE PENDING JOURNEY
       * ========================================================
       *
       * Preserve the existing Firestore structure.
       *
       * This is only performed for normal registration
       * when a pending Journey exists.
       *
       * ========================================================
       */

      if (pendingJourney) {
        try {
          const journeyRef = doc(
            db,
            "users",
            user.uid,
            "journeys",
            "current"
          );

          await setDoc(
            journeyRef,
            {
              familyProfile:
                pendingJourney.familyProfile,
              journey:
                pendingJourney.personalizedJourney,
              updatedAt: Date.now(),
              createdBy: user.uid,
            },
            {
              merge: true,
            }
          );

          clearPendingJourney();
        } catch (saveError) {
          console.error(
            "Unable to save pending journey after signup:",
            saveError
          );

          setError(
            "Your account was created, but we couldn't save your journey yet. Your journey is still being kept temporarily. Please try again."
          );

          setLoading(false);
          return;
        }
      }

      /*
       * ========================================================
       * RETURN TO ORIGINAL PAGE
       * ========================================================
       *
       * Family Team registration:
       * /family-organizer/invitations
       *
       * Normal registration:
       * Return to the original requested page.
       *
       * Default:
       * /journey
       *
       * ========================================================
       */

      router.replace(returnTo);
    } catch (error: unknown) {
      console.error("Signup error:", error);

      /*
       * ========================================================
       * FIREBASE ERROR HANDLING
       * ========================================================
       */

      if (
        error &&
        typeof error === "object" &&
        "code" in error
      ) {
        const code = String(
          (error as { code?: unknown }).code
        );

        switch (code) {
          case "auth/email-already-in-use":
            setError(
              "An account already exists with this email. Try logging in instead."
            );
            break;

          case "auth/invalid-email":
            setError(
              "Please enter a valid email address."
            );
            break;

          case "auth/weak-password":
            setError(
              "Please choose a stronger password."
            );
            break;

          case "auth/operation-not-allowed":
            setError(
              "Email and password accounts are not currently enabled."
            );
            break;

          default:
            setError(
              "We couldn't create your account right now. Please try again."
            );
        }
      } else {
        setError(
          "We couldn't create your account right now. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  /*
   * ============================================================
   * PAGE
   * ============================================================
   */

  return (
    <main
      style={{
        minHeight: "calc(100vh - 120px)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "60px 24px",
        background:
          "linear-gradient(180deg, #F7FAFB 0%, #FFFFFF 100%)",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: 480,
          boxSizing: "border-box",
          background: BRAND.white,
          border: `1px solid ${BRAND.border}`,
          borderRadius: 22,
          padding: 40,
          boxShadow:
            "0 12px 35px rgba(23, 59, 82, 0.07)",
        }}
      >
        {/* ==================================================
            HEADER
        ================================================== */}

        <div
          style={{
            textAlign: "center",
            marginBottom: 30,
          }}
        >
          {/* AUTIVOYA LOGO MARK */}

          <div
            style={{
              width: 60,
              height: 60,
              margin: "0 auto 14px",
              borderRadius: 18,
              background: BRAND.lightTeal,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid #D1EAE8",
            }}
          >
            <img
              src="/autivoya-mark.png"
              alt="Autivoya"
              style={{
                width: 48,
                height: 48,
                objectFit: "contain",
              }}
            />
          </div>

          <h1
            style={{
              margin: 0,
              color: BRAND.darkNavy,
              fontSize: 32,
              lineHeight: 1.2,
              fontWeight: 800,
            }}
          >
            Create Your Free Account
          </h1>

          <p
            style={{
              marginTop: 12,
              marginBottom: 0,
              color: BRAND.muted,
              fontSize: 16,
              lineHeight: 1.6,
            }}
          >
            Save your personalized Autivoya Journey
            and come back to it anytime.
          </p>
        </div>

        {/* ==================================================
            ERROR
        ================================================== */}

        {error && (
          <div
            role="alert"
            style={{
              marginBottom: 20,
              padding: "13px 15px",
              borderRadius: 10,
              background: "#FEF2F2",
              border: "1px solid #FECACA",
              color: "#B91C1C",
              fontSize: 14,
              lineHeight: 1.5,
            }}
          >
            {error}
          </div>
        )}

        {/* ==================================================
            MESSAGE
        ================================================== */}

        {message && (
          <div
            role="status"
            style={{
              marginBottom: 20,
              padding: "13px 15px",
              borderRadius: 10,
              background: BRAND.lightTeal,
              border: "1px solid #C9E7E4",
              color: BRAND.darkTeal,
              fontSize: 14,
              lineHeight: 1.5,
            }}
          >
            {message}
          </div>
        )}

        {/* ==================================================
            FORM
        ================================================== */}

        <form onSubmit={handleSignup}>
          {/* EMAIL */}

          <div style={{ marginBottom: 18 }}>
            <label
              htmlFor="email"
              style={labelStyle}
            >
              Email
            </label>

            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              required
              placeholder="you@example.com"
              style={inputStyle}
            />
          </div>

          {/* PASSWORD */}

          <div style={{ marginBottom: 18 }}>
            <label
              htmlFor="password"
              style={labelStyle}
            >
              Password
            </label>

            <input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              required
              placeholder="At least 6 characters"
              style={inputStyle}
            />
          </div>

          {/* CONFIRM PASSWORD */}

          <div style={{ marginBottom: 24 }}>
            <label
              htmlFor="confirmPassword"
              style={labelStyle}
            >
              Confirm Password
            </label>

            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(event.target.value)
              }
              required
              placeholder="Re-enter your password"
              style={inputStyle}
            />
          </div>

          {/* ==================================================
              CREATE ACCOUNT
          ================================================== */}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px 18px",
              borderRadius: 10,
              border: "none",
              background: loading
                ? BRAND.teal
                : BRAND.darkTeal,
              color: BRAND.white,
              fontSize: 16,
              fontWeight: 800,
              cursor: loading
                ? "default"
                : "pointer",
              opacity: loading ? 0.75 : 1,
              boxShadow:
                "0 5px 14px rgba(39, 132, 130, 0.15)",
            }}
          >
            {loading
              ? "Creating Account..."
              : "Create Free Account"}
          </button>
        </form>

        {/* ==================================================
            LOGIN
        ================================================== */}

        <div
          style={{
            marginTop: 28,
            paddingTop: 24,
            borderTop: `1px solid ${BRAND.border}`,
            textAlign: "center",
          }}
        >
          <p
            style={{
              margin: 0,
              color: BRAND.muted,
              fontSize: 14,
            }}
          >
            Already have an account?
          </p>

          <Link
            href={loginUrl}
            style={{
              display: "inline-block",
              marginTop: 7,
              color: BRAND.darkTeal,
              fontSize: 15,
              fontWeight: 800,
              textDecoration: "none",
            }}
          >
            Log in
          </Link>
        </div>

        {/* ==================================================
            BACK
        ================================================== */}

        <div
          style={{
            marginTop: 28,
            textAlign: "center",
          }}
        >
          <button
            type="button"
            onClick={handleBack}
            style={{
              border: "none",
              background: "transparent",
              padding: 0,
              color: BRAND.navy,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {backLabel}
          </button>
        </div>
      </section>
    </main>
  );
}
