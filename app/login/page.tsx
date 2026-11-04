
"use client";

import {
  FormEvent,
  useState,
} from "react";

import Link from "next/link";

import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";

import {
  auth,
} from "../../lib/firebase";

/*
 * ============================================================
 * AUTIVOYA — LOGIN PAGE
 * ============================================================
 *
 * Preserves:
 * - Firebase email/password authentication
 * - Password reset emails
 * - Existing authentication error handling
 * - returnTo redirect after login
 * - returnTo parameter when navigating to signup
 *
 * ============================================================
 */

const BRAND = {
  navy: "#204D6A",
  darkNavy: "#173B52",
  teal: "#58AAA7",
  darkTeal: "#278482",
  lightTeal: "#EAF6F5",
  background: "#F7FAFB",
  white: "#FFFFFF",
  muted: "#647B8B",
  border: "#DCE7EC",
};

/*
 * ============================================================
 * SHARED FORM STYLES
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

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  /*
   * ============================================================
   * DETERMINE RETURN LOCATION
   * ============================================================
   *
   * Only local application paths are accepted.
   */

  function getReturnTo(): string {
    if (typeof window === "undefined") {
      return "/journey";
    }

    const params = new URLSearchParams(
      window.location.search
    );

    const returnTo = params.get("returnTo");

    if (
      !returnTo ||
      !returnTo.startsWith("/") ||
      returnTo.startsWith("//")
    ) {
      return "/journey";
    }

    return returnTo;
  }

  /*
   * ============================================================
   * LOGIN
   * ============================================================
   */

  async function handleLogin(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setMessage("");
    setLoading(true);

    try {
      await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      /*
       * Return to the page that sent the user here.
       *
       * Community → Community
       * Journey   → Journey
       * Pricing   → Pricing
       *
       * Default: Journey
       */

      const returnTo = getReturnTo();

      window.location.href = returnTo;
    } catch (error: unknown) {
      console.error("Login error:", error);

      if (
        error &&
        typeof error === "object" &&
        "code" in error
      ) {
        const code = String(
          (error as { code?: unknown }).code
        );

        switch (code) {
          case "auth/invalid-credential":
          case "auth/wrong-password":
          case "auth/user-not-found":
            setError(
              "The email or password is incorrect."
            );
            break;

          case "auth/invalid-email":
            setError(
              "Please enter a valid email address."
            );
            break;

          case "auth/too-many-requests":
            setError(
              "Too many unsuccessful attempts. Please try again later."
            );
            break;

          default:
            setError(
              "We couldn't log you in right now. Please try again."
            );
        }
      } else {
        setError(
          "We couldn't log you in right now. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  /*
   * ============================================================
   * PASSWORD RESET
   * ============================================================
   */

  async function handlePasswordReset() {
    setError("");
    setMessage("");

    if (!email.trim()) {
      setError(
        "Enter your email address first, then select Forgot password."
      );
      return;
    }

    setResetting(true);

    try {
      await sendPasswordResetEmail(
        auth,
        email.trim()
      );

      setMessage(
        "If an account exists for this email, we've sent instructions to reset your password."
      );
    } catch (error: unknown) {
      console.error(
        "Password reset error:",
        error
      );

      setError(
        "We couldn't send the password reset email. Please check your email address and try again."
      );
    } finally {
      setResetting(false);
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
            Welcome Back
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
            Log in to continue your personalized
            Autivoya Journey.
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
            LOGIN FORM
        ================================================== */}

        <form onSubmit={handleLogin}>
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

          <div style={{ marginBottom: 10 }}>
            <label
              htmlFor="password"
              style={labelStyle}
            >
              Password
            </label>

            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              required
              placeholder="Enter your password"
              style={inputStyle}
            />
          </div>

          {/* FORGOT PASSWORD */}

          <div
            style={{
              textAlign: "right",
              marginBottom: 24,
            }}
          >
            <button
              type="button"
              onClick={handlePasswordReset}
              disabled={resetting}
              style={{
                border: "none",
                background: "transparent",
                padding: 0,
                color: BRAND.darkTeal,
                fontSize: 13,
                fontWeight: 700,
                cursor: resetting
                  ? "default"
                  : "pointer",
                opacity: resetting ? 0.65 : 1,
              }}
            >
              {resetting
                ? "Sending..."
                : "Forgot password?"}
            </button>
          </div>

          {/* LOG IN */}

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
              ? "Logging in..."
              : "Log In"}
          </button>
        </form>

        {/* ==================================================
            SIGNUP
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
            Don&apos;t have an account?
          </p>

          <Link
            href={`/signup?returnTo=${encodeURIComponent(
              getReturnTo()
            )}`}
            style={{
              display: "inline-block",
              marginTop: 7,
              color: BRAND.darkTeal,
              fontSize: 15,
              fontWeight: 800,
              textDecoration: "none",
            }}
          >
            Create a free account
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
          <Link
            href={getReturnTo()}
            style={{
              color: BRAND.navy,
              fontSize: 13,
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            ← Back
          </Link>
        </div>
      </section>
    </main>
  );
}
