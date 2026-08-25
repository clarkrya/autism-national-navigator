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
 * Guest:
 *   Must create an account or log in.
 *
 * Free:
 *   Read-only Community access.
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
 * COMMUNITY RETURN PATH
 * ============================================================
 */

const COMMUNITY_RETURN_TO =
  "/community";


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

    description:
      string;
  }[] = [

  {
    value:
      "all",

    label:
      "All Topics",

    description:
      "See recent conversations across the Community.",
  },

  {
    value:
      "general",

    label:
      "General",

    description:
      "Everyday questions, experiences, and support.",
  },

  {
    value:
      "newly_diagnosed",

    label:
      "Newly Diagnosed",

    description:
      "Early questions and navigating what comes next.",
  },

  {
    value:
      "school",

    label:
      "School",

    description:
      "School experiences, support, and transitions.",
  },

  {
    value:
      "therapy",

    label:
      "Therapy",

    description:
      "Therapy experiences, questions, and support.",
  },

  {
    value:
      "insurance",

    label:
      "Insurance",

    description:
      "Coverage, claims, and navigating insurance.",
  },

  {
    value:
      "financial_support",

    label:
      "Financial Support",

    description:
      "Financial assistance, costs, and support.",
  },

  {
    value:
      "parent_support",

    label:
      "Parent Support",

    description:
      "Support and encouragement for parents and caregivers.",
  },

  {
    value:
      "teen_transition",

    label:
      "Teen Transition",

    description:
      "Preparing for changing needs during the teen years.",
  },

  {
    value:
      "adult_transition",

    label:
      "Adult Transition",

    description:
      "Preparing for adulthood and greater independence.",
  },

  {
    value:
      "siblings_family",

    label:
      "Siblings & Family",

    description:
      "Family relationships, siblings, and shared experiences.",
  },

  {
    value:
      "success_stories",

    label:
      "Success Stories",

    description:
      "Celebrate progress, milestones, and encouraging moments.",
  },

  {
    value:
      "questions",

    label:
      "Questions",

    description:
      "Ask about something you're navigating.",
  },

  {
    value:
      "other",

    label:
      "Other",

    description:
      "Topics that don't fit another category.",
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
      (
        item
      ) =>
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
 * CATEGORY DESCRIPTION
 * ============================================================
 */

function getCategoryDescription(
  category:
    CommunityCategory |
    "all"
): string {

  const option =
    CATEGORY_OPTIONS.find(
      (
        item
      ) =>
        item.value ===
        category
    );


  return (
    option?.description ||
    "Explore Community conversations."
  );

}


/*
 * ============================================================
 * FORMAT DATE
 * ============================================================
 */

function formatPostDate(
  timestamp:
    number
): string {

  if (
    !timestamp
  ) {

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
   * ACCOUNT ENTITLEMENTS
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
  ] = useState<
    CommunityPost[]
  >([]);


  /*
   * ----------------------------------------------------------
   * LOADING
   * ----------------------------------------------------------
   */

  const [
    loading,
    setLoading,
  ] = useState(true);


  /*
   * ----------------------------------------------------------
   * ERROR
   * ----------------------------------------------------------
   */

  const [
    error,
    setError,
  ] = useState("");


  /*
   * ----------------------------------------------------------
   * CATEGORY
   * ----------------------------------------------------------
   */

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

    let active =
      true;


    async function loadPosts() {

      const currentUser =
        getCurrentUser();


      /*
       * ------------------------------------------------------
       * GUEST
       * ------------------------------------------------------
       */

      if (
        !currentUser
      ) {

        if (
          active
        ) {

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
         * BUILD QUERY
         * ----------------------------------------------------
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


        /*
         * ----------------------------------------------------
         * LOAD
         * ----------------------------------------------------
         */

        const loadedPosts =
          await getCommunityPosts(
            feedFilters
          );


        if (
          !active
        ) {

          return;

        }


        /*
         * ----------------------------------------------------
         * ADDITIONAL CLIENT-SIDE SAFETY
         * ----------------------------------------------------
         */

        const visiblePosts =
          isPremium

            ? loadedPosts

            : loadedPosts.filter(
                (
                  post
                ) =>
                  !post.isPremiumOnly
              );


        setPosts(
          visiblePosts
        );

      } catch (
        loadError
      ) {

        console.error(
          "Unable to load Community posts:",
          loadError
        );


        if (
          !active
        ) {

          return;

        }


        setError(
          "We couldn't load the Community right now. Please try again."
        );

      } finally {

        if (
          active
        ) {

          setLoading(
            false
          );

        }

      }

    }


    /*
     * Don't query before auth/entitlement state is ready.
     */

    if (
      !entitlementLoading
    ) {

      void loadPosts();

    }


    return () => {

      active =
        false;

    };

  }, [
    selectedCategory,
    isPremium,
    entitlementLoading,
  ]);


  /*
   * ==========================================================
   * GUEST VIEW
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
              "26px",

            padding:
              "36px",

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

              lineHeight:
                1.25,

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
                "10px auto 22px",

              color:
                "#64748B",

              fontSize:
                "15px",

              lineHeight:
                1.65,
            }}
          >
            Create a free account to explore
            Community conversations and learn
            from other families.
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
              href={
                `/signup?returnTo=${encodeURIComponent(
                  COMMUNITY_RETURN_TO
                )}`
              }

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
              href={
                `/login?returnTo=${encodeURIComponent(
                  COMMUNITY_RETURN_TO
                )}`
              }

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
   * MAIN COMMUNITY
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
          "40px 24px 90px",
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
          Free member. You can read
          conversations, while posting and
          replying are available with Premium.
        </div>

      )}


      {/* ======================================================
          BROWSE BY TOPIC
      ======================================================= */}

      <section
        style={{
          marginTop:
            "28px",

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

        <div
          style={{
            display:
              "flex",

            alignItems:
              "flex-start",

            justifyContent:
              "space-between",

            gap:
              "20px",

            flexWrap:
              "wrap",
          }}
        >

          <div
            style={{
              flex:
                "1 1 420px",
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
                  "5px",
              }}
            >
              Explore conversations
            </div>


            <h2
              style={{
                margin:
                  0,

                color:
                  "#0F172A",

                fontSize:
                  "23px",

                lineHeight:
                  1.25,

                fontWeight:
                  800,
              }}
            >
              Browse by topic
            </h2>


            <p
              style={{
                margin:
                  "7px 0 0",

                color:
                  "#64748B",

                fontSize:
                  "14px",

                lineHeight:
                  1.55,
              }}
            >
              {
                getCategoryDescription(
                  selectedCategory
                )
              }
            </p>

          </div>


          {/* ==================================================
              TOPIC SELECTOR
          =================================================== */}

          <div
            style={{
              flex:
                "0 1 270px",

              minWidth:
                "230px",
            }}
          >

            <label
              htmlFor="community-category"

              style={{
                display:
                  "block",

                marginBottom:
                  "7px",

                color:
                  "#334155",

                fontSize:
                  "12px",

                fontWeight:
                  800,
              }}
            >
              Topic
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
                width:
                  "100%",

                boxSizing:
                  "border-box",

                padding:
                  "11px 12px",

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
                  700,

                outline:
                  "none",

                cursor:
                  "pointer",
              }}
            >

              {CATEGORY_OPTIONS.map(
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
              )}

            </select>

          </div>

        </div>


        {/* ====================================================
            SELECTED TOPIC CHIP
        ===================================================== */}

        <div
          style={{
            marginTop:
              "17px",

            paddingTop:
              "15px",

            borderTop:
              "1px solid #F1F5F9",

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
              color:
                "#64748B",

              fontSize:
                "12px",

              fontWeight:
                700,
            }}
          >
            Showing:
          </span>


          <span
            style={{
              padding:
                "5px 10px",

              borderRadius:
                "999px",

              background:
                "#EFF6FF",

              color:
                "#1D4ED8",

              fontSize:
                "12px",

              fontWeight:
                800,
            }}
          >
            {
              selectedCategory ===
              "all"

                ? "All Topics"

                : getCategoryLabel(
                    selectedCategory
                  )
            }
          </span>

        </div>

      </section>


      {/* ======================================================
          PREMIUM CREATE POST
      ======================================================= */}

      {isPremium && (

        <div
          style={{
            marginTop:
              "20px",

            display:
              "flex",

            justifyContent:
              "flex-end",
          }}
        >

          <Link
            href="/community/create"

            style={{
              display:
                "inline-flex",

              alignItems:
                "center",

              gap:
                "7px",

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
            <span>
              +
            </span>

            Create a Post
          </Link>

        </div>

      )}


      {/* ======================================================
          SECTION TITLE
      ======================================================= */}

      <div
        style={{
          marginTop:
            "32px",

          display:
            "flex",

          alignItems:
            "center",

          justifyContent:
            "space-between",

          gap:
            "15px",

          flexWrap:
            "wrap",
        }}
      >

        <div>

          <h2
            style={{
              margin:
                0,

              color:
                "#0F172A",

              fontSize:
                "23px",

              fontWeight:
                800,
            }}
          >
            Recent Conversations
          </h2>


          <p
            style={{
              margin:
                "5px 0 0",

              color:
                "#64748B",

              fontSize:
                "13px",
            }}
          >
            {
              selectedCategory ===
              "all"

                ? "The latest published Community conversations."
                
                : `Recent conversations about ${getCategoryLabel(
                    selectedCategory
                  ).toLowerCase()}.`
            }
          </p>

        </div>


        {!loading &&
          !error &&
          posts.length > 0 && (

          <span
            style={{
              color:
                "#94A3B8",

              fontSize:
                "12px",

              fontWeight:
                700,
            }}
          >
            {posts.length}{" "}
            {posts.length ===
            1
              ? "conversation"
              : "conversations"}
          </span>

        )}

      </div>


      {/* ======================================================
          LOADING
      ======================================================= */}

      {loading && (

        <div
          style={{
            marginTop:
              "20px",

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
              "20px",

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
          {
            error
          }
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
              "20px",

            padding:
              "38px 24px",

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
            There aren't any published conversations
            in this topic yet. Check another topic
            or come back as the Community grows.
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
              "20px",
          }}
        >

          {posts.map(
            (
              post
            ) => (

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
          FREE ACCOUNT CONVERSION
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
            reply to other families, and
            participate in Community discussions.
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

      <h3
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
        {
          post.title
        }
      </h3>


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
        {
          post.body
        }
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
            {
              displayAuthor
            }
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
          VIEW CONVERSATION
      ===================================================== */}

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

    </article>

  );

}