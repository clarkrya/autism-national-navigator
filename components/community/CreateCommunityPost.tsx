"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import Link from "next/link";

import {
  useRouter,
} from "next/navigation";

import {
  useAccountEntitlements,
} from "../../lib/useAccountEntitlements";

import {
  auth,
} from "../../lib/firebase";

import {
  getCommunityProfile,
} from "../../lib/communityRepository";

import type {
  CommunityCategory,
} from "../../lib/communityTypes";


/*
 * ============================================================
 * CREATE COMMUNITY POST
 * ============================================================
 *
 * Community access:
 *
 * Guest:
 *   No Community access.
 *
 * Free:
 *   Read-only Community access.
 *
 * Premium:
 *   Read + create posts + participate.
 *
 * Premium+:
 *   Read + create posts + participate.
 *
 * Community is one shared space.
 *
 * Published conversations are visible to authenticated
 * Community members regardless of paid plan.
 *
 * Premium controls participation rather than visibility.
 *
 * The protected server API is the authorization boundary for
 * post creation.
 *
 * COMMUNITY PROFILE
 *
 * The user's saved Community profile controls the initial
 * anonymous-posting preference.
 *
 * users/{uid}/communityProfile/current
 *
 * isAnonymousByDefault:
 *   true  -> Post anonymously starts checked
 *   false -> Post anonymously starts unchecked
 *
 * The user may still override the checkbox for an individual
 * conversation.
 * ============================================================
 */


/*
 * ============================================================
 * CATEGORY OPTIONS
 * ============================================================
 */

const CATEGORY_OPTIONS: {
  value: CommunityCategory;
  label: string;
  description: string;
}[] = [

  {
    value: "general",
    label: "General",
    description:
      "Everyday questions, experiences, and support.",
  },

  {
    value: "newly_diagnosed",
    label: "Newly Diagnosed",
    description:
      "Early questions and navigating what comes next.",
  },

  {
    value: "school",
    label: "School",
    description:
      "School experiences, support, and transitions.",
  },

  {
    value: "therapy",
    label: "Therapy",
    description:
      "Therapy experiences, questions, and support.",
  },

  {
    value: "insurance",
    label: "Insurance",
    description:
      "Coverage, claims, and navigating insurance.",
  },

  {
    value: "financial_support",
    label: "Financial Support",
    description:
      "Financial assistance, costs, and support.",
  },

  {
    value: "parent_support",
    label: "Parent Support",
    description:
      "Support and encouragement for parents and caregivers.",
  },

  {
    value: "teen_transition",
    label: "Teen Transition",
    description:
      "Changing needs during the teen years.",
  },

  {
    value: "adult_transition",
    label: "Adult Transition",
    description:
      "Preparing for adulthood and greater independence.",
  },

  {
    value: "siblings_family",
    label: "Siblings & Family",
    description:
      "Family relationships, siblings, and shared experiences.",
  },

  {
    value: "success_stories",
    label: "Success Stories",
    description:
      "Celebrate progress and encouraging moments.",
  },

  {
    value: "questions",
    label: "Questions",
    description:
      "Ask about something you're navigating.",
  },

  {
    value: "other",
    label: "Other",
    description:
      "Topics that do not fit another category.",
  },

];


/*
 * ============================================================
 * COMPONENT
 * ============================================================
 */

export default function CreateCommunityPost() {

  const router =
    useRouter();


  const {
    loading:
      entitlementLoading,

    isPremium,
  } =
    useAccountEntitlements();


  /*
   * ==========================================================
   * FORM STATE
   * ==========================================================
   */

  const [
    title,
    setTitle,
  ] =
    useState("");


  const [
    body,
    setBody,
  ] =
    useState("");


  const [
    category,
    setCategory,
  ] =
    useState<CommunityCategory>(
      "general"
    );


  /*
   * Start with the privacy-safe fallback while the saved
   * Community profile preference is loading.
   */

  const [
    isAnonymous,
    setIsAnonymous,
  ] =
    useState(true);


  /*
   * Saved profile default.
   *
   * This is kept separately so that after a successful post
   * the form resets to the user's preference rather than
   * always resetting to anonymous.
   */

  const [
    anonymousDefault,
    setAnonymousDefault,
  ] =
    useState(true);


  /*
   * ==========================================================
   * PROFILE PREFERENCE STATE
   * ==========================================================
   */

  const [
    profilePreferenceLoading,
    setProfilePreferenceLoading,
  ] =
    useState(true);


  /*
   * ==========================================================
   * UI STATE
   * ==========================================================
   */

  const [
    submitting,
    setSubmitting,
  ] =
    useState(false);


  const [
    error,
    setError,
  ] =
    useState("");


  const [
    submitted,
    setSubmitted,
  ] =
    useState(false);


  const [
    submittedPostId,
    setSubmittedPostId,
  ] =
    useState("");


  /*
   * ==========================================================
   * LOAD COMMUNITY PROFILE PREFERENCE
   * ==========================================================
   */

  useEffect(() => {

    /*
     * Wait until account entitlements finish resolving.
     */

    if (
      entitlementLoading
    ) {

      return;

    }


    /*
     * The create-post form is Premium-only.
     *
     * There is no need to load the posting preference for a
     * user who cannot access this form.
     */

    if (
      !isPremium
    ) {

      setProfilePreferenceLoading(
        false
      );

      return;

    }


    let active =
      true;


    async function loadProfilePreference() {

      setProfilePreferenceLoading(
        true
      );


      try {

        const currentUser =
          auth.currentUser;


        if (
          !currentUser
        ) {

          /*
           * Keep the privacy-safe anonymous fallback.
           */

          if (
            active
          ) {

            setAnonymousDefault(
              true
            );

            setIsAnonymous(
              true
            );

          }


          return;

        }


        const profile =
          await getCommunityProfile(
            currentUser.uid
          );


        if (
          !active
        ) {

          return;

        }


        /*
         * A missing Community profile keeps the safe fallback.
         */

        const savedDefault =
          profile?.isAnonymousByDefault ??
          true;


        setAnonymousDefault(
          savedDefault
        );


        setIsAnonymous(
          savedDefault
        );


      } catch (
        profileError
      ) {

        console.error(
          "Unable to load Community profile preference:",
          profileError
        );


        /*
         * A profile-read problem should not prevent a Premium
         * user from creating a conversation.
         *
         * Keep anonymous posting selected as the safe fallback.
         */

        if (
          active
        ) {

          setAnonymousDefault(
            true
          );

          setIsAnonymous(
            true
          );

        }


      } finally {

        if (
          active
        ) {

          setProfilePreferenceLoading(
            false
          );

        }

      }

    }


    void loadProfilePreference();


    return () => {

      active =
        false;

    };

  }, [
    entitlementLoading,
    isPremium,
  ]);


  /*
   * ==========================================================
   * SELECTED CATEGORY
   * ==========================================================
   */

  const selectedCategory =
    CATEGORY_OPTIONS.find(
      (
        option
      ) =>
        option.value ===
        category
    );


  /*
   * ==========================================================
   * SUBMIT POST
   * ==========================================================
   */

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {

    event.preventDefault();


    setError("");

    setSubmitted(
      false
    );


    /*
     * --------------------------------------------------------
     * PREMIUM CHECK
     * --------------------------------------------------------
     */

    if (
      !isPremium
    ) {

      setError(
        "Community participation is available with Premium."
      );

      return;

    }


    /*
     * --------------------------------------------------------
     * VALIDATION
     * --------------------------------------------------------
     */

    const cleanTitle =
      title.trim();


    const cleanBody =
      body.trim();


    if (
      cleanTitle.length <
      3
    ) {

      setError(
        "Please enter a meaningful post title."
      );

      return;

    }


    if (
      cleanTitle.length >
      140
    ) {

      setError(
        "Your post title must be 140 characters or fewer."
      );

      return;

    }


    if (
      cleanBody.length <
      5
    ) {

      setError(
        "Please enter a meaningful post message."
      );

      return;

    }


    if (
      cleanBody.length >
      5000
    ) {

      setError(
        "Your post message must be 5,000 characters or fewer."
      );

      return;

    }


    setSubmitting(
      true
    );


    try {

      /*
       * ------------------------------------------------------
       * CURRENT USER
       * ------------------------------------------------------
       */

      const currentUser =
        auth.currentUser;


      if (
        !currentUser
      ) {

        throw new Error(
          "Your login session is no longer active. Please log in again."
        );

      }


      /*
       * ------------------------------------------------------
       * FIREBASE ID TOKEN
       * ------------------------------------------------------
       */

      const idToken =
        await currentUser.getIdToken();


      /*
       * ------------------------------------------------------
       * PROTECTED API REQUEST
       * ------------------------------------------------------
       *
       * The API performs the real Premium authorization check
       * and writes the post through authenticated Firestore
       * REST access.
       */

      const response =
        await fetch(
          "/api/community/posts",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${idToken}`,
            },

            body:
              JSON.stringify({
                title:
                  cleanTitle,

                body:
                  cleanBody,

                category,

                isAnonymous,
              }),
          }
        );


      /*
       * ------------------------------------------------------
       * RESPONSE
       * ------------------------------------------------------
       */

      let data: {
        success?: boolean;
        postId?: string;
        status?: string;
        error?: string;
      };


      try {

        data =
          await response.json();

      } catch {

        throw new Error(
          "The Community service returned an unexpected response."
        );

      }


      if (
        !response.ok
      ) {

        throw new Error(
          data.error ||
          "We couldn't create your post right now."
        );

      }


      /*
       * ------------------------------------------------------
       * VERIFY CREATED POST
       * ------------------------------------------------------
       */

      if (
        !data.success ||
        !data.postId
      ) {

        throw new Error(
          "Your post was created, but the Community service did not return the conversation ID."
        );

      }


      /*
       * ------------------------------------------------------
       * SUCCESS
       * ------------------------------------------------------
       */

      setSubmittedPostId(
        data.postId
      );


      setSubmitted(
        true
      );


      setTitle(
        ""
      );


      setBody(
        ""
      );


      setCategory(
        "general"
      );


      /*
       * Reset to the user's saved Community profile preference
       * instead of hardcoding anonymous posting.
       */

      setIsAnonymous(
        anonymousDefault
      );


    } catch (
      submitError
    ) {

      console.error(
        "Community post submission error:",
        submitError
      );


      setError(
        submitError instanceof Error
          ? submitError.message
          : "We couldn't create your post right now. Please try again."
      );


    } finally {

      setSubmitting(
        false
      );

    }

  }


  /*
   * ==========================================================
   * LOADING
   * ==========================================================
   */

  if (
    entitlementLoading ||
    (
      isPremium &&
      profilePreferenceLoading
    )
  ) {

    return (

      <main
        style={{
          maxWidth:
            "850px",

          margin:
            "0 auto",

          padding:
            "45px 24px 90px",
        }}
      >

        <div
          style={{
            padding:
              "30px",

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
          Loading Community access...
        </div>

      </main>

    );

  }


  /*
   * ==========================================================
   * FREE / GUEST USER
   * ==========================================================
   */

  if (
    !isPremium
  ) {

    return (

      <main
        style={{
          maxWidth:
            "850px",

          margin:
            "0 auto",

          padding:
            "45px 24px 90px",
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
              "24px",

            padding:
              "40px",

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
            🔒
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
                800,
            }}
          >
            Premium Community Feature
          </h1>


          <p
            style={{
              maxWidth:
                "600px",

              margin:
                "12px auto 22px",

              color:
                "#64748B",

              fontSize:
                "15px",

              lineHeight:
                1.65,
            }}
          >
            Free members can read Community
            conversations. Premium members can
            create posts and participate in
            discussions.
          </p>


          <Link
            href="/pricing"

            style={{
              display:
                "inline-block",

              padding:
                "12px 20px",

              borderRadius:
                "10px",

              background:
                "#2563EB",

              color:
                "#FFFFFF",

              fontSize:
                "14px",

              fontWeight:
                800,

              textDecoration:
                "none",
            }}
          >
            Explore Premium
          </Link>

        </section>

      </main>

    );

  }


  /*
   * ==========================================================
   * SUCCESS
   * ==========================================================
   */

  if (
    submitted
  ) {

    return (

      <main
        style={{
          maxWidth:
            "850px",

          margin:
            "0 auto",

          padding:
            "45px 24px 90px",
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
              "24px",

            padding:
              "40px",

            borderRadius:
              "20px",

            border:
              "1px solid #A7F3D0",

            background:
              "#ECFDF5",

            textAlign:
              "center",
          }}
        >

          <div
            style={{
              fontSize:
                "36px",

              marginBottom:
                "12px",
            }}
          >
            ✓
          </div>


          <h1
            style={{
              margin:
                0,

              color:
                "#065F46",

              fontSize:
                "28px",

              fontWeight:
                800,
            }}
          >
            Your conversation is live
          </h1>


          <p
            style={{
              maxWidth:
                "620px",

              margin:
                "12px auto 20px",

              color:
                "#475569",

              fontSize:
                "15px",

              lineHeight:
                1.65,
            }}
          >
            Your post has been published to the
            Community and is now available for
            members to read.
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
              href="/community"

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
                  "14px",

                fontWeight:
                  800,

                textDecoration:
                  "none",
              }}
            >
              Back to Community
            </Link>


            {
              submittedPostId && (

                <button
                  type="button"

                  onClick={
                    () => {

                      router.push(
                        `/community/${submittedPostId}`
                      );

                    }
                  }

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
                      "14px",

                    fontWeight:
                      800,

                    cursor:
                      "pointer",
                  }}
                >
                  View Conversation
                </button>

              )
            }

          </div>

        </section>

      </main>

    );

  }


  /*
   * ==========================================================
   * MAIN FORM
   * ==========================================================
   */

  return (

    <main
      style={{
        maxWidth:
          "850px",

        margin:
          "0 auto",

        padding:
          "45px 24px 90px",
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


      <header
        style={{
          marginTop:
            "22px",

          marginBottom:
            "25px",
        }}
      >

        <div
          style={{
            color:
              "#2563EB",

            fontSize:
              "11px",

            fontWeight:
              800,

            letterSpacing:
              "0.08em",

            textTransform:
              "uppercase",

            marginBottom:
              "7px",
          }}
        >
          Premium Community
        </div>


        <h1
          style={{
            margin:
              0,

            color:
              "#0F172A",

            fontSize:
              "34px",

            lineHeight:
              1.2,

            fontWeight:
              850,
          }}
        >
          Start a Conversation
        </h1>


        <p
          style={{
            maxWidth:
              "680px",

            margin:
              "10px 0 0",

            color:
              "#64748B",

            fontSize:
              "15px",

            lineHeight:
              1.65,
          }}
        >
          Share an experience, ask a question,
          or start a conversation that may help
          another family feel less alone.
        </p>

      </header>


      {
        error && (

          <div
            role="alert"

            style={{
              marginBottom:
                "20px",

              padding:
                "14px 16px",

              borderRadius:
                "12px",

              border:
                "1px solid #FECACA",

              background:
                "#FEF2F2",

              color:
                "#B91C1C",

              fontSize:
                "14px",

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
          handleSubmit
        }
      >

        <section
          style={{
            padding:
              "26px",

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

          {/* ==================================================
              TOPIC
          =================================================== */}

          <div
            style={{
              marginBottom:
                "22px",
            }}
          >

            <label
              htmlFor="community-post-category"

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
                  800,
              }}
            >
              Topic
            </label>


            <select
              id="community-post-category"

              value={
                category
              }

              onChange={
                (
                  event
                ) => {

                  setCategory(
                    event.target.value as CommunityCategory
                  );

                }
              }

              disabled={
                submitting
              }

              style={{
                width:
                  "100%",

                padding:
                  "12px 13px",

                borderRadius:
                  "10px",

                border:
                  "1px solid #CBD5E1",

                background:
                  "#FFFFFF",

                color:
                  "#0F172A",

                fontSize:
                  "14px",

                fontWeight:
                  600,

                outline:
                  "none",

                cursor:
                  submitting
                    ? "default"
                    : "pointer",
              }}
            >

              {
                CATEGORY_OPTIONS.map(
                  (
                    option
                  ) => (

                    <option
                      key={
                        option.value
                      }

                      value={
                        option.value
                      }
                    >
                      {
                        option.label
                      }
                    </option>

                  )
                )
              }

            </select>


            <p
              style={{
                margin:
                  "7px 0 0",

                color:
                  "#64748B",

                fontSize:
                  "12px",

                lineHeight:
                  1.5,
              }}
            >
              {
                selectedCategory?.description
              }
            </p>

          </div>


          {/* ==================================================
              TITLE
          =================================================== */}

          <div
            style={{
              marginBottom:
                "22px",
            }}
          >

            <label
              htmlFor="community-post-title"

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
                  800,
              }}
            >
              Title
            </label>


            <input
              id="community-post-title"

              type="text"

              value={
                title
              }

              onChange={
                (
                  event
                ) => {

                  setTitle(
                    event.target.value
                  );

                }
              }

              maxLength={
                140
              }

              required

              disabled={
                submitting
              }

              placeholder="What would you like the Community to know?"

              style={{
                width:
                  "100%",

                boxSizing:
                  "border-box",

                padding:
                  "12px 13px",

                borderRadius:
                  "10px",

                border:
                  "1px solid #CBD5E1",

                color:
                  "#0F172A",

                fontSize:
                  "15px",

                outline:
                  "none",
              }}
            />


            <div
              style={{
                marginTop:
                  "6px",

                textAlign:
                  "right",

                color:
                  "#94A3B8",

                fontSize:
                  "11px",
              }}
            >
              {
                title.length
              } / 140
            </div>

          </div>


          {/* ==================================================
              MESSAGE
          =================================================== */}

          <div
            style={{
              marginBottom:
                "22px",
            }}
          >

            <label
              htmlFor="community-post-body"

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
                  800,
              }}
            >
              Your message
            </label>


            <textarea
              id="community-post-body"

              value={
                body
              }

              onChange={
                (
                  event
                ) => {

                  setBody(
                    event.target.value
                  );

                }
              }

              maxLength={
                5000
              }

              required

              disabled={
                submitting
              }

              rows={
                9
              }

              placeholder="Share what's going on, what you've experienced, or what you're trying to figure out."

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

                color:
                  "#0F172A",

                fontSize:
                  "15px",

                lineHeight:
                  1.6,

                resize:
                  "vertical",

                outline:
                  "none",
              }}
            />


            <div
              style={{
                marginTop:
                  "6px",

                textAlign:
                  "right",

                color:
                  "#94A3B8",

                fontSize:
                  "11px",
              }}
            >
              {
                body.length
              } / 5,000
            </div>

          </div>


          {/* ==================================================
              ANONYMOUS
          =================================================== */}

          <div
            style={{
              padding:
                "16px",

              borderRadius:
                "12px",

              border:
                "1px solid #E2E8F0",

              background:
                "#F8FAFC",

              marginBottom:
                "24px",
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
                  submitting
                    ? "default"
                    : "pointer",
              }}
            >

              <input
                type="checkbox"

                checked={
                  isAnonymous
                }

                onChange={
                  (
                    event
                  ) => {

                    setIsAnonymous(
                      event.target.checked
                    );

                  }
                }

                disabled={
                  submitting
                }

                style={{
                  marginTop:
                    "3px",

                  width:
                    "16px",

                  height:
                    "16px",
                }}
              />


              <span>

                <span
                  style={{
                    display:
                      "block",

                    color:
                      "#334155",

                    fontSize:
                      "14px",

                    fontWeight:
                      800,
                  }}
                >
                  Post anonymously
                </span>


                <span
                  style={{
                    display:
                      "block",

                    marginTop:
                      "3px",

                    color:
                      "#64748B",

                    fontSize:
                      "12px",

                    lineHeight:
                      1.5,
                  }}
                >
                  {
                    isAnonymous
                      ? "Your Community display name will not be shown on this post."
                      : "Your saved Community display name will be shown on this post."
                  }
                </span>

              </span>

            </label>

          </div>


          {/* ==================================================
              SAFETY NOTE
          =================================================== */}

          <div
            style={{
              marginBottom:
                "22px",

              padding:
                "14px 15px",

              borderRadius:
                "10px",

              background:
                "#FFF7ED",

              border:
                "1px solid #FED7AA",

              color:
                "#9A3412",

              fontSize:
                "12px",

              lineHeight:
                1.6,
            }}
          >
            Community conversations are for shared
            experiences and support. Please avoid
            posting personal identifiers, medical
            records, or another person's private
            information.
          </div>


          {/* ==================================================
              ACTIONS
          =================================================== */}

          <div
            style={{
              display:
                "flex",

              justifyContent:
                "flex-end",

              gap:
                "10px",

              flexWrap:
                "wrap",
            }}
          >

            <Link
              href="/community"

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
                  "14px",

                fontWeight:
                  800,

                textDecoration:
                  "none",
              }}
            >
              Cancel
            </Link>


            <button
              type="submit"

              disabled={
                submitting
              }

              style={{
                padding:
                  "11px 20px",

                borderRadius:
                  "10px",

                border:
                  "none",

                background:
                  submitting
                    ? "#93C5FD"
                    : "#2563EB",

                color:
                  "#FFFFFF",

                fontSize:
                  "14px",

                fontWeight:
                  800,

                cursor:
                  submitting
                    ? "default"
                    : "pointer",
              }}
            >
              {
                submitting
                  ? "Publishing..."
                  : "Publish Conversation"
              }
            </button>

          </div>

        </section>

      </form>

    </main>

  );

}