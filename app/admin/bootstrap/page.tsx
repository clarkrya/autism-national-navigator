"use client";

import {
  useState,
} from "react";

import {
  getCurrentUser,
} from "../../../lib/auth";


export default function AdminBootstrapPage() {

  const [
    secret,
    setSecret,
  ] = useState("");


  const [
    message,
    setMessage,
  ] = useState("");


  const [
    loading,
    setLoading,
  ] = useState(false);


  async function assignAdminClaim() {

    if (
      loading
    ) {
      return;
    }


    setMessage("");


    const user =
      getCurrentUser();


    if (
      !user
    ) {

      setMessage(
        "You must be signed in before assigning the admin claim."
      );

      return;

    }


    if (
      !secret.trim()
    ) {

      setMessage(
        "Enter the bootstrap secret from .env.local."
      );

      return;

    }


    setLoading(
      true
    );


    try {

      /*
       * ----------------------------------------------------------
       * GET FRESH FIREBASE ID TOKEN
       * ----------------------------------------------------------
       */

      const idToken =
        await user.getIdToken(
          true
        );


      /*
       * ----------------------------------------------------------
       * CALL TEMPORARY BOOTSTRAP ROUTE
       * ----------------------------------------------------------
       */

      const response =
        await fetch(
          "/api/admin/bootstrap",
          {
            method:
              "POST",

            headers: {
              Authorization:
                `Bearer ${idToken}`,

              "x-bootstrap-secret":
                secret.trim(),
            },
          }
        );


      const data =
        await response.json();


      if (
        !response.ok
      ) {

        const error =
          typeof data?.error ===
          "string"
            ? data.error
            : "ADMIN_BOOTSTRAP_FAILED";


        setMessage(
          `Admin setup failed: ${error}`
        );

        return;

      }


      /*
       * ----------------------------------------------------------
       * SUCCESS
       * ----------------------------------------------------------
       */

      setSecret(
        ""
      );


      setMessage(
        "Success. The admin claim was assigned. Sign out of Myriad completely, then sign back in so Firebase issues a new token containing admin: true."
      );

    } catch (
      error
    ) {

      console.error(
        "Admin bootstrap request failed:",
        error
      );


      setMessage(
        "Admin setup failed. Check the browser console and server logs."
      );

    } finally {

      setLoading(
        false
      );

    }

  }


  return (
    <main
      style={{
        minHeight:
          "100vh",

        background:
          "#F8FAFC",

        padding:
          "48px 20px",
      }}
    >

      <div
        style={{
          width:
            "100%",

          maxWidth:
            "620px",

          margin:
            "0 auto",

          background:
            "#FFFFFF",

          border:
            "1px solid #E2E8F0",

          borderRadius:
            "16px",

          padding:
            "28px",
        }}
      >

        <h1
          style={{
            margin:
              "0 0 10px",

            fontSize:
              "28px",
          }}
        >
          Community Admin Setup
        </h1>


        <p
          style={{
            margin:
              "0 0 24px",

            lineHeight:
              1.6,

            color:
              "#475569",
          }}
        >
          Temporary setup page for assigning the first Community
          administrator.
        </p>


        <label
          htmlFor="bootstrap-secret"
          style={{
            display:
              "block",

            marginBottom:
              "8px",

            fontWeight:
              700,
          }}
        >
          Bootstrap Secret
        </label>


        <input
          id="bootstrap-secret"

          type="password"

          autoComplete="off"

          value={
            secret
          }

          onChange={
            (
              event
            ) =>
              setSecret(
                event.target.value
              )
          }

          placeholder="Enter COMMUNITY_ADMIN_BOOTSTRAP_SECRET"

          style={{
            width:
              "100%",

            boxSizing:
              "border-box",

            minHeight:
              "48px",

            border:
              "1px solid #CBD5E1",

            borderRadius:
              "10px",

            padding:
              "10px 12px",

            fontSize:
              "16px",

            marginBottom:
              "18px",
          }}
        />


        <button
          type="button"

          onClick={
            assignAdminClaim
          }

          disabled={
            loading
          }

          style={{
            width:
              "100%",

            minHeight:
              "48px",

            border:
              "none",

            borderRadius:
              "10px",

            padding:
              "12px 18px",

            fontSize:
              "16px",

            fontWeight:
              700,

            cursor:
              loading
                ? "not-allowed"
                : "pointer",
          }}
        >

          {
            loading
              ? "Assigning Admin..."
              : "Assign Admin Claim"
          }

        </button>


        {
          message
            ? (
              <div
                style={{
                  marginTop:
                    "20px",

                  padding:
                    "14px",

                  border:
                    "1px solid #CBD5E1",

                  borderRadius:
                    "10px",

                  lineHeight:
                    1.5,

                  overflowWrap:
                    "anywhere",
                }}
              >
                {message}
              </div>
            )
            : null
        }

      </div>

    </main>
  );

}