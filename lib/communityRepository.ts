import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  where,
  type QueryConstraint,
} from "firebase/firestore";

import {
  db,
} from "./firebase";

import type {
  CommunityCategory,
  CommunityContentStatus,
  CommunityFeedFilters,
  CommunityModerationStatus,
  CommunityPost,
  CommunityProfile,
  CommunityReply,
} from "./communityTypes";


/*
 * ============================================================
 * COMMUNITY REPOSITORY
 * ============================================================
 *
 * Client-side Community READ access.
 *
 * Firestore:
 *
 * community/
 *   posts/{postId}
 *   replies/{replyId}
 *
 * users/
 *   {userId}/
 *     communityProfile/current
 *
 * IMPORTANT:
 *
 * Community writes are intentionally NOT handled here.
 *
 * Posts, replies, reactions, reports, and moderation actions
 * should go through protected server-side API routes.
 *
 * PRODUCT ACCESS
 *
 * Guest:
 *   - No Community access
 *
 * Free:
 *   - Read published Community content
 *
 * Premium:
 *   - Read + participate
 *
 * Premium+:
 *   - Read + participate
 *
 * Community is one shared space.
 *
 * Premium controls participation rather than visibility of
 * ordinary published Community conversations.
 * ============================================================
 */


/*
 * ============================================================
 * COLLECTION REFERENCES
 * ============================================================
 */

function getPostsCollection() {
  return collection(
    db,
    "community",
    "posts"
  );
}


function getRepliesCollection() {
  return collection(
    db,
    "community",
    "replies"
  );
}


/*
 * ============================================================
 * COMMUNITY PROFILE REFERENCE
 * ============================================================
 */

function getCommunityProfileRef(
  userId: string
) {
  if (!userId) {
    throw new Error(
      "A user ID is required."
    );
  }


  return doc(
    db,
    "users",
    userId,
    "communityProfile",
    "current"
  );
}


/*
 * ============================================================
 * DATA NORMALIZATION
 * ============================================================
 */

function isCommunityCategory(
  value: unknown
): value is CommunityCategory {
  return (
    value === "general" ||
    value === "newly_diagnosed" ||
    value === "school" ||
    value === "therapy" ||
    value === "insurance" ||
    value === "financial_support" ||
    value === "parent_support" ||
    value === "teen_transition" ||
    value === "adult_transition" ||
    value === "siblings_family" ||
    value === "success_stories" ||
    value === "questions" ||
    value === "other"
  );
}


function normalizeCommunityCategory(
  value: unknown
): CommunityCategory {
  return isCommunityCategory(
    value
  )
    ? value
    : "general";
}


function normalizeContentStatus(
  value: unknown
): CommunityContentStatus {
  if (
    value === "published" ||
    value === "hidden" ||
    value === "removed" ||
    value === "pending_review"
  ) {
    return value;
  }


  return "hidden";
}


function normalizeModerationStatus(
  value: unknown
): CommunityModerationStatus {
  if (
    value === "not_reviewed" ||
    value === "reviewed" ||
    value === "flagged" ||
    value === "removed"
  ) {
    return value;
  }


  return "not_reviewed";
}


/*
 * ============================================================
 * GET COMMUNITY PROFILE
 * ============================================================
 */

export async function getCommunityProfile(
  userId: string
): Promise<CommunityProfile | null> {
  const profileRef =
    getCommunityProfileRef(
      userId
    );


  const snapshot =
    await getDoc(
      profileRef
    );


  if (!snapshot.exists()) {
    return null;
  }


  const data =
    snapshot.data();


  return {
    userId,

    displayName:
      typeof data.displayName ===
      "string"
        ? data.displayName
        : "Community Member",

    isAnonymousByDefault:
      typeof data.isAnonymousByDefault ===
      "boolean"
        ? data.isAnonymousByDefault
        : true,

    bio:
      typeof data.bio ===
      "string"
        ? data.bio
        : undefined,

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
}


/*
 * ============================================================
 * GET COMMUNITY POSTS
 * ============================================================
 *
 * Returns only published Community posts.
 *
 * There is no Premium-only content filter.
 *
 * Free, Premium, and Premium+ readers all read from the same
 * published Community feed.
 * ============================================================
 */

export async function getCommunityPosts(
  filters?: CommunityFeedFilters
): Promise<CommunityPost[]> {
  const constraints:
    QueryConstraint[] = [];


  /*
   * ----------------------------------------------------------
   * ONLY PUBLISHED CONTENT
   * ----------------------------------------------------------
   */

  constraints.push(
    where(
      "status",
      "==",
      "published"
    )
  );


  /*
   * ----------------------------------------------------------
   * CATEGORY
   * ----------------------------------------------------------
   */

  if (filters?.category) {
    constraints.push(
      where(
        "category",
        "==",
        filters.category
      )
    );
  }


  /*
   * ----------------------------------------------------------
   * ORDER
   * ----------------------------------------------------------
   */

  constraints.push(
    orderBy(
      "createdAt",
      "desc"
    )
  );


  /*
   * ----------------------------------------------------------
   * RESULT LIMIT
   * ----------------------------------------------------------
   */

  const maximumResults =
    filters?.limit &&
    filters.limit > 0
      ? Math.min(
          filters.limit,
          100
        )
      : 30;


  constraints.push(
    limit(
      maximumResults
    )
  );


  /*
   * ----------------------------------------------------------
   * QUERY
   * ----------------------------------------------------------
   */

  const postsQuery =
    query(
      getPostsCollection(),
      ...constraints
    );


  const snapshot =
    await getDocs(
      postsQuery
    );


  /*
   * ----------------------------------------------------------
   * MAP RESULTS
   * ----------------------------------------------------------
   */

  return snapshot.docs.map(
    (
      postDocument
    ) => {
      const data =
        postDocument.data();


      return {
        id:
          postDocument.id,

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
          normalizeCommunityCategory(
            data.category
          ),

        isAnonymous:
          data.isAnonymous === true,

        status:
          normalizeContentStatus(
            data.status
          ),

        moderationStatus:
          normalizeModerationStatus(
            data.moderationStatus
          ),

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
          data.isFeatured === true,

        isNavigatorSupported:
          data.isNavigatorSupported === true,

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
    }
  );
}


/*
 * ============================================================
 * GET COMMUNITY REPLIES
 * ============================================================
 *
 * Returns published replies for one Community post.
 * ============================================================
 */

export async function getCommunityReplies(
  postId: string
): Promise<CommunityReply[]> {
  if (!postId) {
    throw new Error(
      "A post ID is required."
    );
  }


  const repliesQuery =
    query(
      getRepliesCollection(),

      where(
        "postId",
        "==",
        postId
      ),

      where(
        "status",
        "==",
        "published"
      ),

      orderBy(
        "createdAt",
        "asc"
      )
    );


  const snapshot =
    await getDocs(
      repliesQuery
    );


  return snapshot.docs.map(
    (
      replyDocument
    ) => {
      const data =
        replyDocument.data();


      return {
        id:
          replyDocument.id,

        postId:
          typeof data.postId ===
          "string"
            ? data.postId
            : postId,

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

        body:
          typeof data.body ===
          "string"
            ? data.body
            : "",

        isAnonymous:
          data.isAnonymous === true,

        status:
          normalizeContentStatus(
            data.status
          ),

        moderationStatus:
          normalizeModerationStatus(
            data.moderationStatus
          ),

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
    }
  );
}