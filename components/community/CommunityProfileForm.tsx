"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import Link from "next/link";

import {
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";

import {
  auth,
  db,
} from "../../lib/firebase";

import {
  useAccountEntitlements,
} from "../../lib/useAccountEntitlements";


/*
 * ============================================================
 * COMMUNITY PROFILE
 * ============================================================
 *
 * Firestore:
 *
 * users/{uid}/communityProfile/current
 *
 * Purpose:
 *
 * Gives each signed-in Community member control over:
 *
 * - Community display name
 * - optional Community bio
 * - anonymous-by-default preference
 *
 * This profile is separate from the user's login email and
 * family Journey information.
 *
 * Firestore Security Rules restrict this document to its owner.
 * ============================================================
 */


/*
 * ============================================================
 * CONSTANTS
 * ============================================================
 */

const DISPLAY_NAME_MAX_LENGTH =
  80;


const BIO_MAX_LENGTH =
  300;


/*
 * ============================================================
 * COMPONENT
 * ============================================================
 */

export default function CommunityProfileForm() {

  /*
   * ==========================================================
   * ACCOUNT
   * ==========================================================
   */

  const {
    plan,

    loading:
      entitlementLoading,

    isPremium,
  } =
    useAccountEntitlements();


  /*
   * ==========================================================
   * PROFILE FIELDS
   * ==========================================================
   */

  const [
    displayName,
    setDisplayName,
  ] =
    useState("");


  const [
    bio,
    setBio,
  ] =
    useState("");


  const [
    isAnonymousByDefault,
    setIsAnonymousByDefault,
  ] =
    useState(false);


  /*
   * ==========================================================
   * PROFILE STATE
   * ==========================================================
   */

  const [
    profileLoading,
    setProfileLoading,
  ] =
    useState(true);


  const [
    saving,
    setSaving,
  ] =
    useState(false);


  const [
    error,
    setError,
  ] =
    useState("");


  const [
    success,
    setSuccess,
  ] =
    useState("");


  const [
    profileExists,
    setProfileExists,
  ] =
    useState(false);


  const [
    createdAt,
    setCreatedAt,
  ] =
    useState<
      number |
      null
    >(null);


  /*
   * ==========================================================
   * LOAD COMMUNITY PROFILE
   * ==========================================================
   */

  useEffect(() => {

    if (
      entitlementLoading
    ) {

      return;

    }


    const currentUser =
      auth.currentUser;


    /*
     * --------------------------------------------------------
     * GUEST
     * --------------------------------------------------------
     */

    if (
      !currentUser
    ) {

      setProfileLoading(
        false
      );

      return;

    }


    let active =
      true;


    async function loadProfile() {

      setProfileLoading(
        true
      );


      setError("");


      try {

        const profileRef =
          doc(
            db,
            "users",
            currentUser.uid,
            "communityProfile",
            "current"
          );


        const snapshot =
          await getDoc(
            profileRef
          );


        if (
          !active
        ) {

          return;

        }


        /*
         * ------------------------------------------------------
         * NO PROFILE YET
         * ------------------------------------------------------
         */

        if (
          !snapshot.exists()
        ) {

          setProfileExists(
            false
          );


          setDisplayName("");

          setBio("");

          setIsAnonymousByDefault(
            false
          );


          setCreatedAt(
            null
          );


          return;

        }


        /*
         * ------------------------------------------------------
         * EXISTING PROFILE
         * ------------------------------------------------------
         */

        const data =
          snapshot.data();


        setProfileExists(
          true
        );


        setDisplayName(
          typeof data.displayName ===
          "string"
            ? data.displayName
            : ""
        );


        setBio(
          typeof data.bio ===
          "string"
            ? data.bio
            : ""
        );


        setIsAnonymousByDefault(
          typeof data.isAnonymousByDefault ===
          "boolean"
            ? data.isAnonymousByDefault
            : false
        );


        setCreatedAt(
          typeof data.createdAt ===
          "number"
            ? data.createdAt
            : null
        );


      } catch (
        loadError
      ) {

        console.error(
          "Unable to load Community profile:",
          loadError
        );


        if (
          active
        ) {

          setError(
            "We couldn't load your Community profile. Please try again."
          );

        }


      } finally {

        if (
          active
        ) {

          setProfileLoading(
            false
          );

        }

      }

    }


    void loadProfile();


    return () => {

      active =
        false;

    };

  }, [
    entitlementLoading,
    plan,
  ]);


  /*
   * ==========================================================
   * SAVE PROFILE
   * ==========================================================
   */

  async function saveProfile(
    event:
      FormEvent<HTMLFormElement>
  ) {

    event.preventDefault();


    setError("");

    setSuccess("");


    /*
     * --------------------------------------------------------
     * AUTHENTICATION
     * --------------------------------------------------------
     */

    const currentUser =
      auth.currentUser;


    if (
      !currentUser
    ) {

      setError(
        "Please log in before saving your Community profile."
      );

      return;

    }


    /*
     * --------------------------------------------------------
     * DISPLAY NAME
     * --------------------------------------------------------
     */

    const cleanDisplayName =
      displayName.trim();


    if (
      cleanDisplayName.length <
      2
    ) {

      setError(
        "Please enter a Community display name with at least 2 characters."
      );

      return;

    }


    if (
      cleanDisplayName.length >
      DISPLAY_NAME_MAX_LENGTH
    ) {

      setError(
        `Community display names must be ${DISPLAY_NAME_MAX_LENGTH} characters or fewer.`
      );

      return;

    }


    /*
     * --------------------------------------------------------
     * BIO
     * --------------------------------------------------------
     */

    const cleanBio =
      bio.trim();


    if (
      cleanBio.length >
      BIO_MAX_LENGTH
    ) {

      setError(
        `Community bios must be ${BIO_MAX_LENGTH} characters or fewer.`
      );

      return;

    }


    /*
     * --------------------------------------------------------
     * SAVE
     * --------------------------------------------------------
     */

    setSaving(
      true
    );


    try {

      const now =
        Date.now();


      const profileRef =
        doc(
          db,
          "users",
          currentUser.uid,
          "communityProfile",
          "current"
        );


      const profileCreatedAt =
        createdAt ||
        now;


      await setDoc(
        profileRef,
        {
          userId:
            currentUser.uid,

          displayName:
            cleanDisplayName,

          isAnonymousByDefault,

          bio:
            cleanBio,

          createdAt:
            profileCreatedAt,

          updatedAt:
            now,
        },
        {
          merge:
            true,
        }
      );


      /*
       * ------------------------------------------------------
       * UPDATE LOCAL STATE
       * ------------------------------------------------------
       */

      setDisplayName(
        cleanDisplayName
      );


      setBio(
        cleanBio
      );


      setCreatedAt(
        profileCreatedAt
      );


      setProfileExists(
        true
      );


      setSuccess(
        "Your Community profile has been saved."
      );


    } catch (
      saveError
    ) {

      console.error(
        "Unable to save Community profile:",
        saveError
      );


      setError(
        "We couldn't save your Community profile. Please try again."
      );


    } finally {

      setSaving(
        false
      );

    }

  }


  /*
   * ==========================================================
   * ENTITLEMENT LOADING
   * ==========================================================
   */

  if (
    entitlementLoading
  ) {

    return (

      <div
        style={{
          maxWidth:
            "760px",

          margin:
            "0 auto",

          padding:
            "40px 24px",
        }}
      >

        <div
          style={{
            padding:
              "35px",

            borderRadius:
              "18px",

            border:
              "1px solid #E2E8F0",

            background:
              "#FFFFFF",

            textAlign:
              "center",

            color:
              "#64748B",

            fontSize:
              "14px",
          }}
        >
          Loading Community profile...
        </div>

      </div>

    );

  }


  /*
   * ==========================================================
   * GUEST
   * ==========================================================
   */

  if (
    plan ===
    "guest"
  ) {

    return (

      <div
        style={{
          maxWidth:
            "760px",

          margin:
            "0 auto",

          padding:
            "25px 24px",
        }}
      >

        <Link
          href="/community"

          style={{
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
          ← Back to Community
        </Link>


        <section
          style={{
            marginTop:
              "22px",

            padding:
              "38px 30px",

            borderRadius:
              "20px",

            border:
              "1px solid #E2E8F0",

            background:
              "#FFFFFF",

            textAlign:
              "center",

            boxShadow:
              "0 8px 24px rgba(15, 23, 42, 0.04)",
          }}
        >

          <div
            style={{
              fontSize:
                "34px",

              marginBottom:
                "12px",
            }}
          >
            👤
          </div>


          <h1
            style={{
              margin:
                0,

              color:
                "#0F172A",

              fontSize:
                "28px",

              fontWeight:
                850,
            }}
          >
            Your Community Profile
          </h1>


          <p
            style={{
              maxWidth:
                "560px",

              margin:
                "12px auto 22px",

              color:
                "#64748B",

              fontSize:
                "14px",

              lineHeight:
                1.65,
            }}
          >
            Log in or create a free account to set
            your Community identity.
          </p>


          <div
            style={{
              display:
                "flex",

              justifyContent:
                "center",

              gap:
                "10px",

              flexWrap:
                "wrap",
            }}
          >

            <Link
              href="/signup?returnTo=%2Fcommunity%2Fprofile"

              style={{
                padding:
                  "11px 18px",

                borderRadius:
                  "10px",

                background:
                  "#2563EB",

                color:
                  "#FFFFFF",

                fontSize:
                  "13px",

                fontWeight:
                  800,

                textDecoration:
                  "none",
              }}
            >
              Create Free Account
            </Link>


            <Link
              href="/login?returnTo=%2Fcommunity%2Fprofile"

              style={{
                padding:
                  "11px 18px",

                borderRadius:
                  "10px",

                border:
                  "1px solid #CBD5E1",

                background:
                  "#FFFFFF",

                color:
                  "#334155",

                fontSize:
                  "13px",

                fontWeight:
                  800,

                textDecoration:
                  "none",
              }}
            >
              Log In
            </Link>

          </div>

        </section>

      </div>

    );

  }


  /*
   * ==========================================================
   * PROFILE LOADING
   * ==========================================================
   */

  if (
    profileLoading
  ) {

    return (

      <div
        style={{
          maxWidth:
            "760px",

          margin:
            "0 auto",

          padding:
            "40px 24px",
        }}
      >

        <div
          style={{
            padding:
              "35px",

            borderRadius:
              "18px",

            border:
              "1px solid #E2E8F0",

            background:
              "#FFFFFF",

            textAlign:
              "center",

            color:
              "#64748B",

            fontSize:
              "14px",
          }}
        >
          Loading Community profile...
        </div>

      </div>

    );

  }


  /*
   * ==========================================================
   * MAIN PROFILE FORM
   * ==========================================================
   */

  return (

    <div
      style={{
        maxWidth:
          "760px",

        margin:
          "0 auto",

        padding:
          "10px 24px",
      }}
    >

      <Link
        href="/community"

        style={{
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
        ← Back to Community
      </Link>


      {/* ==================================================
          HEADER
      =================================================== */}

      <section
        style={{
          marginTop:
            "20px",

          padding:
            "30px",

          borderRadius:
            "20px",

          border:
            "1px solid #E2E8F0",

          background:
            "#FFFFFF",

          boxShadow:
            "0 8px 24px rgba(15, 23, 42, 0.04)",
        }}
      >

        <div
          style={{
            display:
              "flex",

            justifyContent:
              "space-between",

            alignItems:
              "flex-start",

            gap:
              "18px",

            flexWrap:
              "wrap",
          }}
        >

          <div>

            <div
              style={{
                color:
                  "#2563EB",

                fontSize:
                  "12px",

                fontWeight:
                  850,

                textTransform:
                  "uppercase",

                letterSpacing:
                  "0.05em",

                marginBottom:
                  "7px",
              }}
            >
              Community
            </div>


            <h1
              style={{
                margin:
                  0,

                color:
                  "#0F172A",

                fontSize:
                  "30px",

                lineHeight:
                  1.2,

                fontWeight:
                  850,
              }}
            >
              Your Community Profile
            </h1>


            <p
              style={{
                maxWidth:
                  "540px",

                margin:
                  "10px 0 0",

                color:
                  "#64748B",

                fontSize:
                  "14px",

                lineHeight:
                  1.65,
              }}
            >
              Choose how your name appears when you
              participate in Community conversations.
              Your Community name is separate from
              your login information.
            </p>

          </div>


          <span
            style={{
              padding:
                "7px 11px",

              borderRadius:
                "999px",

              background:
                isPremium
                  ? "#EFF6FF"
                  : "#F1F5F9",

              color:
                isPremium
                  ? "#2563EB"
                  : "#64748B",

              fontSize:
                "11px",

              fontWeight:
                850,

              textTransform:
                "uppercase",
            }}
          >
            {
              isPremium
                ? "Premium Member"
                : "Free Member"
            }
          </span>

        </div>

      </section>


      {/* ==================================================
          FORM
      =================================================== */}

      <section
        style={{
          marginTop:
            "18px",

          padding:
            "30px",

          borderRadius:
            "20px",

          border:
            "1px solid #E2E8F0",

          background:
            "#FFFFFF",

          boxShadow:
            "0 6px 20px rgba(15, 23, 42, 0.04)",
        }}
      >

        {
          success && (

            <div
              role="status"

              style={{
                marginBottom:
                  "20px",

                padding:
                  "13px 15px",

                borderRadius:
                  "10px",

                border:
                  "1px solid #BBF7D0",

                background:
                  "#F0FDF4",

                color:
                  "#166534",

                fontSize:
                  "13px",

                lineHeight:
                  1.5,
              }}
            >
              {
                success
              }
            </div>

          )
        }


        {
          error && (

            <div
              role="alert"

              style={{
                marginBottom:
                  "20px",

                padding:
                  "13px 15px",

                borderRadius:
                  "10px",

                border:
                  "1px solid #FECACA",

                background:
                  "#FEF2F2",

                color:
                  "#B91C1C",

                fontSize:
                  "13px",

                lineHeight:
                  1.5,
              }}
            >
              {
                error
              }
            </div>

          )
        }


        <form
          onSubmit={
            saveProfile
          }
        >

          {/* ==================================================
              DISPLAY NAME
          =================================================== */}

          <div>

            <label
              htmlFor="community-display-name"

              style={{
                display:
                  "block",

                color:
                  "#0F172A",

                fontSize:
                  "14px",

                fontWeight:
                  800,

                marginBottom:
                  "6px",
              }}
            >
              Community display name
            </label>


            <p
              style={{
                margin:
                  "0 0 9px",

                color:
                  "#64748B",

                fontSize:
                  "12px",

                lineHeight:
                  1.55,
              }}
            >
              This name appears on posts and replies
              when you do not choose to participate
              anonymously.
            </p>


            <input
              id="community-display-name"

              type="text"

              value={
                displayName
              }

              onChange={
                (
                  event
                ) => {

                  setDisplayName(
                    event.target.value
                  );


                  if (
                    error
                  ) {

                    setError("");

                  }


                  if (
                    success
                  ) {

                    setSuccess("");

                  }

                }
              }

              maxLength={
                DISPLAY_NAME_MAX_LENGTH
              }

              placeholder="Example: Ryan C."

              disabled={
                saving
              }

              style={{
                width:
                  "100%",

                boxSizing:
                  "border-box",

                padding:
                  "12px 13px",

                border:
                  "1px solid #CBD5E1",

                borderRadius:
                  "10px",

                background:
                  "#FFFFFF",

                color:
                  "#0F172A",

                fontSize:
                  "14px",

                outline:
                  "none",
              }}
            />


            <div
              style={{
                marginTop:
                  "6px",

                color:
                  "#94A3B8",

                fontSize:
                  "11px",

                textAlign:
                  "right",
              }}
            >
              {
                displayName.length
              }
              /
              {
                DISPLAY_NAME_MAX_LENGTH
              }
            </div>

          </div>


          {/* ==================================================
              BIO
          =================================================== */}

          <div
            style={{
              marginTop:
                "24px",
            }}
          >

            <label
              htmlFor="community-bio"

              style={{
                display:
                  "block",

                color:
                  "#0F172A",

                fontSize:
                  "14px",

                fontWeight:
                  800,

                marginBottom:
                  "6px",
              }}
            >
              Short bio{" "}
              <span
                style={{
                  color:
                    "#94A3B8",

                  fontWeight:
                    600,
                }}
              >
                (optional)
              </span>
            </label>


            <p
              style={{
                margin:
                  "0 0 9px",

                color:
                  "#64748B",

                fontSize:
                  "12px",

                lineHeight:
                  1.55,
              }}
            >
              Share a little context that may help
              other Community members understand your
              perspective. Avoid including private
              medical or contact information.
            </p>


            <textarea
              id="community-bio"

              value={
                bio
              }

              onChange={
                (
                  event
                ) => {

                  setBio(
                    event.target.value
                  );


                  if (
                    error
                  ) {

                    setError("");

                  }


                  if (
                    success
                  ) {

                    setSuccess("");

                  }

                }
              }

              maxLength={
                BIO_MAX_LENGTH
              }

              placeholder="Example: Parent navigating school services and early intervention."

              disabled={
                saving
              }

              style={{
                width:
                  "100%",

                minHeight:
                  "105px",

                boxSizing:
                  "border-box",

                resize:
                  "vertical",

                padding:
                  "12px 13px",

                border:
                  "1px solid #CBD5E1",

                borderRadius:
                  "10px",

                background:
                  "#FFFFFF",

                color:
                  "#0F172A",

                fontSize:
                  "14px",

                lineHeight:
                  1.6,

                outline:
                  "none",
              }}
            />


            <div
              style={{
                marginTop:
                  "6px",

                color:
                  "#94A3B8",

                fontSize:
                  "11px",

                textAlign:
                  "right",
              }}
            >
              {
                bio.length
              }
              /
              {
                BIO_MAX_LENGTH
              }
            </div>

          </div>


          {/* ==================================================
              DEFAULT ANONYMITY
          =================================================== */}

          <div
            style={{
              marginTop:
                "24px",

              padding:
                "17px",

              borderRadius:
                "12px",

              border:
                "1px solid #E2E8F0",

              background:
                "#F8FAFC",
            }}
          >

            <label
              style={{
                display:
                  "flex",

                alignItems:
                  "flex-start",

                gap:
                  "10px",

                cursor:
                  "pointer",
              }}
            >

              <input
                type="checkbox"

                checked={
                  isAnonymousByDefault
                }

                onChange={
                  (
                    event
                  ) => {

                    setIsAnonymousByDefault(
                      event.target.checked
                    );


                    if (
                      success
                    ) {

                      setSuccess("");

                    }

                  }
                }

                disabled={
                  saving
                }

                style={{
                  marginTop:
                    "3px",
                }}
              />


              <span>

                <strong
                  style={{
                    display:
                      "block",

                    color:
                      "#0F172A",

                    fontSize:
                      "13px",

                    marginBottom:
                      "3px",
                  }}
                >
                  Post anonymously by default
                </strong>


                <span
                  style={{
                    display:
                      "block",

                    color:
                      "#64748B",

                    fontSize:
                      "12px",

                    lineHeight:
                      1.55,
                  }}
                >
                  When enabled, Community post and
                  reply forms can default to anonymous.
                  You can still change the choice before
                  publishing each conversation or reply.
                </span>

              </span>

            </label>

          </div>


          {/* ==================================================
              PRIVACY NOTE
          =================================================== */}

          <div
            style={{
              marginTop:
                "22px",

              padding:
                "15px 16px",

              borderRadius:
                "11px",

              background:
                "#FFFBEB",

              border:
                "1px solid #FDE68A",
            }}
          >

            <strong
              style={{
                display:
                  "block",

                color:
                  "#92400E",

                fontSize:
                  "12px",

                marginBottom:
                  "4px",
              }}
            >
              Community privacy
            </strong>


            <p
              style={{
                margin:
                  0,

                color:
                  "#92400E",

                fontSize:
                  "12px",

                lineHeight:
                  1.55,
              }}
            >
              Your Community display name does not
              need to be your legal name. Avoid using
              your email address, phone number, home
              address, or other sensitive information.
            </p>

          </div>


          {/* ==================================================
              SAVE
          =================================================== */}

          <div
            style={{
              display:
                "flex",

              justifyContent:
                "space-between",

              alignItems:
                "center",

              gap:
                "14px",

              flexWrap:
                "wrap",

              marginTop:
                "26px",
            }}
          >

            <span
              style={{
                color:
                  "#64748B",

                fontSize:
                  "12px",
              }}
            >
              {
                profileExists
                  ? "Editing your existing Community profile"
                  : "Create your Community profile"
              }
            </span>


            <button
              type="submit"

              disabled={
                saving ||
                displayName.trim().length <
                  2
              }

              style={{
                padding:
                  "11px 20px",

                border:
                  "none",

                borderRadius:
                  "10px",

                background:
                  saving ||
                  displayName.trim().length <
                    2
                    ? "#94A3B8"
                    : "#2563EB",

                color:
                  "#FFFFFF",

                fontSize:
                  "13px",

                fontWeight:
                  850,

                cursor:
                  saving ||
                  displayName.trim().length <
                    2
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              {
                saving
                  ? "Saving..."
                  : profileExists
                    ? "Save Changes"
                    : "Save Community Profile"
              }
            </button>

          </div>

        </form>

      </section>


      {/* ==================================================
          PREMIUM PARTICIPATION NOTE
      =================================================== */}

      {
        !isPremium && (

          <section
            style={{
              marginTop:
                "18px",

              padding:
                "20px",

              borderRadius:
                "16px",

              border:
                "1px solid #E2E8F0",

              background:
                "#FFFFFF",

              textAlign:
                "center",
            }}
          >

            <strong
              style={{
                display:
                  "block",

                color:
                  "#0F172A",

                fontSize:
                  "14px",

                marginBottom:
                  "5px",
              }}
            >
              Your profile is ready for Community
            </strong>


            <p
              style={{
                maxWidth:
                  "540px",

                margin:
                  "0 auto 13px",

                color:
                  "#64748B",

                fontSize:
                  "12px",

                lineHeight:
                  1.6,
              }}
            >
              Free members can read Community
              conversations. Posting and replying are
              included with Premium.
            </p>


            <Link
              href="/pricing"

              style={{
                display:
                  "inline-block",

                padding:
                  "9px 16px",

                borderRadius:
                  "9px",

                background:
                  "#2563EB",

                color:
                  "#FFFFFF",

                fontSize:
                  "12px",

                fontWeight:
                  800,

                textDecoration:
                  "none",
              }}
            >
              Explore Premium
            </Link>

          </section>

        )
      }

    </div>

  );

}