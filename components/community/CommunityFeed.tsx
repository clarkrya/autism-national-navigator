"use client";

import {
  useEffect,
  useState,
} from "react";

import Link from "next/link";

import {
  getCurrentUser,
} from "../../lib/auth";

import {
  useAccountEntitlements,
} from "../../lib/useAccountEntitlements";

import {
  getCommunityPosts,
} from "../../lib/communityRepository";

import type {
  CommunityCategory,
  CommunityPost,
} from "../../lib/communityTypes";


/*
 * ============================================================
 * COMMUNITY FEED
 * ============================================================
 *
 * Read-only Community experience for Free accounts.
 *
 * ACCESS
 *
 * Guest:
 *   Community requires an account.
 *
 * Free:
 *   Read published posts.
 *   Cannot participate.
 *
 * Premium:
 *   Read + participate.
 *
 * Premium+:
 *   Read + participate.
 *
 * ============================================================
 */


/*
 * ============================================================
 * CATEGORY OPTIONS
 * ============================================================
 */

const CATEGORY_OPTIONS:
  {
    value:
      CommunityCategory |
      "all";

    label:
      string;
  }[] = [

  {
    value:
      "all",

    label:
      "All Topics",
  },

  {
    value:
      "general",

    label:
      "General",
  },

  {
    value:
      "newly_diagnosed",

    label:
      "Newly Diagnosed",
  },

  {
    value:
      "school",

    label:
      "School",
  },

  {
    value:
      "therapy",

    label:
      "Therapy",
  },

  {
    value:
      "insurance",

    label:
      "Insurance",
  },

  {
    value:
      "financial_support",

    label:
      "Financial Support",
  },

  {
    value:
      "parent_support",

    label:
      "Parent Support",
  },

  {
    value:
      "teen_transition",

    label:
      "Teen Transition",
  },

  {
    value:
      "adult_transition",

    label:
      "Adult Transition",
  },

  {
    value:
      "siblings_family",

    label:
      "Siblings & Family",
  },

  {
    value:
      "success_stories",

    label:
      "Success Stories",
  },

  {
    value:
      "questions",

    label:
      "Questions",
  },

  {
    value:
      "other",

    label:
      "Other",
  },

];


/*
 * ============================================================
 * CATEGORY LABEL
 * ============================================================
 */

function getCategoryLabel(
  category:
    CommunityCategory
): string {

  const option =
    CATEGORY_OPTIONS.find(
      (item) =>
        item.value ===
        category
    );


  return (
    option?.label ||
    "Community"
  );
}


/*
 * ============================================================
 * FORMAT DATE
 * ============================================================
 */

function formatPostDate(
  timestamp: number
): string {

  if (!timestamp) {
    return "";
  }


  try {

    return new Intl.DateTimeFormat(
      "en-US",
      {
        month:
          "short",

        day:
          "numeric",

        year:
          "numeric",
      }
    ).format(
      new Date(
        timestamp
      )
    );

  } catch {

    return "";

  }

}


/*
 * ============================================================
 * COMMUNITY FEED
 * ============================================================
 */

export default function CommunityFeed() {

  /*
   * ----------------------------------------------------------
   * ENTITLEMENTS
   * ----------------------------------------------------------
   */

  const {
    plan,
    loading:
      entitlementLoading,
    isPremium,
  } =
    useAccountEntitlements();


  /*
   * ----------------------------------------------------------
   * POSTS
   * ----------------------------------------------------------
   */

  const [
    posts,
    setPosts,
  ] = useState<CommunityPost[]>(
    []
  );


  /*
   * ----------------------------------------------------------
   * UI STATE
   * ----------------------------------------------------------
   */

  const [
    loading,
    setLoading,
  ] = useState(true);


  const [
    error,
    setError,
  ] = useState("");


  const [
    selectedCategory,
    setSelectedCategory,
  ] = useState<
    CommunityCategory |
    "all"
  >(
    "all"
  );


  /*
   * ==========================================================
   * LOAD POSTS
   * ==========================================================
   */

  useEffect(() => {

    let active = true;


    async function loadPosts() {

      /*
       * ------------------------------------------------------
       * AUTH CHECK
       * ------------------------------------------------------
       */

      const currentUser =
        getCurrentUser();


      if (!currentUser) {

        if (active) {

          setPosts([]);

          setLoading(
            false
          );

        }

        return;

      }


      setLoading(
        true
      );

      setError("");


      try {

        /*
         * ----------------------------------------------------
         * BUILD FILTERS
         * ----------------------------------------------------
         *
         * Free users should only request public/non-Premium
         * posts.
         *
         * Premium users can request both.
         */

        const feedFilters =
          selectedCategory ===
          "all"
            ? {
                premiumOnly:
                  isPremium
                    ? undefined
                    : false,

                limit:
                  50,
              }
            : {
                category:
                  selectedCategory,

                premiumOnly:
                  isPremium
                    ? undefined
                    : false,

                limit:
                  50,
              };


        const loadedPosts =
          await getCommunityPosts(
            feedFilters
          );


        if (!active) {
          return;
        }


        /*
         * ----------------------------------------------------
         * PREMIUM SAFETY FILTER
         * ----------------------------------------------------
         *
         * The Firestore rules provide the actual security
         * boundary.
         *
         * This additional client-side filter keeps the UI
         * consistent in case data returned contains a
         * Premium-only record.
         */

        const visiblePosts =
          isPremium
            ? loadedPosts
            : loadedPosts.filter(
                (post) =>
                  !post.isPremiumOnly
              );


        setPosts(
          visiblePosts
        );

      } catch (loadError) {

        console.error(
          "Unable to load Community posts:",
          loadError
        );


        if (!active) {
          return;
        }


        setError(
          "We couldn't load the Community right now. Please try again."
        );

      } finally {

        if (active) {

          setLoading(
            false
          );

        }

      }

    }


    /*
     * Don't query until the subscription/auth state is
     * established.
     */

    if (
      !entitlementLoading
    ) {

      void loadPosts();

    }


    return () => {

      active = false;

    };

  }, [
    selectedCategory,
    isPremium,
    entitlementLoading,
  ]);


  /*
   * ==========================================================
   * GUEST STATE
   * ==========================================================
   */

  if (
    !entitlementLoading &&
    plan === "guest"
  ) {

    return (

      <section
        style={{
          maxWidth:
            "1050px",

          margin:
            "0 auto",

          padding:
            "40px 24px 80px",
        }}
      >

        <CommunityHeader />


        <div
          style={{
            marginTop:
              "24px",

            padding:
              "35px",

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
            💬
          </div>


          <h2
            style={{
              margin:
                0,

              color:
                "#0F172A",

              fontSize:
                "26px",

              fontWeight:
                800,
            }}
          >
            Join the Community
          </h2>


          <p
            style={{
              maxWidth:
                "620px",

              margin:
                "10px auto 20px",

              color:
                "#64748B",

              fontSize:
                "15px",

              lineHeight:
                1.65,
            }}
          >
            Create a free account to explore
            community conversations and
            learn from other families.
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
              href="/signup"

              style={{
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
              Create Free Account
            </Link>


            <Link
              href="/login"

              style={{
                padding:
                  "12px 20px",

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
              Log In
            </Link>

          </div>

        </div>

      </section>

    );

  }


  /*
   * ==========================================================
   * MAIN FEED
   * ==========================================================
   */

  return (

    <section
      style={{
        maxWidth:
          "1050px",

        margin:
          "0 auto",

        padding:
          "40px 24px 80px",
      }}
    >

      <CommunityHeader />


      {/* ======================================================
          FREE ACCOUNT NOTICE
      ======================================================= */}

      {!entitlementLoading &&
        plan === "free" && (

        <div
          style={{
            marginTop:
              "20px",

            padding:
              "14px 16px",

            borderRadius:
              "12px",

            background:
              "#EFF6FF",

            border:
              "1px solid #BFDBFE",

            color:
              "#1E40AF",

            fontSize:
              "13px",

            lineHeight:
              1.5,
          }}
        >
          You're viewing the Community as a
          Free member. Upgrade to Premium to
          create posts, reply, and participate
          in discussions.
        </div>

      )}


      {/* ======================================================
          PREMIUM CONTROLS
      ======================================================= */}

      {isPremium && (

        <div
          style={{
            marginTop:
              "22px",

            display:
              "flex",

            justifyContent:
              "flex-end",
          }}
        >

          <Link
            href="/community/create"

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
            + Create a Post
          </Link>

        </div>

      )}


      {/* ======================================================
          CATEGORY FILTER
      ======================================================= */}

      <div
        style={{
          marginTop:
            "24px",

          display:
            "flex",

          alignItems:
            "center",

          gap:
            "10px",

          flexWrap:
            "wrap",
        }}
      >

        <label
          htmlFor="community-category"
          style={{
            color:
              "#475569",

            fontSize:
              "13px",

            fontWeight:
              700,
          }}
        >
          Browse:
        </label>


        <select
          id="community-category"

          value={
            selectedCategory
          }

          onChange={(
            event
          ) => {

            setSelectedCategory(
              event.target.value as
                CommunityCategory |
                "all"
            );

          }}

          style={{
            minWidth:
              "190px",

            padding:
              "9px 12px",

            borderRadius:
              "9px",

            border:
              "1px solid #CBD5E1",

            background:
              "#FFFFFF",

            color:
              "#334155",

            fontSize:
              "13px",

            outline:
              "none",
          }}
        >

          {CATEGORY_OPTIONS.map(
            (option) => (

              <option
                key={
                  option.value
                }

                value={
                  option.value
                }
              >
                {option.label}
              </option>

            )
          )}

        </select>

      </div>


      {/* ======================================================
          LOADING
      ======================================================= */}

      {loading && (

        <div
          style={{
            marginTop:
              "24px",

            padding:
              "28px",

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
          Loading Community conversations...
        </div>

      )}


      {/* ======================================================
          ERROR
      ======================================================= */}

      {!loading &&
        error && (

        <div
          role="alert"

          style={{
            marginTop:
              "24px",

            padding:
              "16px",

            borderRadius:
              "14px",

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
          {error}
        </div>

      )}


      {/* ======================================================
          EMPTY
      ======================================================= */}

      {!loading &&
        !error &&
        posts.length === 0 && (

        <div
          style={{
            marginTop:
              "24px",

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
          }}
        >

          <div
            style={{
              fontSize:
                "30px",

              marginBottom:
                "10px",
            }}
          >
            💙
          </div>


          <h3
            style={{
              margin:
                0,

              color:
                "#0F172A",

              fontSize:
                "20px",

              fontWeight:
                800,
            }}
          >
            No conversations yet.
          </h3>


          <p
            style={{
              maxWidth:
                "590px",

              margin:
                "8px auto 0",

              color:
                "#64748B",

              fontSize:
                "14px",

              lineHeight:
                1.6,
            }}
          >
            As the Community grows, you'll see
            conversations from families navigating
            different parts of the autism journey.
          </p>

        </div>

      )}


      {/* ======================================================
          POSTS
      ======================================================= */}

      {!loading &&
        !error &&
        posts.length > 0 && (

        <div
          style={{
            display:
              "grid",

            gap:
              "14px",

            marginTop:
              "24px",
          }}
        >

          {posts.map(
            (post) => (

              <CommunityPostCard
                key={
                  post.id
                }

                post={
                  post
                }

                isPremium={
                  isPremium
                }

              />

            )
          )}

        </div>

      )}


      {/* ======================================================
          PREMIUM CONVERSION
      ======================================================= */}

      {!entitlementLoading &&
        plan === "free" && (

        <div
          style={{
            marginTop:
              "35px",

            padding:
              "25px",

            borderRadius:
              "18px",

            background:
              "#F8FAFC",

            border:
              "1px solid #E2E8F0",

            textAlign:
              "center",
          }}
        >

          <h3
            style={{
              margin:
                0,

              color:
                "#0F172A",

              fontSize:
                "21px",

              fontWeight:
                800,
            }}
          >
            Want to be part of the conversation?
          </h3>


          <p
            style={{
              maxWidth:
                "620px",

              margin:
                "9px auto 17px",

              color:
                "#64748B",

              fontSize:
                "14px",

              lineHeight:
                1.6,
            }}
          >
            Premium members can create posts,
            reply to other families, and participate
            in Community discussions.
          </p>


          <Link
            href="/pricing"

            style={{
              display:
                "inline-block",

              padding:
                "11px 19px",

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

        </div>

      )}

    </section>

  );
}


/*
 * ============================================================
 * COMMUNITY HEADER
 * ============================================================
 */

function CommunityHeader() {

  return (

    <header>

      <div
        style={{
          color:
            "#2563EB",

          fontSize:
            "12px",

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
        Myriad Autism Journey
      </div>


      <h1
        style={{
          margin:
            0,

          color:
            "#0F172A",

          fontSize:
            "40px",

          lineHeight:
            1.15,

          fontWeight:
            850,
        }}
      >
        Community
      </h1>


      <p
        style={{
          maxWidth:
            "760px",

          margin:
            "12px 0 0",

          color:
            "#64748B",

          fontSize:
            "17px",

          lineHeight:
            1.65,
        }}
      >
        Explore conversations, experiences,
        and encouragement from families
        navigating the autism journey.
      </p>

    </header>

  );

}


/*
 * ============================================================
 * COMMUNITY POST CARD
 * ============================================================
 */

function CommunityPostCard({
  post,
  isPremium,
}: {
  post:
    CommunityPost;

  isPremium:
    boolean;
}) {

  const displayAuthor =
    post.isAnonymous
      ? "Anonymous"
      : post.authorDisplayName ||
        "Community Member";


  return (

    <article
      style={{
        padding:
          "22px",

        borderRadius:
          "18px",

        border:
          "1px solid #E2E8F0",

        background:
          "#FFFFFF",

        boxShadow:
          "0 4px 14px rgba(15, 23, 42, 0.03)",
      }}
    >

      {/* ====================================================
          POST META
      ===================================================== */}

      <div
        style={{
          display:
            "flex",

          alignItems:
            "center",

          justifyContent:
            "space-between",

          gap:
            "12px",

          flexWrap:
            "wrap",

          marginBottom:
            "10px",
        }}
      >

        <div
          style={{
            display:
              "flex",

            alignItems:
              "center",

            gap:
              "8px",

            flexWrap:
              "wrap",
          }}
        >

          <span
            style={{
              padding:
                "4px 8px",

              borderRadius:
                "999px",

              background:
                "#EFF6FF",

              color:
                "#2563EB",

              fontSize:
                "10px",

              fontWeight:
                800,

              textTransform:
                "uppercase",

              letterSpacing:
                "0.04em",
            }}
          >
            {
              getCategoryLabel(
                post.category
              )
            }
          </span>


          {post.isPremiumOnly && (

            <span
              style={{
                padding:
                  "4px 8px",

                borderRadius:
                  "999px",

                background:
                  "#F0FDFA",

                color:
                  "#0F766E",

                fontSize:
                  "10px",

                fontWeight:
                  800,

                textTransform:
                  "uppercase",

                letterSpacing:
                  "0.04em",
              }}
            >
              Premium
            </span>

          )}

        </div>


        <span
          style={{
            color:
              "#94A3B8",

            fontSize:
              "12px",
          }}
        >
          {
            formatPostDate(
              post.createdAt
            )
          }
        </span>

      </div>


      {/* ====================================================
          TITLE
      ===================================================== */}

      <h2
        style={{
          margin:
            "0 0 8px",

          color:
            "#0F172A",

          fontSize:
            "20px",

          lineHeight:
            1.3,

          fontWeight:
            800,
        }}
      >
        {post.title}
      </h2>


      {/* ====================================================
          BODY
      ===================================================== */}

      <p
        style={{
          margin:
            0,

          color:
            "#475569",

          fontSize:
            "14px",

          lineHeight:
            1.65,

          whiteSpace:
            "pre-wrap",
        }}
      >
        {post.body}
      </p>


      {/* ====================================================
          AUTHOR / STATS
      ===================================================== */}

      <div
        style={{
          display:
            "flex",

          alignItems:
            "center",

          justifyContent:
            "space-between",

          gap:
            "12px",

          flexWrap:
            "wrap",

          marginTop:
            "17px",

          paddingTop:
            "15px",

          borderTop:
            "1px solid #F1F5F9",

          color:
            "#94A3B8",

          fontSize:
            "12px",
        }}
      >

        <span>
          Shared by{" "}
          <strong
            style={{
              color:
                "#64748B",
            }}
          >
            {displayAuthor}
          </strong>
        </span>


        <div
          style={{
            display:
              "flex",

            gap:
              "12px",
          }}
        >

          <span>
            💬 {post.replyCount}
          </span>


          <span>
            ♥ {post.reactionCount}
          </span>

        </div>

      </div>


      {/* ====================================================
          PREMIUM INTERACTION
      ===================================================== */}

      {isPremium && (

        <div
          style={{
            marginTop:
              "15px",
          }}
        >

          <Link
            href={
              `/community/${post.id}`
            }

            style={{
              color:
                "#2563EB",

              fontSize:
                "13px",

              fontWeight:
                800,

              textDecoration:
                "none",
            }}
          >
            View conversation →
          </Link>

        </div>

      )}

    </article>

  );

}