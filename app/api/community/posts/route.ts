import {
  NextResponse,
} from "next/server";

import type {
  CommunityCategory,
} from "../../../../lib/communityTypes";

import {
  requirePremium,
} from "../../../../lib/serverSubscription";

import {
  adminDb,
} from "../../../../lib/firebaseAdmin";


/*
 * ============================================================
 * COMMUNITY POSTS API
 * ============================================================
 *
 * Creates Community posts for Premium and Premium+ members.
 *
 * SECURITY
 *
 * This route verifies:
 *
 * - Firebase authentication
 * - Premium / Premium+ entitlement
 * - Post title
 * - Post body
 * - Community category
 *
 * Community writes happen server-side only.
 *
 * The client must never create Community posts directly
 * in Firestore.
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
 * ALLOWED COMMUNITY CATEGORIES
 * ============================================================
 */

const COMMUNITY_CATEGORIES:
  CommunityCategory[] = [
    "general",
    "newly_diagnosed",
    "school",
    "therapy",
    "insurance",
    "financial_support",
    "parent_support",
    "teen_transition",
    "adult_transition",
    "siblings_family",
    "success_stories",
    "questions",
    "other",
  ];


/*
 * ============================================================
 * REQUEST TYPE
 * ============================================================
 */

type CreatePostRequest = {
  title?: unknown;

  body?: unknown;

  category?: unknown;

  isAnonymous?: unknown;
};


/*
 * ============================================================
 * LIMITS
 * ============================================================
 */

const MAX_TITLE_LENGTH =
  140;


const MAX_BODY_LENGTH =
  5000;


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
 * CATEGORY VALIDATION
 * ============================================================
 */

function isCommunityCategory(
  value: unknown
): value is CommunityCategory {

  return (
    typeof value ===
      "string" &&
    COMMUNITY_CATEGORIES.includes(
      value as CommunityCategory
    )
  );

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
      CreatePostRequest;


    try {

      requestBody =
        await request.json() as
          CreatePostRequest;

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
     * STEP 3 — VALIDATE TITLE
     * ========================================================
     */

    const title =
      getCleanString(
        requestBody.title
      );


    if (
      title.length <
      3
    ) {

      return NextResponse.json(
        {
          error:
            "Please enter a meaningful post title.",
        },
        {
          status:
            400,
        }
      );

    }


    if (
      title.length >
      MAX_TITLE_LENGTH
    ) {

      return NextResponse.json(
        {
          error:
            `Post titles must be ${MAX_TITLE_LENGTH} characters or fewer.`,
        },
        {
          status:
            400,
        }
      );

    }


    /*
     * ========================================================
     * STEP 4 — VALIDATE BODY
     * ========================================================
     */

    const postBody =
      getCleanString(
        requestBody.body
      );


    if (
      postBody.length <
      5
    ) {

      return NextResponse.json(
        {
          error:
            "Please enter a meaningful post message.",
        },
        {
          status:
            400,
        }
      );

    }


    if (
      postBody.length >
      MAX_BODY_LENGTH
    ) {

      return NextResponse.json(
        {
          error:
            `Posts must be ${MAX_BODY_LENGTH.toLocaleString()} characters or fewer.`,
        },
        {
          status:
            400,
        }
      );

    }


    /*
     * ========================================================
     * STEP 5 — VALIDATE CATEGORY
     * ========================================================
     */

    if (
      !isCommunityCategory(
        requestBody.category
      )
    ) {

      return NextResponse.json(
        {
          error:
            "Please select a valid Community category.",
        },
        {
          status:
            400,
        }
      );

    }


    const category =
      requestBody.category;


    /*
     * ========================================================
     * STEP 6 — ANONYMOUS OPTION
     * ========================================================
     */

    const isAnonymous =
      requestBody.isAnonymous ===
      true;


    /*
     * ========================================================
     * STEP 7 — LOAD COMMUNITY PROFILE
     * ========================================================
     *
     * Use the member's chosen Community display name when
     * available.
     *
     * Anonymous posts never expose that name in Community
     * content.
     *
     * A profile lookup problem should not block a valid
     * Premium member from creating a post.
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

      console.error(
        "Unable to load Community profile for post:",
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
     * STEP 9 — FIRESTORE COLLECTION
     * ========================================================
     */

    const postsCollection =
      adminDb.collection(
        "communityPosts"
      );


    /*
     * ========================================================
     * STEP 10 — FIRESTORE WRITE
     * ========================================================
     *
     * New posts enter pending_review.
     *
     * This gives us a safer moderation model while the
     * reporting/moderation system is completed.
     *
     * The client does not control:
     *
     * - status
     * - moderationStatus
     * - counts
     * - featured status
     * - Navigator support status
     * ========================================================
     */

    const postReference =
      await postsCollection.add({

        authorId:
          account.uid,

        authorDisplayName:
          isAnonymous
            ? "Anonymous"
            : authorDisplayName,

        title:
          title,

        body:
          postBody,

        category:
          category,

        isAnonymous:
          isAnonymous,

        status:
          "pending_review",

        moderationStatus:
          "not_reviewed",

        replyCount:
          0,

        reactionCount:
          0,

        reportCount:
          0,

        isFeatured:
          false,

        /*
         * All normal Community conversations are readable by
         * Free members.
         *
         * Premium controls participation, not reading.
         */
        isPremiumOnly:
          false,

        isNavigatorSupported:
          false,

        createdAt:
          now,

        updatedAt:
          now,

      });


    /*
     * ========================================================
     * SUCCESS
     * ========================================================
     */

    return NextResponse.json(
      {
        success:
          true,

        postId:
          postReference.id,

        status:
          "pending_review",

        plan:
          account.plan,

        message:
          "Your post has been submitted for review.",
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
     * UNEXPECTED ERROR
     * ========================================================
     */

    console.error(
      "Community post creation error:",
      error
    );


    return NextResponse.json(
      {
        error:
          "We couldn't create your post right now. Please try again.",
      },
      {
        status:
          500,
        }
      );

  }

}