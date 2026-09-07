import {
    NextResponse,
  } from "next/server";
  
  import {
    getAuthenticatedFirestoreDocument,
    requirePremium,
  } from "../../../../lib/serverSubscriptionAuth";
  
  
  /*
   * ============================================================
   * COMMUNITY REACTIONS API
   * ============================================================
   *
   * Current reaction model:
   *
   * Helpful 👍
   *
   * Guest:
   *   No Community access.
   *
   * Free:
   *   Read-only.
   *
   * Premium / Premium+:
   *   May add or remove their own Helpful reaction.
   *
   * Storage:
   *
   * communityReactions/{reactionId}
   *
   * Deterministic reaction ID:
   *
   * {targetType}_{targetId}_{uid}_helpful
   *
   * This guarantees one Helpful reaction per user per target.
   *
   * No Firebase Admin SDK.
   *
   * Firestore Security Rules remain active.
   * ============================================================
   */
  
  
  /*
   * ============================================================
   * TYPES
   * ============================================================
   */
  
  type ReactionTargetType =
    | "post"
    | "reply";
  
  
  type ReactionRequest = {
    targetType?: unknown;
  
    targetId?: unknown;
  
    action?: unknown;
  };
  
  
  type ReactionAction =
    | "add"
    | "remove";
  
  
  type FirestoreWriteResponse = {
    name?: string;
  
    error?: {
      code?: number;
  
      message?: string;
  
      status?: string;
    };
  };
  
  
  /*
   * ============================================================
   * VALIDATION
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
  
  
  function isReactionTargetType(
    value: unknown
  ): value is ReactionTargetType {
  
    return (
      value ===
        "post" ||
      value ===
        "reply"
    );
  
  }
  
  
  function isReactionAction(
    value: unknown
  ): value is ReactionAction {
  
    return (
      value ===
        "add" ||
      value ===
        "remove"
    );
  
  }
  
  
  /*
   * ============================================================
   * FIREBASE PROJECT ID
   * ============================================================
   */
  
  function getFirebaseProjectId():
    string {
  
    const projectId =
      process.env
        .NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
      process.env
        .FIREBASE_ADMIN_PROJECT_ID;
  
  
    if (
      !projectId
    ) {
  
      console.error(
        "Firebase project ID is not configured."
      );
  
  
      throw new Error(
        "FIREBASE_CONFIG_MISSING"
      );
  
    }
  
  
    return projectId;
  
  }
  
  
  /*
   * ============================================================
   * REACTION DOCUMENT ID
   * ============================================================
   */
  
  function createReactionId(
    targetType: ReactionTargetType,
    targetId: string,
    uid: string
  ): string {
  
    return [
      targetType,
      targetId,
      uid,
      "helpful",
    ]
      .map(
        (
          value
        ) =>
          encodeURIComponent(
            value
          )
      )
      .join("_");
  
  }
  
  
  /*
   * ============================================================
   * VERIFY TARGET
   * ============================================================
   *
   * Reactions may only be added to published Community content.
   * ============================================================
   */
  
  async function requirePublishedTarget(
    targetType: ReactionTargetType,
    targetId: string,
    idToken: string
  ): Promise<void> {
  
    const documentPath =
      targetType ===
      "post"
        ? `communityPosts/${targetId}`
        : `communityReplies/${targetId}`;
  
  
    const target =
      await getAuthenticatedFirestoreDocument(
        documentPath,
        idToken
      );
  
  
    if (
      !target ||
      target.status !==
        "published"
    ) {
  
      throw new Error(
        "TARGET_NOT_FOUND"
      );
  
    }
  
  }
  
  
  /*
   * ============================================================
   * CREATE REACTION
   * ============================================================
   *
   * Reaction IDs are deterministic.
   *
   * Before creating a reaction, we check whether it already
   * exists. If it does, the operation behaves as a successful
   * idempotent add instead of rewriting createdAt.
   *
   * This keeps the API consistent with Firestore Security Rules,
   * which do not allow the original creation time to change.
   * ============================================================
   */
  
  async function saveHelpfulReaction(
    reactionId: string,
  
    idToken: string,
  
    data: {
      userId: string;
  
      targetType:
        ReactionTargetType;
  
      targetId: string;
  
      type: "helpful";
  
      createdAt: number;
  
      updatedAt: number;
    }
  ): Promise<void> {
  
    const projectId =
      getFirebaseProjectId();
  
  
    const documentPath =
      `communityReactions/${reactionId}`;
  
  
    /*
     * ==========================================================
     * CHECK FOR EXISTING REACTION
     * ==========================================================
     */
  
    const existingReaction =
      await getAuthenticatedFirestoreDocument(
        documentPath,
        idToken
      );
  
  
    if (
      existingReaction
    ) {
  
      return;
  
    }
  
  
    /*
     * ==========================================================
     * CREATE REACTION
     * ==========================================================
     */
  
    const endpoint =
      `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
        projectId
      )}/databases/(default)/documents/communityReactions?documentId=${encodeURIComponent(
        reactionId
      )}`;
  
  
    const response =
      await fetch(
        endpoint,
        {
          method:
            "POST",
  
          headers: {
            Authorization:
              `Bearer ${idToken}`,
  
            "Content-Type":
              "application/json",
          },
  
          body:
            JSON.stringify({
              fields: {
  
                userId: {
                  stringValue:
                    data.userId,
                },
  
                targetType: {
                  stringValue:
                    data.targetType,
                },
  
                targetId: {
                  stringValue:
                    data.targetId,
                },
  
                type: {
                  stringValue:
                    data.type,
                },
  
                createdAt: {
                  integerValue:
                    String(
                      data.createdAt
                    ),
                },
  
                updatedAt: {
                  integerValue:
                    String(
                      data.updatedAt
                    ),
                },
  
              },
            }),
        }
      );
  
  
    let result:
      FirestoreWriteResponse = {};
  
  
    try {
  
      result =
        await response.json() as
          FirestoreWriteResponse;
  
    } catch {
  
      result = {};
  
    }
  
  
    /*
     * Another request may have created the same deterministic
     * reaction after the existence check.
     *
     * Treat that conflict as successful idempotent behavior.
     */
  
    if (
      response.status ===
      409
    ) {
  
      return;
  
    }
  
  
    if (
      response.status ===
      401
    ) {
  
      throw new Error(
        "AUTH_INVALID"
      );
  
    }
  
  
    if (
      response.status ===
      403
    ) {
  
      console.error(
        "Firestore denied Community reaction creation:",
        result.error
      );
  
  
      throw new Error(
        "FIRESTORE_PERMISSION_DENIED"
      );
  
    }
  
  
    if (
      !response.ok
    ) {
  
      console.error(
        "Firestore Community reaction creation failed:",
        {
          status:
            response.status,
  
          error:
            result.error,
        }
      );
  
  
      throw new Error(
        "FIRESTORE_WRITE_FAILED"
      );
  
    }
  
  }
  
  
  /*
   * ============================================================
   * DELETE REACTION
   * ============================================================
   */
  
  async function deleteHelpfulReaction(
    reactionId: string,
    idToken: string
  ): Promise<void> {
  
    const projectId =
      getFirebaseProjectId();
  
  
    const endpoint =
      `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
        projectId
      )}/databases/(default)/documents/communityReactions/${encodeURIComponent(
        reactionId
      )}`;
  
  
    const response =
      await fetch(
        endpoint,
        {
          method:
            "DELETE",
  
          headers: {
            Authorization:
              `Bearer ${idToken}`,
          },
        }
      );
  
  
    /*
     * Deleting a reaction that no longer exists is safe.
     *
     * Treat the operation as successful so remove remains
     * idempotent.
     */
  
    if (
      response.status ===
      404
    ) {
  
      return;
  
    }
  
  
    if (
      response.status ===
      401
    ) {
  
      throw new Error(
        "AUTH_INVALID"
      );
  
    }
  
  
    if (
      response.status ===
      403
    ) {
  
      throw new Error(
        "FIRESTORE_PERMISSION_DENIED"
      );
  
    }
  
  
    if (
      !response.ok
    ) {
  
      throw new Error(
        "FIRESTORE_WRITE_FAILED"
      );
  
    }
  
  }
  
  
  /*
   * ============================================================
   * POST /api/community/reactions
   * ============================================================
   */
  
  export async function POST(
    request: Request
  ) {
  
    try {
  
      /*
       * ========================================================
       * REQUIRE PREMIUM
       * ========================================================
       */
  
      const account =
        await requirePremium(
          request
        );
  
  
      /*
       * Reuse the already verified Firebase ID token returned by
       * requirePremium.
       *
       * This avoids rereading the request authorization header.
       */
  
      const idToken =
        account.idToken;
  
  
      /*
       * ========================================================
       * REQUEST BODY
       * ========================================================
       */
  
      let body:
        ReactionRequest;
  
  
      try {
  
        body =
          await request.json() as
            ReactionRequest;
  
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
       * TARGET TYPE
       * ========================================================
       */
  
      if (
        !isReactionTargetType(
          body.targetType
        )
      ) {
  
        return NextResponse.json(
          {
            error:
              "A valid Community reaction target is required.",
          },
          {
            status:
              400,
          }
        );
  
      }
  
  
      const targetType =
        body.targetType;
  
  
      /*
       * ========================================================
       * TARGET ID
       * ========================================================
       */
  
      const targetId =
        getCleanString(
          body.targetId,
          200
        );
  
  
      if (
        !targetId
      ) {
  
        return NextResponse.json(
          {
            error:
              "A Community content ID is required.",
          },
          {
            status:
              400,
          }
        );
  
      }
  
  
      /*
       * ========================================================
       * ACTION
       * ========================================================
       */
  
      if (
        !isReactionAction(
          body.action
        )
      ) {
  
        return NextResponse.json(
          {
            error:
              "A valid reaction action is required.",
          },
          {
            status:
              400,
          }
        );
  
      }
  
  
      const action =
        body.action;
  
  
      /*
       * ========================================================
       * VERIFY TARGET
       * ========================================================
       *
       * Both add and remove requests must reference published
       * Community content.
       */
  
      await requirePublishedTarget(
        targetType,
        targetId,
        idToken
      );
  
  
      /*
       * ========================================================
       * REACTION ID
       * ========================================================
       */
  
      const reactionId =
        createReactionId(
          targetType,
          targetId,
          account.uid
        );
  
  
      /*
       * ========================================================
       * REMOVE REACTION
       * ========================================================
       */
  
      if (
        action ===
        "remove"
      ) {
  
        await deleteHelpfulReaction(
          reactionId,
          idToken
        );
  
  
        return NextResponse.json(
          {
            success:
              true,
  
            action:
              "removed",
  
            reactionId,
  
            targetType,
  
            targetId,
  
            type:
              "helpful",
          }
        );
  
      }
  
  
      /*
       * ========================================================
       * ADD REACTION
       * ========================================================
       */
  
      const now =
        Date.now();
  
  
      await saveHelpfulReaction(
        reactionId,
        idToken,
        {
          userId:
            account.uid,
  
          targetType,
  
          targetId,
  
          type:
            "helpful",
  
          createdAt:
            now,
  
          updatedAt:
            now,
        }
      );
  
  
      return NextResponse.json(
        {
          success:
            true,
  
          action:
            "added",
  
          reactionId,
  
          targetType,
  
          targetId,
  
          type:
            "helpful",
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
       * AUTH REQUIRED
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
              "You must be logged in to react in the Community.",
          },
          {
            status:
              401,
          }
        );
  
      }
  
  
      /*
       * ========================================================
       * INVALID AUTH
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
              "Community reactions are available with Premium.",
          },
          {
            status:
              403,
          }
        );
  
      }
  
  
      /*
       * ========================================================
       * TARGET NOT FOUND
       * ========================================================
       */
  
      if (
        error instanceof Error &&
        error.message ===
          "TARGET_NOT_FOUND"
      ) {
  
        return NextResponse.json(
          {
            error:
              "That Community content is no longer available.",
          },
          {
            status:
              404,
          }
        );
  
      }
  
  
      /*
       * ========================================================
       * FIRESTORE RULES
       * ========================================================
       */
  
      if (
        error instanceof Error &&
        error.message ===
          "FIRESTORE_PERMISSION_DENIED"
      ) {
  
        return NextResponse.json(
          {
            error:
              "Your account does not currently have permission to react to this Community content.",
          },
          {
            status:
              403,
          }
        );
  
      }
  
  
      /*
       * ========================================================
       * FIREBASE CONFIG
       * ========================================================
       */
  
      if (
        error instanceof Error &&
        error.message ===
          "FIREBASE_CONFIG_MISSING"
      ) {
  
        return NextResponse.json(
          {
            error:
              "The Community service is not configured correctly.",
          },
          {
            status:
              500,
          }
        );
  
      }
  
  
      /*
       * ========================================================
       * FIRESTORE WRITE FAILURE
       * ========================================================
       */
  
      if (
        error instanceof Error &&
        error.message ===
          "FIRESTORE_WRITE_FAILED"
      ) {
  
        return NextResponse.json(
          {
            error:
              "We couldn't update your reaction right now. Please try again.",
          },
          {
            status:
              500,
          }
        );
  
      }
  
  
      /*
       * ========================================================
       * UNEXPECTED ERROR
       * ========================================================
       */
  
      console.error(
        "Community reaction error:",
        error
      );
  
  
      return NextResponse.json(
        {
          error:
            "We couldn't update your reaction right now. Please try again.",
        },
        {
          status:
            500,
        }
      );
  
    }
  
  }