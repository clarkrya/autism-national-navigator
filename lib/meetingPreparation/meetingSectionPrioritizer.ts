import type {
  MeetingTemplateItem,
} from "../../types/meetingPreparation";

import {
  MINIMUM_MULTI_CONCEPT_SCORE,
  MINIMUM_PRIORITY_SCORE,
  TEMPLATE_ITEM_CONCEPTS,
} from "./meetingPrioritizationConfig";

import {
  isStageCompatible,
} from "./meetingStage";

import type {
  MeetingPreparationConcept,
  MeetingStage,
  PrioritizedMeetingTemplateSection,
} from "./meetingPrioritizationTypes";

/*
 * ============================================================
 * SCORE TEMPLATE ITEM
 * ============================================================
 *
 * Determines how strongly a trusted MeetingTemplate item
 * matches concepts detected in the child's Current Journey.
 *
 * The template item itself remains trusted content.
 * Journey context only determines whether it receives
 * additional emphasis.
 * ============================================================
 */

function scoreTemplateItem(
  item: MeetingTemplateItem,
  conceptScores: Map<
    MeetingPreparationConcept,
    number
  >
): {
  score: number;
  matchedConcepts: MeetingPreparationConcept[];
} {
  const concepts =
    TEMPLATE_ITEM_CONCEPTS[item.id] ?? [];

  let score = 0;

  const matchedConcepts:
    MeetingPreparationConcept[] = [];

  for (const concept of concepts) {
    const conceptScore =
      conceptScores.get(concept) ?? 0;

    if (conceptScore <= 0) {
      continue;
    }

    score += conceptScore;

    matchedConcepts.push(
      concept
    );
  }

  return {
    score,
    matchedConcepts,
  };
}

/*
 * ============================================================
 * PRIORITY QUALIFICATION
 * ============================================================
 *
 * An item may qualify in either of two ways:
 *
 * 1. A strong Journey match reaches the normal priority
 *    threshold.
 *
 * 2. Multiple Journey concepts collectively provide enough
 *    evidence to reach the multi-concept threshold.
 *
 * Stage compatibility is evaluated separately.
 * ============================================================
 */

function qualifiesForPriority(
  score: number,
  matchedConcepts: MeetingPreparationConcept[]
): boolean {
  if (
    score >=
    MINIMUM_PRIORITY_SCORE
  ) {
    return true;
  }

  if (
    matchedConcepts.length >= 2 &&
    score >=
      MINIMUM_MULTI_CONCEPT_SCORE
  ) {
    return true;
  }

  return false;
}

/*
 * ============================================================
 * PRIORITIZE TEMPLATE SECTION
 * ============================================================
 *
 * Scores each trusted item, applies Journey-stage safeguards,
 * and separates the section into:
 *
 * - prioritized
 * - additional
 *
 * IMPORTANT:
 *
 * Items that are not Journey-prioritized are never removed.
 * They remain available as Additional trusted items.
 *
 * We intentionally do NOT apply a blanket stage to an entire
 * section. Individual trusted items are evaluated against the
 * Current Journey through isStageCompatible().
 *
 * This allows useful "Before You Leave" items to be emphasized
 * while a family is preparing for an upcoming meeting, without
 * automatically promoting unrelated post-meeting content.
 * ============================================================
 */

export function prioritizeSection(
  items: MeetingTemplateItem[],
  conceptScores: Map<
    MeetingPreparationConcept,
    number
  >,
  maximumPrioritized: number,
  currentStage: MeetingStage
): PrioritizedMeetingTemplateSection {
  /*
   * STEP 1
   * Score every trusted template item.
   */
  const scoredItems =
    items.map(
      (
        item,
        originalIndex
      ) => {
        const {
          score,
          matchedConcepts,
        } = scoreTemplateItem(
          item,
          conceptScores
        );

        return {
          id: item.id,
          text: item.text,
          score,
          prioritized: false,
          matchedConcepts,
          originalIndex,
        };
      }
    );

  /*
   * STEP 2
   * Identify items that:
   *
   * - meet the Journey relevance threshold, and
   * - are compatible with the Journey's current meeting stage.
   */
  const eligible =
    scoredItems
      .filter(
        (item) =>
          qualifiesForPriority(
            item.score,
            item.matchedConcepts
          ) &&
          isStageCompatible(
            item.id,
            item.matchedConcepts,
            currentStage
          )
      )
      .sort(
        (a, b) => {
          /*
           * Stronger Journey score wins first.
           */
          if (
            b.score !==
            a.score
          ) {
            return (
              b.score -
              a.score
            );
          }

          /*
           * If scores tie, prefer the item supported by more
           * distinct Journey concepts.
           */
          if (
            b.matchedConcepts.length !==
            a.matchedConcepts.length
          ) {
            return (
              b.matchedConcepts.length -
              a.matchedConcepts.length
            );
          }

          /*
           * Final tie-breaker preserves trusted template order.
           */
          return (
            a.originalIndex -
            b.originalIndex
          );
        }
      );

  /*
   * STEP 3
   * Respect the maximum number of emphasized items allowed
   * within the section.
   */
  const prioritizedIds =
    new Set(
      eligible
        .slice(
          0,
          maximumPrioritized
        )
        .map(
          (item) =>
            item.id
        )
    );

  /*
   * STEP 4
   * Build the Journey-prioritized group.
   */
  const prioritized =
    eligible
      .filter(
        (item) =>
          prioritizedIds.has(
            item.id
          )
      )
      .map(
        (item) => ({
          id: item.id,
          text: item.text,
          score: item.score,
          prioritized: true,
          matchedConcepts:
            item.matchedConcepts,
        })
      );

  /*
   * STEP 5
   * Preserve every remaining trusted item.
   *
   * These items remain visible under Additional trusted items
   * rather than being discarded.
   */
  const additional =
    scoredItems
      .filter(
        (item) =>
          !prioritizedIds.has(
            item.id
          )
      )
      .sort(
        (a, b) =>
          a.originalIndex -
          b.originalIndex
      )
      .map(
        (item) => ({
          id: item.id,
          text: item.text,
          score: item.score,
          prioritized: false,
          matchedConcepts:
            item.matchedConcepts,
        })
      );

  return {
    prioritized,
    additional,
  };
}