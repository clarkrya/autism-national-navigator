/*
 * ============================================================
 * GENERAL MEETING PREPARATION TEMPLATE
 * ============================================================
 *
 * Trusted fallback template used when:
 *
 * 1. The family manually selects a meeting or conversation that
 *    does not fit one of Myriad's specific meeting categories,
 *    or
 *
 * 2. Meeting preparation may be useful but the Current Journey
 *    does not support a reliable specific meeting type.
 *
 * This template is intentionally broad.
 *
 * It should never imply provider-, school-, insurance-,
 * therapy-, program-, or organization-specific requirements.
 *
 * AI personalization may:
 *
 *   - Prioritize relevant template items
 *   - Connect preparation to the Current Journey
 *   - Add family-specific questions based on known context
 *
 * AI personalization should NOT:
 *
 *   - Invent information about the child or family
 *   - Invent requirements
 *   - Assume a particular process or outcome
 *   - Turn optional suggestions into requirements
 *   - Make medical, educational, legal, insurance, or
 *     eligibility determinations
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


export const generalMeetingTemplate:
  MeetingTemplate = {

  type:
    "general",

  title:
    "General Meeting Preparation",

  description:
    "Organize what you want to accomplish, the questions you want to ask, and the information you want to remember for an upcoming meeting or conversation.",


  /*
   * ==========================================================
   * PRIORITIES
   * ==========================================================
   */

  priorities: [
    {
      id:
        "general-clarify-goal",

      text:
        "Be clear about what you hope to accomplish during the meeting or conversation.",
    },

    {
      id:
        "general-prioritize-questions",

      text:
        "Make sure your most important questions, concerns, or priorities are discussed.",
    },

    {
      id:
        "general-share-relevant-information",

      text:
        "Share information that may be helpful to the conversation.",
    },

    {
      id:
        "general-understand-next-steps",

      text:
        "Leave with a clear understanding of what happens next and who is responsible for each next step.",
    },
  ],


  /*
   * ==========================================================
   * QUESTIONS TO ASK
   * ==========================================================
   *
   * These questions are intentionally broad so they can be
   * useful across many different types of conversations.
   * ==========================================================
   */

  questions: [
    {
      id:
        "general-question-purpose",

      text:
        "What should we make sure we discuss or accomplish today?",
    },

    {
      id:
        "general-question-information-needed",

      text:
        "Is there any additional information you need from me to help with the next step?",
    },

    {
      id:
        "general-question-options",

      text:
        "Are there options, decisions, or next steps I should understand?",
    },

    {
      id:
        "general-question-family-action",

      text:
        "Is there anything I need to do after this conversation?",
    },

    {
      id:
        "general-question-other-action",

      text:
        "Is there anything you or another person or organization will be doing next?",
    },

    {
      id:
        "general-question-contact",

      text:
        "Who should I contact if I have questions afterward?",
    },

    {
      id:
        "general-question-follow-up",

      text:
        "When should I expect an update or follow-up, if applicable?",
    },
  ],


  /*
   * ==========================================================
   * ITEMS TO CONSIDER HAVING AVAILABLE
   * ==========================================================
   *
   * These are general suggestions only.
   * ==========================================================
   */

  bringItems: [
    {
      id:
        "general-have-meeting-information",

      text:
        "Any meeting instructions, agenda, invitation, or other information you received, if applicable.",
    },

    {
      id:
        "general-have-relevant-documents",

      text:
        "Relevant information or documents you already have, if applicable.",
    },

    {
      id:
        "general-have-contact-information",

      text:
        "Names or contact information that may be useful during the conversation.",
    },

    {
      id:
        "general-have-updates",

      text:
        "Notes about important changes, updates, concerns, or examples you want to discuss.",
    },

    {
      id:
        "general-have-goal",

      text:
        "A written note about what you most hope to accomplish.",
    },

    {
      id:
        "general-have-question-list",

      text:
        "A written list of your most important questions.",
    },

    {
      id:
        "general-have-notes",

      text:
        "A place to record important information, decisions, and next steps during the conversation.",
    },
  ],


  /*
   * ==========================================================
   * INFORMATION TO SHARE / RECORD
   * ==========================================================
   *
   * These become editable sections in the Meeting Plan.
   *
   * Because this is the general template, the sections remain
   * intentionally broad.
   * ==========================================================
   */

  informationToShare: [
    {
      id:
        "general-share-goal",

      text:
        "What you hope to accomplish",
    },

    {
      id:
        "general-share-background",

      text:
        "Important background information that may be relevant",
    },

    {
      id:
        "general-share-updates",

      text:
        "Changes, updates, or examples you want to discuss",
    },

    {
      id:
        "general-share-questions",

      text:
        "Questions, concerns, or priorities you want to discuss",
    },

    {
      id:
        "general-share-decisions",

      text:
        "Important information or decisions discussed during the conversation",
    },

    {
      id:
        "general-share-next-steps",

      text:
        "Next steps and who is responsible for completing them",
    },

    {
      id:
        "general-share-follow-up",

      text:
        "Follow-up information, dates, contacts, or other details you want to remember",
    },
  ],


  /*
   * ==========================================================
   * BEFORE YOU END THE CONVERSATION
   * ==========================================================
   */

  beforeYouLeave: [
    {
      id:
        "general-close-summary",

      text:
        "Confirm your understanding of the important information or decisions discussed.",
    },

    {
      id:
        "general-close-next-step",

      text:
        "Confirm what happens next.",
    },

    {
      id:
        "general-close-family-action",

      text:
        "Confirm whether you need to take any additional action.",
    },

    {
      id:
        "general-close-other-action",

      text:
        "Confirm whether another person or organization is responsible for any next steps.",
    },

    {
      id:
        "general-close-contact",

      text:
        "Confirm who to contact if you have questions.",
    },

    {
      id:
        "general-close-follow-up",

      text:
        "Ask when you should expect follow-up or when you should check back, if applicable.",
    },
  ],
};