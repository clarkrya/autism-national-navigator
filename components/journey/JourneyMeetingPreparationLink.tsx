"use client";

import Link from "next/link";

import type {
  PersonalizedJourney,
} from "../../lib/ai/journeyTypes";

import {
  detectMeetingType,
} from "../../lib/meetingPreparation/detectMeetingType";

import {
  useAccountEntitlements,
} from "../../lib/useAccountEntitlements";

import { auth } from "../../lib/firebase";

type Props = {
  childId: string;
  childName: string;
  taskId: string;
  journey: PersonalizedJourney;
};

export default function JourneyMeetingPreparationLink({
  childId,
  childName,
  taskId,
  journey,
}: Props) {
  const { isPremium } = useAccountEntitlements();

  const canAccessMeetingPreparation =
    Boolean(auth.currentUser) && isPremium;

  const task = (journey.tasks || []).find(
    (item) => item.id === taskId
  );

  if (!childId || !task) {
    return null;
  }

  const taskFocusedJourney: PersonalizedJourney = {
    ...journey,
    currentFocus: {
      title: task.title,
      explanation: task.description,
    },
    nextStep: {
      title: task.title,
      description: task.description,
    },
    actions: [],
    tasks: [task],
  };

  const recommendation = detectMeetingType(
    taskFocusedJourney,
    childName
  );

  if (!recommendation) {
    return null;
  }

  const buttonStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    marginTop: 12,
    padding: "10px 14px",
    borderRadius: 9,
    fontSize: 13,
    fontWeight: 700,
    textDecoration: "none",
  };

  if (!canAccessMeetingPreparation) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <button
          type="button"
          disabled
          title="Available with Autivoya Premium"
          style={{
            ...buttonStyle,
            background: "#F1F5F9",
            border: "1px solid #E2E8F0",
            color: "#64748B",
            cursor: "not-allowed",
          }}
        >
          🔒 Prepare for Meeting
        </button>

        <span
          style={{
            marginTop: 12,
            color: "#64748B",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          Premium Feature
        </span>
      </div>
    );
  }

  const params = new URLSearchParams({
    childId,
    taskId,
  });

  return (
    <Link
      href={`/meeting-preparation?${params.toString()}`}
      style={{
        ...buttonStyle,
        background: "#EAF6F5",
        border: "1px solid #CDE7E5",
        color: "#204D6A",
      }}
    >
      Prepare for Meeting →
    </Link>
  );
}