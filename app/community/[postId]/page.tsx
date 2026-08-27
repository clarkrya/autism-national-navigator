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
} from "firebase/firestore";

import {
  getCurrentUser,
} from "../../../lib/auth";

import {
  auth,
  db,
} from "../../../lib/firebase";

import {
  useAccountEntitlements,
} from "../../../lib/useAccountEntitlements";

import {
  createCommunityReaction,
  createCommunityReply,
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
 * Guest:
 *   Login/create account required.
 *
 * Free:
 *   Read-only.
 *
 * Premium:
 *   Read + reply + react.
 *
 * Premium+:
 *   Read + reply + react.
 *
 * Replies enter moderation review.
 *
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
   * ----------------------------------------------------------
   * POST ID
   * ----------------------------------------------------------
   */

  const [
    postId,
    setPostId,
  ] = useState("");


  /*
   * ----------------------------------------------------------
   * ACCOUNT
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
   * POST
   * ----------------------------------------------------------
   */

  const [
    post,
    setPost,
  ] = useState<
    CommunityPost |
    null
  >(null);


  /*
   * ----------------------------------------------------------
   * REPLIES
   * ----------------------------------------------------------
   */

  const [
    replies,
    setReplies,
  ] = useState<
    CommunityReply[]
  >([]);


  /*
   * ----------------------------------------------------------
   * PAGE STATE
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


  /*
   * ==========================================================
   * REPLY FORM
   * ==========================================================
   */

  const [
    replyBody,
    setReplyBody,
  ] = useState("");


  const [
    replyAnonymous,
    setReplyAnonymous,
  ] = useState(true);


  const [
    submittingReply,
    setSubmittingReply,
  ] = useState(false);


  const [
    replyMessage,
    setReplyMessage,
  ] = useState("");


  const [
    replyError,
    setReplyError,
  ] = useState("");


  /*
   * ==========================================================
   * REACTION STATE
   * ==========================================================
   *
   * This tracks reactions made during the current session.
   *
   * Firestore prevents duplicate reaction documents because
   * the repository builds a deterministic reaction ID from:
   *
   * targetType + targetId + userId + type
   * ==========================================================
   */

  const [
    reactedItems,
    setReactedItems,
  ] = useState<
    Record<string, boolean>
  >({});


  const [
    reactionCounts,
    setReactionCounts,
  ] = useState<
    Record<string, number>
  >({});


  const [
    reactingItem,
    setReactingItem,
  ] = useState("");


  const [
    reactionError,
    setReactionError,
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

      const resolved =
        await params;


      if (
        !active
      ) {

        return;

      }


      setPostId(
        resolved.postId
      );

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

      if (
        !currentUser
      ) {

        if (
          active
        ) {

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
            data.category,

          isAnonymous:
            data.isAnonymous ===
            true,

          status:
            data.status,

          moderationStatus:
            data.moderationStatus,

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
         * LOAD REPLIES
         * ----------------------------------------------------
         */

        const loadedReplies =
          await getCommunityReplies(
            postId
          );


        if (
          !active
        ) {

          return;

        }


        setPost(
          loadedPost
        );

        setReplies(
          loadedReplies
        );


        /*
         * ----------------------------------------------------
         * INITIAL REACTION COUNTS
         * ----------------------------------------------------
         */

        const initialCounts:
          Record<string, number> = {
          [`post_${loadedPost.id}`]:
            loadedPost.reactionCount,
        };


        loadedReplies.forEach(
          (
            reply
          ) => {

            initialCounts[
              `reply_${reply.id}`
            ] =
              reply.reactionCount;

          }
        );


        setReactionCounts(
          initialCounts
        );

      } catch (
        loadError
      ) {

        console.error(
          "Unable to load Community conversation:",
          loadError
        );


        if (
          !active
        ) {

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

        if (
          active
        ) {

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
   * SUBMIT REPLY
   * ==========================================================
   */

  async function handleSubmitReply(
    event:
      FormEvent<HTMLFormElement>
  ) {

    event.preventDefault();

    setReplyError("");

    setReplyMessage("");


    if (
      !isPremium
    ) {

      setReplyError(
        "Community participation is available with Premium."
      );

      return;

    }


    const cleanBody =
      replyBody.trim();


    if (
      cleanBody.length < 2
    ) {

      setReplyError(
        "Please enter a reply before submitting."
      );

      return;

    }


    if (
      cleanBody.length > 5000
    ) {

      setReplyError(
        "Your reply must be 5,000 characters or fewer."
      );

      return;

    }


    if (
      !postId
    ) {

      setReplyError(
        "We couldn't identify this conversation."
      );

      return;

    }


    const currentUser =
      auth.currentUser;


    if (
      !currentUser
    ) {

      setReplyError(
        "Your login session has expired. Please log in again."
      );

      return;

    }


    setSubmittingReply(
      true
    );


    try {

      await createCommunityReply(
        currentUser.uid,
        {
          postId:
            postId,

          body:
            cleanBody,

          isAnonymous:
            replyAnonymous,
        }
      );


      setReplyBody("");

      setReplyAnonymous(
        true
      );

      setReplyMessage(
        "Your reply was submitted for Community review."
      );

    } catch (
      submitError
    ) {

      console.error(
        "Unable to submit Community reply:",
        submitError
      );


      setReplyError(
        submitError instanceof Error
          ? submitError.message
          : "We couldn't submit your reply right now. Please try again."
      );

    } finally {

      setSubmittingReply(
        false
      );

    }

  }


  /*
   * ==========================================================
   * REACT TO CONTENT
   * ==========================================================
   */

  async function handleReaction(
    targetType:
      "post" |
      "reply",
    targetId:
      string
  ) {

    if (
      !isPremium
    ) {

      setReactionError(
        "Community participation is available with Premium."
      );

      return;

    }


    const currentUser =
      auth.currentUser;


    if (
      !currentUser
    ) {

      setReactionError(
        "Your login session has expired. Please log in again."
      );

      return;

    }


    const reactionKey =
      `${targetType}_${targetId}`;


    /*
     * Prevent duplicate clicks during this session.
     */

    if (
      reactedItems[
        reactionKey
      ]
    ) {

      return;

    }


    setReactionError("");

    setReactingItem(
      reactionKey
    );


    try {

      await createCommunityReaction(
        currentUser.uid,
        {
          targetType,

          targetId,

          type:
            "support",

          createdAt:
            Date.now(),
        }
      );


      /*
       * ------------------------------------------------------
       * Mark as reacted locally
       * ------------------------------------------------------
       */

      setReactedItems(
        (
          current
        ) => ({
          ...current,

          [reactionKey]:
            true,
        })
      );


      /*
       * ------------------------------------------------------
       * Update count locally
       * ------------------------------------------------------
       */

      setReactionCounts(
        (
          current
        ) => ({
          ...current,

          [reactionKey]:
            (
              current[
                reactionKey
              ] || 0
            ) + 1,
        })
      );

    } catch (
      reactionSubmitError
    ) {

      console.error(
        "Unable to create Community reaction:",
        reactionSubmitError
      );


      setReactionError(
        reactionSubmitError instanceof Error
          ? reactionSubmitError.message
          : "We couldn't record your reaction right now."
      );

    } finally {

      setReactingItem("");

    }

  }


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
   * POST REACTION DATA
   * ==========================================================
   */

  const postReactionKey =
    `post_${post.id}`;


  const postReactionCount =
    reactionCounts[
      postReactionKey
    ] ??
    post.reactionCount;


  const postHasReacted =
    reactedItems[
      postReactionKey
    ] === true;


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

      {/* ======================================================
          BACK
      ======================================================= */}

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


      {/* ======================================================
          ORIGINAL POST
      ======================================================= */}

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


          <div
            style={{
              display:
                "flex",

              alignItems:
                "center",

              gap:
                "10px",
            }}
          >

            <button
              type="button"

              onClick={() =>
                handleReaction(
                  "post",
                  post.id
                )
              }

              disabled={
                !isPremium ||
                postHasReacted ||
                reactingItem ===
                  postReactionKey
              }

              style={{
                padding:
                  "7px 11px",

                borderRadius:
                  "999px",

                border:
                  postHasReacted
                    ? "1px solid #93C5FD"
                    : "1px solid #CBD5E1",

                background:
                  postHasReacted
                    ? "#EFF6FF"
                    : "#FFFFFF",

                color:
                  postHasReacted
                    ? "#1D4ED8"
                    : "#475569",

                fontSize:
                  "12px",

                fontWeight:
                  800,

                cursor:
                  !isPremium ||
                  postHasReacted
                    ? "default"
                    : "pointer",
              }}
            >
              ♥{" "}
              {postHasReacted
                ? "Supported"
                : "Support"}{" "}
              {postReactionCount}
            </button>


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
            </span>

          </div>

        </div>

      </article>


      {/* ======================================================
          REACTION ERROR
      ======================================================= */}

      {reactionError && (

        <div
          role="alert"

          style={{
            marginTop:
              "15px",

            padding:
              "12px 14px",

            borderRadius:
              "10px",

            background:
              "#FEF2F2",

            border:
              "1px solid #FECACA",

            color:
              "#B91C1C",

            fontSize:
              "13px",
          }}
        >
          {reactionError}
        </div>

      )}


      {/* ======================================================
          CONVERSATION
      ======================================================= */}

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


        {/* ====================================================
            REPLIES
        ===================================================== */}

        {replies.length ===
        0 ? (

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
            No replies yet. Be the first to
            join the conversation.
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


                const reactionKey =
                  `reply_${reply.id}`;


                const count =
                  reactionCounts[
                    reactionKey
                  ] ??
                  reply.reactionCount;


                const hasReacted =
                  reactedItems[
                    reactionKey
                  ] === true;


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


                    <div
                      style={{
                        marginTop:
                          "13px",

                        paddingTop:
                          "11px",

                        borderTop:
                          "1px solid #F1F5F9",

                        display:
                          "flex",

                        justifyContent:
                          "flex-end",
                      }}
                    >

                      <button
                        type="button"

                        onClick={() =>
                          handleReaction(
                            "reply",
                            reply.id
                          )
                        }

                        disabled={
                          !isPremium ||
                          hasReacted ||
                          reactingItem ===
                            reactionKey
                        }

                        style={{
                          padding:
                            "6px 10px",

                          borderRadius:
                            "999px",

                          border:
                            hasReacted
                              ? "1px solid #93C5FD"
                              : "1px solid #CBD5E1",

                          background:
                            hasReacted
                              ? "#EFF6FF"
                              : "#FFFFFF",

                          color:
                            hasReacted
                              ? "#1D4ED8"
                              : "#64748B",

                          fontSize:
                            "11px",

                          fontWeight:
                            800,

                          cursor:
                            !isPremium ||
                            hasReacted
                              ? "default"
                              : "pointer",
                        }}
                      >
                        ♥{" "}
                        {hasReacted
                          ? "Supported"
                          : "Support"}{" "}
                        {count}
                      </button>

                    </div>

                  </article>

                );

              }
            )}

          </div>

        )}

      </section>


      {/* ======================================================
          PREMIUM REPLY
      ======================================================= */}

      {isPremium && (

        <section
          style={{
            marginTop:
              "28px",

            padding:
              "25px",

            borderRadius:
              "18px",

            border:
              "1px solid #BFDBFE",

            background:
              "#EFF6FF",
          }}
        >

          <div
            style={{
              marginBottom:
                "15px",
            }}
          >

            <div
              style={{
                color:
                  "#1D4ED8",

                fontSize:
                  "11px",

                fontWeight:
                  800,

                letterSpacing:
                  "0.06em",

                textTransform:
                  "uppercase",

                marginBottom:
                  "5px",
              }}
            >
              Premium Community
            </div>


            <h2
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
              Join the conversation
            </h2>


            <p
              style={{
                margin:
                  "7px 0 0",

                color:
                  "#475569",

                fontSize:
                  "13px",

                lineHeight:
                  1.55,
              }}
            >
              Share your experience or offer
              encouragement to another family.
              Your reply will be reviewed before
              it is published.
            </p>

          </div>


          {replyMessage && (

            <div
              role="status"

              style={{
                marginBottom:
                  "15px",

                padding:
                  "12px 14px",

                borderRadius:
                  "10px",

                background:
                  "#ECFDF5",

                border:
                  "1px solid #A7F3D0",

                color:
                  "#047857",

                fontSize:
                  "13px",

                lineHeight:
                  1.5,
              }}
            >
              {replyMessage}
            </div>

          )}


          {replyError && (

            <div
              role="alert"

              style={{
                marginBottom:
                  "15px",

                padding:
                  "12px 14px",

                borderRadius:
                  "10px",

                background:
                  "#FEF2F2",

                border:
                  "1px solid #FECACA",

                color:
                  "#B91C1C",

                fontSize:
                  "13px",

                lineHeight:
                  1.5,
              }}
            >
              {replyError}
            </div>

          )}


          <form
            onSubmit={
              handleSubmitReply
            }
          >

            <textarea
              value={
                replyBody
              }

              onChange={(
                event
              ) =>
                setReplyBody(
                  event.target.value
                )
              }

              rows={
                6
              }

              maxLength={
                5000
              }

              placeholder="Write your reply..."

              required

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
                  "#FFFFFF",

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
                replyBody.length
              } / 5,000
            </div>


            <div
              style={{
                marginTop:
                  "15px",

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

              <label
                style={{
                  display:
                    "flex",

                  alignItems:
                    "center",

                  gap:
                    "9px",

                  color:
                    "#334155",

                  fontSize:
                    "13px",

                  fontWeight:
                    700,

                  cursor:
                    "pointer",
                }}
              >

                <input
                  type="checkbox"

                  checked={
                    replyAnonymous
                  }

                  onChange={(
                    event
                  ) =>
                    setReplyAnonymous(
                      event.target.checked
                    )
                  }

                  style={{
                    width:
                      "16px",

                    height:
                      "16px",
                  }}
                />

                Reply anonymously
              </label>


              <button
                type="submit"

                disabled={
                  submittingReply
                }

                style={{
                  padding:
                    "11px 20px",

                  borderRadius:
                    "10px",

                  border:
                    "none",

                  background:
                    submittingReply
                      ? "#93C5FD"
                      : "#2563EB",

                  color:
                    "#FFFFFF",

                  fontSize:
                    "14px",

                  fontWeight:
                    800,

                  cursor:
                    submittingReply
                      ? "default"
                      : "pointer",
                }}
              >
                {
                  submittingReply
                    ? "Submitting..."
                    : "Submit Reply"
                }
              </button>

            </div>

          </form>

        </section>

      )}


      {/* ======================================================
          FREE MEMBER
      ======================================================= */}

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
            conversations. Premium members can
            reply and react.
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