/*
 * ============================================================
 * SCHOOL / IEP MEETING TEMPLATE
 * ============================================================
 *
 * Trusted base template used when a family's Current Journey
 * indicates preparation for a school meeting, educational
 * evaluation discussion, IEP meeting, or related conversation.
 *
 * IMPORTANT:
 *
 * This template provides general organizational and meeting
 * preparation support.
 *
 * School processes and meeting purposes vary. A meeting may
 * involve evaluation, eligibility, an IEP, a 504 Plan,
 * progress, services, supports, accommodations, transition,
 * or another school-related discussion.
 *
 * This template does NOT:
 *
 *   - Provide legal advice
 *   - Determine eligibility
 *   - Determine services, accommodations, goals, or placement
 *   - Replace official school documents or notices
 *   - Assume that a particular process or outcome applies
 *
 * Families should review information provided by their school
 * or district about the specific meeting they are attending.
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
 *   - Make legal conclusions
 *   - Determine educational eligibility
 *   - Recommend a specific placement
 *   - Promise a particular service or accommodation
 *   - Invent school- or district-specific requirements
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


export const schoolIepTemplate:
  MeetingTemplate = {

  type:
    "school_iep",

  title:
    "School / IEP Meeting",

  description:
    "Prepare for a school, evaluation, IEP, 504, or related educational meeting by organizing your priorities, questions, observations, and information you want the school team to understand.",


  /*
   * ==========================================================
   * PRIORITIES
   * ==========================================================
   */

  priorities: [
    {
      id:
        "school-understand-meeting-purpose",

      text:
        "Understand the purpose of the meeting and what will be discussed or reviewed.",
    },

    {
      id:
        "school-discuss-strengths-needs",

      text:
        "Make sure your child's strengths, needs, and relevant experiences are part of the discussion.",
    },

    {
      id:
        "school-discuss-family-priorities",

      text:
        "Discuss the questions, observations, and priorities that are most important to your child and family.",
    },

    {
      id:
        "school-understand-information",

      text:
        "Understand the information, progress, evaluations, or other records being discussed.",
    },

    {
      id:
        "school-understand-next-steps",

      text:
        "Leave with a clear understanding of decisions made, items still being considered, and next steps.",
    },
  ],


  /*
   * ==========================================================
   * QUESTIONS TO ASK
   * ==========================================================
   *
   * These are suggested questions.
   *
   * Not every question will apply to every school meeting.
   * Personalization may highlight questions based on the
   * Current Journey and purpose of the meeting.
   * ==========================================================
   */

  questions: [
    {
      id:
        "school-question-meeting-purpose",

      text:
        "What is the purpose of today's meeting, and what are we hoping to accomplish?",
    },

    {
      id:
        "school-question-team-observations",

      text:
        "What strengths, progress, and areas of need is the school team seeing?",
    },

    {
      id:
        "school-question-information-reviewed",

      text:
        "What information, observations, progress data, or evaluation results are being considered?",
    },

    {
      id:
        "school-question-clarify-information",

      text:
        "Can you explain any information, results, or terms that may not be clear to us?",
    },

    {
      id:
        "school-question-goals-supports",

      text:
        "What goals, supports, services, accommodations, or other next steps are being discussed, if applicable?",
    },

    {
      id:
        "school-question-child-participation",

      text:
        "How are our child's strengths, needs, preferences, and experiences being considered in the discussion?",
    },

    {
      id:
        "school-question-family-input",

      text:
        "Is there additional information or family input that would be helpful for the team to consider?",
    },

    {
      id:
        "school-question-progress",

      text:
        "If goals or supports are discussed, how will progress be reviewed or communicated?",
    },

    {
      id:
        "school-question-responsibilities",

      text:
        "What next steps will the school handle, and is there anything our family is being asked to do?",
    },

    {
      id:
        "school-question-contact",

      text:
        "Who should we contact if we have questions after the meeting?",
    },

    {
      id:
        "school-question-next-step",

      text:
        "What happens next after today's meeting?",
    },
  ],


  /*
   * ==========================================================
   * ITEMS TO CONSIDER BRINGING
   * ==========================================================
   *
   * These are general preparation suggestions.
   *
   * Families should follow instructions from their school or
   * district regarding documents or information requested for
   * a specific meeting.
   * ==========================================================
   */

  bringItems: [
    {
      id:
        "school-bring-meeting-information",

      text:
        "The meeting notice, agenda, or other information provided by the school, if available.",
    },

    {
      id:
        "school-bring-current-plan",

      text:
        "Your child's current IEP, 504 Plan, or other school support plan, if applicable.",
    },

    {
      id:
        "school-bring-school-records",

      text:
        "Relevant school evaluations, progress reports, report cards, or other school information you already have, if helpful.",
    },

    {
      id:
        "school-bring-outside-reports",

      text:
        "Relevant outside evaluations, reports, or recommendations you would like to discuss with the school team, if applicable.",
    },

    {
      id:
        "school-bring-strengths-needs-notes",

      text:
        "Notes or examples about your child's strengths, needs, progress, or recent changes.",
    },

    {
      id:
        "school-bring-family-priorities",

      text:
        "A written list of the priorities or outcomes you hope to discuss during the meeting.",
    },

    {
      id:
        "school-bring-question-list",

      text:
        "A written list of questions or concerns you do not want to forget.",
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
   * Families should be able to complete only the sections that
   * are relevant to their child and the purpose of the meeting.
   * ==========================================================
   */

  informationToShare: [
    {
      id:
        "school-share-strengths-interests",

      text:
        "Your child's strengths, interests, preferences, and things that are going well",
    },

    {
      id:
        "school-share-family-priorities",

      text:
        "The priorities or outcomes that are most important to your child and family",
    },

    {
      id:
        "school-share-learning",

      text:
        "Learning or academic strengths and concerns you want to discuss, if relevant",
    },

    {
      id:
        "school-share-communication",

      text:
        "Communication strengths, preferences, supports, or concerns, if relevant",
    },

    {
      id:
        "school-share-social-emotional",

      text:
        "Social, emotional, behavioral, or regulation strengths and concerns, if relevant",
    },

    {
      id:
        "school-share-sensory-access",

      text:
        "Sensory, accessibility, or participation needs that may be relevant at school",
    },

    {
      id:
        "school-share-progress-changes",

      text:
        "Progress, changes, or new concerns you have noticed",
    },

    {
      id:
        "school-share-helpful-strategies",

      text:
        "Strategies, supports, or accommodations that appear to help your child, if applicable",
    },

    {
      id:
        "school-share-outside-supports",

      text:
        "Outside services, evaluations, or supports that may be relevant to the school discussion",
    },

    {
      id:
        "school-share-child-perspective",

      text:
        "Your child's preferences, concerns, or perspective that you want the team to understand, when appropriate",
    },

    {
      id:
        "school-share-other-questions",

      text:
        "Questions or concerns you do not want to forget",
    },
  ],


  /*
   * ==========================================================
   * BEFORE YOU LEAVE
   * ==========================================================
   *
   * These prompts help families leave with a clearer
   * understanding of the discussion and next steps without
   * assuming a particular legal or educational outcome.
   * ==========================================================
   */

  beforeYouLeave: [
    {
      id:
        "school-close-decisions",

      text:
        "Confirm your understanding of any decisions made during the meeting.",
    },

    {
      id:
        "school-close-unresolved-items",

      text:
        "Clarify any questions, concerns, or items that still need additional discussion or information.",
    },

    {
      id:
        "school-close-next-steps",

      text:
        "Confirm the next steps discussed and who is responsible for each one.",
    },

    {
      id:
        "school-close-progress-follow-up",

      text:
        "Ask how and when progress, follow-up, or additional discussion will occur, if applicable.",
    },

    {
      id:
        "school-close-documents",

      text:
        "Ask whether you should expect any additional documents, plans, reports, or other information after the meeting.",
    },

    {
      id:
        "school-close-contact",

      text:
        "Confirm who to contact if you have questions after the meeting.",
    },

    {
      id:
        "school-close-another-meeting",

      text:
        "Ask whether another meeting or follow-up discussion needs to be scheduled.",
    },
  ],
};