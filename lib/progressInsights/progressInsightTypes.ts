/*
 * MYRIAD PROGRESS INSIGHTS TYPES
 *
 * Shared types for family progress insights.
 *
 * Progress Insights are derived from saved Journey information.
 * They should summarize progress without diagnosing, predicting
 * outcomes, or replacing professional guidance.
 */

import type { AIPriority } from "../ai/journeyTypes";

/*
 * ============================================================
 * INSIGHT CATEGORY
 * ============================================================
 */

export type ProgressInsightCategory =
  | "progress"
  | "momentum"
  | "focus"
  | "support"
  | "next_step";

/*
 * ============================================================
 * INSIGHT STATUS
 * ============================================================
 */

export type ProgressInsightStatus =
  | "positive"
  | "attention"
  | "informational";

/*
 * ============================================================
 * SINGLE PROGRESS INSIGHT
 * ============================================================
 */

export interface ProgressInsight {
  /*
   * Stable identifier used by the UI.
   */
  id: string;

  /*
   * Type of insight being presented.
   */
  category: ProgressInsightCategory;

  /*
   * Short family-friendly heading.
   */
  title: string;

  /*
   * Plain-language explanation of the insight.
   */
  summary: string;

  /*
   * Optional suggested action.
   *
   * This should remain practical and non-diagnostic.
   */
  suggestedAction?: string;

  /*
   * Optional Journey priority associated with the insight.
   */
  priority?: AIPriority;

  /*
   * Presentation status used by the UI.
   */
  status: ProgressInsightStatus;
}

/*
 * ============================================================
 * PROGRESS COUNTS
 * ============================================================
 */

export interface ProgressInsightCounts {
  /*
   * Total number of Journey tasks considered.
   */
  totalTasks: number;

  /*
   * Number of tasks the family has completed.
   */
  completedTasks: number;

  /*
   * Number of tasks that remain incomplete.
   */
  remainingTasks: number;

  /*
   * Percentage of Journey tasks completed.
   *
   * Expected range: 0–100.
   */
  completionPercentage: number;
}

/*
 * ============================================================
 * JOURNEY PROGRESS SUMMARY
 * ============================================================
 */

export interface JourneyProgressSummary {
  /*
   * Child this progress summary belongs to.
   */
  childId: string;

  /*
   * Family-friendly child name when available.
   */
  childName?: string;

  /*
   * Current Journey stage number when available.
   */
  stageNumber?: number;

  /*
   * Current Journey identifier when available.
   */
  journeyId?: string;

  /*
   * Calculated task progress.
   */
  counts: ProgressInsightCounts;

  /*
   * Generated family-facing insights.
   */
  insights: ProgressInsight[];

  /*
   * Timestamp represented as milliseconds since Unix epoch.
   */
  generatedAt: number;
}

/*
 * ============================================================
 * PROGRESS INSIGHT SOURCE
 * ============================================================
 *
 * Identifies the information used to produce an insight.
 * This gives us room later to distinguish Journey-derived
 * insights from other family activity without changing the
 * ProgressInsight shape.
 */

export type ProgressInsightSource =
  | "current_journey"
  | "journey_history";

/*
 * ============================================================
 * PROGRESS INSIGHT INPUT
 * ============================================================
 */

export interface ProgressInsightInput {
  childId: string;
  childName?: string;
  journeyId?: string;
  stageNumber?: number;

  totalTasks: number;
  completedTaskIds: string[];

  source: ProgressInsightSource;
}