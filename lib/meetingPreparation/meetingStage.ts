import type {
  JourneySignal,
  MeetingPreparationConcept,
  MeetingStage,
} from "./meetingPrioritizationTypes";

import {
  normalizeMeetingText,
} from "./meetingJourneySignals";

/*
 * ============================================================
 * MEETING STAGE DETECTION
 * ============================================================
 *
 * Determines whether the Current Journey appears to be:
 *
 *   - before the meeting
 *   - during the meeting
 *   - after the meeting
 *   - unknown
 *
 * This stage information is used only to prevent trusted
 * MeetingTemplate items from being prioritized at the wrong
 * point in the family's Journey.
 *
 * IMPORTANT:
 *
 * Stage detection does NOT generate new meeting advice.
 *
 * The trusted MeetingTemplate remains the source of truth.
 * ============================================================
 */

const BEFORE_STAGE_TERMS = [
  "schedule an appointment",
  "schedule the appointment",
  "schedule a visit",
  "schedule the visit",
  "request an appointment",
  "request intake",
  "intake date",
  "intake dates",
  "intake appointment",
  "confirm an intake appointment",
  "secure an intake",
  "join the waitlist",
  "waitlist",
  "before the appointment",
  "before the visit",
  "before the evaluation",
  "pre-visit",
  "pre visit",
  "pre-appointment",
  "pre appointment",
  "prepare for the appointment",
  "prepare for the visit",
  "prepare for the evaluation",
  "prepare materials",
  "prepare the materials",
  "intake packet",
  "intake forms",
  "submission instructions",
  "submit before",
  "send before",
  "provide before",
  "complete before",
];

const DURING_STAGE_TERMS = [
  "during the appointment",
  "during the visit",
  "during the evaluation",
  "at the appointment",
  "at the visit",
  "at the evaluation",
  "in the appointment",
  "in the visit",
  "meeting today",
  "appointment today",
  "visit today",
  "evaluation today",
  "discuss during",
  "ask during",
];

const AFTER_STAGE_TERMS = [
  "after the appointment",
  "after the visit",
  "after the evaluation",
  "after the meeting",
  "after receiving the results",
  "after receiving the report",
  "once the report is received",
  "once you receive the report",
  "review the results",
  "discuss the results",
  "receive the results",
  "results appointment",
  "results discussion",
  "final report",
  "follow-up appointment",
  "follow up appointment",
  "follow-up meeting",
  "follow up meeting",
  "schedule follow-up",
  "schedule a follow-up",
  "follow up after",
  "follow-up after",
];

/*
 * Concepts that generally describe things that happen
 * after the meeting/evaluation.
 *
 * When the Current Journey is clearly before the meeting,
 * an item made up entirely of these concepts should not be
 * promoted merely because the same words appear elsewhere
 * in the Journey.
 */
const AFTER_STAGE_CONCEPTS =
  new Set<MeetingPreparationConcept>([
    "results",
    "written_report",
    "recommendations",
    "follow_up",
  ]);

/*
 * Concepts that are primarily relevant before the meeting.
 *
 * When the Journey is clearly after the meeting, an item
 * made up entirely of these concepts should not be promoted.
 */
const BEFORE_ONLY_CONCEPTS =
  new Set<MeetingPreparationConcept>([
    "appointment_scheduling",
    "clinic_requirements",
    "forms_questionnaires",
  ]);

/*
 * ============================================================
 * DETECT CURRENT MEETING STAGE
 * ============================================================
 */

export function detectMeetingStage(
  signals: JourneySignal[]
): MeetingStage {
  let beforeScore = 0;
  let duringScore = 0;
  let afterScore = 0;

  for (const signal of signals) {
    const text =
      normalizeMeetingText(signal.text);

    const hasBeforeSignal =
      BEFORE_STAGE_TERMS.some((term) =>
        text.includes(
          normalizeMeetingText(term)
        )
      );

    const hasDuringSignal =
      DURING_STAGE_TERMS.some((term) =>
        text.includes(
          normalizeMeetingText(term)
        )
      );

    const hasAfterSignal =
      AFTER_STAGE_TERMS.some((term) =>
        text.includes(
          normalizeMeetingText(term)
        )
      );

    if (hasBeforeSignal) {
      beforeScore += signal.weight;
    }

    if (hasDuringSignal) {
      duringScore += signal.weight;
    }

    if (hasAfterSignal) {
      afterScore += signal.weight;
    }
  }

  const highestScore = Math.max(
    beforeScore,
    duringScore,
    afterScore
  );

  if (highestScore <= 0) {
    return "unknown";
  }

  /*
   * In a tie, favor the most immediate/preparatory stage.
   *
   * This prevents future-looking language such as
   * "results" or "follow-up" from overpowering a Journey
   * that is clearly focused on getting ready for an
   * upcoming appointment.
   */
  if (beforeScore === highestScore) {
    return "before";
  }

  if (duringScore === highestScore) {
    return "during";
  }

  return "after";
}

/*
 * ============================================================
 * STAGE COMPATIBILITY
 * ============================================================
 *
 * Determines whether a trusted template item is appropriate
 * to PRIORITIZE at the Journey's current meeting stage.
 *
 * Returning false does NOT remove the trusted item.
 *
 * The item remains available in Additional trusted items.
 * ============================================================
 */

export function isStageCompatible(
  itemId: string,
  matchedConcepts: MeetingPreparationConcept[],
  currentStage: MeetingStage
): boolean {
  /*
   * If stage cannot be determined confidently, do not
   * suppress prioritization based on stage alone.
   */
  if (currentStage === "unknown") {
    return true;
  }

  /*
   * ========================================================
   * BEFORE THE MEETING
   * ========================================================
   */

  if (currentStage === "before") {
    /*
     * If every matched concept is specifically about
     * post-meeting results, reports, recommendations, or
     * follow-up, the item should not be promoted while the
     * family is still preparing for the appointment.
     *
     * We intentionally use every() rather than some().
     *
     * A valid pre-appointment item may legitimately contain
     * one future-oriented concept while still being strongly
     * relevant to preparation.
     */
    if (
      matchedConcepts.length > 0 &&
      matchedConcepts.every((concept) =>
        AFTER_STAGE_CONCEPTS.has(concept)
      )
    ) {
      return false;
    }

    /*
     * ------------------------------------------------------
     * DIAGNOSTIC / EVALUATION SAFEGUARDS
     * ------------------------------------------------------
     *
     * These checks use the stable semantic IDs from the
     * trusted Diagnostic / Evaluation MeetingTemplate.
     *
     * They prevent generic Journey language from promoting
     * a trusted item at the wrong stage.
     */

    /*
     * The Journey may say "contact the clinic" while the
     * family is arranging intake.
     *
     * That is NOT evidence that a post-results contact
     * question should be prioritized.
     */
    if (
      itemId ===
      "evaluation-question-results-contact"
    ) {
      return false;
    }

    /*
     * The same generic "contact" concept can otherwise
     * promote the closing item asking who to contact after
     * the appointment or after receiving the report.
     *
     * During a clearly pre-appointment Journey, keep this
     * trusted item available under Additional trusted items
     * instead of promoting it.
     */
    if (
      itemId ===
      "evaluation-close-contact"
    ) {
      return false;
    }

    /*
     * The Current Journey may contain an existing referral,
     * referral records, or instructions related to getting
     * into the diagnostic clinic.
     *
     * An incoming referral is NOT evidence that the family
     * currently needs the closing item about future
     * recommendations or referrals.
     */
    if (
      itemId ===
      "evaluation-close-recommendations"
    ) {
      return false;
    }

    /*
     * The Journey may contain pre-appointment records,
     * forms, intake materials, developmental history, or
     * other documents that need to be submitted before the
     * evaluation.
     *
     * That overlap should NOT promote the closing item that
     * asks whether additional information is needed after
     * the meeting.
     */
    if (
      itemId ===
      "evaluation-close-additional-information"
    ) {
      return false;
    }
  }

  /*
   * ========================================================
   * AFTER THE MEETING
   * ========================================================
   */

  if (currentStage === "after") {
    /*
     * If every matched concept is specifically about
     * scheduling, clinic requirements, or pre-visit forms,
     * the item should not be promoted after the meeting has
     * already occurred.
     *
     * The trusted item still remains available under
     * Additional trusted items.
     */
    if (
      matchedConcepts.length > 0 &&
      matchedConcepts.every((concept) =>
        BEFORE_ONLY_CONCEPTS.has(concept)
      )
    ) {
      return false;
    }
  }

  /*
   * No stage conflict was found.
   */
  return true;
}