import type {
  PersonalizedJourney,
} from "../ai/journeyTypes";

import {
  CONCEPT_TERMS,
  SOURCE_WEIGHTS,
} from "./meetingPrioritizationConfig";

import type {
  JourneySignal,
  MeetingPreparationConcept,
} from "./meetingPrioritizationTypes";

/*
 * ============================================================
 * TEXT NORMALIZATION
 * ============================================================
 */

export function normalizeMeetingText(
  value: string | undefined | null
): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/*
 * ============================================================
 * BUILD JOURNEY SIGNALS
 * ============================================================
 *
 * Pulls the meaningful text from the validated Current Journey.
 *
 * IMPORTANT:
 *
 * This function does not create new facts or recommendations.
 * It only collects text that already exists in the Journey.
 * ============================================================
 */

export function buildJourneySignals(
  journey: PersonalizedJourney
): JourneySignal[] {
  const signals: JourneySignal[] = [];

  /*
   * ----------------------------------------------------------
   * CURRENT FOCUS
   * ----------------------------------------------------------
   *
   * AICurrentFocus uses:
   *
   *   title
   *   explanation
   *
   * The explanation is important because it often contains the
   * context that explains why the focus matters to this family.
   */

  const currentFocusText = [
    journey.currentFocus?.title,
    journey.currentFocus?.explanation,
  ]
    .filter(
      (value): value is string =>
        typeof value === "string" &&
        value.trim().length > 0
    )
    .join(" ")
    .trim();

  if (currentFocusText) {
    signals.push({
      source: "current_focus",
      text: currentFocusText,
      weight:
        SOURCE_WEIGHTS.current_focus,
    });
  }

  /*
   * ----------------------------------------------------------
   * NEXT STEP
   * ----------------------------------------------------------
   */

  const nextStepText = [
    journey.nextStep?.title,
    journey.nextStep?.description,
  ]
    .filter(
      (value): value is string =>
        typeof value === "string" &&
        value.trim().length > 0
    )
    .join(" ")
    .trim();

  if (nextStepText) {
    signals.push({
      source: "next_step",
      text: nextStepText,
      weight:
        SOURCE_WEIGHTS.next_step,
    });
  }

  /*
   * ----------------------------------------------------------
   * ACTIONS
   * ----------------------------------------------------------
   *
   * Include whyItMatters because it can contain useful context
   * that is not repeated in the shorter action instructions.
   */

  for (
    const action of journey.actions ?? []
  ) {
    const actionText = [
      action.title,
      action.whyItMatters,
      action.action,
      action.howTo,
      action.nextStep,
    ]
      .filter(
        (value): value is string =>
          typeof value === "string" &&
          value.trim().length > 0
      )
      .join(" ")
      .trim();

    if (!actionText) {
      continue;
    }

    signals.push({
      source: "action",
      text: actionText,
      weight:
        SOURCE_WEIGHTS.action,
    });
  }

  /*
   * ----------------------------------------------------------
   * INCOMPLETE TASKS
   * ----------------------------------------------------------
   *
   * Completed tasks should not continue driving preparation
   * priorities.
   */

  for (
    const task of journey.tasks ?? []
  ) {
    if (task.completed) {
      continue;
    }

    const taskText = [
      task.title,
      task.description,
    ]
      .filter(
        (value): value is string =>
          typeof value === "string" &&
          value.trim().length > 0
      )
      .join(" ")
      .trim();

    if (!taskText) {
      continue;
    }

    signals.push({
      source: "task",
      text: taskText,
      weight:
        SOURCE_WEIGHTS.task,
    });
  }

  return signals;
}

/*
 * ============================================================
 * TERM MATCHING
 * ============================================================
 *
 * We still use the trusted concept vocabulary from
 * meetingPrioritizationConfig.ts.
 *
 * This function improves matching without allowing the engine
 * to invent concepts.
 *
 * It supports:
 *
 *   1. Exact normalized phrase matching
 *   2. Small singular/plural wording differences
 *
 * It intentionally does NOT perform broad fuzzy matching.
 * Broad fuzzy matching could cause unrelated Journey language
 * to activate the wrong meeting-preparation concept.
 * ============================================================
 */

function termMatchesText(
  normalizedText: string,
  rawTerm: string
): boolean {
  const normalizedTerm =
    normalizeMeetingText(rawTerm);

  if (!normalizedTerm) {
    return false;
  }

  /*
   * Exact phrase contained in Journey text.
   */

  if (
    normalizedText.includes(
      normalizedTerm
    )
  ) {
    return true;
  }

  /*
   * ----------------------------------------------------------
   * TOKEN-AWARE FALLBACK
   * ----------------------------------------------------------
   *
   * This is intentionally conservative.
   *
   * For multi-word concept terms, every meaningful token must
   * be represented in the Journey text.
   *
   * Example:
   *
   *   concept term:
   *   "intake forms"
   *
   * can match:
   *   "forms requested for the intake"
   *
   * But a generic word such as "forms" by itself does not
   * activate unrelated concepts.
   */

  const termTokens =
    normalizedTerm
      .split(" ")
      .filter(
        (token) =>
          token.length >= 4
      );

  /*
   * Do not use token fallback for single-word terms.
   *
   * Single-word concepts remain exact matches to avoid
   * accidental overmatching.
   */

  if (termTokens.length < 2) {
    return false;
  }

  const textTokens =
    new Set(
      normalizedText
        .split(" ")
        .filter(Boolean)
    );

  return termTokens.every(
    (termToken) => {
      if (
        textTokens.has(termToken)
      ) {
        return true;
      }

      /*
       * Conservative singular/plural tolerance.
       */

      if (
        termToken.endsWith("s") &&
        textTokens.has(
          termToken.slice(0, -1)
        )
      ) {
        return true;
      }

      if (
        textTokens.has(
          `${termToken}s`
        )
      ) {
        return true;
      }

      return false;
    }
  );
}

/*
 * ============================================================
 * DETECT CONCEPTS
 * ============================================================
 */

export function detectConcepts(
  signal: JourneySignal
): MeetingPreparationConcept[] {
  const normalizedSignal =
    normalizeMeetingText(
      signal.text
    );

  if (!normalizedSignal) {
    return [];
  }

  const matches:
    MeetingPreparationConcept[] = [];

  for (
    const [concept, terms] of Object.entries(
      CONCEPT_TERMS
    ) as [
      MeetingPreparationConcept,
      string[]
    ][]
  ) {
    const matched =
      terms.some((term) =>
        termMatchesText(
          normalizedSignal,
          term
        )
      );

    if (matched) {
      matches.push(
        concept
      );
    }
  }

  return matches;
}

/*
 * ============================================================
 * SCORE JOURNEY CONCEPTS
 * ============================================================
 *
 * A concept receives the weight of each Journey signal in
 * which it appears.
 *
 * Example:
 *
 * If developmental history appears in:
 *
 *   Current Focus = 4
 *   Next Step     = 5
 *
 * its resulting concept score is 9.
 *
 * We count a concept only once per Journey signal even when
 * several vocabulary terms for the same concept appear in that
 * signal.
 * ============================================================
 */

export function scoreJourneyConcepts(
  signals: JourneySignal[]
): Map<
  MeetingPreparationConcept,
  number
> {
  const scores =
    new Map<
      MeetingPreparationConcept,
      number
    >();

  for (
    const signal of signals
  ) {
    const concepts =
      detectConcepts(
        signal
      );

    /*
     * detectConcepts already returns each concept only once,
     * but Set makes that guarantee explicit if the detector is
     * expanded later.
     */

    const uniqueConcepts =
      new Set(
        concepts
      );

      for (const concept of Array.from(uniqueConcepts)) {
        scores.set(
        concept,
        (
          scores.get(concept) ??
          0
        ) +
          signal.weight
      );
    }
  }

  return scores;
}