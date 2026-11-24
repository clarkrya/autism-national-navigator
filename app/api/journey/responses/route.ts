import { NextRequest, NextResponse } from "next/server";

import { getAdminDb } from "../../../../lib/firebaseAdmin";
import {
  verifyFirebaseRequest,
} from "../../../../lib/serverSubscription";

export const runtime = "nodejs";

const MAX_RESPONSE_LENGTH = 10000;

type ResponseInput = {
  ownerUserId?: unknown;
  childId?: unknown;
  journeyId?: unknown;
  stageNumber?: unknown;
  taskId?: unknown;
  response?: unknown;
};

function validId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= 200 &&
    value !== "." &&
    value !== ".." &&
    !value.includes("/")
  );
}

function errorResponse(
  message: string,
  status: number
) {
  return NextResponse.json(
    { error: message },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function POST(request: NextRequest) {
  try {
    const account = await verifyFirebaseRequest(request);
    const db = getAdminDb();

    // Verify Premium subscription access.
    let hasPremium =
      account.plan === "premium" ||
      account.plan === "premium_plus";

    // Preserve temporary Premium tester access.
    if (!hasPremium) {
      const testerSnapshot = await db
        .collection("users")
        .doc(account.uid)
        .collection("testerAccess")
        .doc("current")
        .get();

      const tester = testerSnapshot.data();

      hasPremium =
        tester?.active === true &&
        tester?.plan === "premium" &&
        typeof tester?.expiresAt === "number" &&
        Number.isFinite(tester.expiresAt) &&
        tester.expiresAt > Date.now();
    }

    if (!hasPremium) {
      return errorResponse(
        "Premium is required to save Journey Notes.",
        403
      );
    }

    let body: ResponseInput;

    try {
      const parsed = await request.json();

      if (
        !parsed ||
        typeof parsed !== "object" ||
        Array.isArray(parsed)
      ) {
        return errorResponse(
          "Invalid Journey Response data.",
          400
        );
      }

      body = parsed as ResponseInput;
    } catch {
      return errorResponse(
        "Invalid Journey Response data.",
        400
      );
    }

    const {
      ownerUserId,
      childId,
      journeyId,
      stageNumber,
      taskId,
      response,
    } = body;

    if (
      !validId(ownerUserId) ||
      !validId(childId) ||
      !validId(journeyId) ||
      !validId(taskId) ||
      typeof stageNumber !== "number" ||
      !Number.isSafeInteger(stageNumber) ||
      stageNumber < 1 ||
      typeof response !== "string" ||
      response.length > MAX_RESPONSE_LENGTH
    ) {
      return errorResponse(
        "Invalid Journey Response data.",
        400
      );
    }

    const ownerId = ownerUserId;
    const validChildId = childId;
    const validJourneyId = journeyId;
    const validTaskId = taskId;
    const validStage = stageNumber;

    // Journey Notes are private to the account owner.
    // Family Organizer membership does not grant access
    // to another user's private Journey Notes.
    if (account.uid !== ownerId) {
      return errorResponse(
        "Only the account owner can save or edit private Journey Notes.",
        403
      );
    }

    const childRef = db
      .collection("users")
      .doc(ownerId)
      .collection("children")
      .doc(validChildId);

    const currentJourneyRef = childRef
      .collection("journeys")
      .doc("current");

    const responseId = [
      encodeURIComponent(validJourneyId),
      validStage,
      encodeURIComponent(validTaskId),
    ].join("__");

    const responseRef = childRef
      .collection("journeyResponses")
      .doc(responseId);

    await db.runTransaction(async (transaction) => {
      const [
        childSnapshot,
        journeySnapshot,
        responseSnapshot,
      ] = await Promise.all([
        transaction.get(childRef),
        transaction.get(currentJourneyRef),
        transaction.get(responseRef),
      ]);

      if (!childSnapshot.exists) {
        throw new Error("CHILD_NOT_FOUND");
      }

      if (!journeySnapshot.exists) {
        throw new Error("JOURNEY_NOT_FOUND");
      }

      const journey = journeySnapshot.data();

      if (
        journey?.journeyId !== validJourneyId ||
        journey?.stageNumber !== validStage
      ) {
        throw new Error("STAGE_LOCKED");
      }

      const tasks = journey?.journey?.tasks;

      if (!Array.isArray(tasks)) {
        throw new Error("TASK_NOT_FOUND");
      }

      const task = tasks.find(
        (item: { id?: string }) =>
          item?.id === validTaskId
      );

      if (!task) {
        throw new Error("TASK_NOT_FOUND");
      }

      const now = Date.now();
      const previous = responseSnapshot.data();

      transaction.set(responseRef, {
        id: responseId,
        ownerUserId: ownerId,
        childId: validChildId,
        journeyId: validJourneyId,
        stageNumber: validStage,
        taskId: validTaskId,

        taskTitle:
          typeof task.title === "string"
            ? task.title
            : "Journey Task",

        response,

        createdByUserId:
          previous?.createdByUserId ?? account.uid,

        updatedByUserId: account.uid,

        createdAt:
          typeof previous?.createdAt === "number"
            ? previous.createdAt
            : now,

        updatedAt: now,

        schemaVersion: 1,
      });
    });

    return NextResponse.json(
      {
        success: true,
        responseId,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "";

    if (
      message === "AUTH_REQUIRED" ||
      message === "AUTH_INVALID"
    ) {
      return errorResponse(
        "Please sign in again.",
        401
      );
    }

    if (
      message === "CHILD_NOT_FOUND" ||
      message === "JOURNEY_NOT_FOUND" ||
      message === "TASK_NOT_FOUND"
    ) {
      return errorResponse(
        "The requested Journey task was not found.",
        404
      );
    }

    if (message === "STAGE_LOCKED") {
      return errorResponse(
        "This Journey stage is completed and cannot be edited.",
        409
      );
    }

    console.error("Journey Response save failed:", error);

    return errorResponse(
      "Unable to save your Journey Response.",
      500
    );
  }
}