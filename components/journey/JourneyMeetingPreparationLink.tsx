
"use client";

import Link from "next/link";

import type {
  PersonalizedJourney,
} from "../../lib/ai/journeyTypes";

import {
  detectMeetingType,
} from "../../lib/meetingPreparation/detectMeetingType";

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

  const params = new URLSearchParams({
    childId,
    taskId,
  });

  return (
    <Link
      href={`/meeting-preparation?${params.toString()}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        marginTop: 12,
        padding: "10px 14px",
        borderRadius: 9,
        background: "#EAF6F5",
        border: "1px solid #CDE7E5",
        color: "#204D6A",
        fontSize: 13,
        fontWeight: 700,
        textDecoration: "none",
      }}
    >
      Prepare for Meeting →
    </Link>
  );
}
