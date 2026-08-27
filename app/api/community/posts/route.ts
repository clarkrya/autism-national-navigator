import { NextResponse } from "next/server";

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
 * Premium-only Community post creation.
 *
 * NOTE:
 *
 * Premium Community participation is currently being held
 * for a later development phase while the Free experience
 * is prepared for user testing.
 *
 * This route remains available for future Premium work and
 * is kept build-safe for Vercel deployment.
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

  isPremiumOnly?: unknown;
};


/*
 * ============================================================
 * STRING VALIDATION
 * ============================================================
 */

function getCleanString(
  value: unknown,
  maxLength: number
): string {

  if (
    typeof value !==
    "string"
  ) {

    return "";

  }


  return value
    .trim()
    .slice(
      0,
      maxLength
    );

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

    let body:
      CreatePostRequest;


    try {

      body =
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
        body.title,
        140
      );


    if (
      title.length < 3
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


    /*
     * ========================================================
     * STEP 4 — VALIDATE BODY
     * ========================================================
     */

    const postBody =
      getCleanString(
        body.body,
        5000
      );


    if (
      postBody.length < 5
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


    /*
     * ========================================================
     * STEP 5 — VALIDATE CATEGORY
     * ========================================================
     */

    if (
      !isCommunityCategory(
        body.category
      )
    ) {

      return NextResponse.json(
        {
          error:
            "Please select a valid community category.",
        },
        {
          status:
            400,
        }
      );

    }


    /*
     * ========================================================
     * STEP 6 — ANONYMOUS OPTION
     * ========================================================
     */

    const isAnonymous =
      body.isAnonymous === true;


    /*
     * ========================================================
     * STEP 7 — PREMIUM-ONLY OPTION
     * ========================================================
     */

    const isPremiumOnly =
      body.isPremiumOnly === true;


    /*
     * ========================================================
     * STEP 8 — SERVER-CONTROLLED VALUES
     * ========================================================
     */

    const now =
      Date.now();


    /*
     * ========================================================
     * STEP 9 — FIRESTORE WRITE
     * ========================================================
     *
     * The existing Community repository defines the intended
     * posts collection as:
     *
     *   community / posts
     *
     * The Admin SDK does not support chaining .collection()
     * from a CollectionReference.
     *
     * Use the collection path directly instead.
     *
     * This preserves the existing logical collection name
     * used throughout the Community code.
     */

    const postsCollection =
      adminDb.collection(
        "community/posts"
      );


    const postReference =
      await postsCollection.add({

        authorId:
          account.uid,

        authorDisplayName:
          isAnonymous
            ? "Anonymous"
            : "Community Member",

        title,

        body:
          postBody,

        category:
          body.category,

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

        isPremiumOnly,

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
            "You must be logged in to participate in the community.",
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