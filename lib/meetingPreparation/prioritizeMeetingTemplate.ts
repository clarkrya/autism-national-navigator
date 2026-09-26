/*
 * ============================================================
 * JOURNEY-AWARE MEETING TEMPLATE PRIORITIZER
 * ============================================================
 *
 * Personalizes Meeting Preparation by identifying which
 * trusted MeetingTemplate items are most relevant to the
 * child's Current Journey.
 *
 * IMPORTANT:
 *
 * This engine does NOT generate new meeting advice.
 *
 * The trusted MeetingTemplate remains the source of truth.
 * Journey context only determines which trusted items receive
 * additional emphasis.
 *
 * ============================================================
 */

import type {
  PersonalizedJourney,
} from "../ai/journeyTypes";

import type {
  MeetingRecommendation,
  MeetingTemplate,
} from "../../types/meetingPreparation";

import {
  getMeetingTemplate,
} from "../../data/meetingTemplates";

import {
  MAXIMUM_PRIORITIZED_PER_SECTION,
} from "./meetingPrioritizationConfig";

import {
  buildJourneySignals,
  scoreJourneyConcepts,
} from "./meetingJourneySignals";

import {
  detectMeetingStage,
} from "./meetingStage";

import {
  prioritizeSection,
} from "./meetingSectionPrioritizer";

import type {
  PrioritizedMeetingTemplate,
  PrioritizedMeetingTemplateItem,
  PrioritizedMeetingTemplateSection,
} from "./meetingPrioritizationTypes";

/*
 * Re-export these types so existing files importing them
 * from prioritizeMeetingTemplate.ts do not need to change.
 */
export type {
  PrioritizedMeetingTemplate,
  PrioritizedMeetingTemplateItem,
  PrioritizedMeetingTemplateSection,
} from "./meetingPrioritizationTypes";

/*
 * ============================================================
 * RECOMMENDATION VALIDATION
 * ============================================================
 */

function validateRecommendation(
  recommendation: MeetingRecommendation
): void {
  /*
   * General is intended primarily for manual preparation.
   *
   * An uncertain Journey should not silently become an
   * automatic General meeting recommendation.
   */
  if (
    recommendation.meetingType ===
    "general"
  ) {
    throw new Error(
      "A Journey-based Meeting Recommendation cannot automatically use the general template."
    );
  }
}

/*
 * ============================================================
 * MAIN PRIORITIZATION ENGINE
 * ============================================================
 */

export function prioritizeMeetingTemplate(
  journey: PersonalizedJourney,
  recommendation: MeetingRecommendation
): PrioritizedMeetingTemplate {
  /*
   * STEP 1
   * Validate the Journey-generated recommendation.
   */
  validateRecommendation(
    recommendation
  );

  /*
   * STEP 2
   * Retrieve the trusted Meeting Preparation template.
   */
  const template: MeetingTemplate =
    getMeetingTemplate(
      recommendation.meetingType
    );

  /*
   * STEP 3
   * Build weighted Journey signals.
   *
   * These signals come from relevant portions of the child's
   * Current Journey, such as:
   *
   * - current focus
   * - next step
   * - Journey actions
   * - open Journey tasks
   */
  const signals =
    buildJourneySignals(
      journey
    );

  /*
   * STEP 4
   * Convert Journey signals into Meeting Preparation
   * concept scores.
   *
   * These scores determine which trusted template items
   * are most relevant to the family's Current Journey.
   */
  const conceptScores =
    scoreJourneyConcepts(
      signals
    );

  /*
   * STEP 5
   * Determine where the family currently is relative to
   * the meeting.
   *
   * Possible stages:
   *
   * - before
   * - during
   * - after
   * - unknown
   *
   * Stage is used as a safeguard against inappropriate
   * prioritization. It does not determine whether an entire
   * template section is allowed to participate.
   */
  const currentStage =
    detectMeetingStage(
      signals
    );

  /*
   * STEP 6
   * Prioritize trusted items within each section.
   *
   * Each section uses the same Journey concept scores and
   * current meeting stage.
   *
   * Individual items are responsible for passing relevance
   * and stage-compatibility checks.
   */

  const priorities =
    prioritizeSection(
      template.priorities,
      conceptScores,
      MAXIMUM_PRIORITIZED_PER_SECTION,
      currentStage
    );

  const questions =
    prioritizeSection(
      template.questions,
      conceptScores,
      MAXIMUM_PRIORITIZED_PER_SECTION,
      currentStage
    );

  const bringItems =
    prioritizeSection(
      template.bringItems,
      conceptScores,
      MAXIMUM_PRIORITIZED_PER_SECTION,
      currentStage
    );

  const informationToShare =
    prioritizeSection(
      template.informationToShare,
      conceptScores,
      MAXIMUM_PRIORITIZED_PER_SECTION,
      currentStage
    );

  /*
   * BEFORE YOU LEAVE
   *
   * This section intentionally participates in Journey
   * prioritization even when the family is currently preparing
   * before the meeting.
   *
   * A family may benefit from knowing in advance which
   * questions or confirmations will be especially important
   * before leaving the appointment.
   *
   * We therefore do NOT apply a blanket "during" restriction
   * to this section.
   *
   * Individual items still pass through the same scoring and
   * stage-compatibility safeguards used throughout Meeting
   * Preparation.
   */
  const beforeYouLeave =
    prioritizeSection(
      template.beforeYouLeave,
      conceptScores,
      MAXIMUM_PRIORITIZED_PER_SECTION,
      currentStage
    );

  /*
   * STEP 7
   * Return the trusted template with Journey-aware
   * prioritization applied.
   *
   * No trusted template items are removed.
   *
   * Items that receive Journey emphasis appear as prioritized.
   * Remaining trusted items stay available as Additional
   * trusted items.
   */
  return {
    meetingType:
      template.type,

    title:
      template.title,

    description:
      template.description,

    recommendation,

    priorities,

    questions,

    bringItems,

    informationToShare,

    beforeYouLeave,
  };
}