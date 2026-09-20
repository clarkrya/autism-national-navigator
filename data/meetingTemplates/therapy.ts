/*
 * ============================================================
 * THERAPY MEETING TEMPLATE
 * ============================================================
 *
 * Trusted base template used when a family's Current Journey
 * indicates preparation for a therapy consultation, intake,
 * progress meeting, or other therapy-related conversation.
 *
 * IMPORTANT:
 *
 * This template provides general preparation suggestions.
 *
 * Therapy and support services vary by discipline, provider,
 * setting, reason for referral, and the child's individual
 * needs.
 *
 * Items in this template should NOT be presented as universal
 * requirements.
 *
 * Families should follow instructions provided by their
 * therapist, provider, or organization when those instructions
 * differ from the general preparation suggestions below.
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
 *   - Recommend a particular therapy or treatment
 *   - Determine medical necessity
 *   - Recommend a specific frequency or duration of services
 *   - Give medication instructions
 *   - Invent provider-specific requirements
 *   - Present optional records as required
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


export const therapyTemplate:
  MeetingTemplate = {

  type:
    "therapy",

  title:
    "Therapy Meeting",

  description:
    "Prepare for a therapy consultation, intake, progress meeting, or other therapy-related conversation by organizing your family's priorities, questions, observations, and relevant information.",


  /*
   * ==========================================================
   * PRIORITIES
   * ==========================================================
   */

  priorities: [
    {
      id:
        "therapy-discuss-family-priorities",

      text:
        "Discuss the goals, concerns, or everyday needs that are most important to your child and family.",
    },

    {
      id:
        "therapy-understand-service-approach",

      text:
        "Understand the provider's approach to services, goal setting, and family involvement.",
    },

    {
      id:
        "therapy-share-current-context",

      text:
        "Share relevant information about your child's strengths, current supports, and changes or progress you have noticed.",
    },

    {
      id:
        "therapy-understand-next-steps",

      text:
        "Understand what the next steps may be after the meeting.",
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
        "therapy-question-what-to-expect",

      text:
        "What should we expect from this therapy or service?",
    },

    {
      id:
        "therapy-question-goal-development",

      text:
        "How are goals developed, and how can our family participate in that process?",
    },

    {
      id:
        "therapy-question-child-strengths",

      text:
        "How will our child's strengths, preferences, communication needs, and individual needs be considered when developing goals or services?",
    },

    {
      id:
        "therapy-question-progress",

      text:
        "How will progress be measured and discussed with our family?",
    },

    {
      id:
        "therapy-question-family-participation",

      text:
        "What role, if any, can our family have in supporting goals outside of sessions?",
    },

    {
      id:
        "therapy-question-service-plan-review",

      text:
        "How and when are goals or the service plan typically reviewed?",
    },

    {
      id:
        "therapy-question-coordination",

      text:
        "If appropriate, how can information be coordinated with other providers, therapists, or school supports involved in our child's care?",
    },

    {
      id:
        "therapy-question-contact",

      text:
        "Who should we contact if we have questions or concerns?",
    },

    {
      id:
        "therapy-question-next-steps",

      text:
        "What are the next steps after this meeting?",
    },
  ],


  /*
   * ==========================================================
   * ITEMS TO CONSIDER BRINGING
   * ==========================================================
   *
   * These are suggestions rather than requirements.
   *
   * Families should follow instructions from the therapist,
   * provider, or organization regarding what should be
   * submitted beforehand or brought to the meeting.
   * ==========================================================
   */

  bringItems: [
    {
      id:
        "therapy-bring-provider-instructions",

      text:
        "Appointment instructions, forms, or questionnaires from the provider or organization, if provided.",
    },

    {
      id:
        "therapy-bring-insurance-identification",

      text:
        "Insurance information and identification, if requested by the provider or organization.",
    },

    {
      id:
        "therapy-bring-evaluation-reports",

      text:
        "Relevant evaluation, therapy, or progress reports you already have, if available and relevant.",
    },

    {
      id:
        "therapy-bring-current-support-information",

      text:
        "Information about current therapies, services, school supports, or other supports, if relevant.",
    },

    {
      id:
        "therapy-bring-medication-list",

      text:
        "A current medication list, if relevant to the service or requested by the provider.",
    },

    {
      id:
        "therapy-bring-school-information",

      text:
        "Relevant school information, educational evaluations, an IEP, or a 504 Plan, if applicable and helpful to the discussion.",
    },

    {
      id:
        "therapy-bring-support-items",

      text:
        "Communication supports, assistive devices, sensory items, or other supports your child regularly uses, if appropriate.",
    },

    {
      id:
        "therapy-bring-family-priorities",

      text:
        "A written list of your family's goals, observations, priorities, or concerns.",
    },

    {
      id:
        "therapy-bring-question-list",

      text:
        "A written list of questions you want to discuss.",
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
   * their child, family, and reason for the meeting.
   * ==========================================================
   */

  informationToShare: [
    {
      id:
        "therapy-share-family-goals",

      text:
        "Goals, priorities, or everyday needs that are most important to your child and family",
    },

    {
      id:
        "therapy-share-strengths-interests",

      text:
        "Your child's strengths, interests, preferences, and things that are going well",
    },

    {
      id:
        "therapy-share-communication",

      text:
        "Communication preferences, supports, or needs that may be relevant",
    },

    {
      id:
        "therapy-share-current-supports",

      text:
        "Current therapies, services, school supports, or other supports",
    },

    {
      id:
        "therapy-share-progress",

      text:
        "Changes, progress, or new skills you have noticed",
    },

    {
      id:
        "therapy-share-challenges",

      text:
        "Challenges, concerns, or situations you would like help understanding or addressing",
    },

    {
      id:
        "therapy-share-daily-life",

      text:
        "Daily routines, environments, or activities that may be relevant to the goals being discussed",
    },

    {
      id:
        "therapy-share-helpful-strategies",

      text:
        "Strategies, accommodations, or supports that have been helpful for your child, if applicable",
    },

    {
      id:
        "therapy-share-other-questions",

      text:
        "Questions or concerns you do not want to forget",
    },
  ],


  /*
   * ==========================================================
   * BEFORE YOU LEAVE
   * ==========================================================
   *
   * These prompts help the family understand the agreed-upon
   * plan without assuming what services will be recommended.
   * ==========================================================
   */

  beforeYouLeave: [
    {
      id:
        "therapy-close-goals-next-steps",

      text:
        "Confirm the goals, recommendations, or next steps discussed during the meeting.",
    },

    {
      id:
        "therapy-close-service-details",

      text:
        "If services are planned, clarify the proposed schedule, setting, and what the family should expect next.",
    },

    {
      id:
        "therapy-close-progress",

      text:
        "Ask how progress and goals will be reviewed or communicated.",
    },

    {
      id:
        "therapy-close-family-role",

      text:
        "Clarify whether there are strategies, activities, observations, or information the family is being asked to provide between visits.",
    },

    {
      id:
        "therapy-close-responsibilities",

      text:
        "Clarify which next steps the family should complete and which steps the provider or organization will handle.",
    },

    {
      id:
        "therapy-close-contact",

      text:
        "Confirm who to contact with questions or concerns.",
    },

    {
      id:
        "therapy-close-follow-up",

      text:
        "Ask whether another appointment, session, or meeting needs to be scheduled.",
    },

    {
      id:
        "therapy-close-additional-information",

      text:
        "Confirm whether any additional information, records, forms, or authorizations are needed.",
    },
  ],
};