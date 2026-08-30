"use client";

import {
  useEffect,
  useState,
} from "react";

import Link from "next/link";

import {
  getCurrentUser,
} from "../../../lib/auth";

import {
  useAccountEntitlements,
} from "../../../lib/useAccountEntitlements";

import {
  getCommunityPost,
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
 * ACCESS
 *
 * Guest:
 *   Login/create account required.
 *
 * Free:
 *   Read published Community conversations.
 *
 * Premium:
 *   Read + participate.
 *
 * Premium+:
 *   Read + participate.
 *
 *
 * IMPORTANT
 *
 * Community reads are handled through:
 *
 *   communityRepository.ts
 *
 * Community writes are handled through protected server API
 * routes.
 *
 * The client does not write Community content directly
 * to Firestore.
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
  ] = useState(
    ""
  );


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
  >(
    null
  );


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
  >(
    []
  );


  /*
   * ==========================================================
   * PAGE STATE
   * ==========================================================
   */

  const [
    loading,
    setLoading,
  ] = useState(
    true
  );


  const [
    error,
    setError,
  ] = useState(
    ""
  );


  /*
   * ==========================================================
   * REPLY FORM
   * ==========================================================
   */

  const [
    replyBody,
    setReplyBody,
  ] = useState(
    ""
  );


  const [
    replyAnonymously,
    setReplyAnonymously,
  ] = useState(
    false
  );


  const [
    submittingReply,
    setSubmittingReply,
  ] = useState(
    false
  );


  const [
    replyError,
    setReplyError,
  ] = useState(
    ""
  );


  const [
    replySuccess,
    setReplySuccess,
  ] = useState(
    ""
  );


  /*
   * ==========================================================
   * RESOLVE POST ID
   * ==========================================================
   */

  useEffect(() => {

    let active =
      true;


    async function resolveParams() {

      try {

        const resolved =
          await params;


        if (
          !active
        ) {

          return;

        }


        if (
          !resolved.postId
        ) {

          throw new Error(
            "POST_ID_REQUIRED"
          );

        }


        setPostId(
          resolved.postId
        );

      } catch (
        resolveError
      ) {

        console.error(
          "Unable to resolve Community post parameters:",
          resolveError
        );


        if (
          active
        ) {

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

      /*
       * ------------------------------------------------------
       * GUESTS DO NOT LOAD COMMUNITY CONTENT
       * ------------------------------------------------------
       */

      const currentUser =
        getCurrentUser();


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

      setError(
        ""
      );


      try {

        /*
         * ----------------------------------------------------
         * LOAD POST
         * ----------------------------------------------------
         */

        const loadedPost =
          await getCommunityPost(
            postId
          );


        if (
          !loadedPost
        ) {

          throw new Error(
            "POST_NOT_FOUND"
          );

        }


        /*
         * ----------------------------------------------------
         * LOAD PUBLISHED REPLIES
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


        setPost(
          null
        );


        setReplies(
          []
        );


        setError(
          "We couldn't find that Community conversation."
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


    void loadConversation();


    return () => {

      active =
        false;

    };

  }, [
    postId,
    entitlementLoading,
  ]);


  /*
   * ==========================================================
   * SUBMIT REPLY
   * ==========================================================
   */

  async function handleSubmitReply() {

    /*
     * --------------------------------------------------------
     * PREMIUM CHECK
     * --------------------------------------------------------
     */

    if (
      !postId ||
      !isPremium
    ) {

      setReplyError(
        "Premium membership is required to participate in the Community."
      );

      return;

    }


    /*
     * --------------------------------------------------------
     * VALIDATE BODY
     * --------------------------------------------------------
     */

    const trimmedBody =
      replyBody.trim();


    if (
      !trimmedBody
    ) {

      setReplyError(
        "Please enter a reply before posting."
      );

      return;

    }


    if (
      trimmedBody.length <
      2
    ) {

      setReplyError(
        "Please enter a meaningful reply."
      );

      return;

    }


    if (
      trimmedBody.length >
      3000
    ) {

      setReplyError(
        "Replies must be 3,000 characters or fewer."
      );

      return;

    }


    setSubmittingReply(
      true
    );

    setReplyError(
      ""
    );

    setReplySuccess(
      ""
    );


    try {

      /*
       * ------------------------------------------------------
       * AUTHENTICATED USER
       * ------------------------------------------------------
       */

      const currentUser =
        getCurrentUser();


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
       */

      const response =
        await fetch(
          "/api/community/replies",
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
                postId:
                  postId,

                body:
                  trimmedBody,

                isAnonymous:
                  replyAnonymously,
              }),
          }
        );


      /*
       * ------------------------------------------------------
       * READ RESPONSE
       * ------------------------------------------------------
       */

      const result =
        await response
          .json()
          .catch(
            () =>
              null
          );


      /*
       * ------------------------------------------------------
       * HANDLE SERVER ERRORS
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


        if (
          response.status ===
          404
        ) {

          throw new Error(
            "POST_NOT_FOUND"
          );

        }


        if (
          response.status ===
          409
        ) {

          throw new Error(
            "POST_NOT_AVAILABLE"
          );

        }


        const serverMessage =
          result &&
          typeof result.error ===
            "string"
            ? result.error
            : "";


        throw new Error(
          serverMessage ||
          "REPLY_FAILED"
        );

      }


      /*
       * ------------------------------------------------------
       * RELOAD REPLIES
       * ------------------------------------------------------
       *
       * The server has written the reply.
       *
       * Now reload the published replies through our
       * read-focused Community repository.
       * ------------------------------------------------------
       */

      const updatedReplies =
        await getCommunityReplies(
          postId
        );


      setReplies(
        updatedReplies
      );


      /*
       * ------------------------------------------------------
       * REFRESH POST
       * ------------------------------------------------------
       *
       * The server transaction also updates replyCount.
       *
       * Re-reading the post ensures the UI reflects the
       * authoritative Firestore count.
       * ------------------------------------------------------
       */

      const updatedPost =
        await getCommunityPost(
          postId
        );


      if (
        updatedPost
      ) {

        setPost(
          updatedPost
        );

      } else {

        /*
         * Defensive fallback.
         */

        setPost(
          (
            currentPost
          ) => {

            if (
              !currentPost
            ) {

              return currentPost;

            }


            return {
              ...currentPost,

              replyCount:
                updatedReplies.length,
            };

          }
        );

      }


      /*
       * ------------------------------------------------------
       * RESET FORM
       * ------------------------------------------------------
       */

      setReplyBody(
        ""
      );


      setReplyAnonymously(
        false
      );


      setReplySuccess(
        "Your reply has been posted."
      );

    } catch (
      submitError
    ) {

      console.error(
        "Unable to post Community reply:",
        submitError
      );


      if (
        submitError instanceof Error &&
        submitError.message ===
          "AUTH_REQUIRED"
      ) {

        setReplyError(
          "Your session has expired. Please log in again before posting."
        );

      } else if (
        submitError instanceof Error &&
        submitError.message ===
          "PREMIUM_REQUIRED"
      ) {

        setReplyError(
          "Community participation is available with Premium."
        );

      } else if (
        submitError instanceof Error &&
        submitError.message ===
          "POST_NOT_FOUND"
      ) {

        setReplyError(
          "We couldn't find this Community conversation."
        );

      } else if (
        submitError instanceof Error &&
        submitError.message ===
          "POST_NOT_AVAILABLE"
      ) {

        setReplyError(
          "This conversation is not currently available for replies."
        );

      } else if (
        submitError instanceof Error &&
        submitError.message
      ) {

        setReplyError(
          submitError.message
        );

      } else {

        setReplyError(
          "We couldn't post your reply. Please try again."
        );

      }

    } finally {

      setSubmittingReply(
        false
      );

    }

  }


  /*
   * ==========================================================
   * GUEST VIEW
   * ==========================================================
   */

  if (
    !entitlementLoading &&
    plan ===
      "guest"
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
            Create a free account or log in to read
            Community conversations.
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
    entitlementLoading ||
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
   * DISPLAY AUTHOR
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
        width:
          "100%",

        maxWidth:
          "900px",

        boxSizing:
          "border-box",

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


            {
              post.isFeatured && (

                <span
                  style={{
                    padding:
                      "5px 9px",

                    borderRadius:
                      "999px",

                    background:
                      "#FFF7ED",

                    color:
                      "#C2410C",

                    fontSize:
                      "10px",

                    fontWeight:
                      800,

                    textTransform:
                      "uppercase",
                  }}
                >
                  Featured
                </span>

              )
            }

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
              "clamp(26px, 5vw, 32px)",

            lineHeight:
              1.25,

            fontWeight:
              850,

            overflowWrap:
              "anywhere",
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

            overflowWrap:
              "anywhere",
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
            {
              post.replyCount
            }
            {" "}
            {
              post.replyCount ===
              1
                ? "reply"
                : "replies"
            }
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

            flexWrap:
              "wrap",

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
            {
              replies.length
            }{" "}
            {
              replies.length ===
              1
                ? "reply"
                : "replies"
            }
          </span>

        </div>


        {
          replies.length ===
          0
            ? (

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
                {
                  isPremium
                    ? "No replies yet. Be the first to join the conversation."
                    : "No replies yet."
                }
              </div>

            )
            : (

              <div
                style={{
                  display:
                    "grid",

                  gap:
                    "12px",
                }}
              >

                {
                  replies.map(
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

                              overflowWrap:
                                "anywhere",
                            }}
                          >
                            {
                              reply.body
                            }
                          </p>

                        </article>

                      );

                    }
                  )
                }

              </div>

            )
        }

      </section>


      {/* ==================================================
          PREMIUM / PREMIUM+ REPLY FORM
      =================================================== */}

      {
        isPremium && (

          <section
            style={{
              marginTop:
                "28px",

              padding:
                "24px",

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
                marginBottom:
                  "16px",
              }}
            >

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
                Join the conversation
              </h3>


              <p
                style={{
                  margin:
                    "6px 0 0",

                  color:
                    "#64748B",

                  fontSize:
                    "13px",

                  lineHeight:
                    1.6,
                }}
              >
                Share a helpful thought, experience, or
                question with the Community.
              </p>

            </div>


            <label
              htmlFor="community-reply"

              style={{
                display:
                  "block",

                marginBottom:
                  "7px",

                color:
                  "#334155",

                fontSize:
                  "13px",

                fontWeight:
                  800,
              }}
            >
              Your reply
            </label>


            <textarea
              id="community-reply"

              value={
                replyBody
              }

              onChange={(
                event
              ) => {

                setReplyBody(
                  event.target.value
                );


                if (
                  replyError
                ) {

                  setReplyError(
                    ""
                  );

                }


                if (
                  replySuccess
                ) {

                  setReplySuccess(
                    ""
                  );

                }

              }}

              disabled={
                submittingReply
              }

              maxLength={
                3000
              }

              placeholder="Share a helpful thought, experience, or question..."

              rows={
                6
              }

              style={{
                width:
                  "100%",

                boxSizing:
                  "border-box",

                resize:
                  "vertical",

                minHeight:
                  "130px",

                padding:
                  "14px",

                borderRadius:
                  "12px",

                border:
                  "1px solid #CBD5E1",

                background:
                  submittingReply
                    ? "#F8FAFC"
                    : "#FFFFFF",

                color:
                  "#0F172A",

                fontSize:
                  "16px",

                lineHeight:
                  1.65,

                fontFamily:
                  "inherit",

                outline:
                  "none",
              }}
            />


            <div
              style={{
                marginTop:
                  "8px",

                display:
                  "flex",

                justifyContent:
                  "flex-end",

                color:
                  "#94A3B8",

                fontSize:
                  "11px",
              }}
            >
              {
                replyBody.length
              }
              /3000
            </div>


            <label
              style={{
                display:
                  "flex",

                alignItems:
                  "flex-start",

                gap:
                  "9px",

                marginTop:
                  "14px",

                color:
                  "#475569",

                fontSize:
                  "13px",

                lineHeight:
                  1.5,

                cursor:
                  submittingReply
                    ? "default"
                    : "pointer",
              }}
            >

              <input
                type="checkbox"

                checked={
                  replyAnonymously
                }

                onChange={(
                  event
                ) => {

                  setReplyAnonymously(
                    event.target.checked
                  );

                }}

                disabled={
                  submittingReply
                }

                style={{
                  marginTop:
                    "2px",
                }}
              />

              <span>
                Post anonymously
              </span>

            </label>


            {
              replyError && (

                <div
                  role="alert"

                  style={{
                    marginTop:
                      "14px",

                    padding:
                      "11px 12px",

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
                    replyError
                  }
                </div>

              )
            }


            {
              replySuccess && (

                <div
                  role="status"

                  style={{
                    marginTop:
                      "14px",

                    padding:
                      "11px 12px",

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
                    replySuccess
                  }
                </div>

              )
            }


            <div
              style={{
                marginTop:
                  "18px",

                display:
                  "flex",

                justifyContent:
                  "flex-end",
              }}
            >

              <button
                type="button"

                onClick={() => {

                  void handleSubmitReply();

                }}

                disabled={
                  submittingReply ||
                  !replyBody.trim()
                }

                style={{
                  minHeight:
                    "44px",

                  padding:
                    "11px 19px",

                  borderRadius:
                    "10px",

                  border:
                    "none",

                  background:
                    submittingReply ||
                    !replyBody.trim()
                      ? "#94A3B8"
                      : "#2563EB",

                  color:
                    "#FFFFFF",

                  fontSize:
                    "14px",

                  fontWeight:
                    800,

                  cursor:
                    submittingReply ||
                    !replyBody.trim()
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                {
                  submittingReply
                    ? "Posting..."
                    : "Post Reply"
                }
              </button>

            </div>

          </section>

        )
      }


      {/* ==================================================
          FREE MEMBER UPGRADE
      =================================================== */}

      {
        plan ===
        "free" && (

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
              conversations. Posting and replying are
              available with Premium.
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
                  "12px 18px",

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

        )
      }

    </main>

  );

}