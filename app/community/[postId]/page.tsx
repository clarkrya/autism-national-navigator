"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";

import { getCurrentUser } from "../../../lib/auth";
import { useAccountEntitlements } from "../../../lib/useAccountEntitlements";

import {
  getCommunityPost,
  getCommunityReplies,
  getCommunityProfile,
  getCommunityReactionSummary,
  type CommunityReactionSummary,
  type CommunityReactionTargetType,
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
 *   Read published conversations and replies.
 *   See Helpful reaction counts.
 *
 * Premium / Premium+:
 *   Read and participate.
 *   Add/remove Helpful reactions.
 *
 * Community profile:
 *   The saved isAnonymousByDefault preference controls the
 *   initial state of the reply anonymity checkbox.
 *
 * Published conversations are shared across Community.
 * Premium controls participation, not visibility.
 * ============================================================
 */


type CommunityPostPageProps = {
  params: {
    postId: string;
  };
};


type CreateReplyResponse = {
  success?: boolean;
  replyId?: string;
  error?: string;
};


type ReactionApiResponse = {
  success?: boolean;
  action?: "added" | "removed";
  reactionId?: string;
  targetType?: CommunityReactionTargetType;
  targetId?: string;
  type?: "helpful";
  error?: string;
};


type ReplyReactionSummaryMap = Record<
  string,
  CommunityReactionSummary
>;


type ReactionLoadingMap = Record<
  string,
  boolean
>;


const EMPTY_REACTION_SUMMARY: CommunityReactionSummary = {
  count: 0,
  currentUserReacted: false,
};


/*
 * ============================================================
 * HELPERS
 * ============================================================
 */


function formatDate(timestamp: number): string {
  if (!timestamp) {
    return "";
  }

  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(timestamp));
  } catch {
    return "";
  }
}


function getCategoryLabel(category: string): string {
  return category
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}


/*
 * ============================================================
 * PAGE
 * ============================================================
 */


export default function CommunityPostPage({
  params,
}: CommunityPostPageProps) {
  const postId = params.postId;

  /*
   * ==========================================================
   * ACCOUNT
   * ==========================================================
   */

  const {
    plan,
    loading: entitlementLoading,
    isPremium,
  } = useAccountEntitlements();


  /*
   * ==========================================================
   * CONVERSATION
   * ==========================================================
   */

  const [post, setPost] =
    useState<CommunityPost | null>(null);

  const [replies, setReplies] =
    useState<CommunityReply[]>([]);


  /*
   * ==========================================================
   * PAGE STATE
   * ==========================================================
   */

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");


  /*
   * ==========================================================
   * REACTION STATE
   * ==========================================================
   */

  const [postReaction, setPostReaction] =
    useState<CommunityReactionSummary>(
      EMPTY_REACTION_SUMMARY
    );

  const [replyReactions, setReplyReactions] =
    useState<ReplyReactionSummaryMap>({});

  const [reactionLoading, setReactionLoading] =
    useState<ReactionLoadingMap>({});

  const [reactionError, setReactionError] =
    useState("");


  /*
   * ==========================================================
   * REPLY FORM
   * ==========================================================
   */

  const [replyBody, setReplyBody] =
    useState("");

  /*
   * Privacy-safe fallback:
   * anonymous until the saved Community profile is loaded.
   */

  const [replyAnonymously, setReplyAnonymously] =
    useState(true);

  /*
   * Keep the saved default separately so after a successful
   * reply we reset to the user's profile preference.
   */

  const [
    replyAnonymousDefault,
    setReplyAnonymousDefault,
  ] = useState(true);

  const [submittingReply, setSubmittingReply] =
    useState(false);

  const [replyError, setReplyError] =
    useState("");

  const [replySuccess, setReplySuccess] =
    useState("");


  /*
   * ==========================================================
   * LOAD SAVED COMMUNITY PROFILE PREFERENCE
   * ==========================================================
   */

  useEffect(() => {
    if (
      entitlementLoading ||
      !isPremium
    ) {
      return;
    }

    let active = true;

    async function loadReplyPreference() {
      try {
        const currentUser =
          getCurrentUser();

        if (!currentUser) {
          return;
        }

        const profile =
          await getCommunityProfile(
            currentUser.uid
          );

        if (!active) {
          return;
        }

        const savedDefault =
          profile?.isAnonymousByDefault ??
          true;

        setReplyAnonymousDefault(
          savedDefault
        );

        setReplyAnonymously(
          savedDefault
        );
      } catch (profileError) {
        console.error(
          "Unable to load Community reply preference:",
          profileError
        );

        if (active) {
          setReplyAnonymousDefault(true);
          setReplyAnonymously(true);
        }
      }
    }

    void loadReplyPreference();

    return () => {
      active = false;
    };
  }, [
    entitlementLoading,
    isPremium,
  ]);


  /*
   * ==========================================================
   * LOAD REACTION SUMMARIES
   * ==========================================================
   */

  async function loadReactionSummaries(
    loadedReplies: CommunityReply[]
  ) {
    const currentUser =
      getCurrentUser();

    const currentUserId =
      currentUser?.uid || null;

    const [
      loadedPostReaction,
      ...loadedReplyReactions
    ] = await Promise.all([
      getCommunityReactionSummary(
        "post",
        postId,
        currentUserId
      ),

      ...loadedReplies.map(
        (reply) =>
          getCommunityReactionSummary(
            "reply",
            reply.id,
            currentUserId
          )
      ),
    ]);

    setPostReaction(
      loadedPostReaction
    );

    const nextReplyReactions:
      ReplyReactionSummaryMap = {};

    loadedReplies.forEach(
      (reply, index) => {
        nextReplyReactions[
          reply.id
        ] =
          loadedReplyReactions[index] ||
          EMPTY_REACTION_SUMMARY;
      }
    );

    setReplyReactions(
      nextReplyReactions
    );
  }


  /*
   * ==========================================================
   * LOAD CONVERSATION
   * ==========================================================
   */

  useEffect(() => {
    if (entitlementLoading) {
      return;
    }

    if (plan === "guest") {
      setLoading(false);
      return;
    }

    if (!postId) {
      setError(
        "We couldn't open that Community conversation."
      );

      setLoading(false);
      return;
    }

    let active = true;

    async function loadConversation() {
      setLoading(true);
      setError("");
      setReactionError("");

      try {
        const [
          loadedPost,
          loadedReplies,
        ] = await Promise.all([
          getCommunityPost(postId),
          getCommunityReplies(postId),
        ]);

        if (!loadedPost) {
          throw new Error(
            "POST_NOT_FOUND"
          );
        }

        if (!active) {
          return;
        }

        setPost(
          loadedPost
        );

        setReplies(
          loadedReplies
        );

        /*
         * Reaction data is read independently from the stale
         * reactionCount fields stored on posts/replies.
         */

        try {
          const currentUser =
            getCurrentUser();

          const currentUserId =
            currentUser?.uid || null;

          const [
            loadedPostReaction,
            ...loadedReplyReactions
          ] = await Promise.all([
            getCommunityReactionSummary(
              "post",
              postId,
              currentUserId
            ),

            ...loadedReplies.map(
              (reply) =>
                getCommunityReactionSummary(
                  "reply",
                  reply.id,
                  currentUserId
                )
            ),
          ]);

          if (!active) {
            return;
          }

          setPostReaction(
            loadedPostReaction
          );

          const nextReplyReactions:
            ReplyReactionSummaryMap = {};

          loadedReplies.forEach(
            (reply, index) => {
              nextReplyReactions[
                reply.id
              ] =
                loadedReplyReactions[index] ||
                EMPTY_REACTION_SUMMARY;
            }
          );

          setReplyReactions(
            nextReplyReactions
          );
        } catch (
          reactionLoadError
        ) {
          console.error(
            "Unable to load Community reactions:",
            reactionLoadError
          );

          setPostReaction(
            EMPTY_REACTION_SUMMARY
          );

          setReplyReactions({});
        }
      } catch (loadError) {
        console.error(
          "Unable to load Community conversation:",
          loadError
        );

        if (!active) {
          return;
        }

        setError(
          "We couldn't find that Community conversation."
        );

        setPost(null);
        setReplies([]);

        setPostReaction(
          EMPTY_REACTION_SUMMARY
        );

        setReplyReactions({});
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadConversation();

    return () => {
      active = false;
    };
  }, [
    postId,
    entitlementLoading,
    plan,
  ]);


  /*
   * ==========================================================
   * REFRESH REPLIES
   * ==========================================================
   */

  async function refreshReplies() {
    const loadedReplies =
      await getCommunityReplies(
        postId
      );

    setReplies(
      loadedReplies
    );

    try {
      await loadReactionSummaries(
        loadedReplies
      );
    } catch (
      refreshReactionError
    ) {
      console.error(
        "Unable to refresh Community reactions:",
        refreshReactionError
      );
    }
  }


  /*
   * ==========================================================
   * REACTION HELPERS
   * ==========================================================
   */

  function getReactionKey(
    targetType:
      CommunityReactionTargetType,
    targetId: string
  ): string {
    return `${targetType}:${targetId}`;
  }


  function updateLocalReactionSummary(
    targetType:
      CommunityReactionTargetType,
    targetId: string,
    summary:
      CommunityReactionSummary
  ) {
    if (targetType === "post") {
      setPostReaction(
        summary
      );

      return;
    }

    setReplyReactions(
      (current) => ({
        ...current,
        [targetId]: summary,
      })
    );
  }


  /*
   * ==========================================================
   * TOGGLE HELPFUL REACTION
   * ==========================================================
   */

  async function toggleHelpfulReaction(
    targetType:
      CommunityReactionTargetType,
    targetId: string,
    currentSummary:
      CommunityReactionSummary
  ) {
    setReactionError("");

    if (!isPremium) {
      setReactionError(
        "Helpful reactions are available with Premium."
      );

      return;
    }

    const currentUser =
      getCurrentUser();

    if (!currentUser) {
      setReactionError(
        "Please log in again before reacting."
      );

      return;
    }

    const reactionKey =
      getReactionKey(
        targetType,
        targetId
      );

    setReactionLoading(
      (current) => ({
        ...current,
        [reactionKey]: true,
      })
    );

    try {
      const idToken =
        await currentUser.getIdToken();

      const action =
        currentSummary.currentUserReacted
          ? "remove"
          : "add";

      const response =
        await fetch(
          "/api/community/reactions",
          {
            method: "POST",

            headers: {
              Authorization:
                `Bearer ${idToken}`,

              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              targetType,
              targetId,
              action,
            }),
          }
        );

      let result:
        ReactionApiResponse = {};

      try {
        result =
          await response.json() as
            ReactionApiResponse;
      } catch {
        result = {};
      }

      if (!response.ok) {
        throw new Error(
          result.error ||
          "We couldn't update your Helpful reaction right now."
        );
      }

      /*
       * Read the saved state back from Firestore instead of
       * relying on optimistic counters.
       */

      const refreshedSummary =
        await getCommunityReactionSummary(
          targetType,
          targetId,
          currentUser.uid
        );

      updateLocalReactionSummary(
        targetType,
        targetId,
        refreshedSummary
      );
    } catch (
      reactionSubmitError
    ) {
      console.error(
        "Unable to update Community reaction:",
        reactionSubmitError
      );

      setReactionError(
        reactionSubmitError instanceof Error
          ? reactionSubmitError.message
          : "We couldn't update your Helpful reaction right now."
      );
    } finally {
      setReactionLoading(
        (current) => ({
          ...current,
          [reactionKey]: false,
        })
      );
    }
  }


  /*
   * ==========================================================
   * SUBMIT REPLY
   * ==========================================================
   */

  async function submitReply(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setReplyError("");
    setReplySuccess("");

    if (!isPremium) {
      setReplyError(
        "Community participation is available with Premium."
      );

      return;
    }

    const cleanReply =
      replyBody.trim();

    if (
      cleanReply.length < 2
    ) {
      setReplyError(
        "Please enter a meaningful reply."
      );

      return;
    }

    if (
      cleanReply.length > 5000
    ) {
      setReplyError(
        "Replies must be 5,000 characters or fewer."
      );

      return;
    }

    const currentUser =
      getCurrentUser();

    if (!currentUser) {
      setReplyError(
        "Please log in again before posting your reply."
      );

      return;
    }

    setSubmittingReply(true);

    try {
      const idToken =
        await currentUser.getIdToken();

      const response =
        await fetch(
          "/api/community/replies",
          {
            method: "POST",

            headers: {
              Authorization:
                `Bearer ${idToken}`,

              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              postId,
              body: cleanReply,
              isAnonymous:
                replyAnonymously,
            }),
          }
        );

      let result:
        CreateReplyResponse = {};

      try {
        result =
          await response.json() as
            CreateReplyResponse;
      } catch {
        result = {};
      }

      if (!response.ok) {
        throw new Error(
          result.error ||
          "We couldn't add your reply right now."
        );
      }

      await refreshReplies();

      setReplyBody("");

      /*
       * IMPORTANT:
       *
       * Reset the checkbox to the SAVED Community profile
       * preference instead of hardcoding false.
       */

      setReplyAnonymously(
        replyAnonymousDefault
      );

      setReplySuccess(
        "Your reply is now part of the conversation."
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
          : "We couldn't add your reply right now. Please try again."
      );
    } finally {
      setSubmittingReply(false);
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
          maxWidth: "900px",
          margin: "0 auto",
          padding: "50px 24px 90px",
        }}
      >
        <Link
          href="/community"
          style={{
            color: "#2563EB",
            fontSize: "14px",
            fontWeight: 800,
            textDecoration: "none",
          }}
        >
          ← Back to Community
        </Link>

        <section
          style={{
            marginTop: "25px",
            padding: "40px",
            borderRadius: "20px",
            border:
              "1px solid #E2E8F0",
            background: "#FFFFFF",
            textAlign: "center",
            boxShadow:
              "0 8px 24px rgba(15, 23, 42, 0.04)",
          }}
        >
          <div
            style={{
              fontSize: "34px",
              marginBottom: "12px",
            }}
          >
            💬
          </div>

          <h1
            style={{
              margin: 0,
              color: "#0F172A",
              fontSize: "28px",
              fontWeight: 800,
            }}
          >
            Join the Community
          </h1>

          <p
            style={{
              maxWidth: "620px",
              margin:
                "12px auto 22px",
              color: "#64748B",
              fontSize: "15px",
              lineHeight: 1.65,
            }}
          >
            Create a free account or log in
            to read Community conversations.
          </p>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            <Link
              href={
                `/signup?returnTo=${encodeURIComponent(
                  `/community/${postId}`
                )}`
              }
              style={{
                padding: "12px 20px",
                borderRadius: "10px",
                background: "#2563EB",
                color: "#FFFFFF",
                fontSize: "14px",
                fontWeight: 800,
                textDecoration: "none",
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
                padding: "12px 20px",
                borderRadius: "10px",
                border:
                  "1px solid #CBD5E1",
                background: "#FFFFFF",
                color: "#334155",
                fontSize: "14px",
                fontWeight: 800,
                textDecoration: "none",
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
          maxWidth: "900px",
          margin: "0 auto",
          padding: "50px 24px 90px",
        }}
      >
        <Link
          href="/community"
          style={{
            color: "#2563EB",
            fontSize: "14px",
            fontWeight: 800,
            textDecoration: "none",
          }}
        >
          ← Back to Community
        </Link>

        <div
          style={{
            marginTop: "25px",
            padding: "40px",
            borderRadius: "20px",
            border:
              "1px solid #E2E8F0",
            background: "#FFFFFF",
            textAlign: "center",
            color: "#64748B",
            fontSize: "14px",
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
          maxWidth: "900px",
          margin: "0 auto",
          padding: "50px 24px 90px",
        }}
      >
        <Link
          href="/community"
          style={{
            color: "#2563EB",
            fontSize: "14px",
            fontWeight: 800,
            textDecoration: "none",
          }}
        >
          ← Back to Community
        </Link>

        <section
          style={{
            marginTop: "25px",
            padding: "35px",
            borderRadius: "18px",
            border:
              "1px solid #FECACA",
            background: "#FEF2F2",
            color: "#B91C1C",
            textAlign: "center",
            fontSize: "14px",
            lineHeight: 1.6,
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
   * DISPLAY VALUES
   * ==========================================================
   */

  const postAuthor =
    post.isAnonymous
      ? "Anonymous"
      : post.authorDisplayName ||
        "Community Member";

  const replyCount =
    replies.length;

  const postReactionKey =
    getReactionKey(
      "post",
      post.id
    );

  const postReactionBusy =
    reactionLoading[
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
        maxWidth: "900px",
        margin: "0 auto",
        padding: "45px 24px 90px",
      }}
    >
      <Link
        href="/community"
        style={{
          color: "#2563EB",
          fontSize: "14px",
          fontWeight: 800,
          textDecoration: "none",
        }}
      >
        ← Back to Community
      </Link>


      {/* ==================================================
          ORIGINAL POST
      =================================================== */}

      <article
        style={{
          marginTop: "22px",
          padding: "30px",
          borderRadius: "20px",
          border:
            "1px solid #E2E8F0",
          background: "#FFFFFF",
          boxShadow:
            "0 6px 20px rgba(15, 23, 42, 0.04)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
            marginBottom: "15px",
          }}
        >
          <span
            style={{
              padding: "5px 9px",
              borderRadius: "999px",
              background: "#EFF6FF",
              color: "#2563EB",
              fontSize: "10px",
              fontWeight: 800,
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

          <span
            style={{
              color: "#94A3B8",
              fontSize: "12px",
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
            margin: "0 0 14px",
            color: "#0F172A",
            fontSize: "32px",
            lineHeight: 1.25,
            fontWeight: 850,
          }}
        >
          {post.title}
        </h1>

        <p
          style={{
            margin: 0,
            color: "#475569",
            fontSize: "16px",
            lineHeight: 1.75,
            whiteSpace: "pre-wrap",
          }}
        >
          {post.body}
        </p>


        {/* ==================================================
            POST REACTION
        =================================================== */}

        <div
          style={{
            marginTop: "20px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          {
            isPremium
              ? (
                <button
                  type="button"
                  onClick={
                    () =>
                      void toggleHelpfulReaction(
                        "post",
                        post.id,
                        postReaction
                      )
                  }
                  disabled={
                    postReactionBusy
                  }
                  aria-pressed={
                    postReaction
                      .currentUserReacted
                  }
                  style={{
                    padding:
                      "8px 12px",
                    borderRadius:
                      "999px",
                    border:
                      postReaction
                        .currentUserReacted
                        ? "1px solid #93C5FD"
                        : "1px solid #CBD5E1",
                    background:
                      postReaction
                        .currentUserReacted
                        ? "#EFF6FF"
                        : "#FFFFFF",
                    color:
                      postReaction
                        .currentUserReacted
                        ? "#1D4ED8"
                        : "#475569",
                    fontSize: "12px",
                    fontWeight: 800,
                    cursor:
                      postReactionBusy
                        ? "wait"
                        : "pointer",
                    opacity:
                      postReactionBusy
                        ? 0.65
                        : 1,
                  }}
                >
                  {
                    postReactionBusy
                      ? "Updating..."
                      : `👍 Helpful${
                          postReaction.count >
                          0
                            ? ` ${postReaction.count}`
                            : ""
                        }`
                  }
                </button>
              )
              : (
                <span
                  style={{
                    padding: "7px 0",
                    color: "#64748B",
                    fontSize: "12px",
                    fontWeight: 700,
                  }}
                >
                  👍 Helpful{" "}
                  {postReaction.count}
                </span>
              )
          }
        </div>


        <div
          style={{
            marginTop: "18px",
            paddingTop: "17px",
            borderTop:
              "1px solid #F1F5F9",
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              color: "#64748B",
              fontSize: "13px",
            }}
          >
            Shared by{" "}
            <strong>
              {postAuthor}
            </strong>
          </span>

          <span
            style={{
              color: "#94A3B8",
              fontSize: "12px",
            }}
          >
            💬 {replyCount}{" "}
            {
              replyCount === 1
                ? "reply"
                : "replies"
            }
          </span>
        </div>
      </article>


      {/* ==================================================
          REACTION ERROR
      =================================================== */}

      {
        reactionError && (
          <div
            role="alert"
            style={{
              marginTop: "14px",
              padding: "11px 13px",
              borderRadius: "10px",
              border:
                "1px solid #FECACA",
              background: "#FEF2F2",
              color: "#B91C1C",
              fontSize: "12px",
              lineHeight: 1.5,
            }}
          >
            {reactionError}
          </div>
        )
      }


      {/* ==================================================
          CONVERSATION
      =================================================== */}

      <section
        style={{
          marginTop: "30px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent:
              "space-between",
            gap: "12px",
            marginBottom: "15px",
          }}
        >
          <h2
            style={{
              margin: 0,
              color: "#0F172A",
              fontSize: "22px",
              fontWeight: 800,
            }}
          >
            Conversation
          </h2>

          <span
            style={{
              color: "#64748B",
              fontSize: "13px",
            }}
          >
            {replyCount}{" "}
            {
              replyCount === 1
                ? "reply"
                : "replies"
            }
          </span>
        </div>


        {
          replies.length === 0
            ? (
              <div
                style={{
                  padding: "28px",
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
            )
            : (
              <div
                style={{
                  display: "grid",
                  gap: "12px",
                }}
              >
                {
                  replies.map(
                    (reply) => {
                      const replyAuthor =
                        reply.isAnonymous
                          ? "Anonymous"
                          : reply.authorDisplayName ||
                            "Community Member";

                      const replyReaction =
                        replyReactions[
                          reply.id
                        ] ||
                        EMPTY_REACTION_SUMMARY;

                      const replyReactionKey =
                        getReactionKey(
                          "reply",
                          reply.id
                        );

                      const replyReactionBusy =
                        reactionLoading[
                          replyReactionKey
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
                              margin: 0,
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


                          {/* ==============================
                              REPLY REACTION
                          =============================== */}

                          <div
                            style={{
                              marginTop:
                                "14px",
                              paddingTop:
                                "12px",
                              borderTop:
                                "1px solid #F1F5F9",
                              display:
                                "flex",
                              alignItems:
                                "center",
                              gap: "8px",
                            }}
                          >
                            {
                              isPremium
                                ? (
                                  <button
                                    type="button"
                                    onClick={
                                      () =>
                                        void toggleHelpfulReaction(
                                          "reply",
                                          reply.id,
                                          replyReaction
                                        )
                                    }
                                    disabled={
                                      replyReactionBusy
                                    }
                                    aria-pressed={
                                      replyReaction
                                        .currentUserReacted
                                    }
                                    style={{
                                      padding:
                                        "7px 11px",
                                      borderRadius:
                                        "999px",
                                      border:
                                        replyReaction
                                          .currentUserReacted
                                          ? "1px solid #93C5FD"
                                          : "1px solid #CBD5E1",
                                      background:
                                        replyReaction
                                          .currentUserReacted
                                          ? "#EFF6FF"
                                          : "#FFFFFF",
                                      color:
                                        replyReaction
                                          .currentUserReacted
                                          ? "#1D4ED8"
                                          : "#475569",
                                      fontSize:
                                        "11px",
                                      fontWeight:
                                        800,
                                      cursor:
                                        replyReactionBusy
                                          ? "wait"
                                          : "pointer",
                                      opacity:
                                        replyReactionBusy
                                          ? 0.65
                                          : 1,
                                    }}
                                  >
                                    {
                                      replyReactionBusy
                                        ? "Updating..."
                                        : `👍 Helpful${
                                            replyReaction.count >
                                            0
                                              ? ` ${replyReaction.count}`
                                              : ""
                                          }`
                                    }
                                  </button>
                                )
                                : (
                                  <span
                                    style={{
                                      color:
                                        "#64748B",
                                      fontSize:
                                        "11px",
                                      fontWeight:
                                        700,
                                    }}
                                  >
                                    👍 Helpful{" "}
                                    {
                                      replyReaction.count
                                    }
                                  </span>
                                )
                            }
                          </div>
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
          PREMIUM REPLY FORM
      =================================================== */}

      {
        isPremium && (
          <section
            style={{
              marginTop: "30px",
              padding: "26px",
              borderRadius: "18px",
              border:
                "1px solid #BFDBFE",
              background: "#FFFFFF",
              boxShadow:
                "0 6px 20px rgba(15, 23, 42, 0.04)",
            }}
          >
            <h2
              style={{
                margin: "0 0 7px",
                color: "#0F172A",
                fontSize: "21px",
                fontWeight: 800,
              }}
            >
              Reply to this conversation
            </h2>

            <p
              style={{
                margin:
                  "0 0 18px",
                color: "#64748B",
                fontSize: "13px",
                lineHeight: 1.6,
              }}
            >
              Share a helpful experience,
              question, or perspective with
              the Community.
            </p>


            {
              replySuccess && (
                <div
                  role="status"
                  style={{
                    marginBottom:
                      "16px",
                    padding:
                      "12px 14px",
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
                  {replySuccess}
                </div>
              )
            }


            {
              replyError && (
                <div
                  role="alert"
                  style={{
                    marginBottom:
                      "16px",
                    padding:
                      "12px 14px",
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
                  {replyError}
                </div>
              )
            }


            <form
              onSubmit={
                submitReply
              }
            >
              <label
                htmlFor="community-reply"
                style={{
                  display: "block",
                  marginBottom:
                    "7px",
                  color: "#334155",
                  fontSize: "13px",
                  fontWeight: 800,
                }}
              >
                Your reply
              </label>

              <textarea
                id="community-reply"
                value={
                  replyBody
                }
                onChange={
                  (event) => {
                    setReplyBody(
                      event.target.value
                    );

                    if (replyError) {
                      setReplyError("");
                    }

                    if (replySuccess) {
                      setReplySuccess("");
                    }
                  }
                }
                maxLength={5000}
                disabled={
                  submittingReply
                }
                placeholder="Write your reply..."
                style={{
                  width: "100%",
                  minHeight:
                    "145px",
                  boxSizing:
                    "border-box",
                  resize:
                    "vertical",
                  padding:
                    "13px 14px",
                  borderRadius:
                    "11px",
                  border:
                    "1px solid #CBD5E1",
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
                  marginTop: "7px",
                  color: "#94A3B8",
                  fontSize: "11px",
                  textAlign:
                    "right",
                }}
              >
                {replyBody.length}/5000
              </div>


              <label
                style={{
                  display: "flex",
                  alignItems:
                    "flex-start",
                  gap: "9px",
                  marginTop:
                    "13px",
                  color: "#475569",
                  fontSize: "13px",
                  lineHeight: 1.5,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={
                    replyAnonymously
                  }
                  onChange={
                    (event) =>
                      setReplyAnonymously(
                        event.target.checked
                      )
                  }
                  disabled={
                    submittingReply
                  }
                  style={{
                    marginTop: "3px",
                  }}
                />

                <span>
                  Post anonymously
                </span>
              </label>


              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "flex-end",
                  marginTop:
                    "18px",
                }}
              >
                <button
                  type="submit"
                  disabled={
                    submittingReply ||
                    replyBody
                      .trim()
                      .length < 2
                  }
                  style={{
                    padding:
                      "11px 19px",
                    border: "none",
                    borderRadius:
                      "10px",
                    background:
                      submittingReply ||
                      replyBody
                        .trim()
                        .length < 2
                        ? "#94A3B8"
                        : "#2563EB",
                    color: "#FFFFFF",
                    fontSize: "13px",
                    fontWeight: 800,
                    cursor:
                      submittingReply ||
                      replyBody
                        .trim()
                        .length < 2
                        ? "not-allowed"
                        : "pointer",
                  }}
                >
                  {
                    submittingReply
                      ? "Posting reply..."
                      : "Post Reply"
                  }
                </button>
              </div>
            </form>
          </section>
        )
      }


      {/* ==================================================
          FREE MEMBER MESSAGE
      =================================================== */}

      {
        plan === "free" && (
          <section
            style={{
              marginTop: "25px",
              padding: "22px",
              borderRadius: "16px",
              border:
                "1px solid #E2E8F0",
              background: "#F8FAFC",
              textAlign: "center",
            }}
          >
            <h3
              style={{
                margin: 0,
                color: "#0F172A",
                fontSize: "19px",
                fontWeight: 800,
              }}
            >
              Want to join the conversation?
            </h3>

            <p
              style={{
                maxWidth: "600px",
                margin:
                  "8px auto 16px",
                color: "#64748B",
                fontSize: "13px",
                lineHeight: 1.6,
              }}
            >
              Free members can read Community
              conversations and see Helpful
              reactions. Community participation
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
                color: "#FFFFFF",
                fontSize: "13px",
                fontWeight: 800,
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