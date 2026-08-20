/*
 * ============================================================
 * COMMUNITY TYPES
 * ============================================================
 *
 * Defines the data model for Myriad Autism Journey Community.
 *
 * PRODUCT RULES
 *
 * Guest:
 *   - No community access
 *
 * Free:
 *   - Read community content
 *   - Cannot create posts
 *   - Cannot reply
 *   - Cannot react
 *
 * Premium:
 *   - Read
 *   - Create posts
 *   - Reply
 *   - React
 *   - Participate in premium discussion areas
 *
 * Premium+:
 *   - Everything in Premium
 *   - Future Navigator-supported community spaces
 *
 * IMPORTANT
 *
 * These types define the data structure.
 *
 * Firestore security rules will enforce the actual access.
 * The UI should never be treated as the security boundary.
 * ============================================================
 */


/*
 * ============================================================
 * COMMUNITY PLAN ACCESS
 * ============================================================
 */

export type CommunityAccessLevel =
  | "none"
  | "read"
  | "participate"
  | "navigator";


/*
 * ============================================================
 * COMMUNITY CATEGORIES
 * ============================================================
 *
 * Categories should be broad enough to support families while
 * avoiding collection of unnecessary sensitive information.
 */

export type CommunityCategory =
  | "general"
  | "newly_diagnosed"
  | "school"
  | "therapy"
  | "insurance"
  | "financial_support"
  | "parent_support"
  | "teen_transition"
  | "adult_transition"
  | "siblings_family"
  | "success_stories"
  | "questions"
  | "other";


/*
 * ============================================================
 * COMMUNITY POST
 * ============================================================
 */

export type CommunityPost = {
  id: string;

  /*
   * Firebase UID of the author.
   *
   * This should never be used as the public display identity.
   */

  authorId: string;

  /*
   * Display name shown to other community members.
   *
   * We should eventually support:
   *
   * "Anonymous"
   * "Parent of a 7-year-old"
   * etc.
   */

  authorDisplayName: string;

  /*
   * Main post title.
   */

  title: string;

  /*
   * Main post body.
   */

  body: string;

  /*
   * Community category.
   */

  category: CommunityCategory;

  /*
   * Whether the author chose to publish anonymously.
   */

  isAnonymous: boolean;

  /*
   * Whether the post is visible to the community.
   */

  status:
    | "published"
    | "hidden"
    | "removed"
    | "pending_review";

  /*
   * Moderation state.
   */

  moderationStatus:
    | "not_reviewed"
    | "reviewed"
    | "flagged"
    | "removed";

  /*
   * Number of replies.
   *
   * This is a denormalized count for display.
   */

  replyCount: number;

  /*
   * Number of reactions.
   */

  reactionCount: number;

  /*
   * Number of reports.
   */

  reportCount: number;

  /*
   * Whether this is a featured/pinned post.
   */

  isFeatured: boolean;

  /*
   * Whether this is restricted to Premium/Premium+ members.
   */

  isPremiumOnly: boolean;

  /*
   * Whether this is restricted to Navigator-supported areas.
   */

  isNavigatorSupported: boolean;

  /*
   * Creation/update timestamps.
   */

  createdAt: number;

  updatedAt: number;
};


/*
 * ============================================================
 * COMMUNITY REPLY
 * ============================================================
 */

export type CommunityReply = {
  id: string;

  postId: string;

  authorId: string;

  authorDisplayName: string;

  body: string;

  isAnonymous: boolean;

  status:
    | "published"
    | "hidden"
    | "removed"
    | "pending_review";

  moderationStatus:
    | "not_reviewed"
    | "reviewed"
    | "flagged"
    | "removed";

  reactionCount: number;

  reportCount: number;

  createdAt: number;

  updatedAt: number;
};


/*
 * ============================================================
 * COMMUNITY REACTION
 * ============================================================
 *
 * One reaction per user per content item.
 */

export type CommunityReaction = {
  id: string;

  userId: string;

  targetType:
    | "post"
    | "reply";

  targetId: string;

  type:
    | "support"
    | "helpful"
    | "celebrate";

  createdAt: number;
};


/*
 * ============================================================
 * COMMUNITY REPORT
 * ============================================================
 *
 * Allows members to flag content for moderation.
 */

export type CommunityReport = {
  id: string;

  reporterId: string;

  targetType:
    | "post"
    | "reply";

  targetId: string;

  reason:
    | "harassment"
    | "hate"
    | "threat"
    | "spam"
    | "misinformation"
    | "privacy"
    | "self_harm"
    | "medical_advice"
    | "other";

  details?: string;

  status:
    | "open"
    | "reviewing"
    | "resolved"
    | "dismissed";

  createdAt: number;

  resolvedAt?: number;

  resolvedBy?: string;

  moderatorNotes?: string;
};


/*
 * ============================================================
 * COMMUNITY AUTHOR PROFILE
 * ============================================================
 *
 * Separate from Firebase Auth profile.
 *
 * This allows users to choose what the community sees without
 * exposing account email addresses or other private information.
 */

export type CommunityProfile = {
  userId: string;

  displayName: string;

  /*
   * Optional public identity choices.
   */

  isAnonymousByDefault: boolean;

  /*
   * Optional short description.
   *
   * Example:
   *
   * "Parent of a school-age child"
   *
   * Avoid encouraging users to include identifying or
   * sensitive information here.
   */

  bio?: string;

  createdAt: number;

  updatedAt: number;
};


/*
 * ============================================================
 * COMMUNITY MODERATION RECORD
 * ============================================================
 *
 * Internal moderation information.
 *
 * This should never be shown to ordinary community users.
 */

export type CommunityModerationRecord = {
  contentType:
    | "post"
    | "reply";

  contentId: string;

  action:
    | "approve"
    | "hide"
    | "remove"
    | "restore";

  moderatorId: string;

  reason?: string;

  createdAt: number;
};


/*
 * ============================================================
 * COMMUNITY FEED FILTERS
 * ============================================================
 */

export type CommunityFeedFilters = {
  category?: CommunityCategory;

  premiumOnly?: boolean;

  search?: string;

  limit?: number;
};


/*
 * ============================================================
 * CREATE POST INPUT
 * ============================================================
 *
 * This is what the UI sends when Premium users create posts.
 */

export type CreateCommunityPostInput = {
  title: string;

  body: string;

  category: CommunityCategory;

  isAnonymous: boolean;

  isPremiumOnly?: boolean;
};


/*
 * ============================================================
 * CREATE REPLY INPUT
 * ============================================================
 */

export type CreateCommunityReplyInput = {
  postId: string;

  body: string;

  isAnonymous: boolean;
};


/*
 * ============================================================
 * REPORT INPUT
 * ============================================================
 */

export type CreateCommunityReportInput = {
  targetType:
    | "post"
    | "reply";

  targetId: string;

  reason:
    | "harassment"
    | "hate"
    | "threat"
    | "spam"
    | "misinformation"
    | "privacy"
    | "self_harm"
    | "medical_advice"
    | "other";

  details?: string;
};


/*
 * ============================================================
 * COMMUNITY FEATURE FLAGS
 * ============================================================
 *
 * Centralized feature names for future entitlement checks.
 */

export type CommunityFeature =
  | "community_read"
  | "community_create_post"
  | "community_reply"
  | "community_react"
  | "community_premium_spaces"
  | "community_navigator_spaces";