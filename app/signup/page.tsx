"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import {
  createUserWithEmailAndPassword,
} from "firebase/auth";

import { auth } from "../../lib/firebase";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleSignup(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (password.length < 6) {
      setError(
        "Your password must be at least 6 characters."
      );
      return;
    }

    if (password !== confirmPassword) {
      setError(
        "The passwords do not match."
      );
      return;
    }

    setLoading(true);

    try {
      await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      setMessage(
        "Your account has been created."
      );

      /*
       * For now, return the user to the journey.
       *
       * We will connect this to the Save My Journey
       * flow next so the journey they were trying to
       * save is preserved automatically.
       */

      window.location.href = "/journey";
    } catch (error: unknown) {
      console.error(
        "Signup error:",
        error
      );

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

  return (
    <main
      style={{
        minHeight: "calc(100vh - 120px)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "60px 24px",
        background:
          "linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 100%)",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: "480px",
          background: "#FFFFFF",
          border: "1px solid #E2E8F0",
          borderRadius: "22px",
          padding: "40px",
          boxShadow:
            "0 12px 35px rgba(15, 23, 42, 0.08)",
        }}
      >
        <div
          style={{
            textAlign: "center",
            marginBottom: "30px",
          }}
        >
          <div
            style={{
              fontSize: "38px",
              marginBottom: "12px",
            }}
          >
            🧭
          </div>

          <h1
            style={{
              margin: 0,
              color: "#0F172A",
              fontSize: "32px",
              lineHeight: 1.2,
              fontWeight: 800,
            }}
          >
            Create Your Free Account
          </h1>

          <p
            style={{
              marginTop: "12px",
              marginBottom: 0,
              color: "#64748B",
              fontSize: "16px",
              lineHeight: 1.6,
            }}
          >
            Save your personalized journey and
            come back to it anytime.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            style={{
              marginBottom: "20px",
              padding: "13px 15px",
              borderRadius: "10px",
              background: "#FEF2F2",
              border: "1px solid #FECACA",
              color: "#B91C1C",
              fontSize: "14px",
              lineHeight: 1.5,
            }}
          >
            {error}
          </div>
        )}

        {message && (
          <div
            role="status"
            style={{
              marginBottom: "20px",
              padding: "13px 15px",
              borderRadius: "10px",
              background: "#ECFDF5",
              border: "1px solid #A7F3D0",
              color: "#047857",
              fontSize: "14px",
              lineHeight: 1.5,
            }}
          >
            {message}
          </div>
        )}

        <form onSubmit={handleSignup}>
          <div
            style={{
              marginBottom: "18px",
            }}
          >
            <label
              htmlFor="email"
              style={{
                display: "block",
                marginBottom: "7px",
                color: "#334155",
                fontSize: "14px",
                fontWeight: 700,
              }}
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
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "13px 14px",
                borderRadius: "10px",
                border:
                  "1px solid #CBD5E1",
                fontSize: "16px",
                color: "#0F172A",
                outline: "none",
              }}
            />
          </div>

          <div
            style={{
              marginBottom: "18px",
            }}
          >
            <label
              htmlFor="password"
              style={{
                display: "block",
                marginBottom: "7px",
                color: "#334155",
                fontSize: "14px",
                fontWeight: 700,
              }}
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
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "13px 14px",
                borderRadius: "10px",
                border:
                  "1px solid #CBD5E1",
                fontSize: "16px",
                color: "#0F172A",
                outline: "none",
              }}
            />
          </div>

          <div
            style={{
              marginBottom: "24px",
            }}
          >
            <label
              htmlFor="confirmPassword"
              style={{
                display: "block",
                marginBottom: "7px",
                color: "#334155",
                fontSize: "14px",
                fontWeight: 700,
              }}
            >
              Confirm Password
            </label>

            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(
                  event.target.value
                )
              }
              required
              placeholder="Re-enter your password"
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "13px 14px",
                borderRadius: "10px",
                border:
                  "1px solid #CBD5E1",
                fontSize: "16px",
                color: "#0F172A",
                outline: "none",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px 18px",
              borderRadius: "10px",
              border: "none",
              background: loading
                ? "#93C5FD"
                : "#2563EB",
              color: "#FFFFFF",
              fontSize: "16px",
              fontWeight: 800,
              cursor: loading
                ? "default"
                : "pointer",
            }}
          >
            {loading
              ? "Creating Account..."
              : "Create Free Account"}
          </button>
        </form>

        <div
          style={{
            marginTop: "28px",
            paddingTop: "24px",
            borderTop:
              "1px solid #E2E8F0",
            textAlign: "center",
          }}
        >
          <p
            style={{
              margin: 0,
              color: "#64748B",
              fontSize: "14px",
            }}
          >
            Already have an account?
          </p>

          <Link
            href="/login"
            style={{
              display: "inline-block",
              marginTop: "7px",
              color: "#2563EB",
              fontSize: "15px",
              fontWeight: 800,
              textDecoration: "none",
            }}
          >
            Log in
          </Link>
        </div>

        <div
          style={{
            marginTop: "28px",
            textAlign: "center",
          }}
        >
          <Link
            href="/journey"
            style={{
              color: "#64748B",
              fontSize: "13px",
              textDecoration: "none",
            }}
          >
            ← Back to my journey
          </Link>
        </div>
      </section>
    </main>
  );
}