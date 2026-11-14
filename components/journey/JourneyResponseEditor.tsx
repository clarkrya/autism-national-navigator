
"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { auth } from "../../lib/firebase";
import {
  getStageJourneyResponses,
  JOURNEY_RESPONSE_MAX_LENGTH,
} from "../../lib/journeyResponseRepository";

type SaveStatus =
  | "loading"
  | "idle"
  | "saving"
  | "saved"
  | "error";

type JourneyResponseEditorProps = {
  ownerUserId: string;
  childId: string;
  journeyId: string;
  stageNumber: number;
  taskId: string;
  disabled?: boolean;
  onPendingChange?: (
    taskId: string,
    pending: boolean
  ) => void;
};

export default function JourneyResponseEditor({
  ownerUserId,
  childId,
  journeyId,
  stageNumber,
  taskId,
  disabled = false,
  onPendingChange,
}: JourneyResponseEditorProps) {
  const [response, setResponse] = useState("");
  const [savedResponse, setSavedResponse] =
    useState("");
  const [status, setStatus] =
    useState<SaveStatus>("loading");
  const [errorMessage, setErrorMessage] =
    useState("");

  const responseRef = useRef("");
  const savedResponseRef = useRef("");
  const mountedRef = useRef(true);
  const revisionRef = useRef(0);
  const savingRef = useRef(false);

  const hasUnsavedChanges =
    response !== savedResponse;

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadResponse() {
      setStatus("loading");
      setErrorMessage("");
      setResponse("");
      setSavedResponse("");

      responseRef.current = "";
      savedResponseRef.current = "";
      revisionRef.current = 0;

      try {
        const responses =
          await getStageJourneyResponses(
            ownerUserId,
            childId,
            journeyId,
            stageNumber
          );

        if (!active) return;

        const existing = responses.find(
          (item) => item.taskId === taskId
        );

        const value =
          existing?.response ?? "";

        setResponse(value);
        setSavedResponse(value);

        responseRef.current = value;
        savedResponseRef.current = value;

        setStatus("idle");
      } catch (error) {
        if (!active) return;

        console.error(
          "Unable to load Journey Response:",
          error
        );

        setStatus("error");
        setErrorMessage(
          "Unable to load your saved notes. Please refresh the page and try again."
        );
      }
    }

    void loadResponse();

    return () => {
      active = false;
    };
  }, [
    ownerUserId,
    childId,
    journeyId,
    stageNumber,
    taskId,
  ]);

  useEffect(() => {
    onPendingChange?.(
      taskId,
      hasUnsavedChanges || status === "saving"
    );
  }, [
    taskId,
    hasUnsavedChanges,
    status,
    onPendingChange,
  ]);

  const saveResponse = useCallback(
    async (value: string) => {
      const currentUser = auth.currentUser;

      if (!currentUser) {
        throw new Error(
          "Please sign in to save your notes."
        );
      }

      const token =
        await currentUser.getIdToken(true);

      const result = await fetch(
        "/api/journey/responses",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ownerUserId,
            childId,
            journeyId,
            stageNumber,
            taskId,
            response: value,
          }),
        }
      );

      let data: {
        error?: string;
      } = {};

      try {
        data = await result.json();
      } catch {
        // Handle responses without JSON.
      }

      if (!result.ok) {
        if (result.status === 401) {
          throw new Error(
            "Your session could not be verified. Please sign in again."
          );
        }

        throw new Error(
          data?.error ||
            "Unable to save your notes."
        );
      }
    },
    [
      ownerUserId,
      childId,
      journeyId,
      stageNumber,
      taskId,
    ]
  );

  async function handleSave() {
    if (
      disabled ||
      status === "loading" ||
      savingRef.current ||
      !hasUnsavedChanges
    ) {
      return;
    }

    savingRef.current = true;

    const valueToSave = responseRef.current;
    const revisionAtSave =
      revisionRef.current;

    setStatus("saving");
    setErrorMessage("");

    onPendingChange?.(taskId, true);

    try {
      await saveResponse(valueToSave);

      if (!mountedRef.current) return;

      savedResponseRef.current =
        valueToSave;

      setSavedResponse(valueToSave);

      if (
        revisionRef.current ===
        revisionAtSave
      ) {
        setStatus("saved");
        onPendingChange?.(taskId, false);
      } else {
        setStatus("idle");
        onPendingChange?.(taskId, true);
      }
    } catch (error) {
      if (!mountedRef.current) return;

      console.error(
        "Journey Response save failed:",
        error
      );

      setStatus("error");

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to save your notes."
      );

      onPendingChange?.(taskId, true);
    } finally {
      savingRef.current = false;
    }
  }

  function handleChange(value: string) {
    if (
      disabled ||
      status === "loading" ||
      savingRef.current
    ) {
      return;
    }

    if (
      value.length >
      JOURNEY_RESPONSE_MAX_LENGTH
    ) {
      return;
    }

    revisionRef.current += 1;

    responseRef.current = value;
    setResponse(value);
    setErrorMessage("");

    if (
      value === savedResponseRef.current
    ) {
      setStatus("saved");
      onPendingChange?.(taskId, false);
    } else {
      setStatus("idle");
      onPendingChange?.(taskId, true);
    }
  }

  return (
    <div
      style={{
        marginTop: 18,
        padding: 16,
        background: "#F8FAFC",
        border: "1px solid #E2E8F0",
        borderRadius: 12,
      }}
    >
      <label
        htmlFor={`journey-response-${stageNumber}-${taskId}`}
        style={{
          display: "block",
          fontSize: 14,
          fontWeight: 700,
          color: "#204D6A",
          marginBottom: 8,
        }}
      >
        My Journey Notes
      </label>

      <p
        style={{
          fontSize: 13,
          lineHeight: 1.5,
          color: "#64748B",
          margin: "0 0 12px",
        }}
      >
        Record your progress, observations,
        questions, or next steps. Select
        Save Notes when you're ready to
        save your response.
      </p>

      <textarea
        id={`journey-response-${stageNumber}-${taskId}`}
        value={response}
        onChange={(event) =>
          handleChange(event.target.value)
        }
        disabled={
          disabled ||
          status === "loading" ||
          status === "saving"
        }
        placeholder="Write your notes here..."
        rows={5}
        maxLength={
          JOURNEY_RESPONSE_MAX_LENGTH
        }
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: 12,
          border: "1px solid #CBD5E1",
          borderRadius: 9,
          background: disabled
            ? "#F1F5F9"
            : "#FFFFFF",
          color: "#0F172A",
          fontSize: 14,
          lineHeight: 1.6,
          resize: "vertical",
          fontFamily: "inherit",
        }}
      />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 8,
          marginTop: 9,
        }}
      >
        <span
          style={{
            fontSize: 12,
            color: "#64748B",
          }}
        >
          {response.length.toLocaleString()}
          {" / "}
          {JOURNEY_RESPONSE_MAX_LENGTH.toLocaleString()}
          {" characters"}
        </span>

        <span
          role="status"
          style={{
            fontSize: 12,
            fontWeight: 600,
            color:
              status === "error"
                ? "#B91C1C"
                : status === "saved"
                  ? "#047857"
                  : hasUnsavedChanges
                    ? "#B45309"
                    : "#64748B",
          }}
        >
          {status === "loading" &&
            "Loading notes..."}

          {status === "saving" &&
            "Saving..."}

          {status === "saved" &&
            !hasUnsavedChanges &&
            "✓ Saved"}

          {status === "idle" &&
            hasUnsavedChanges &&
            "Unsaved changes"}

          {status === "idle" &&
            !hasUnsavedChanges &&
            "No unsaved changes"}

          {status === "error" &&
            "Save failed"}
        </span>
      </div>

      {errorMessage && (
        <div
          role="alert"
          style={{
            marginTop: 10,
            color: "#B91C1C",
            fontSize: 13,
          }}
        >
          {errorMessage}
        </div>
      )}

      {!disabled && (
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginTop: 16,
          }}
        >
          <button
            type="button"
            onClick={handleSave}
            disabled={
              status === "loading" ||
              status === "saving" ||
              !hasUnsavedChanges
            }
            style={{
              padding: "10px 20px",
              borderRadius: 9,
              border: "none",
              background:
                !hasUnsavedChanges
                  ? "#D1D5DB"
                  : "#204D6A",
              color:
                !hasUnsavedChanges
                  ? "#475569"
                  : "#FFFFFF",
              fontSize: 13,
              fontWeight: 700,
              cursor:
                !hasUnsavedChanges
                  ? "default"
                  : "pointer",
              opacity:
                status === "saving"
                  ? 0.65
                  : 1,
            }}
          >
            {status === "saving"
              ? "Saving..."
              : status === "saved" &&
                  !hasUnsavedChanges
                ? "✓ Saved"
                : "Save Notes"}
          </button>
        </div>
      )}

      {disabled && (
        <p
          style={{
            margin: "10px 0 0",
            color: "#64748B",
            fontSize: 12,
          }}
        >
          This response is read-only.
        </p>
      )}
    </div>
  );
}
