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
 * communityPosts/{postId}
 *
 * communityReplies/{replyId}
 *
 * communityReactions/{reactionId}
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
 *   - Read reaction counts
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
 *
 * FIREBASE ARCHITECTURE
 *
 * Reads:
 *   Firebase client Firestore SDK + Firestore Security Rules.
 *
 * Writes:
 *   Protected Next.js API routes using Firebase ID token
 *   authentication and Firestore REST.
 *
 * Firebase Admin is NOT used by Community request-time APIs.
 * ============================================================
 */


/*
 * ============================================================
 * REACTION TYPES
 * ============================================================
 */

export type CommunityReactionTargetType =
  | "post"
  | "reply";


export type CommunityReactionType =
  "helpful";


export interface CommunityReaction {

  id: string;

  userId: string;

  targetType:
    CommunityReactionTargetType;

  targetId: string;

  type:
    CommunityReactionType;

  createdAt: number;

  updatedAt: number;

}


export interface CommunityReactionSummary {

  count: number;

  currentUserReacted:
    boolean;

}


/*
 * ============================================================
 * COLLECTION NAMES
 * ============================================================
 */

const COMMUNITY_POSTS_COLLECTION =
  "communityPosts";


const COMMUNITY_REPLIES_COLLECTION =
  "communityReplies";


const COMMUNITY_REACTIONS_COLLECTION =
  "communityReactions";


/*
 * ============================================================
 * COLLECTION REFERENCES
 * ============================================================
 */

function getPostsCollection() {

  return collection(
    db,
    COMMUNITY_POSTS_COLLECTION
  );

}


function getRepliesCollection() {

  return collection(
    db,
    COMMUNITY_REPLIES_COLLECTION
  );

}


function getReactionsCollection() {

  return collection(
    db,
    COMMUNITY_REACTIONS_COLLECTION
  );

}


/*
 * ============================================================
 * POST REFERENCE
 * ============================================================
 */

function getPostRef(
  postId: string
) {

  if (
    !postId
  ) {

    throw new Error(
      "A post ID is required."
    );

  }


  return doc(
    db,
    COMMUNITY_POSTS_COLLECTION,
    postId
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

  if (
    !userId
  ) {

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


function normalizeReactionTargetType(
  value: unknown
): CommunityReactionTargetType | null {

  if (
    value === "post" ||
    value === "reply"
  ) {

    return value;

  }


  return null;

}


/*
 * ============================================================
 * NORMALIZE POST
 * ============================================================
 */

function normalizeCommunityPost(
  postId: string,
  data: Record<string, any>
): CommunityPost {

  return {

    id:
      postId,

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
      data.isAnonymous ===
      true,

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
      data.isFeatured ===
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
 * NORMALIZE REPLY
 * ============================================================
 */

function normalizeCommunityReply(
  replyId: string,
  postId: string,
  data: Record<string, any>
): CommunityReply {

  return {

    id:
      replyId,

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


/*
 * ============================================================
 * NORMALIZE REACTION
 * ============================================================
 */

function normalizeCommunityReaction(
  reactionId: string,
  data: Record<string, any>
): CommunityReaction | null {

  const targetType =
    normalizeReactionTargetType(
      data.targetType
    );


  if (
    !targetType
  ) {

    return null;

  }


  if (
    typeof data.userId !==
      "string" ||
    !data.userId
  ) {

    return null;

  }


  if (
    typeof data.targetId !==
      "string" ||
    !data.targetId
  ) {

    return null;

  }


  if (
    data.type !==
    "helpful"
  ) {

    return null;

  }


  return {

    id:
      reactionId,

    userId:
      data.userId,

    targetType,

    targetId:
      data.targetId,

    type:
      "helpful",

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
 * GET COMMUNITY POST
 * ============================================================
 *
 * Loads one Community conversation.
 *
 * Only published posts are returned to ordinary Community
 * readers.
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


  const snapshot =
    await getDoc(
      getPostRef(
        postId
      )
    );


  if (
    !snapshot.exists()
  ) {

    return null;

  }


  const post =
    normalizeCommunityPost(
      snapshot.id,
      snapshot.data()
    );


  if (
    post.status !==
    "published"
  ) {

    return null;

  }


  return post;

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


  constraints.push(
    where(
      "status",
      "==",
      "published"
    )
  );


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


  constraints.push(
    orderBy(
      "createdAt",
      "desc"
    )
  );


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


  const postsQuery =
    query(
      getPostsCollection(),
      ...constraints
    );


  const snapshot =
    await getDocs(
      postsQuery
    );


  return snapshot.docs.map(
    (
      postDocument
    ) =>
      normalizeCommunityPost(
        postDocument.id,
        postDocument.data()
      )
  );

}


/*
 * ============================================================
 * GET COMMUNITY REPLIES
 * ============================================================
 *
 * Returns published replies for one Community post.
 *
 * All authenticated Community members may read published
 * replies.
 *
 * Premium controls the ability to create replies, not the
 * ability to read published replies.
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
    ) =>
      normalizeCommunityReply(
        replyDocument.id,
        postId,
        replyDocument.data()
      )
  );

}


/*
 * ============================================================
 * GET COMMUNITY REACTIONS
 * ============================================================
 *
 * Reads Helpful reactions for one published Community target.
 *
 * Free, Premium, and Premium+ authenticated users may read
 * reactions under the current Firestore rules.
 *
 * Reaction writes remain protected by:
 *
 * /api/community/reactions
 * ============================================================
 */

export async function getCommunityReactions(
  targetType:
    CommunityReactionTargetType,

  targetId: string
): Promise<CommunityReaction[]> {

  if (
    targetType !==
      "post" &&
    targetType !==
      "reply"
  ) {

    throw new Error(
      "A valid Community reaction target type is required."
    );

  }


  if (
    !targetId
  ) {

    throw new Error(
      "A Community reaction target ID is required."
    );

  }


  const reactionsQuery =
    query(
      getReactionsCollection(),

      where(
        "targetType",
        "==",
        targetType
      ),

      where(
        "targetId",
        "==",
        targetId
      ),

      where(
        "type",
        "==",
        "helpful"
      )
    );


  const snapshot =
    await getDocs(
      reactionsQuery
    );


  const reactions:
    CommunityReaction[] = [];


  snapshot.docs.forEach(
    (
      reactionDocument
    ) => {

      const reaction =
        normalizeCommunityReaction(
          reactionDocument.id,
          reactionDocument.data()
        );


      if (
        reaction
      ) {

        reactions.push(
          reaction
        );

      }

    }
  );


  return reactions;

}


/*
 * ============================================================
 * GET COMMUNITY REACTION SUMMARY
 * ============================================================
 *
 * Gives the UI exactly what it needs:
 *
 * - total Helpful count
 * - whether the current signed-in user already reacted
 *
 * currentUserId may be omitted when only a count is needed.
 * ============================================================
 */

export async function getCommunityReactionSummary(
  targetType:
    CommunityReactionTargetType,

  targetId: string,

  currentUserId?: string | null
): Promise<CommunityReactionSummary> {

  const reactions =
    await getCommunityReactions(
      targetType,
      targetId
    );


  const currentUserReacted =
    Boolean(
      currentUserId &&
      reactions.some(
        (
          reaction
        ) =>
          reaction.userId ===
          currentUserId
      )
    );


  return {

    count:
      reactions.length,

    currentUserReacted,

  };

}