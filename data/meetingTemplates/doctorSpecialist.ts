/*
 * ============================================================
 * DOCTOR / SPECIALIST MEETING TEMPLATE
 * ============================================================
 *
 * Trusted base template used when a family's Current Journey
 * indicates preparation for an appointment with a healthcare
 * provider or specialist.
 *
 * IMPORTANT:
 *
 * This template provides general preparation suggestions.
 *
 * Appointments vary by provider, specialty, reason for the
 * visit, and the child's individual needs.
 *
 * Items in this template should NOT be presented as universal
 * requirements.
 *
 * Families should follow instructions provided by their
 * healthcare provider or practice when those instructions
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
 *   - Diagnose or suggest a diagnosis
 *   - Recommend or change treatment
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


export const doctorSpecialistTemplate:
  MeetingTemplate = {

  type:
    "doctor_specialist",

  title:
    "Doctor / Specialist Appointment",

  description:
    "Prepare for an appointment with a healthcare provider or specialist by organizing your concerns, questions, relevant information, and follow-up needs.",


  /*
   * ==========================================================
   * PRIORITIES
   * ==========================================================
   */

  priorities: [
    {
      id:
        "provider-discuss-main-concerns",

      text:
        "Make sure your main concerns, priorities, and questions are discussed.",
    },

    {
      id:
        "provider-share-important-updates",

      text:
        "Share important changes, updates, or observations that may be relevant to the visit.",
    },

    {
      id:
        "provider-understand-recommendations",

      text:
        "Understand any recommendations or next steps discussed during the appointment.",
    },

    {
      id:
        "provider-understand-follow-up",

      text:
        "Know what follow-up, if any, may be needed after the appointment.",
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
        "provider-question-visit-focus",

      text:
        "What are the most important things for us to focus on during today's appointment?",
    },

    {
      id:
        "provider-question-changes-to-watch",

      text:
        "Are there changes, symptoms, behaviors, or concerns you would like us to continue to watch or keep track of?",
    },

    {
      id:
        "provider-question-evaluations-referrals",

      text:
        "Are there evaluations, referrals, services, or follow-up appointments we should discuss?",
    },

    {
      id:
        "provider-question-recommendation-purpose",

      text:
        "If something new is recommended, what is the purpose of the recommendation?",
    },

    {
      id:
        "provider-question-options",

      text:
        "If a new treatment, test, service, or other next step is recommended, are there benefits, risks, alternatives, or other considerations we should understand?",
    },

    {
      id:
        "provider-question-what-to-monitor",

      text:
        "Is there anything you would like us to monitor or document before the next appointment?",
    },

    {
      id:
        "provider-question-after-visit-contact",

      text:
        "Who should we contact if we have questions or concerns after the appointment?",
    },

    {
      id:
        "provider-question-follow-up-timing",

      text:
        "When should we follow up, if needed?",
    },
  ],


  /*
   * ==========================================================
   * ITEMS TO CONSIDER BRINGING
   * ==========================================================
   *
   * These are suggestions rather than requirements.
   *
   * Families should follow instructions from the provider or
   * practice regarding what should be submitted beforehand or
   * brought to the appointment.
   * ==========================================================
   */

  bringItems: [
    {
      id:
        "provider-bring-appointment-instructions",

      text:
        "Appointment instructions, forms, or questionnaires from the provider or practice, if provided.",
    },

    {
      id:
        "provider-bring-insurance-identification",

      text:
        "Insurance information and identification, if requested by the provider or practice.",
    },

    {
      id:
        "provider-bring-medication-list",

      text:
        "A current list of medications and supplements you would like the provider to know about, if applicable.",
    },

    {
      id:
        "provider-bring-relevant-records",

      text:
        "Relevant medical, developmental, or evaluation records you already have, if available and relevant to the appointment.",
    },

    {
      id:
        "provider-bring-current-support-information",

      text:
        "Information about current providers, therapies, services, school supports, or other supports, if relevant.",
    },

    {
      id:
        "provider-bring-changes-concerns",

      text:
        "A written list of changes, observations, or concerns you want to discuss.",
    },

    {
      id:
        "provider-bring-question-list",

      text:
        "A written list of your main questions and priorities for the appointment.",
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
   * their situation and the purpose of the appointment.
   * ==========================================================
   */

  informationToShare: [
    {
      id:
        "provider-share-reason-for-visit",

      text:
        "The main concerns, questions, or goals you want to address during the appointment",
    },

    {
      id:
        "provider-share-changes",

      text:
        "Changes, symptoms, behaviors, or concerns you have noticed",
    },

    {
      id:
        "provider-share-strengths-progress",

      text:
        "Strengths, progress, or positive changes you want the provider to know about",
    },

    {
      id:
        "provider-share-medications",

      text:
        "Current medications or supplements, if applicable",
    },

    {
      id:
        "provider-share-current-supports",

      text:
        "Current therapies, services, school supports, or other supports, if relevant",
    },

    {
      id:
        "provider-share-recent-evaluations",

      text:
        "Recent evaluations, test results, recommendations, or other relevant updates, if applicable",
    },

    {
      id:
        "provider-share-other-questions",

      text:
        "Questions or concerns you do not want to forget",
    },
  ],


  /*
   * ==========================================================
   * BEFORE YOU LEAVE
   * ==========================================================
   *
   * These prompts help the family leave the appointment with a
   * clearer understanding of recommendations and follow-up.
   * ==========================================================
   */

  beforeYouLeave: [
    {
      id:
        "provider-close-recommendations",

      text:
        "Confirm the recommendations and next steps discussed during the appointment.",
    },

    {
      id:
        "provider-close-referrals",

      text:
        "Ask whether any referrals, evaluations, tests, services, or follow-up appointments are needed.",
    },

    {
      id:
        "provider-close-responsibilities",

      text:
        "Clarify which next steps the family should complete and which steps the provider or practice will handle.",
    },

    {
      id:
        "provider-close-contact",

      text:
        "Confirm who to contact if you have questions or concerns after the appointment.",
    },

    {
      id:
        "provider-close-follow-up",

      text:
        "Ask when follow-up should occur, if needed.",
    },

    {
      id:
        "provider-close-additional-information",

      text:
        "Confirm whether any additional information, records, forms, or monitoring are needed.",
    },
  ],
};