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


export default function LoginPage() {

  const [
    email,
    setEmail,
  ] = useState("");

  const [
    password,
    setPassword,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    resetting,
    setResetting,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    message,
    setMessage,
  ] = useState("");


  /*
   * ============================================================
   * DETERMINE RETURN LOCATION
   * ============================================================
   *
   * Examples:
   *
   * /login
   * /login?returnTo=/community
   *
   * We only allow local paths beginning with "/" so an external
   * website cannot be supplied as the redirect destination.
   */

  function getReturnTo(): string {

    if (
      typeof window ===
      "undefined"
    ) {

      return "/journey";

    }


    const params =
      new URLSearchParams(
        window.location.search
      );


    const returnTo =
      params.get(
        "returnTo"
      );


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
    event:
      FormEvent<HTMLFormElement>
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
       * Return the user to the page that sent them here.
       *
       * Examples:
       *
       * Community → Community
       * Journey   → Journey
       * Pricing   → Pricing
       *
       * Default:
       *
       * Journey
       */

      const returnTo =
        getReturnTo();


      window.location.href =
        returnTo;

    } catch (
      error: unknown
    ) {

      console.error(
        "Login error:",
        error
      );


      if (
        error &&
        typeof error ===
          "object" &&
        "code" in error
      ) {

        const code =
          String(
            (
              error as {
                code?: unknown;
              }
            ).code
          );


        switch (
          code
        ) {

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

      setLoading(
        false
      );

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


    if (
      !email.trim()
    ) {

      setError(
        "Enter your email address first, then select Forgot password."
      );

      return;

    }


    setResetting(
      true
    );


    try {

      await sendPasswordResetEmail(
        auth,
        email.trim()
      );


      setMessage(
        "If an account exists for this email, we've sent instructions to reset your password."
      );

    } catch (
      error: unknown
    ) {

      console.error(
        "Password reset error:",
        error
      );


      setError(
        "We couldn't send the password reset email. Please check your email address and try again."
      );

    } finally {

      setResetting(
        false
      );

    }

  }


  /*
   * ============================================================
   * RETURN
   * ============================================================
   */

  return (

    <main
      style={{
        minHeight:
          "calc(100vh - 120px)",

        display:
          "flex",

        justifyContent:
          "center",

        alignItems:
          "center",

        padding:
          "60px 24px",

        background:
          "linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 100%)",
      }}
    >

      <section
        style={{
          width:
            "100%",

          maxWidth:
            "480px",

          background:
            "#FFFFFF",

          border:
            "1px solid #E2E8F0",

          borderRadius:
            "22px",

          padding:
            "40px",

          boxShadow:
            "0 12px 35px rgba(15, 23, 42, 0.08)",
        }}
      >

        <div
          style={{
            textAlign:
              "center",

            marginBottom:
              "30px",
          }}
        >

          <div
            style={{
              fontSize:
                "38px",

              marginBottom:
                "12px",
            }}
          >
            🧭
          </div>


          <h1
            style={{
              margin:
                0,

              color:
                "#0F172A",

              fontSize:
                "32px",

              lineHeight:
                1.2,

              fontWeight:
                800,
            }}
          >
            Welcome Back
          </h1>


          <p
            style={{
              marginTop:
                "12px",

              marginBottom:
                0,

              color:
                "#64748B",

              fontSize:
                "16px",

              lineHeight:
                1.6,
            }}
          >
            Log in to save and continue your
            personalized journey.
          </p>

        </div>


        {error && (

          <div
            role="alert"

            style={{
              marginBottom:
                "20px",

              padding:
                "13px 15px",

              borderRadius:
                "10px",

              background:
                "#FEF2F2",

              border:
                "1px solid #FECACA",

              color:
                "#B91C1C",

              fontSize:
                "14px",

              lineHeight:
                1.5,
            }}
          >
            {error}
          </div>

        )}


        {message && (

          <div
            role="status"

            style={{
              marginBottom:
                "20px",

              padding:
                "13px 15px",

              borderRadius:
                "10px",

              background:
                "#ECFDF5",

              border:
                "1px solid #A7F3D0",

              color:
                "#047857",

              fontSize:
                "14px",

              lineHeight:
                1.5,
            }}
          >
            {message}
          </div>

        )}


        <form
          onSubmit={
            handleLogin
          }
        >

          <div
            style={{
              marginBottom:
                "18px",
            }}
          >

            <label
              htmlFor="email"

              style={{
                display:
                  "block",

                marginBottom:
                  "7px",

                color:
                  "#334155",

                fontSize:
                  "14px",

                fontWeight:
                  700,
              }}
            >
              Email
            </label>


            <input
              id="email"

              type="email"

              autoComplete="email"

              value={
                email
              }

              onChange={(
                event
              ) =>
                setEmail(
                  event.target.value
                )
              }

              required

              placeholder="you@example.com"

              style={{
                width:
                  "100%",

                boxSizing:
                  "border-box",

                padding:
                  "13px 14px",

                borderRadius:
                  "10px",

                border:
                  "1px solid #CBD5E1",

                fontSize:
                  "16px",

                color:
                  "#0F172A",

                outline:
                  "none",
              }}
            />

          </div>


          <div
            style={{
              marginBottom:
                "10px",
            }}
          >

            <label
              htmlFor="password"

              style={{
                display:
                  "block",

                marginBottom:
                  "7px",

                color:
                  "#334155",

                fontSize:
                  "14px",

                fontWeight:
                  700,
              }}
            >
              Password
            </label>


            <input
              id="password"

              type="password"

              autoComplete="current-password"

              value={
                password
              }

              onChange={(
                event
              ) =>
                setPassword(
                  event.target.value
                )
              }

              required

              placeholder="Enter your password"

              style={{
                width:
                  "100%",

                boxSizing:
                  "border-box",

                padding:
                  "13px 14px",

                borderRadius:
                  "10px",

                border:
                  "1px solid #CBD5E1",

                fontSize:
                  "16px",

                color:
                  "#0F172A",

                outline:
                  "none",
              }}
            />

          </div>


          <div
            style={{
              textAlign:
                "right",

              marginBottom:
                "24px",
            }}
          >

            <button
              type="button"

              onClick={
                handlePasswordReset
              }

              disabled={
                resetting
              }

              style={{
                border:
                  "none",

                background:
                  "transparent",

                padding:
                  0,

                color:
                  "#2563EB",

                fontSize:
                  "13px",

                fontWeight:
                  700,

                cursor:
                  resetting
                    ? "default"
                    : "pointer",
              }}
            >
              {
                resetting
                  ? "Sending..."
                  : "Forgot password?"
              }
            </button>

          </div>


          <button
            type="submit"

            disabled={
              loading
            }

            style={{
              width:
                "100%",

              padding:
                "14px 18px",

              borderRadius:
                "10px",

              border:
                "none",

              background:
                loading
                  ? "#93C5FD"
                  : "#2563EB",

              color:
                "#FFFFFF",

              fontSize:
                "16px",

              fontWeight:
                800,

              cursor:
                loading
                  ? "default"
                  : "pointer",
            }}
          >
            {
              loading
                ? "Logging in..."
                : "Log In"
            }
          </button>

        </form>


        <div
          style={{
            marginTop:
              "28px",

            paddingTop:
              "24px",

            borderTop:
              "1px solid #E2E8F0",

            textAlign:
              "center",
          }}
        >

          <p
            style={{
              margin:
                0,

              color:
                "#64748B",

              fontSize:
                "14px",
            }}
          >
            Don't have an account?
          </p>


          <Link
            href={
              `/signup?returnTo=${encodeURIComponent(
                getReturnTo()
              )}`
            }

            style={{
              display:
                "inline-block",

              marginTop:
                "7px",

              color:
                "#2563EB",

              fontSize:
                "15px",

              fontWeight:
                800,

              textDecoration:
                "none",
            }}
          >
            Create a free account
          </Link>

        </div>


        <div
          style={{
            marginTop:
              "28px",

            textAlign:
              "center",
          }}
        >

          <Link
            href={
              getReturnTo()
            }

            style={{
              color:
                "#64748B",

              fontSize:
                "13px",

              textDecoration:
                "none",
            }}
          >
            ← Back
          </Link>

        </div>

      </section>

    </main>

  );

}