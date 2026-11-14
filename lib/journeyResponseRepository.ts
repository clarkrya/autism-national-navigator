
import {
    collection,
    getDocs,
    orderBy,
    query,
  } from "firebase/firestore";
  
  import { db } from "./firebase";
  
  /**
   * AUTIVOYA JOURNEY RESPONSE REPOSITORY
   *
   * Canonical Firestore location:
   *
   * users/{ownerUserId}/children/{childId}/journeyResponses/{responseId}
   *
   * Written responses remain separate from task progress.
   *
   * IMPORTANT:
   * - Premium access is enforced by Firestore rules and server APIs.
   * - Never grant access based solely on client-side subscription state.
   * - Completed-stage responses are read-only.
   */
  
  export const JOURNEY_RESPONSE_MAX_LENGTH = 10000;
  
  export type JourneyResponse = {
    id: string;
    ownerUserId: string;
    childId: string;
    journeyId: string;
    stageNumber: number;
    taskId: string;
    taskTitle: string;
    response: string;
    createdByUserId: string;
    updatedByUserId: string;
    createdAt: number;
    updatedAt: number;
    schemaVersion: 1;
  };
  
  export type SaveJourneyResponseInput = {
    ownerUserId: string;
    childId: string;
    journeyId: string;
    stageNumber: number;
    taskId: string;
    response: string;
  };
  
  function requireIdentifier(
    value: string,
    label: string
  ): string {
    if (
      typeof value !== "string" ||
      !value.trim() ||
      value.includes("/")
    ) {
      throw new Error(`Invalid ${label}.`);
    }
  
    return value.trim();
  }
  
  /**
   * A stable document ID ensures that editing the same
   * task does not create duplicate Vault entries.
   */
  export function createJourneyResponseId(
    journeyId: string,
    stageNumber: number,
    taskId: string
  ): string {
    requireIdentifier(journeyId, "Journey ID");
    requireIdentifier(taskId, "task ID");
  
    if (
      !Number.isInteger(stageNumber) ||
      stageNumber < 1
    ) {
      throw new Error("Invalid Journey stage.");
    }
  
    return [
      encodeURIComponent(journeyId),
      stageNumber,
      encodeURIComponent(taskId),
    ].join("__");
  }
  
  export function validateJourneyResponse(
    response: string
  ): string {
    if (typeof response !== "string") {
      throw new Error("Response must be text.");
    }
  
    if (response.length > JOURNEY_RESPONSE_MAX_LENGTH) {
      throw new Error(
        `Responses cannot exceed ${JOURNEY_RESPONSE_MAX_LENGTH} characters.`
      );
    }
  
    return response;
  }
  
  function normalizeJourneyResponse(
    id: string,
    data: Record<string, unknown>
  ): JourneyResponse | null {
    if (
      typeof data.ownerUserId !== "string" ||
      typeof data.childId !== "string" ||
      typeof data.journeyId !== "string" ||
      typeof data.stageNumber !== "number" ||
      typeof data.taskId !== "string" ||
      typeof data.taskTitle !== "string" ||
      typeof data.response !== "string"
    ) {
      return null;
    }
  
    return {
      id,
      ownerUserId: data.ownerUserId,
      childId: data.childId,
      journeyId: data.journeyId,
      stageNumber: data.stageNumber,
      taskId: data.taskId,
      taskTitle: data.taskTitle,
      response: data.response,
      createdByUserId:
        typeof data.createdByUserId === "string"
          ? data.createdByUserId
          : "",
      updatedByUserId:
        typeof data.updatedByUserId === "string"
          ? data.updatedByUserId
          : "",
      createdAt:
        typeof data.createdAt === "number"
          ? data.createdAt
          : 0,
      updatedAt:
        typeof data.updatedAt === "number"
          ? data.updatedAt
          : 0,
      schemaVersion: 1,
    };
  }
  
  /**
   * Load all saved responses for a child's Document Vault.
   *
   * Firestore security rules must authorize the read.
   */
  export async function getChildJourneyResponses(
    ownerUserId: string,
    childId: string
  ): Promise<JourneyResponse[]> {
    const ownerId = requireIdentifier(
      ownerUserId,
      "owner user ID"
    );
  
    const validChildId = requireIdentifier(
      childId,
      "child ID"
    );
  
    const responsesRef = collection(
      db,
      "users",
      ownerId,
      "children",
      validChildId,
      "journeyResponses"
    );
  
    const snapshot = await getDocs(
      query(responsesRef, orderBy("updatedAt", "desc"))
    );
  
    return snapshot.docs
      .map((document) =>
        normalizeJourneyResponse(
          document.id,
          document.data()
        )
      )
      .filter(
        (response): response is JourneyResponse =>
          response !== null
      );
  }
  
  /**
   * Load responses belonging to one Journey stage.
   */
  export async function getStageJourneyResponses(
    ownerUserId: string,
    childId: string,
    journeyId: string,
    stageNumber: number
  ): Promise<JourneyResponse[]> {
    const responses = await getChildJourneyResponses(
      ownerUserId,
      childId
    );
  
    return responses.filter(
      (item) =>
        item.journeyId === journeyId &&
        item.stageNumber === stageNumber
    );
  }
  