"use client";

import {
  useEffect,
  useState,
} from "react";

import Link from "next/link";

import {
  doc,
  getDoc,
} from "firebase/firestore";

import {
  getCurrentUser,
} from "../../../lib/auth";

import {
  db,
} from "../../../lib/firebase";

import {
  useAccountEntitlements,
} from "../../../lib/useAccountEntitlements";

import {
  getCommunityReplies,
} from "../../../lib/communityRepository";

import type {
  CommunityPost,
  CommunityReply,
} from "../../../lib/communityTypes";


/*
 * ============================================================
 * COMMUNITY CONVERSATION
 * ============================================================
 *
 * CURRENT TESTING VERSION
 *
 * Guest:
 *   Login/create account required.
 *
 * Free:
 *   Read-only.
 *
 * Premium:
 *   Premium participation is temporarily hidden while the
 *   Free experience is prepared for user testing.
 *
 * Existing replies remain readable.
 * ============================================================
 */


type CommunityPostPageProps = {
  params: Promise<{
    postId: string;
  }>;
};


/*
 * ============================================================
 * FORMAT DATE
 * ============================================================
 */

function formatDate(
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
          "long",

        day:
          "numeric",

        year:
          "numeric",

        hour:
          "numeric",

        minute:
          "2-digit",
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
 * CATEGORY LABEL
 * ============================================================
 */

function getCategoryLabel(
  category: string
): string {

  return category
    .replace(
      /_/g,
      " "
    )
    .replace(
      /\b\w/g,
      (
        letter
      ) =>
        letter.toUpperCase()
    );

}


/*
 * ============================================================
 * PAGE
 * ============================================================
 */

export default function CommunityPostPage({
  params,
}: CommunityPostPageProps) {

  /*
   * ==========================================================
   * POST ID
   * ==========================================================
   */

  const [
    postId,
    setPostId,
  ] = useState("");


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
   * POST
   * ==========================================================
   */

  const [
    post,
    setPost,
  ] = useState<
    CommunityPost |
    null
  >(null);


  /*
   * ==========================================================
   * REPLIES
   * ==========================================================
   */

  const [
    replies,
    setReplies,
  ] = useState<
    CommunityReply[]
  >([]);


  /*
   * ==========================================================
   * PAGE STATE
   * ==========================================================
   */

  const [
    loading,
    setLoading,
  ] = useState(true);


  const [
    error,
    setError,
  ] = useState("");


  /*
   * ==========================================================
   * RESOLVE PARAMS
   * ==========================================================
   */

  useEffect(() => {

    let active =
      true;


    async function resolveParams() {

      try {

        const resolved =
          await params;


        if (!active) {
          return;
        }


        setPostId(
          resolved.postId
        );

      } catch (error) {

        console.error(
          "Unable to resolve Community post parameters:",
          error
        );


        if (active) {

          setError(
            "We couldn't open that Community conversation."
          );

          setLoading(
            false
          );

        }

      }

    }


    void resolveParams();


    return () => {

      active =
        false;

    };

  }, [
    params,
  ]);


  /*
   * ==========================================================
   * LOAD CONVERSATION
   * ==========================================================
   */

  useEffect(() => {

    if (
      entitlementLoading ||
      !postId
    ) {

      return;

    }


    let active =
      true;


    async function loadConversation() {

      const currentUser =
        getCurrentUser();


      /*
       * ------------------------------------------------------
       * GUEST
       * ------------------------------------------------------
       */

      if (!currentUser) {

        if (active) {

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
         * LOAD POST
         * ----------------------------------------------------
         */

        const postRef =
          doc(
            db,
            "community",
            "posts",
            postId
          );


        const postSnapshot =
          await getDoc(
            postRef
          );


        if (
          !postSnapshot.exists()
        ) {

          throw new Error(
            "POST_NOT_FOUND"
          );

        }


        const data =
          postSnapshot.data();


        /*
         * ----------------------------------------------------
         * PUBLISHED ONLY
         * ----------------------------------------------------
         */

        if (
          data.status !==
          "published"
        ) {

          throw new Error(
            "POST_NOT_FOUND"
          );

        }


        /*
         * ----------------------------------------------------
         * BUILD POST
         * ----------------------------------------------------
         */

        const loadedPost:
          CommunityPost = {

          id:
            postSnapshot.id,

          authorId:
            typeof data.authorId ===
            "string"
              ? data.authorId
              : "",

          authorDisplayName:
            typeof data.authorDisplayName ===
            "string"
              ? data.authorDisplayName
              : "Community Member",

          title:
            typeof data.title ===
            "string"
              ? data.title
              : "",

          body:
            typeof data.body ===
            "string"
              ? data.body
              : "",

          category:
            typeof data.category ===
            "string"
              ? data.category
              : "",

          isAnonymous:
            data.isAnonymous ===
            true,

          status:
            typeof data.status ===
            "string"
              ? data.status
              : "published",

          moderationStatus:
            typeof data.moderationStatus ===
            "string"
              ? data.moderationStatus
              : "",

          replyCount:
            typeof data.replyCount ===
            "number"
              ? data.replyCount
              : 0,

          reactionCount:
            typeof data.reactionCount ===
            "number"
              ? data.reactionCount
              : 0,

          reportCount:
            typeof data.reportCount ===
            "number"
              ? data.reportCount
              : 0,

          isFeatured:
            data.isFeatured ===
            true,

          isPremiumOnly:
            data.isPremiumOnly ===
            true,

          isNavigatorSupported:
            data.isNavigatorSupported ===
            true,

          createdAt:
            typeof data.createdAt ===
            "number"
              ? data.createdAt
              : 0,

          updatedAt:
            typeof data.updatedAt ===
            "number"
              ? data.updatedAt
              : 0,

        };


        /*
         * ----------------------------------------------------
         * PREMIUM-ONLY POST
         * ----------------------------------------------------
         */

        if (
          loadedPost.isPremiumOnly &&
          !isPremium
        ) {

          throw new Error(
            "PREMIUM_REQUIRED"
          );

        }


        /*
         * ----------------------------------------------------
         * LOAD EXISTING REPLIES
         * ----------------------------------------------------
         *
         * Reading existing replies is still allowed for users
         * who can access the conversation.
         */

        const loadedReplies =
          await getCommunityReplies(
            postId
          );


        if (!active) {
          return;
        }


        setPost(
          loadedPost
        );

        setReplies(
          loadedReplies
        );

      } catch (
        loadError
      ) {

        console.error(
          "Unable to load Community conversation:",
          loadError
        );


        if (!active) {
          return;
        }


        if (
          loadError instanceof Error &&
          loadError.message ===
            "PREMIUM_REQUIRED"
        ) {

          setError(
            "This conversation is available to Premium members."
          );

        } else {

          setError(
            "We couldn't find that Community conversation."
          );

        }


        setPost(
          null
        );

        setReplies(
          []);

      } finally {

        if (active) {

          setLoading(
            false
          );

        }

      }

    }


    void loadConversation();


    return () => {

      active =
        false;

    };

  }, [
    postId,
    entitlementLoading,
    isPremium,
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

      <main
        style={{
          maxWidth:
            "900px",

          margin:
            "0 auto",

          padding:
            "50px 24px 90px",
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
              "25px",

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
            💬
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
            Join the Community
          </h1>


          <p
            style={{
              maxWidth:
                "620px",

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
            Create a free account or log in to
            read Community conversations.
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
                  `/community/${postId}`
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
                  `/community/${postId}`
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

        </section>

      </main>

    );

  }


  /*
   * ==========================================================
   * LOADING
   * ==========================================================
   */

  if (
    loading
  ) {

    return (

      <main
        style={{
          maxWidth:
            "900px",

          margin:
            "0 auto",

          padding:
            "50px 24px 90px",
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


        <div
          style={{
            marginTop:
              "25px",

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

            color:
              "#64748B",

            fontSize:
              "14px",
          }}
        >
          Loading conversation...
        </div>

      </main>

    );

  }


  /*
   * ==========================================================
   * ERROR
   * ==========================================================
   */

  if (
    error ||
    !post
  ) {

    return (

      <main
        style={{
          maxWidth:
            "900px",

          margin:
            "0 auto",

          padding:
            "50px 24px 90px",
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
              "25px",

            padding:
              "35px",

            borderRadius:
              "18px",

            border:
              "1px solid #FECACA",

            background:
              "#FEF2F2",

            color:
              "#B91C1C",

            textAlign:
              "center",

            fontSize:
              "14px",

            lineHeight:
              1.6,
          }}
        >
          {
            error ||
            "We couldn't find that conversation."
          }
        </section>

      </main>

    );

  }


  /*
   * ==========================================================
   * POST AUTHOR
   * ==========================================================
   */

  const postAuthor =
    post.isAnonymous
      ? "Anonymous"
      : post.authorDisplayName ||
        "Community Member";


  /*
   * ==========================================================
   * MAIN PAGE
   * ==========================================================
   */

  return (

    <main
      style={{
        maxWidth:
          "900px",

        margin:
          "0 auto",

        padding:
          "45px 24px 90px",
      }}
    >

      {/* ==================================================
          BACK
      =================================================== */}

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
          ORIGINAL POST
      =================================================== */}

      <article
        style={{
          marginTop:
            "22px",

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

        <div
          style={{
            display:
              "flex",

            justifyContent:
              "space-between",

            alignItems:
              "center",

            gap:
              "12px",

            flexWrap:
              "wrap",

            marginBottom:
              "15px",
          }}
        >

          <div
            style={{
              display:
                "flex",

              gap:
                "8px",

              flexWrap:
                "wrap",
            }}
          >

            <span
              style={{
                padding:
                  "5px 9px",

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
                    "5px 9px",

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
              formatDate(
                post.createdAt
              )
            }
          </span>

        </div>


        <h1
          style={{
            margin:
              "0 0 14px",

            color:
              "#0F172A",

            fontSize:
              "32px",

            lineHeight:
              1.25,

            fontWeight:
              850,
          }}
        >
          {
            post.title
          }
        </h1>


        <p
          style={{
            margin:
              0,

            color:
              "#475569",

            fontSize:
              "16px",

            lineHeight:
              1.75,

            whiteSpace:
              "pre-wrap",
          }}
        >
          {
            post.body
          }
        </p>


        <div
          style={{
            marginTop:
              "22px",

            paddingTop:
              "17px",

            borderTop:
              "1px solid #F1F5F9",

            display:
              "flex",

            justifyContent:
              "space-between",

            alignItems:
              "center",

            gap:
              "12px",

            flexWrap:
              "wrap",
          }}
        >

          <span
            style={{
              color:
                "#64748B",

              fontSize:
                "13px",
            }}
          >
            Shared by{" "}

            <strong>
              {
                postAuthor
              }
            </strong>
          </span>


          <span
            style={{
              color:
                "#94A3B8",

              fontSize:
                "12px",
            }}
          >
            💬{" "}
            {post.replyCount}
            {" "}
            {post.replyCount === 1
              ? "reply"
              : "replies"}
          </span>

        </div>

      </article>


      {/* ==================================================
          CONVERSATION
      =================================================== */}

      <section
        style={{
          marginTop:
            "30px",
        }}
      >

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

            marginBottom:
              "15px",
          }}
        >

          <h2
            style={{
              margin:
                0,

              color:
                "#0F172A",

              fontSize:
                "22px",

              fontWeight:
                800,
            }}
          >
            Conversation
          </h2>


          <span
            style={{
              color:
                "#64748B",

              fontSize:
                "13px",
            }}
          >
            {replies.length}{" "}
            {
              replies.length ===
              1
                ? "reply"
                : "replies"
            }
          </span>

        </div>


        {replies.length === 0 ? (

          <div
            style={{
              padding:
                "28px",

              borderRadius:
                "16px",

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

              lineHeight:
                1.6,
            }}
          >
            No replies yet.
          </div>

        ) : (

          <div
            style={{
              display:
                "grid",

              gap:
                "12px",
            }}
          >

            {replies.map(
              (
                reply
              ) => {

                const replyAuthor =
                  reply.isAnonymous
                    ? "Anonymous"
                    : reply.authorDisplayName ||
                      "Community Member";


                return (

                  <article
                    key={
                      reply.id
                    }

                    style={{
                      padding:
                        "20px",

                      borderRadius:
                        "16px",

                      border:
                        "1px solid #E2E8F0",

                      background:
                        "#FFFFFF",
                    }}
                  >

                    <div
                      style={{
                        display:
                          "flex",

                        justifyContent:
                          "space-between",

                        gap:
                          "12px",

                        flexWrap:
                          "wrap",

                        marginBottom:
                          "9px",
                      }}
                    >

                      <strong
                        style={{
                          color:
                            "#334155",

                          fontSize:
                            "13px",
                        }}
                      >
                        {
                          replyAuthor
                        }
                      </strong>


                      <span
                        style={{
                          color:
                            "#94A3B8",

                          fontSize:
                            "11px",
                        }}
                      >
                        {
                          formatDate(
                            reply.createdAt
                          )
                        }
                      </span>

                    </div>


                    <p
                      style={{
                        margin:
                          0,

                        color:
                          "#475569",

                        fontSize:
                          "14px",

                        lineHeight:
                          1.7,

                        whiteSpace:
                          "pre-wrap",
                      }}
                    >
                      {
                        reply.body
                      }
                    </p>

                  </article>

                );

              }
            )}

          </div>

        )}

      </section>


      {/* ==================================================
          PREMIUM MEMBER MESSAGE
      =================================================== */}

      {plan === "premium" && (

        <section
          style={{
            marginTop:
              "28px",

            padding:
              "22px",

            borderRadius:
              "16px",

            border:
              "1px solid #BFDBFE",

            background:
              "#EFF6FF",

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
                "18px",

              fontWeight:
                800,
            }}
          >
            Premium community participation
          </h3>


          <p
            style={{
              maxWidth:
                "620px",

              margin:
                "8px auto 0",

              color:
                "#64748B",

              fontSize:
                "13px",

              lineHeight:
                1.6,
            }}
          >
            Posting and replying are temporarily
            unavailable while we prepare the Community
            experience for testing.
          </p>

        </section>

      )}


      {/* ==================================================
          FREE MEMBER MESSAGE
      =================================================== */}

      {plan === "free" && (

        <section
          style={{
            marginTop:
              "25px",

            padding:
              "22px",

            borderRadius:
              "16px",

            border:
              "1px solid #E2E8F0",

            background:
              "#F8FAFC",

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
                "19px",

              fontWeight:
                800,
            }}
          >
            Want to join the conversation?
          </h3>


          <p
            style={{
              maxWidth:
                "600px",

              margin:
                "8px auto 16px",

              color:
                "#64748B",

              fontSize:
                "13px",

              lineHeight:
                1.6,
            }}
          >
            Free members can read Community
            conversations. Community participation
            is part of Premium.
          </p>


          <Link
            href="/pricing"

            style={{
              display:
                "inline-block",

              padding:
                "10px 18px",

              borderRadius:
                "9px",

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
            Explore Premium
          </Link>

        </section>

      )}

    </main>

  );

}