/*
 * ============================================================
 * DIAGNOSTIC / EVALUATION MEETING TEMPLATE
 * ============================================================
 *
 * Trusted base template used when a family's Current Journey
 * indicates preparation for a diagnostic, developmental, or
 * autism evaluation.
 *
 * IMPORTANT:
 *
 * This template provides general preparation suggestions.
 *
 * Evaluation processes vary by clinic, clinician, discipline,
 * age, reason for referral, and the type of evaluation being
 * completed.
 *
 * Items in this template should NOT be presented as universal
 * requirements.
 *
 * Families should follow instructions provided by their
 * evaluation clinic or clinician when those instructions differ
 * from the general preparation suggestions below.
 *
 * AI personalization may:
 *
 *   - Prioritize relevant template items
 *   - Connect preparation to the Current Journey
 *   - Add family-specific questions based on known context
 *
 * AI personalization should NOT:
 *
 *   - Invent information about the child
 *   - Assume a diagnosis
 *   - Predict evaluation results
 *   - Present optional records as required
 *   - Invent clinic-specific requirements
 *   - Give medication instructions
 *
 * STABLE IDS:
 *
 * Every preparation item has a semantic ID. Personalization
 * should use these IDs rather than depending on the exact
 * wording of the family-facing text.
 *
 * ============================================================
 */

import type {
  MeetingTemplate,
} from "../../types/meetingPreparation";


export const diagnosticEvaluationTemplate:
  MeetingTemplate = {

  type:
    "diagnostic_evaluation",

  title:
    "Diagnostic / Evaluation Appointment",

  description:
    "Prepare for a developmental, diagnostic, or autism evaluation by organizing the information, examples, records, questions, and priorities you may want to discuss with the clinician or evaluation team.",


  /*
   * ==========================================================
   * PRIORITIES
   * ==========================================================
   */

  priorities: [
    {
      id:
        "evaluation-understand-appointment",

      text:
        "Understand what to expect during the evaluation and how the appointment may be structured.",
    },

    {
      id:
        "evaluation-identify-concerns-strengths",

      text:
        "Identify the main concerns, strengths, questions, and examples you want to discuss.",
    },

    {
      id:
        "evaluation-organize-records",

      text:
        "Organize records or information that may help the clinician or evaluation team understand your child's history and current needs.",
    },

    {
      id:
        "evaluation-understand-results-next-steps",

      text:
        "Clarify how results, recommendations, and next steps will be shared after the evaluation.",
    },
  ],


  /*
   * ==========================================================
   * QUESTIONS TO ASK
   * ==========================================================
   *
   * These are suggested questions.
   *
   * Families do not need to ask every question.
   * Personalization may highlight the questions most relevant
   * to the family's Current Journey.
   * ==========================================================
   */

  questions: [
    {
      id:
        "evaluation-question-what-to-expect",

      text:
        "What should we expect during the evaluation?",
    },

    {
      id:
        "evaluation-question-duration",

      text:
        "How long should we plan for the appointment?",
    },

    {
      id:
        "evaluation-question-who-is-involved",

      text:
        "Who may be involved in the evaluation?",
    },

    {
      id:
        "evaluation-question-assessment-process",

      text:
        "What assessments, interviews, observations, or activities may be part of the evaluation?",
    },

    {
      id:
        "evaluation-question-before-appointment",

      text:
        "Is there anything you would like us to complete or provide before the appointment?",
    },

    {
      id:
        "evaluation-question-helpful-records",

      text:
        "Are there records or reports that would be helpful for you to review?",
    },

    {
      id:
        "evaluation-question-medication-instructions",

      text:
        "Should medications be taken as usual on the day of the appointment, or should we follow any specific instructions from the clinic?",
    },

    {
      id:
        "evaluation-question-comfort-items",

      text:
        "Can we bring comfort items, communication supports, snacks, or other items that may help during the appointment?",
    },

    {
      id:
        "evaluation-question-accommodations",

      text:
        "Can breaks or other accommodations be provided if needed?",
    },

    {
      id:
        "evaluation-question-family-concerns",

      text:
        "Will there be time for us to discuss our main questions and concerns?",
    },

    {
      id:
        "evaluation-question-results-discussion",

      text:
        "How and when will the results be explained to us?",
    },

    {
      id:
        "evaluation-question-written-report",

      text:
        "Will we receive a written report, and approximately when should we expect it?",
    },

    {
      id:
        "evaluation-question-results-contact",

      text:
        "Who should we contact if we have questions after receiving the results or report?",
    },

    {
      id:
        "evaluation-question-recommendations",

      text:
        "What recommendations or next steps might be discussed after the evaluation?",
    },

    {
      id:
        "evaluation-question-referrals",

      text:
        "If additional evaluations, services, or referrals are recommended, how will we receive that information?",
    },
  ],


  /*
   * ==========================================================
   * ITEMS TO CONSIDER BRINGING
   * ==========================================================
   *
   * These are intentionally suggestions rather than
   * requirements.
   *
   * Families should follow the clinic's instructions regarding
   * what should be submitted beforehand or brought to the
   * appointment.
   * ==========================================================
   */

  bringItems: [
    {
      id:
        "evaluation-bring-clinic-instructions",

      text:
        "The clinic's appointment instructions, forms, or questionnaires, if provided.",
    },

    {
      id:
        "evaluation-bring-insurance-identification",

      text:
        "Insurance information and identification, if requested by the clinic.",
    },

    {
      id:
        "evaluation-bring-medication-list",

      text:
        "A current medication list, including medications or supplements you would like the clinician to know about, if applicable.",
    },

    {
      id:
        "evaluation-bring-previous-evaluations",

      text:
        "Previous developmental, psychological, diagnostic, or evaluation reports, if available and relevant.",
    },

    {
      id:
        "evaluation-bring-medical-records",

      text:
        "Relevant medical records or summaries you already have, if available.",
    },

    {
      id:
        "evaluation-bring-school-records",

      text:
        "School records, educational evaluations, an IEP, or a 504 Plan, if applicable and relevant.",
    },

    {
      id:
        "evaluation-bring-therapy-records",

      text:
        "Therapy evaluations, progress reports, or information about current services and supports, if available and relevant.",
    },

    {
      id:
        "evaluation-bring-support-items",

      text:
        "Communication supports, assistive devices, sensory items, comfort items, or other supports your child regularly uses, if appropriate.",
    },

    {
      id:
        "evaluation-bring-family-question-list",

      text:
        "A written list of your main questions, concerns, priorities, and examples you want to discuss.",
    },
  ],


  /*
   * ==========================================================
   * INFORMATION TO SHARE
   * ==========================================================
   *
   * These become editable sections in the personalized
   * Meeting Plan.
   *
   * Families should be able to add only what is relevant to
   * their situation.
   * ==========================================================
   */

  informationToShare: [
    {
      id:
        "evaluation-share-reason",

      text:
        "Your main reasons for seeking the evaluation",
    },

    {
      id:
        "evaluation-share-family-questions",

      text:
        "Questions you hope the evaluation will help answer",
    },

    {
      id:
        "evaluation-share-strengths-interests",

      text:
        "Your child's strengths, interests, and things that are going well",
    },

    {
      id:
        "evaluation-share-developmental-concerns",

      text:
        "Developmental concerns, differences, or changes you want to discuss",
    },

    {
      id:
        "evaluation-share-specific-examples",

      text:
        "Specific examples of behaviors or situations you want the clinician or evaluation team to understand",
    },

    {
      id:
        "evaluation-share-communication",

      text:
        "Communication strengths, preferences, or concerns, if relevant",
    },

    {
      id:
        "evaluation-share-social",

      text:
        "Social interaction or relationship strengths and concerns, if relevant",
    },

    {
      id:
        "evaluation-share-sensory",

      text:
        "Sensory preferences, sensitivities, or regulation needs, if relevant",
    },

    {
      id:
        "evaluation-share-learning-attention",

      text:
        "Learning, attention, behavior, or school concerns, if relevant",
    },

    {
      id:
        "evaluation-share-daily-living",

      text:
        "Daily living or independence strengths and concerns, if relevant",
    },

    {
      id:
        "evaluation-share-developmental-history",

      text:
        "Developmental history or milestones you believe may be relevant",
    },

    {
      id:
        "evaluation-share-medical-history",

      text:
        "Relevant medical history, medications, or health information",
    },

    {
      id:
        "evaluation-share-current-supports",

      text:
        "Current therapies, services, school supports, or other supports",
    },

    {
      id:
        "evaluation-share-previous-evaluations",

      text:
        "Previous evaluations, diagnoses, or recommendations, if applicable",
    },

    {
      id:
        "evaluation-share-family-history",

      text:
        "Family history you believe may be relevant or that the clinician asks about",
    },

    {
      id:
        "evaluation-share-accommodations",

      text:
        "Accommodations, communication supports, or other needs that may help your child participate in the evaluation",
    },

    {
      id:
        "evaluation-share-other-questions",

      text:
        "Questions or concerns you do not want to forget",
    },
  ],


  /*
   * ==========================================================
   * BEFORE YOU LEAVE
   * ==========================================================
   *
   * These prompts help families understand what happens after
   * the appointment without assuming what the evaluation will
   * conclude.
   * ==========================================================
   */

  beforeYouLeave: [
    {
      id:
        "evaluation-close-next-process-step",

      text:
        "Confirm what happens next in the evaluation process.",
    },

    {
      id:
        "evaluation-close-additional-information",

      text:
        "Ask whether any additional information, records, forms, or appointments are needed.",
    },

    {
      id:
        "evaluation-close-results-timing",

      text:
        "Confirm how and when results will be discussed with you.",
    },

    {
      id:
        "evaluation-close-written-report",

      text:
        "Ask whether you will receive a written report and when you should expect it.",
    },

    {
      id:
        "evaluation-close-contact",

      text:
        "Confirm who to contact if you have questions after the appointment or after receiving the report.",
    },

    {
      id:
        "evaluation-close-recommendations",

      text:
        "Ask how recommendations or referrals, if any, will be communicated.",
    },

    {
      id:
        "evaluation-close-follow-up",

      text:
        "Confirm whether another appointment or follow-up discussion needs to be scheduled.",
    },
  ],
};