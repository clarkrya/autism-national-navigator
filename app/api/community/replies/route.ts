import {
    NextResponse,
  } from "next/server";
  
  import {
    requirePremium,
  } from "../../../../lib/serverSubscription";
  
  import {
    adminDb,
  } from "../../../../lib/firebaseAdmin";
  
  
  /*
   * ============================================================
   * COMMUNITY REPLIES API
   * ============================================================
   *
   * Creates replies for Premium and Premium+ members.
   *
   * SECURITY
   *
   * This route verifies:
   *
   * - Firebase authentication
   * - Premium / Premium+ entitlement
   * - Parent post exists
   * - Parent post is published
   * - Reply content is valid
   *
   * Community writes happen server-side only.
   *
   * The client must never write Community replies directly
   * to Firestore.
   *
   *
   * FIRESTORE STRUCTURE
   *
   * communityPosts/
   *   {postId}
   *
   * communityReplies/
   *   {replyId}
   *
   * users/
   *   {userId}/
   *     communityProfile/
   *       current
   *
   * ============================================================
   */
  
  
  /*
   * ============================================================
   * REQUEST TYPE
   * ============================================================
   */
  
  type CreateReplyRequest = {
    postId?: unknown;
  
    body?: unknown;
  
    isAnonymous?: unknown;
  };
  
  
  /*
   * ============================================================
   * MAXIMUM REPLY LENGTH
   * ============================================================
   */
  
  const MAX_REPLY_LENGTH =
    3000;
  
  
  /*
   * ============================================================
   * CLEAN STRING
   * ============================================================
   */
  
  function getCleanString(
    value: unknown
  ): string {
  
    if (
      typeof value !==
      "string"
    ) {
  
      return "";
  
    }
  
  
    return value.trim();
  
  }
  
  
  /*
   * ============================================================
   * POST
   * ============================================================
   */
  
  export async function POST(
    request: Request
  ) {
  
    try {
  
      /*
       * ========================================================
       * STEP 1 — REQUIRE PREMIUM
       * ========================================================
       *
       * requirePremium() should verify:
       *
       * - Authorization Bearer token
       * - Firebase authentication
       * - Subscription entitlement
       *
       * Both Premium and Premium+ should be accepted.
       * ========================================================
       */
  
      const account =
        await requirePremium(
          request
        );
  
  
      /*
       * ========================================================
       * STEP 2 — READ REQUEST BODY
       * ========================================================
       */
  
      let requestBody:
        CreateReplyRequest;
  
  
      try {
  
        requestBody =
          await request.json() as
            CreateReplyRequest;
  
      } catch {
  
        return NextResponse.json(
          {
            error:
              "Invalid request body.",
          },
          {
            status:
              400,
          }
        );
  
      }
  
  
      /*
       * ========================================================
       * STEP 3 — VALIDATE POST ID
       * ========================================================
       */
  
      const postId =
        getCleanString(
          requestBody.postId
        );
  
  
      if (
        !postId
      ) {
  
        return NextResponse.json(
          {
            error:
              "A Community post is required.",
          },
          {
            status:
              400,
          }
        );
  
      }
  
  
      /*
       * ========================================================
       * STEP 4 — VALIDATE REPLY BODY
       * ========================================================
       */
  
      const replyBody =
        getCleanString(
          requestBody.body
        );
  
  
      if (
        replyBody.length <
        2
      ) {
  
        return NextResponse.json(
          {
            error:
              "Please enter a meaningful reply.",
          },
          {
            status:
              400,
          }
        );
  
      }
  
  
      if (
        replyBody.length >
        MAX_REPLY_LENGTH
      ) {
  
        return NextResponse.json(
          {
            error:
              `Replies must be ${MAX_REPLY_LENGTH.toLocaleString()} characters or fewer.`,
          },
          {
            status:
              400,
          }
        );
  
      }
  
  
      /*
       * ========================================================
       * STEP 5 — ANONYMOUS OPTION
       * ========================================================
       */
  
      const isAnonymous =
        requestBody.isAnonymous ===
        true;
  
  
      /*
       * ========================================================
       * STEP 6 — COLLECTION REFERENCES
       * ========================================================
       *
       * IMPORTANT:
       *
       * We are using root-level collections:
       *
       *   communityPosts
       *   communityReplies
       *
       * rather than:
       *
       *   community/posts
       *   community/replies
       *
       * because Firestore paths must alternate:
       *
       *   collection / document / collection / document
       *
       * ========================================================
       */
  
      const postReference =
        adminDb
          .collection(
            "communityPosts"
          )
          .doc(
            postId
          );
  
  
      const repliesCollection =
        adminDb.collection(
          "communityReplies"
        );
  
  
      /*
       * ========================================================
       * STEP 7 — LOAD COMMUNITY PROFILE
       * ========================================================
       *
       * If the member has created a Community profile, use
       * their chosen Community display name.
       *
       * Otherwise fall back to "Community Member".
       *
       * Anonymous replies never expose the display name in
       * Community content.
       * ========================================================
       */
  
      let authorDisplayName =
        "Community Member";
  
  
      try {
  
        const profileReference =
          adminDb
            .collection(
              "users"
            )
            .doc(
              account.uid
            )
            .collection(
              "communityProfile"
            )
            .doc(
              "current"
            );
  
  
        const profileSnapshot =
          await profileReference.get();
  
  
        if (
          profileSnapshot.exists
        ) {
  
          const profileData =
            profileSnapshot.data();
  
  
          const profileDisplayName =
            typeof profileData?.displayName ===
              "string"
              ? profileData.displayName.trim()
              : "";
  
  
          if (
            profileDisplayName
          ) {
  
            authorDisplayName =
              profileDisplayName.slice(
                0,
                80
              );
  
          }
  
        }
  
      } catch (
        profileError
      ) {
  
        /*
         * A profile lookup failure should not prevent a valid
         * Premium member from replying.
         */
  
        console.error(
          "Unable to load Community profile for reply:",
          profileError
        );
  
      }
  
  
      /*
       * ========================================================
       * STEP 8 — SERVER-CONTROLLED VALUES
       * ========================================================
       */
  
      const now =
        Date.now();
  
  
      /*
       * ========================================================
       * STEP 9 — PREPARE REPLY REFERENCE
       * ========================================================
       */
  
      const replyReference =
        repliesCollection.doc();
  
  
      /*
       * ========================================================
       * STEP 10 — ATOMIC FIRESTORE TRANSACTION
       * ========================================================
       *
       * The transaction:
       *
       * 1. Verifies the parent post exists.
       * 2. Verifies the post is published.
       * 3. Creates the reply.
       * 4. Increments the post reply count.
       *
       * This prevents the reply and replyCount from getting
       * out of sync during a normal successful write.
       * ========================================================
       */
  
      await adminDb.runTransaction(
        async (
          transaction
        ) => {
  
          /*
           * ----------------------------------------------------
           * LOAD PARENT POST
           * ----------------------------------------------------
           */
  
          const postSnapshot =
            await transaction.get(
              postReference
            );
  
  
          if (
            !postSnapshot.exists
          ) {
  
            throw new Error(
              "POST_NOT_FOUND"
            );
  
          }
  
  
          const postData =
            postSnapshot.data();
  
  
          /*
           * ----------------------------------------------------
           * ONLY PUBLISHED POSTS CAN RECEIVE REPLIES
           * ----------------------------------------------------
           */
  
          if (
            postData?.status !==
            "published"
          ) {
  
            throw new Error(
              "POST_NOT_AVAILABLE"
            );
  
          }
  
  
          /*
           * ----------------------------------------------------
           * CURRENT REPLY COUNT
           * ----------------------------------------------------
           */
  
          const currentReplyCount =
            typeof postData.replyCount ===
              "number" &&
            Number.isFinite(
              postData.replyCount
            )
              ? postData.replyCount
              : 0;
  
  
          /*
           * ----------------------------------------------------
           * CREATE REPLY
           * ----------------------------------------------------
           *
           * Replies are initially published.
           *
           * Moderation/reporting infrastructure can later move
           * a reply to:
           *
           *   hidden
           *   removed
           *   pending_review
           *
           * if necessary.
           * ----------------------------------------------------
           */
  
          transaction.set(
            replyReference,
            {
  
              postId:
                postId,
  
              authorId:
                account.uid,
  
              authorDisplayName:
                isAnonymous
                  ? "Anonymous"
                  : authorDisplayName,
  
              body:
                replyBody,
  
              isAnonymous:
                isAnonymous,
  
              status:
                "published",
  
              moderationStatus:
                "not_reviewed",
  
              reactionCount:
                0,
  
              reportCount:
                0,
  
              createdAt:
                now,
  
              updatedAt:
                now,
  
            }
          );
  
  
          /*
           * ----------------------------------------------------
           * UPDATE POST REPLY COUNT
           * ----------------------------------------------------
           */
  
          transaction.update(
            postReference,
            {
  
              replyCount:
                currentReplyCount +
                1,
  
              updatedAt:
                now,
  
            }
          );
  
        }
      );
  
  
      /*
       * ========================================================
       * SUCCESS
       * ========================================================
       */
  
      return NextResponse.json(
        {
          success:
            true,
  
          replyId:
            replyReference.id,
  
          postId:
            postId,
  
          status:
            "published",
  
          plan:
            account.plan,
        },
        {
          status:
            201,
        }
      );
  
    } catch (
      error
    ) {
  
      /*
       * ========================================================
       * AUTHENTICATION REQUIRED
       * ========================================================
       */
  
      if (
        error instanceof Error &&
        error.message ===
          "AUTH_REQUIRED"
      ) {
  
        return NextResponse.json(
          {
            error:
              "You must be logged in to participate in the Community.",
          },
          {
            status:
              401,
          }
        );
  
      }
  
  
      /*
       * ========================================================
       * INVALID AUTHENTICATION
       * ========================================================
       */
  
      if (
        error instanceof Error &&
        error.message ===
          "AUTH_INVALID"
      ) {
  
        return NextResponse.json(
          {
            error:
              "Your login session is no longer valid. Please log in again.",
          },
          {
            status:
              401,
          }
        );
  
      }
  
  
      /*
       * ========================================================
       * PREMIUM REQUIRED
       * ========================================================
       */
  
      if (
        error instanceof Error &&
        error.message ===
          "PREMIUM_REQUIRED"
      ) {
  
        return NextResponse.json(
          {
            error:
              "Community participation is available with Premium.",
          },
          {
            status:
              403,
          }
        );
  
      }
  
  
      /*
       * ========================================================
       * POST NOT FOUND
       * ========================================================
       */
  
      if (
        error instanceof Error &&
        error.message ===
          "POST_NOT_FOUND"
      ) {
  
        return NextResponse.json(
          {
            error:
              "We couldn't find that Community conversation.",
          },
          {
            status:
              404,
          }
        );
  
      }
  
  
      /*
       * ========================================================
       * POST NOT AVAILABLE
       * ========================================================
       */
  
      if (
        error instanceof Error &&
        error.message ===
          "POST_NOT_AVAILABLE"
      ) {
  
        return NextResponse.json(
          {
            error:
              "This Community conversation is not currently available for replies.",
          },
          {
            status:
              409,
          }
        );
  
      }
  
  
      /*
       * ========================================================
       * UNEXPECTED ERROR
       * ========================================================
       */
  
      console.error(
        "Community reply creation error:",
        error
      );
  
  
      return NextResponse.json(
        {
          error:
            "We couldn't post your reply right now. Please try again.",
        },
        {
          status:
            500,
        }
      );
  
    }
  
  }