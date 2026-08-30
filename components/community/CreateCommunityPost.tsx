"use client";

import {
  FormEvent,
  useState,
} from "react";

import Link from "next/link";

import {
  useAccountEntitlements,
} from "../../lib/useAccountEntitlements";

import {
  auth,
} from "../../lib/firebase";

import type {
  CommunityCategory,
} from "../../lib/communityTypes";


/*
 * ============================================================
 * CREATE COMMUNITY POST
 * ============================================================
 *
 * Premium and Premium+ Community participation.
 *
 * Free:
 *   Read-only Community access.
 *
 * Premium:
 *   Read + create posts + reply.
 *
 * Premium+:
 *   Read + create posts + reply.
 *
 * IMPORTANT
 *
 * The protected server API is the real authorization boundary.
 *
 * The client does not write Community posts directly to
 * Firestore.
 *
 * All normal Community conversations are readable by Free,
 * Premium, and Premium+ members.
 *
 * Premium controls participation — not reading.
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

  /*
   * ==========================================================
   * ACCOUNT ACCESS
   * ==========================================================
   */

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
  ] = useState(
    ""
  );


  const [
    body,
    setBody,
  ] = useState(
    ""
  );


  const [
    category,
    setCategory,
  ] =
    useState<CommunityCategory>(
      "general"
    );


  const [
    isAnonymous,
    setIsAnonymous,
  ] = useState(
    true
  );


  /*
   * ==========================================================
   * UI STATE
   * ==========================================================
   */

  const [
    submitting,
    setSubmitting,
  ] = useState(
    false
  );


  const [
    error,
    setError,
  ] = useState(
    ""
  );


  const [
    submitted,
    setSubmitted,
  ] = useState(
    false
  );


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
    event: FormEvent<HTMLFormElement>
  ) {

    event.preventDefault();


    /*
     * --------------------------------------------------------
     * PREVENT DUPLICATE SUBMISSION
     * --------------------------------------------------------
     */

    if (
      submitting
    ) {

      return;

    }


    setError(
      ""
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
          "AUTH_REQUIRED"
        );

      }


      /*
       * ------------------------------------------------------
       * FIREBASE TOKEN
       * ------------------------------------------------------
       */

      const idToken =
        await currentUser.getIdToken();


      /*
       * ------------------------------------------------------
       * PROTECTED SERVER REQUEST
       * ------------------------------------------------------
       *
       * IMPORTANT:
       *
       * isPremiumOnly is intentionally NOT sent.
       *
       * The server controls Community visibility.
       * ------------------------------------------------------
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

                category:
                  category,

                isAnonymous:
                  isAnonymous,

              }),
          }
        );


      /*
       * ------------------------------------------------------
       * READ SERVER RESPONSE
       * ------------------------------------------------------
       */

      const data =
        await response
          .json()
          .catch(
            () =>
              null
          );


      /*
       * ------------------------------------------------------
       * SERVER ERROR
       * ------------------------------------------------------
       */

      if (
        !response.ok
      ) {

        if (
          response.status ===
          401
        ) {

          throw new Error(
            "AUTH_REQUIRED"
          );

        }


        if (
          response.status ===
          403
        ) {

          throw new Error(
            "PREMIUM_REQUIRED"
          );

        }


        const serverMessage =
          data &&
          typeof data.error ===
            "string"
            ? data.error
            : "";


        throw new Error(
          serverMessage ||
          "POST_FAILED"
        );

      }


      /*
       * ------------------------------------------------------
       * VERIFY SUCCESS RESPONSE
       * ------------------------------------------------------
       */

      if (
        !data ||
        data.success !==
          true ||
        typeof data.postId !==
          "string" ||
        !data.postId
      ) {

        throw new Error(
          "The Community service returned an unexpected response."
        );

      }


      /*
       * ------------------------------------------------------
       * SUCCESS
       * ------------------------------------------------------
       *
       * New posts currently enter pending_review.
       *
       * We intentionally do NOT send the member directly to
       * /community/{postId}, because published Community reads
       * should not expose pending content.
       * ------------------------------------------------------
       */

      setSubmitted(
        true
      );


      /*
       * Clear sensitive/free-text form content once the server
       * confirms successful submission.
       */

      setTitle(
        ""
      );


      setBody(
        ""
      );


      setCategory(
        "general"
      );


      setIsAnonymous(
        true
      );

    } catch (
      submitError
    ) {

      console.error(
        "Community post submission error:",
        submitError
      );


      if (
        submitError instanceof Error &&
        submitError.message ===
          "AUTH_REQUIRED"
      ) {

        setError(
          "Your login session is no longer active. Please log in again."
        );

      } else if (
        submitError instanceof Error &&
        submitError.message ===
          "PREMIUM_REQUIRED"
      ) {

        setError(
          "Community participation is available with Premium."
        );

      } else if (
        submitError instanceof Error &&
        submitError.message ===
          "POST_FAILED"
      ) {

        setError(
          "We couldn't create your post right now. Please try again."
        );

      } else if (
        submitError instanceof Error &&
        submitError.message
      ) {

        setError(
          submitError.message
        );

      } else {

        setError(
          "We couldn't create your post right now. Please try again."
        );

      }

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
    entitlementLoading
  ) {

    return (

      <div
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

      </div>

    );

  }


  /*
   * ==========================================================
   * FREE / NON-PREMIUM USER
   * ==========================================================
   */

  if (
    !isPremium
  ) {

    return (

      <div
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
            Join the Conversation with Premium
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
            conversations. Premium and Premium+ members
            can create posts and participate in
            discussions.
          </p>


          <Link
            href="/pricing"

            style={{
              display:
                "inline-block",

              minHeight:
                "44px",

              boxSizing:
                "border-box",

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

      </div>

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

      <div
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
            Your post was submitted
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
            Your post has been submitted for Community
            review. Once approved, it will appear in the
            appropriate topic.
          </p>


          <Link
            href="/community"

            style={{
              display:
                "inline-block",

              minHeight:
                "44px",

              boxSizing:
                "border-box",

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
            Back to Community
          </Link>

        </section>

      </div>

    );

  }


  /*
   * ==========================================================
   * MAIN FORM
   * ==========================================================
   */

  return (

    <div
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
              "clamp(28px, 6vw, 34px)",

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
          Share an experience, ask a question, or start
          a conversation that may help another family
          feel less alone.
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
              "clamp(18px, 4vw, 26px)",

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

              onChange={(
                event
              ) => {

                setCategory(
                  event.target.value as
                    CommunityCategory
                );

                if (
                  error
                ) {

                  setError(
                    ""
                  );

                }

              }}

              disabled={
                submitting
              }

              style={{
                width:
                  "100%",

                minHeight:
                  "44px",

                boxSizing:
                  "border-box",

                padding:
                  "12px 13px",

                borderRadius:
                  "10px",

                border:
                  "1px solid #CBD5E1",

                background:
                  submitting
                    ? "#F8FAFC"
                    : "#FFFFFF",

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

              onChange={(
                event
              ) => {

                setTitle(
                  event.target.value
                );

                if (
                  error
                ) {

                  setError(
                    ""
                  );

                }

              }}

              disabled={
                submitting
              }

              maxLength={
                140
              }

              required

              autoComplete="off"

              placeholder="What would you like the Community to know?"

              style={{
                width:
                  "100%",

                minHeight:
                  "44px",

                boxSizing:
                  "border-box",

                padding:
                  "12px 13px",

                borderRadius:
                  "10px",

                border:
                  "1px solid #CBD5E1",

                background:
                  submitting
                    ? "#F8FAFC"
                    : "#FFFFFF",

                color:
                  "#0F172A",

                fontSize:
                  "16px",

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
              }
              {" / 140"}
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

              onChange={(
                event
              ) => {

                setBody(
                  event.target.value
                );

                if (
                  error
                ) {

                  setError(
                    ""
                  );

                }

              }}

              disabled={
                submitting
              }

              maxLength={
                5000
              }

              required

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

                background:
                  submitting
                    ? "#F8FAFC"
                    : "#FFFFFF",

                color:
                  "#0F172A",

                fontSize:
                  "16px",

                lineHeight:
                  1.6,

                resize:
                  "vertical",

                outline:
                  "none",

                fontFamily:
                  "inherit",
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
              }
              {" / 5,000"}
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
                "22px",
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

                onChange={(
                  event
                ) => {

                  setIsAnonymous(
                    event.target.checked
                  );

                }}

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
                  Your Community display name will not
                  be shown on this post.
                </span>

              </span>

            </label>

          </div>


          {/* ==================================================
              COMMUNITY VISIBILITY
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
                "#EFF6FF",

              border:
                "1px solid #BFDBFE",

              color:
                "#1E40AF",

              fontSize:
                "12px",

              lineHeight:
                1.6,
            }}
          >
            Community posts can be read by all signed-in
            Myriad members. Creating posts and replying
            are Premium features.
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
            records, or another person&apos;s private
            information.
          </div>


          {/* ==================================================
              REVIEW NOTE
          =================================================== */}

          <div
            style={{
              marginBottom:
                "24px",

              padding:
                "14px 15px",

              borderRadius:
                "10px",

              background:
                "#F8FAFC",

              border:
                "1px solid #E2E8F0",

              color:
                "#64748B",

              fontSize:
                "12px",

              lineHeight:
                1.6,
            }}
          >
            New conversations are reviewed before they
            appear in the Community.
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

              aria-disabled={
                submitting
              }

              style={{
                minHeight:
                  "44px",

                boxSizing:
                  "border-box",

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

                display:
                  "inline-flex",

                alignItems:
                  "center",

                justifyContent:
                  "center",
              }}
            >
              Cancel
            </Link>


            <button
              type="submit"

              disabled={
                submitting ||
                title.trim().length <
                  3 ||
                body.trim().length <
                  5
              }

              style={{
                minHeight:
                  "44px",

                padding:
                  "11px 20px",

                borderRadius:
                  "10px",

                border:
                  "none",

                background:
                  submitting ||
                  title.trim().length <
                    3 ||
                  body.trim().length <
                    5
                    ? "#93C5FD"
                    : "#2563EB",

                color:
                  "#FFFFFF",

                fontSize:
                  "14px",

                fontWeight:
                  800,

                cursor:
                  submitting ||
                  title.trim().length <
                    3 ||
                  body.trim().length <
                    5
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              {
                submitting
                  ? "Submitting..."
                  : "Submit Post"
              }
            </button>

          </div>

        </section>

      </form>

    </div>

  );

}