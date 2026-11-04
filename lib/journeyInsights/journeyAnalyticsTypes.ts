/*
 * MYRIAD JOURNEY ANALYTICS TYPES
 *
 * Shared types for collecting structured Journey activity
 * that can later support de-identified, aggregate Journey
 * Insights across Myriad families.
 *
 * IMPORTANT:
 * These records represent product/Journey activity.
 * They must not contain free-text family notes, document
 * contents, medical records, or other unnecessary sensitive
 * information.
 */

/*
 * ============================================================
 * ANALYTICS EVENT TYPES
 * ============================================================
 */

export type JourneyAnalyticsEventType =
  | "journey_started"
  | "stage_started"
  | "task_completed"
  | "task_uncompleted"
  | "stage_completed"
  | "resource_opened"
  | "template_used";

/*
 * ============================================================
 * JOURNEY FOCUS
 * ============================================================
 *
 * Broad standardized areas that can eventually be used
 * for aggregate comparisons.
 *
 * Keep these values stable because they may be stored
 * in Firestore.
 */

export type JourneyInsightFocus =
  | "diagnosis_evaluation"
  | "medical"
  | "school_iep"
  | "therapy"
  | "insurance_benefits"
  | "financial_support"
  | "family_support"
  | "transition"
  | "general"
  | "other";

/*
 * ============================================================
 * AGE BANDS
 * ============================================================
 *
 * Aggregate age ranges are intentionally broader than
 * storing age directly in analytics events.
 */

export type JourneyInsightAgeBand =
  | "0_3"
  | "4_5"
  | "6_9"
  | "10_13"
  | "14_17"
  | "18_plus"
  | "unknown";

/*
 * ============================================================
 * EVENT CONTEXT
 * ============================================================
 */

export interface JourneyAnalyticsContext {
  /*
   * Permanent Journey identifier.
   *
   * This lets Myriad understand progression across stages
   * belonging to the same Journey.
   */
  journeyId: string;

  /*
   * Current Journey stage.
   */
  stageNumber: number;

  /*
   * Broad Journey focus when known.
   */
  focus?: JourneyInsightFocus;

  /*
   * Broad age band used for future aggregate cohorts.
   */
  ageBand?: JourneyInsightAgeBand;
}

/*
 * ============================================================
 * EVENT
 * ============================================================
 */

export interface JourneyAnalyticsEvent {
  /*
   * Unique event identifier.
   */
  id: string;

  /*
   * Type of Journey activity.
   */
  eventType: JourneyAnalyticsEventType;

  /*
   * Firebase UID.
   *
   * This is used for ownership/deduplication in the raw
   * event store. User-facing aggregate results must never
   * expose this value.
   */
  userId: string;

  /*
   * Saved child identifier.
   *
   * Used to keep multiple children on one account separate.
   * User-facing aggregate results must never expose it.
   */
  childId: string;

  /*
   * Journey context at the time of the event.
   */
  context: JourneyAnalyticsContext;

  /*
   * Structured task identifier when the event concerns
   * a Journey task.
   */
  taskId?: string;

  /*
   * Structured resource identifier when the event concerns
   * a resource.
   */
  resourceId?: string;

  /*
   * Structured template identifier when the event concerns
   * Meeting Preparation or another Myriad template.
   */
  templateId?: string;

  /*
   * Event timestamp represented as milliseconds since
   * Unix epoch.
   */
  occurredAt: number;

  /*
   * Allows future schema changes without breaking
   * existing analytics records.
   */
  schemaVersion: 1;
}

/*
 * ============================================================
 * CREATE EVENT INPUT
 * ============================================================
 *
 * The repository will generate:
 * - event ID
 * - occurredAt
 * - schemaVersion
 */

export interface CreateJourneyAnalyticsEventInput {
  eventType: JourneyAnalyticsEventType;

  userId: string;

  childId: string;

  context: JourneyAnalyticsContext;

  taskId?: string;

  resourceId?: string;

  templateId?: string;
}

/*
 * ============================================================
 * AGGREGATE COHORT
 * ============================================================
 *
 * This describes a comparison group without exposing
 * individual families.
 */

export interface JourneyInsightCohort {
  focus?: JourneyInsightFocus;

  ageBand?: JourneyInsightAgeBand;

  stageNumber?: number;
}

/*
 * ============================================================
 * AGGREGATE METRIC
 * ============================================================
 */

export interface JourneyAggregateMetric {
  /*
   * Machine-readable metric identifier.
   */
  metricKey: string;

  /*
   * Number of distinct families represented.
   */
  cohortSize: number;

  /*
   * Numeric aggregate value.
   *
   * Example:
   * 64 for a 64% completion rate.
   *
   * This must come from actual stored Myriad activity.
   */
  value: number;

  /*
   * Unit clarifies how the value should be interpreted.
   */
  unit:
    | "percent"
    | "count"
    | "days";

  /*
   * Cohort used to calculate the metric.
   */
  cohort: JourneyInsightCohort;

  /*
   * Timestamp of the aggregate calculation.
   */
  calculatedAt: number;
}

/*
 * ============================================================
 * COMPARISON AVAILABILITY
 * ============================================================
 *
 * Myriad should not show aggregate comparisons until the
 * cohort meets the configured minimum sample requirement.
 */

export type JourneyComparisonAvailability =
  | {
      available: true;
      cohortSize: number;
    }
  | {
      available: false;
      cohortSize: number;
      reason:
        | "insufficient_data"
        | "no_matching_cohort";
    };