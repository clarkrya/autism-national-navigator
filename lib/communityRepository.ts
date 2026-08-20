import {
    collection,
    doc,
    getDocs,
    limit,
    orderBy,
    query,
    where,
    addDoc,
    setDoc,
    getDoc,
  } from "firebase/firestore";
  
  import {
    db,
  } from "./firebase";
  
  import type {
    CommunityPost,
    CommunityReply,
    CommunityReaction,
    CommunityProfile,
    CommunityFeedFilters,
    CreateCommunityPostInput,
    CreateCommunityReplyInput,
    CreateCommunityReportInput,
    CommunityReport,
  } from "./communityTypes";
  
  
  /*
   * ============================================================
   * COMMUNITY REPOSITORY
   * ============================================================
   *
   * Handles data access for Myriad Autism Journey Community.
   *
   * Firestore:
   *
   * community/
   *   posts/{postId}
   *   replies/{replyId}
   *   reactions/{reactionId}
   *   reports/{reportId}
   *
   * users/
   *   {userId}/
   *     communityProfile/current
   *
   * IMPORTANT:
   *
   * This repository is NOT the final authorization layer.
   *
   * Firestore rules and server-side checks must enforce:
   *
   * Guest:
   *   no access
   *
   * Free:
   *   read only
   *
   * Premium:
   *   read + participate
   *
   * Premium+:
   *   read + participate
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
  
  
  function getReactionsCollection() {
  
    return collection(
      db,
      "community",
      "reactions"
    );
  
  }
  
  
  function getReportsCollection() {
  
    return collection(
      db,
      "community",
      "reports"
    );
  
  }
  
  
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
   * SAVE COMMUNITY PROFILE
   * ============================================================
   *
   * Premium users may eventually update this profile through
   * the UI.
   *
   * Firestore rules will determine who is actually allowed to
   * write it.
   * ============================================================
   */
  
  export async function saveCommunityProfile(
    profile: CommunityProfile
  ): Promise<void> {
  
    if (
      !profile.userId
    ) {
  
      throw new Error(
        "A user ID is required."
      );
  
    }
  
  
    await setDoc(
      getCommunityProfileRef(
        profile.userId
      ),
      {
        ...profile,
  
        updatedAt:
          Date.now(),
      },
      {
        merge:
          true,
      }
    );
  
  }
  
  
  /*
   * ============================================================
   * GET POSTS
   * ============================================================
   *
   * Free and paid members can read published posts.
   *
   * The repository intentionally requests only published content.
   */
  
  export async function getCommunityPosts(
    filters?: CommunityFeedFilters
  ): Promise<CommunityPost[]> {
  
    const constraints = [
      where(
        "status",
        "==",
        "published"
      ),
      orderBy(
        "createdAt",
        "desc"
      ),
    ];
  
  
    if (
      filters?.category
    ) {
  
      constraints.unshift(
        where(
          "category",
          "==",
          filters.category
        )
      );
  
    }
  
  
    if (
      filters?.premiumOnly !== undefined
    ) {
  
      constraints.unshift(
        where(
          "isPremiumOnly",
          "==",
          filters.premiumOnly
        )
      );
  
    }
  
  
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
      (postDocument) => {
  
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
            data.isAnonymous === true,
  
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
            data.isFeatured === true,
  
          isPremiumOnly:
            data.isPremiumOnly === true,
  
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
   * GET REPLIES
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
      (replyDocument) => {
  
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
  
  
  /*
   * ============================================================
   * CREATE POST
   * ============================================================
   *
   * Intended for Premium/Premium+.
   *
   * The repository itself does not determine Premium ownership.
   *
   * Firestore security rules and eventually server-side
   * authorization must enforce this.
   *
   * This method is deliberately kept available so the Premium
   * UI can eventually call it.
   * ============================================================
   */
  
  export async function createCommunityPost(
    userId: string,
    input: CreateCommunityPostInput
  ): Promise<string> {
  
    if (!userId) {
  
      throw new Error(
        "You must be logged in to create a community post."
      );
  
    }
  
  
    if (
      !input.title.trim()
    ) {
  
      throw new Error(
        "A post title is required."
      );
  
    }
  
  
    if (
      !input.body.trim()
    ) {
  
      throw new Error(
        "A post message is required."
      );
  
    }
  
  
    const profile =
      await getCommunityProfile(
        userId
      );
  
  
    const displayName =
      input.isAnonymous
        ? "Anonymous"
        : profile?.displayName ||
          "Community Member";
  
  
    const now =
      Date.now();
  
  
    const postData:
      Omit<
        CommunityPost,
        "id"
      > = {
  
      authorId:
        userId,
  
      authorDisplayName:
        displayName,
  
      title:
        input.title.trim(),
  
      body:
        input.body.trim(),
  
      category:
        input.category,
  
      isAnonymous:
        input.isAnonymous,
  
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
  
      isPremiumOnly:
        input.isPremiumOnly === true,
  
      isNavigatorSupported:
        false,
  
      createdAt:
        now,
  
      updatedAt:
        now,
    };
  
  
    const document =
      await addDoc(
        getPostsCollection(),
        postData
      );
  
  
    return document.id;
  
  }
  
  
  /*
   * ============================================================
   * CREATE REPLY
   * ============================================================
   *
   * Intended for Premium/Premium+.
   * ============================================================
   */
  
  export async function createCommunityReply(
    userId: string,
    input: CreateCommunityReplyInput
  ): Promise<string> {
  
    if (!userId) {
  
      throw new Error(
        "You must be logged in to reply."
      );
  
    }
  
  
    if (
      !input.postId
    ) {
  
      throw new Error(
        "A post ID is required."
      );
  
    }
  
  
    if (
      !input.body.trim()
    ) {
  
      throw new Error(
        "A reply message is required."
      );
  
    }
  
  
    const profile =
      await getCommunityProfile(
        userId
      );
  
  
    const displayName =
      input.isAnonymous
        ? "Anonymous"
        : profile?.displayName ||
          "Community Member";
  
  
    const now =
      Date.now();
  
  
    const replyData:
      Omit<
        CommunityReply,
        "id"
      > = {
  
      postId:
        input.postId,
  
      authorId:
        userId,
  
      authorDisplayName:
        displayName,
  
      body:
        input.body.trim(),
  
      isAnonymous:
        input.isAnonymous,
  
      status:
        "pending_review",
  
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
    };
  
  
    const document =
      await addDoc(
        getRepliesCollection(),
        replyData
      );
  
  
    return document.id;
  
  }
  
  
  /*
   * ============================================================
   * CREATE REPORT
   * ============================================================
   *
   * Any authenticated community participant may eventually be
   * able to report content.
   *
   * Security rules should verify that the reporter is the
   * authenticated owner of the new report.
   * ============================================================
   */
  
  export async function createCommunityReport(
    userId: string,
    input: CreateCommunityReportInput
  ): Promise<string> {
  
    if (!userId) {
  
      throw new Error(
        "You must be logged in to report community content."
      );
  
    }
  
  
    if (
      !input.targetId
    ) {
  
      throw new Error(
        "A target ID is required."
      );
  
    }
  
  
    const now =
      Date.now();
  
  
    const reportData:
      Omit<
        CommunityReport,
        "id"
      > = {
  
      reporterId:
        userId,
  
      targetType:
        input.targetType,
  
      targetId:
        input.targetId,
  
      reason:
        input.reason,
  
      details:
        input.details?.trim(),
  
      status:
        "open",
  
      createdAt:
        now,
    };
  
  
    const document =
      await addDoc(
        getReportsCollection(),
        reportData
      );
  
  
    return document.id;
  
  }
  
  
  /*
   * ============================================================
   * CREATE REACTION
   * ============================================================
   *
   * Intended for Premium/Premium+.
   *
   * We use a deterministic document ID so a future Firestore
   * rule can enforce one reaction per user/content/type.
   * ============================================================
   */
  
  export async function createCommunityReaction(
    userId: string,
    reaction: CommunityReaction
  ): Promise<void> {
  
    if (!userId) {
  
      throw new Error(
        "You must be logged in to react."
      );
  
    }
  
  
    const reactionId =
      `${reaction.targetType}_${reaction.targetId}_${userId}_${reaction.type}`;
  
  
    await setDoc(
      doc(
        getReactionsCollection(),
        reactionId
      ),
      {
        ...reaction,
  
        id:
          reactionId,
  
        userId,
  
        createdAt:
          reaction.createdAt ||
          Date.now(),
      },
      {
        merge:
          true,
      }
    );
  
  }