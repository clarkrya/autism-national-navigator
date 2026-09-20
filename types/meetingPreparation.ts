/*
 * ============================================================
 * MEETING PREPARATION TYPES
 * ============================================================
 *
 * Shared types for Myriad's Meeting Preparation feature.
 *
 * Meeting Preparation uses the child's validated Current Journey
 * to recommend an appropriate meeting template.
 *
 * Trusted templates provide the base structure.
 * Personalization may prioritize that trusted structure based on
 * the family's Current Journey and context without inventing
 * requirements, diagnoses, history, or other facts.
 * ============================================================
 */


/*
 * ============================================================
 * MEETING TYPES
 * ============================================================
 */

export type MeetingType =
  | "diagnostic_evaluation"
  | "doctor_specialist"
  | "therapy"
  | "school_iep"
  | "insurance_benefits"
  | "general";


/*
 * ============================================================
 * MEETING RECOMMENDATION
 * ============================================================
 *
 * Represents a meeting opportunity detected from the child's
 * Current Journey.
 *
 * A recommendation should only be shown when the Journey
 * provides enough evidence to reasonably identify the type
 * of interaction the family may need to prepare for.
 * ============================================================
 */

export type MeetingRecommendationSource =
  | "current_focus"
  | "next_step"
  | "action"
  | "task"
  | "multiple";


export type MeetingRecommendationConfidence =
  | "high"
  | "medium";


export type MeetingRecommendation = {
  meetingType:
    MeetingType;

  title:
    string;

  reason:
    string;

  source:
    MeetingRecommendationSource;

  /*
   * IDs of Journey actions or tasks that contributed to the
   * recommendation, when applicable.
   */
  sourceIds?:
    string[];

  confidence:
    MeetingRecommendationConfidence;
};


/*
 * ============================================================
 * TRUSTED TEMPLATE ITEM
 * ============================================================
 *
 * Every item in a trusted Meeting Preparation template receives
 * a stable semantic ID.
 *
 * WHY:
 *
 * Personalization should prioritize trusted concepts rather
 * than depend on the exact wording of a sentence.
 *
 * Example:
 *
 *   {
 *     id: "evaluation-what-to-expect",
 *     text: "What should we expect during the evaluation?"
 *   }
 *
 * The text may later be improved without changing the semantic
 * identity of the item.
 *
 * IMPORTANT:
 *
 * Once a template item ID is used in saved Meeting Plans or
 * personalization rules, avoid changing that ID unless there is
 * a deliberate migration.
 * ============================================================
 */

export type MeetingTemplateItem = {
  id:
    string;

  text:
    string;
};


/*
 * ============================================================
 * TRUSTED MEETING TEMPLATE
 * ============================================================
 *
 * These templates provide the protected foundation for a
 * Meeting Plan.
 *
 * The Current Journey may determine which trusted items are
 * emphasized or shown first.
 *
 * The trusted template remains the source of truth for the
 * preparation content.
 *
 * AI or other personalization logic should not silently turn
 * optional suggestions into requirements or invent facts about
 * the family, child, provider, clinic, school, therapist, or
 * insurance plan.
 * ============================================================
 */

export type MeetingTemplate = {
  type:
    MeetingType;

  title:
    string;

  description:
    string;

  /*
   * Core priorities commonly useful for this type of meeting.
   */
  priorities:
    MeetingTemplateItem[];

  /*
   * Questions the family may want to ask.
   */
  questions:
    MeetingTemplateItem[];

  /*
   * Items the family may want to consider bringing.
   *
   * These are suggestions unless a trusted source specifically
   * confirms that an item is required.
   */
  bringItems:
    MeetingTemplateItem[];

  /*
   * Information the family may want to be prepared to discuss.
   */
  informationToShare:
    MeetingTemplateItem[];

  /*
   * Questions or confirmations that help close the loop before
   * the family leaves the meeting.
   */
  beforeYouLeave:
    MeetingTemplateItem[];
};


/*
 * ============================================================
 * MEETING PLAN ITEM
 * ============================================================
 *
 * Used for editable/checkable items in a generated Meeting Plan.
 *
 * "source" allows the application to distinguish trusted
 * template content from personalized suggestions or items
 * added directly by the family.
 * ============================================================
 */

export type MeetingPlanItemSource =
  | "template"
  | "personalized"
  | "family";


export type MeetingPlanItem = {
  id:
    string;

  text:
    string;

  completed:
    boolean;

  source:
    MeetingPlanItemSource;
};


/*
 * ============================================================
 * MEETING NOTE SECTION
 * ============================================================
 *
 * Provides structured areas where the family can enter their
 * own information before or during the meeting.
 * ============================================================
 */

export type MeetingNoteSection = {
  id:
    string;

  title:
    string;

  prompt?:
    string;

  value:
    string;
};


/*
 * ============================================================
 * JOURNEY CONTEXT
 * ============================================================
 *
 * A small snapshot of the Journey that led to the Meeting Plan.
 *
 * We intentionally do not duplicate the complete Journey here.
 * The Meeting Plan only stores enough context to explain why
 * the preparation was created.
 * ============================================================
 */

export type MeetingJourneyContext = {
  journeyId:
    string;

  currentFocus:
    string;

  nextStep:
    string;

  /*
   * Journey actions/tasks that were particularly relevant to
   * the meeting recommendation.
   */
  relatedActionIds?:
    string[];

  relatedTaskIds?:
    string[];
};


/*
 * ============================================================
 * MEETING PLAN STATUS
 * ============================================================
 */

export type MeetingPlanStatus =
  | "upcoming"
  | "completed";


/*
 * ============================================================
 * SAVED MEETING PLAN
 * ============================================================
 *
 * Child-scoped Meeting Plans will eventually be stored at:
 *
 * users/{userId}/children/{childId}/meetingPlans/{meetingPlanId}
 * ============================================================
 */

export type SavedMeetingPlan = {
  id:
    string;

  childId:
    string;

  /*
   * Child name is stored for convenient display of the plan.
   * childId remains the authoritative child identifier.
   */
  childName:
    string;

  meetingType:
    MeetingType;

  meetingTitle:
    string;

  /*
   * Optional because a family may prepare before an appointment
   * has been formally scheduled.
   */
  meetingDate?:
    string;

  /*
   * Optional family-entered goal for the meeting.
   */
  familyGoal?:
    string;

  status:
    MeetingPlanStatus;

  /*
   * Identifies whether the meeting was recommended from the
   * Current Journey or manually selected by the family.
   */
  origin:
    | "journey"
    | "manual";

  recommendation?:
    MeetingRecommendation;

  journeyContext?:
    MeetingJourneyContext;

  priorities:
    MeetingPlanItem[];

  questions:
    MeetingPlanItem[];

  bringItems:
    MeetingPlanItem[];

  informationToShare:
    MeetingNoteSection[];

  beforeYouLeave:
    MeetingPlanItem[];

  /*
   * Family-entered notes captured during or after the meeting.
   */
  meetingNotes:
    string;

  /*
   * Family-entered follow-up actions or outcomes.
   */
  nextSteps:
    string;

  createdAt:
    number;

  updatedAt:
    number;
};


/*
 * ============================================================
 * NEW MEETING PLAN INPUT
 * ============================================================
 *
 * Information collected before generating a new Meeting Plan.
 * ============================================================
 */

export type MeetingPlanInput = {
  childId:
    string;

  meetingType:
    MeetingType;

  /*
   * Optional because Journey-based recommendations may provide
   * the meeting type before an appointment is scheduled.
   */
  meetingDate?:
    string;

  /*
   * Optional statement from the family describing what they
   * most want to accomplish.
   */
  familyGoal?:
    string;

  origin:
    | "journey"
    | "manual";

  recommendation?:
    MeetingRecommendation;
};