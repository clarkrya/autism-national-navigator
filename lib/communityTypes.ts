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
 *   - Read published community content
 *   - Cannot create posts
 *   - Cannot reply
 *   - Cannot react
 *
 * Premium:
 *   - Read
 *   - Create posts
 *   - Reply
 *   - React
 *
 * Premium+:
 *   - Everything in Premium
 *   - Future Navigator-supported community experiences
 *
 * IMPORTANT:
 *
 * Community is one shared space.
 *
 * There are no Premium-only discussion areas.
 *
 * Premium controls PARTICIPATION, not visibility of ordinary
 * published community conversations.
 *
 * These types define the data structure.
 *
 * Firestore Security Rules and protected server APIs enforce
 * actual access.
 *
 * The UI must never be treated as the security boundary.
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
 * COMMUNITY POST STATUS
 * ============================================================
 */

export type CommunityContentStatus =
  | "published"
  | "hidden"
  | "removed"
  | "pending_review";


/*
 * ============================================================
 * COMMUNITY MODERATION STATUS
 * ============================================================
 */

export type CommunityModerationStatus =
  | "not_reviewed"
  | "reviewed"
  | "flagged"
  | "removed";


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
   * Never use this as the public display identity.
   */

  authorId: string;

  /*
   * Community-facing display name.
   */

  authorDisplayName: string;

  title: string;

  body: string;

  category: CommunityCategory;

  /*
   * Whether the author chose to publish anonymously.
   */

  isAnonymous: boolean;

  /*
   * New posts may begin as pending_review before publication.
   */

  status: CommunityContentStatus;

  moderationStatus: CommunityModerationStatus;

  /*
   * Denormalized display counts.
   */

  replyCount: number;

  reactionCount: number;

  reportCount: number;

  /*
   * Featured/pinned community content.
   */

  isFeatured: boolean;

  /*
   * Reserved for future Navigator-supported community
   * experiences.
   *
   * This does not make ordinary community posts Premium-only.
   */

  isNavigatorSupported: boolean;

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

  /*
   * Replies may publish immediately while retaining a separate
   * moderation state.
   */

  status: CommunityContentStatus;

  moderationStatus: CommunityModerationStatus;

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
 */

export type CommunityReportReason =
  | "harassment"
  | "hate"
  | "threat"
  | "spam"
  | "misinformation"
  | "privacy"
  | "self_harm"
  | "medical_advice"
  | "other";


export type CommunityReportStatus =
  | "open"
  | "reviewing"
  | "resolved"
  | "dismissed";


export type CommunityReport = {
  id: string;

  reporterId: string;

  targetType:
    | "post"
    | "reply";

  targetId: string;

  reason: CommunityReportReason;

  details?: string;

  status: CommunityReportStatus;

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
 * This allows the member to control what the community sees
 * without exposing account email or private account details.
 */

export type CommunityProfile = {
  userId: string;

  displayName: string;

  isAnonymousByDefault: boolean;

  /*
   * Optional public community bio.
   *
   * Avoid encouraging identifying or sensitive information.
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

  search?: string;

  limit?: number;
};


/*
 * ============================================================
 * CREATE POST INPUT
 * ============================================================
 *
 * Premium and Premium+ members may create posts.
 */

export type CreateCommunityPostInput = {
  title: string;

  body: string;

  category: CommunityCategory;

  isAnonymous: boolean;
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

  reason: CommunityReportReason;

  details?: string;
};


/*
 * ============================================================
 * COMMUNITY FEATURE FLAGS
 * ============================================================
 */

export type CommunityFeature =
  | "community_read"
  | "community_create_post"
  | "community_reply"
  | "community_react"
  | "community_navigator_spaces";