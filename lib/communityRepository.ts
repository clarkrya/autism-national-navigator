import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  where,
  getDoc,
} from "firebase/firestore";

import {
  db,
} from "./firebase";

import type {
  CommunityPost,
  CommunityReply,
  CommunityProfile,
  CommunityFeedFilters,
} from "./communityTypes";


/*
 * ============================================================
 * COMMUNITY REPOSITORY
 * ============================================================
 *
 * Client-side Community data access.
 *
 * Firestore:
 *
 * communityPosts/
 *   {postId}
 *
 * communityReplies/
 *   {replyId}
 *
 * users/
 *   {userId}/
 *     communityProfile/current
 *
 * IMPORTANT
 *
 * This repository is intentionally READ-FOCUSED.
 *
 * Community writes are handled through protected server-side
 * API routes.
 *
 * The server verifies:
 *
 * - Firebase authentication
 * - Subscription status
 * - Premium/Premium+ entitlement
 *
 * This prevents users from bypassing the UI and writing
 * directly to Firestore.
 *
 *
 * PRODUCT ACCESS
 *
 * Guest:
 *   No Community access
 *
 * Free:
 *   Read published Community content
 *
 * Premium:
 *   Read + participate
 *
 * Premium+:
 *   Read + participate
 *
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
    "communityPosts"
  );

}


function getRepliesCollection() {

  return collection(
    db,
    "communityReplies"
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


  if (
    !snapshot.exists()
  ) {

    return null;

  }


  const data =
    snapshot.data();


  return {
    userId:
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
        : Date.now(),

    updatedAt:
      typeof data.updatedAt ===
      "number"
        ? data.updatedAt
        : Date.now(),
  };

}


/*
 * ============================================================
 * GET COMMUNITY POSTS
 * ============================================================
 *
 * Returns published Community posts.
 *
 * IMPORTANT
 *
 * Free users should normally query with:
 *
 *   premiumOnly === false
 *
 * Premium users can query without that restriction.
 *
 * Firestore Security Rules remain the actual security boundary.
 * ============================================================
 */

export async function getCommunityPosts(
  filters?: CommunityFeedFilters
): Promise<CommunityPost[]> {

  const constraints = [];


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

  if (
    filters?.category
  ) {

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
   * PREMIUM FILTER
   * ----------------------------------------------------------
   */

  if (
    filters?.premiumOnly !== undefined
  ) {

    constraints.push(
      where(
        "isPremiumOnly",
        "==",
        filters.premiumOnly
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

    }
  );

}


/*
 * ============================================================
 * GET COMMUNITY POST BY ID
 * ============================================================
 *
 * Returns a single Community post by Firestore document ID.
 *
 * Only published posts are returned.
 * ============================================================
 */

export async function getCommunityPost(
  postId: string
): Promise<CommunityPost | null> {

  if (
    !postId
  ) {

    throw new Error(
      "A post ID is required."
    );

  }


  const postRef =
    doc(
      db,
      "communityPosts",
      postId
    );


  const snapshot =
    await getDoc(
      postRef
    );


  if (
    !snapshot.exists()
  ) {

    return null;

  }


  const data =
    snapshot.data();


  if (
    data.status !==
    "published"
  ) {

    return null;

  }


  return {
    id:
      snapshot.id,

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

}


/*
 * ============================================================
 * GET COMMUNITY REPLIES
 * ============================================================
 *
 * Only published replies are returned.
 *
 * The Firestore rules determine whether the authenticated
 * reader is allowed to access the content.
 * ============================================================
 */

export async function getCommunityReplies(
  postId: string
): Promise<CommunityReply[]> {

  if (
    !postId
  ) {

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
          data.isAnonymous ===
          true,

        status:
          data.status,

        moderationStatus:
          data.moderationStatus,

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