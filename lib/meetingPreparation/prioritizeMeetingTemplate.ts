/*
 * ============================================================
 * JOURNEY-AWARE MEETING TEMPLATE PRIORITIZER
 * ============================================================
 *
 * Personalizes Meeting Preparation by identifying which items
 * from a trusted MeetingTemplate are most relevant to the
 * child's Current Journey.
 *
 * IMPORTANT:
 *
 * This engine does NOT generate new meeting advice.
 *
 * It only:
 *
 *   1. Reads the validated Current Journey
 *   2. Retrieves the trusted MeetingTemplate
 *   3. Scores trusted template items against Journey context
 *   4. Identifies which trusted items should be emphasized
 *
 * The trusted template remains the source of truth.
 *
 * This engine must NOT:
 *
 *   - Invent facts about the child or family
 *   - Invent provider, clinic, school, therapy, or plan rules
 *   - Convert suggestions into requirements
 *   - Diagnose
 *   - Recommend treatment
 *   - Determine educational eligibility
 *   - Determine insurance coverage
 *
 * ============================================================
 */

import type {
    PersonalizedJourney,
  } from "../ai/journeyTypes";
  
  import type {
    MeetingRecommendation,
    MeetingTemplate,
    MeetingTemplateItem,
    MeetingType,
  } from "../../types/meetingPreparation";
  
  import {
    getMeetingTemplate,
  } from "../../data/meetingTemplates";
  
  
  /*
   * ============================================================
   * OUTPUT TYPES
   * ============================================================
   */
  
  export type PrioritizedMeetingTemplateItem = {
    id:
      string;
  
    text:
      string;
  
    score:
      number;
  
    prioritized:
      boolean;
  
    matchedConcepts:
      string[];
  };
  
  
  export type PrioritizedMeetingTemplateSection = {
    prioritized:
      PrioritizedMeetingTemplateItem[];
  
    additional:
      PrioritizedMeetingTemplateItem[];
  };
  
  
  export type PrioritizedMeetingTemplate = {
    meetingType:
      MeetingType;
  
    title:
      string;
  
    description:
      string;
  
    recommendation:
      MeetingRecommendation;
  
    priorities:
      PrioritizedMeetingTemplateSection;
  
    questions:
      PrioritizedMeetingTemplateSection;
  
    bringItems:
      PrioritizedMeetingTemplateSection;
  
    informationToShare:
      PrioritizedMeetingTemplateSection;
  
    beforeYouLeave:
      PrioritizedMeetingTemplateSection;
  };
  
  
  /*
   * ============================================================
   * JOURNEY SIGNALS
   * ============================================================
   */
  
  type JourneySignalSource =
    | "current_focus"
    | "next_step"
    | "action"
    | "task";
  
  
  type JourneySignal = {
    source:
      JourneySignalSource;
  
    text:
      string;
  
    weight:
      number;
  };
  
  
  /*
   * ============================================================
   * CONCEPTS
   * ============================================================
   *
   * These concepts connect Journey language to stable trusted
   * template IDs.
   *
   * The Journey determines relevance.
   *
   * The template determines the actual family-facing guidance.
   * ============================================================
   */
  
  type MeetingPreparationConcept =
    | "appointment_expectations"
    | "appointment_scheduling"
    | "clinic_requirements"
    | "forms_questionnaires"
    | "records"
    | "evaluation_reports"
    | "school_records"
    | "therapy_records"
    | "medications"
    | "family_questions"
    | "concerns_examples"
    | "strengths"
    | "developmental_history"
    | "communication"
    | "sensory_accommodations"
    | "current_supports"
    | "results"
    | "written_report"
    | "recommendations"
    | "referrals"
    | "follow_up"
    | "contact"
    | "responsibilities"
    | "progress"
    | "goals"
    | "school_supports"
    | "insurance"
    | "network"
    | "authorization"
    | "costs";
  
  
  /*
   * ============================================================
   * CONCEPT TERMS
   * ============================================================
   *
   * These terms detect broad preparation concepts in the Journey.
   *
   * Matching these terms does NOT create advice.
   *
   * It only helps decide which already-approved trusted template
   * items should receive more emphasis.
   * ============================================================
   */
  
  const CONCEPT_TERMS:
    Record<
      MeetingPreparationConcept,
      string[]
    > = {
  
    appointment_expectations: [
      "what to expect",
      "prepare for the appointment",
      "prepare for the visit",
      "prepare for the evaluation",
      "evaluation itself",
      "appointment preparation",
      "visit preparation",
    ],
  
    appointment_scheduling: [
      "schedule",
      "scheduling",
      "appointment",
      "appointment date",
      "intake date",
      "intake appointment",
      "secure an intake",
      "request intake",
      "waitlist",
    ],
  
    clinic_requirements: [
      "clinic needs",
      "clinic requires",
      "clinic requests",
      "submission instructions",
      "intake requirements",
      "appointment instructions",
      "materials",
      "provide before",
      "bring",
    ],
  
    forms_questionnaires: [
      "form",
      "forms",
      "questionnaire",
      "questionnaires",
      "paperwork",
      "intake packet",
      "intake forms",
    ],
  
    records: [
      "record",
      "records",
      "medical records",
      "documents",
      "documentation",
      "send records",
      "submit records",
      "upload records",
    ],
  
    evaluation_reports: [
      "evaluation report",
      "evaluation reports",
      "previous evaluation",
      "previous evaluations",
      "assessment report",
      "assessment reports",
      "psychological report",
      "diagnostic report",
    ],
  
    school_records: [
      "school record",
      "school records",
      "iep",
      "504",
      "educational evaluation",
      "school evaluation",
      "progress report",
    ],
  
    therapy_records: [
      "therapy report",
      "therapy reports",
      "therapy evaluation",
      "therapy evaluations",
      "therapy progress",
      "therapist report",
    ],
  
    medications: [
      "medication",
      "medications",
      "medicine",
      "medicines",
      "supplement",
      "supplements",
    ],
  
    family_questions: [
      "questions",
      "question",
      "ask",
      "clarify",
      "confirm",
    ],
  
    concerns_examples: [
      "concern",
      "concerns",
      "examples",
      "observations",
      "behavior",
      "behaviors",
      "changes",
    ],
  
    strengths: [
      "strength",
      "strengths",
      "interests",
      "preferences",
      "things going well",
      "progress",
    ],
  
    developmental_history: [
      "developmental history",
      "development history",
      "milestone",
      "milestones",
      "early development",
    ],
  
    communication: [
      "communication",
      "communicate",
      "speech",
      "language",
      "aac",
      "communication support",
      "communication supports",
    ],
  
    sensory_accommodations: [
      "sensory",
      "accommodation",
      "accommodations",
      "breaks",
      "comfort item",
      "comfort items",
      "support needs",
      "accessibility",
    ],
  
    current_supports: [
      "current therapy",
      "current therapies",
      "current services",
      "current supports",
      "services",
      "supports",
    ],
  
    results: [
      "results",
      "evaluation results",
      "assessment results",
      "feedback",
      "results appointment",
    ],
  
    written_report: [
      "written report",
      "report",
      "final report",
      "evaluation report",
    ],
  
    recommendations: [
      "recommendation",
      "recommendations",
      "recommended",
      "next recommendations",
    ],
  
    referrals: [
      "referral",
      "referrals",
      "referred",
      "referral transmission",
      "referral was sent",
      "referral receipt",
    ],
  
    follow_up: [
      "follow up",
      "follow-up",
      "next appointment",
      "next meeting",
      "check back",
    ],
  
    contact: [
      "contact",
      "phone",
      "call",
      "email",
      "who to contact",
    ],
  
    responsibilities: [
      "responsible",
      "responsibility",
      "who will",
      "who should",
      "family needs to",
      "provider will",
      "clinic will",
    ],
  
    progress: [
      "progress",
      "monitor",
      "monitoring",
      "review progress",
      "progress review",
    ],
  
    goals: [
      "goal",
      "goals",
      "priority",
      "priorities",
      "outcome",
      "outcomes",
    ],
  
    school_supports: [
      "school support",
      "school supports",
      "iep",
      "504 plan",
      "accommodation",
      "accommodations",
      "educational support",
    ],
  
    insurance: [
      "insurance",
      "medicaid",
      "health plan",
      "plan",
      "coverage",
      "benefit",
      "benefits",
    ],
  
    network: [
      "network",
      "in-network",
      "out-of-network",
      "accepts insurance",
      "accepts medicaid",
      "provider network",
    ],
  
    authorization: [
      "authorization",
      "prior authorization",
      "approval",
      "preauthorization",
      "pre-authorization",
    ],
  
    costs: [
      "copay",
      "coinsurance",
      "deductible",
      "cost",
      "costs",
      "out-of-pocket",
    ],
  };
  
  
  /*
   * ============================================================
   * TEMPLATE ITEM → CONCEPT MAP
   * ============================================================
   *
   * Stable template IDs map to preparation concepts.
   *
   * This is intentionally explicit.
   *
   * We do NOT infer template meaning from the family-facing text.
   * That allows wording to improve without changing
   * personalization behavior.
   * ============================================================
   */
  
  const TEMPLATE_ITEM_CONCEPTS:
    Record<
      string,
      MeetingPreparationConcept[]
    > = {
  
    /*
     * ----------------------------------------------------------
     * DIAGNOSTIC / EVALUATION
     * ----------------------------------------------------------
     */
  
    "evaluation-understand-appointment": [
      "appointment_expectations",
      "appointment_scheduling",
    ],
  
    "evaluation-identify-concerns-strengths": [
      "family_questions",
      "concerns_examples",
      "strengths",
    ],
  
    "evaluation-organize-records": [
      "records",
      "evaluation_reports",
      "school_records",
      "therapy_records",
    ],
  
    "evaluation-understand-results-next-steps": [
      "results",
      "written_report",
      "recommendations",
      "follow_up",
    ],
  
  
    "evaluation-question-what-to-expect": [
      "appointment_expectations",
    ],
  
    "evaluation-question-duration": [
      "appointment_expectations",
      "appointment_scheduling",
    ],
  
    "evaluation-question-who-is-involved": [
      "appointment_expectations",
    ],
  
    "evaluation-question-assessment-process": [
      "appointment_expectations",
    ],
  
    "evaluation-question-before-appointment": [
      "clinic_requirements",
      "forms_questionnaires",
    ],
  
    "evaluation-question-helpful-records": [
      "records",
      "evaluation_reports",
      "school_records",
      "therapy_records",
    ],
  
    "evaluation-question-medication-instructions": [
      "medications",
    ],
  
    "evaluation-question-comfort-items": [
      "sensory_accommodations",
      "communication",
    ],
  
    "evaluation-question-accommodations": [
      "sensory_accommodations",
      "communication",
    ],
  
    "evaluation-question-family-concerns": [
      "family_questions",
      "concerns_examples",
    ],
  
    "evaluation-question-results-discussion": [
      "results",
    ],
  
    "evaluation-question-written-report": [
      "written_report",
      "results",
    ],
  
    "evaluation-question-results-contact": [
      "results",
      "contact",
    ],
  
    "evaluation-question-recommendations": [
      "recommendations",
      "follow_up",
    ],
  
    "evaluation-question-referrals": [
      "recommendations",
      "referrals",
      "follow_up",
    ],
  
  
    "evaluation-bring-clinic-instructions": [
      "clinic_requirements",
      "forms_questionnaires",
    ],
  
    "evaluation-bring-insurance-identification": [
      "insurance",
    ],
  
    "evaluation-bring-medication-list": [
      "medications",
    ],
  
    "evaluation-bring-previous-evaluations": [
      "evaluation_reports",
      "records",
    ],
  
    "evaluation-bring-medical-records": [
      "records",
    ],
  
    "evaluation-bring-school-records": [
      "school_records",
    ],
  
    "evaluation-bring-therapy-records": [
      "therapy_records",
      "current_supports",
    ],
  
    "evaluation-bring-support-items": [
      "sensory_accommodations",
      "communication",
    ],
  
    "evaluation-bring-family-question-list": [
      "family_questions",
      "concerns_examples",
    ],
  
  
    "evaluation-share-reason": [
      "concerns_examples",
    ],
  
    "evaluation-share-family-questions": [
      "family_questions",
    ],
  
    "evaluation-share-strengths-interests": [
      "strengths",
    ],
  
    "evaluation-share-developmental-concerns": [
      "concerns_examples",
      "developmental_history",
    ],
  
    "evaluation-share-specific-examples": [
      "concerns_examples",
    ],
  
    "evaluation-share-communication": [
      "communication",
    ],
  
    "evaluation-share-social": [
      "concerns_examples",
    ],
  
    "evaluation-share-sensory": [
      "sensory_accommodations",
    ],
  
    "evaluation-share-learning-attention": [
      "concerns_examples",
      "school_records",
    ],
  
    "evaluation-share-daily-living": [
      "concerns_examples",
    ],
  
    "evaluation-share-developmental-history": [
      "developmental_history",
    ],
  
    "evaluation-share-medical-history": [
      "medications",
      "records",
    ],
  
    "evaluation-share-current-supports": [
      "current_supports",
    ],
  
    "evaluation-share-previous-evaluations": [
      "evaluation_reports",
    ],
  
    "evaluation-share-family-history": [
      "developmental_history",
    ],
  
    "evaluation-share-accommodations": [
      "sensory_accommodations",
      "communication",
    ],
  
    "evaluation-share-other-questions": [
      "family_questions",
    ],
  
  
    "evaluation-close-next-process-step": [
      "follow_up",
      "recommendations",
    ],
  
    "evaluation-close-additional-information": [
      "records",
      "forms_questionnaires",
      "clinic_requirements",
    ],
  
    "evaluation-close-results-timing": [
      "results",
      "follow_up",
    ],
  
    "evaluation-close-written-report": [
      "written_report",
      "results",
    ],
  
    "evaluation-close-contact": [
      "contact",
      "follow_up",
    ],
  
    "evaluation-close-recommendations": [
      "recommendations",
      "referrals",
    ],
  
    "evaluation-close-follow-up": [
      "follow_up",
      "appointment_scheduling",
    ],
  };
  
  
  /*
   * ============================================================
   * SOURCE WEIGHTS
   * ============================================================
   *
   * Current Focus and Next Step describe what the family is
   * working on now, so they receive more weight than individual
   * actions and tasks.
   * ============================================================
   */
  
  const SOURCE_WEIGHTS:
    Record<
      JourneySignalSource,
      number
    > = {
  
    current_focus:
      4,
  
    next_step:
      4,
  
    action:
      2,
  
    task:
      2,
  };
  
  
  /*
   * ============================================================
   * NORMALIZE TEXT
   * ============================================================
   */
  
  function normalizeText(
    value:
      string
  ):
    string {
  
    return value
      .toLowerCase()
      .replace(
        /[’']/g,
        "'"
      )
      .replace(
        /[^a-z0-9\s\-']/g,
        " "
      )
      .replace(
        /\s+/g,
        " "
      )
      .trim();
  }
  
  
  /*
   * ============================================================
   * BUILD JOURNEY SIGNALS
   * ============================================================
   */
  
  function buildJourneySignals(
    journey:
      PersonalizedJourney
  ):
    JourneySignal[] {
  
    const signals:
      JourneySignal[] = [];
  
  
    const currentFocusText =
      [
        journey.currentFocus?.title,
        journey.currentFocus?.explanation,
      ]
        .filter(
          Boolean
        )
        .join(
          " "
        )
        .trim();
  
  
    if (
      currentFocusText
    ) {
  
      signals.push({
        source:
          "current_focus",
  
        text:
          currentFocusText,
  
        weight:
          SOURCE_WEIGHTS.current_focus,
      });
  
    }
  
  
    const nextStepText =
      [
        journey.nextStep?.title,
        journey.nextStep?.description,
      ]
        .filter(
          Boolean
        )
        .join(
          " "
        )
        .trim();
  
  
    if (
      nextStepText
    ) {
  
      signals.push({
        source:
          "next_step",
  
        text:
          nextStepText,
  
        weight:
          SOURCE_WEIGHTS.next_step,
      });
  
    }
  
  
    for (
      const action of
        journey.actions ?? []
    ) {
  
      const actionText =
        [
          action.title,
          action.action,
          action.howTo,
          action.nextStep,
        ]
          .filter(
            Boolean
          )
          .join(
            " "
          )
          .trim();
  
  
      if (
        actionText
      ) {
  
        signals.push({
          source:
            "action",
  
          text:
            actionText,
  
          weight:
            SOURCE_WEIGHTS.action,
        });
  
      }
  
    }
  
  
    for (
      const task of
        journey.tasks ?? []
    ) {
  
      /*
       * Completed tasks describe work the family has already
       * finished. They should not drive preparation priorities.
       */
      if (
        task.completed
      ) {
        continue;
      }
  
  
      const taskText =
        [
          task.title,
          task.description,
        ]
          .filter(
            Boolean
          )
          .join(
            " "
          )
          .trim();
  
  
      if (
        taskText
      ) {
  
        signals.push({
          source:
            "task",
  
          text:
            taskText,
  
          weight:
            SOURCE_WEIGHTS.task,
        });
  
      }
  
    }
  
  
    return signals;
  }
  
  
  /*
   * ============================================================
   * DETECT CONCEPTS IN A SIGNAL
   * ============================================================
   */
  
  function detectConcepts(
    signal:
      JourneySignal
  ):
    MeetingPreparationConcept[] {
  
    const normalizedSignal =
      normalizeText(
        signal.text
      );
  
  
    const matches:
      MeetingPreparationConcept[] = [];
  
  
    for (
      const [
        concept,
        terms,
      ] of Object.entries(
        CONCEPT_TERMS
      ) as [
        MeetingPreparationConcept,
        string[]
      ][]
    ) {
  
      const matched =
        terms.some(
          (
            term
          ) =>
            normalizedSignal.includes(
              normalizeText(
                term
              )
            )
        );
  
  
      if (
        matched
      ) {
  
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
   * Each signal contributes its source weight once to a concept.
   *
   * Multiple synonyms inside the same Journey signal do not
   * artificially inflate the score.
   * ============================================================
   */
  
  function scoreJourneyConcepts(
    signals:
      JourneySignal[]
  ):
    Map<
      MeetingPreparationConcept,
      number
    > {
  
    const scores =
      new Map<
        MeetingPreparationConcept,
        number
      >();
  
  
    for (
      const signal of
        signals
    ) {
  
      const concepts =
        detectConcepts(
          signal
        );
  
  
      for (
        const concept of
          concepts
      ) {
  
        scores.set(
          concept,
          (
            scores.get(
              concept
            ) ?? 0
          ) +
            signal.weight
        );
  
      }
  
    }
  
  
    return scores;
  }
  
  
  /*
   * ============================================================
   * SCORE TEMPLATE ITEM
   * ============================================================
   */
  
  function scoreTemplateItem(
    item:
      MeetingTemplateItem,
    conceptScores:
      Map<
        MeetingPreparationConcept,
        number
      >
  ): {
    score:
      number;
    matchedConcepts:
      MeetingPreparationConcept[];
  } {
  
    const concepts =
      TEMPLATE_ITEM_CONCEPTS[
        item.id
      ] ?? [];
  
  
    let score =
      0;
  
  
    const matchedConcepts:
      MeetingPreparationConcept[] = [];
  
  
    for (
      const concept of
        concepts
    ) {
  
      const conceptScore =
        conceptScores.get(
          concept
        ) ?? 0;
  
  
      if (
        conceptScore <= 0
      ) {
        continue;
      }
  
  
      score +=
        conceptScore;
  
  
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
   * PRIORITIZE SECTION
   * ============================================================
   *
   * A small number of trusted items are emphasized.
   *
   * Everything else remains available as additional preparation
   * content.
   *
   * This prevents the personalized experience from hiding useful
   * trusted content simply because it was not mentioned in the
   * Current Journey.
   * ============================================================
   */
  
  function prioritizeSection(
    items:
      MeetingTemplateItem[],
    conceptScores:
      Map<
        MeetingPreparationConcept,
        number
      >,
    maximumPrioritized:
      number
  ):
    PrioritizedMeetingTemplateSection {
  
    const scoredItems =
      items.map(
        (
          item,
          originalIndex
        ) => {
  
          const {
            score,
            matchedConcepts,
          } =
            scoreTemplateItem(
              item,
              conceptScores
            );
  
  
          return {
            id:
              item.id,
  
            text:
              item.text,
  
            score,
  
            prioritized:
              false,
  
            matchedConcepts,
  
            originalIndex,
          };
  
        }
      );
  
  
    const eligible =
      scoredItems
        .filter(
          (
            item
          ) =>
            item.score >
              0
        )
        .sort(
          (
            a,
            b
          ) => {
  
            if (
              b.score !==
                a.score
            ) {
  
              return (
                b.score -
                a.score
              );
  
            }
  
  
            return (
              a.originalIndex -
              b.originalIndex
            );
  
          }
        );
  
  
    const prioritizedIds =
      new Set(
        eligible
          .slice(
            0,
            maximumPrioritized
          )
          .map(
            (
              item
            ) =>
              item.id
          )
      );
  
  
    const prioritized:
      PrioritizedMeetingTemplateItem[] =
        eligible
          .filter(
            (
              item
            ) =>
              prioritizedIds.has(
                item.id
              )
          )
          .map(
            (
              item
            ) => ({
              id:
                item.id,
  
              text:
                item.text,
  
              score:
                item.score,
  
              prioritized:
                true,
  
              matchedConcepts:
                item.matchedConcepts,
            })
          );
  
  
    const additional:
      PrioritizedMeetingTemplateItem[] =
        scoredItems
          .filter(
            (
              item
            ) =>
              !prioritizedIds.has(
                item.id
              )
          )
          .map(
            (
              item
            ) => ({
              id:
                item.id,
  
              text:
                item.text,
  
              score:
                item.score,
  
              prioritized:
                false,
  
              matchedConcepts:
                item.matchedConcepts,
            })
          );
  
  
    return {
      prioritized,
      additional,
    };
  }
  
  
  /*
   * ============================================================
   * VALIDATE RECOMMENDATION
   * ============================================================
   */
  
  function validateRecommendation(
    recommendation:
      MeetingRecommendation
  ):
    void {
  
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
   * PRIORITIZE TRUSTED TEMPLATE
   * ============================================================
   */
  
  export function prioritizeMeetingTemplate(
    journey:
      PersonalizedJourney,
    recommendation:
      MeetingRecommendation
  ):
    PrioritizedMeetingTemplate {
  
    validateRecommendation(
      recommendation
    );
  
  
    const template:
      MeetingTemplate =
        getMeetingTemplate(
          recommendation.meetingType
        );
  
  
    const signals =
      buildJourneySignals(
        journey
      );
  
  
    const conceptScores =
      scoreJourneyConcepts(
        signals
      );
  
  
    return {
      meetingType:
        template.type,
  
      title:
        template.title,
  
      description:
        template.description,
  
      recommendation,
  
      /*
       * Priorities are intentionally kept small.
       */
      priorities:
        prioritizeSection(
          template.priorities,
          conceptScores,
          3
        ),
  
      /*
       * Questions are the most useful area for Journey-aware
       * emphasis, so up to five may be highlighted.
       */
      questions:
        prioritizeSection(
          template.questions,
          conceptScores,
          5
        ),
  
      /*
       * Keep the initial "have available" list manageable.
       */
      bringItems:
        prioritizeSection(
          template.bringItems,
          conceptScores,
          5
        ),
  
      /*
       * These become editable note sections, so limit the first
       * personalized group while keeping every other trusted
       * section available.
       */
      informationToShare:
        prioritizeSection(
          template.informationToShare,
          conceptScores,
          5
        ),
  
      /*
       * Closing prompts should stay focused.
       */
      beforeYouLeave:
        prioritizeSection(
          template.beforeYouLeave,
          conceptScores,
          4
        ),
    };
  }