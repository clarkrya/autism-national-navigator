/*
 * ============================================================
 * INSURANCE / BENEFITS CONVERSATION TEMPLATE
 * ============================================================
 *
 * Trusted base template used when a family's Current Journey
 * indicates preparation for an insurance, benefits, coverage,
 * network, referral, authorization, or related conversation.
 *
 * IMPORTANT:
 *
 * This template helps families organize questions, information,
 * and follow-up for conversations with an insurance plan,
 * benefits administrator, provider, or other organization.
 *
 * Insurance and benefits vary by plan, program, provider,
 * service, location, and individual circumstances.
 *
 * This template does NOT:
 *
 *   - Determine eligibility
 *   - Determine whether a service is covered
 *   - Determine whether a provider is in-network
 *   - Determine medical necessity
 *   - Determine whether authorization will be approved
 *   - Interpret a specific insurance contract
 *   - Estimate or guarantee out-of-pocket costs
 *   - Guarantee payment or reimbursement
 *
 * Provider acceptance of an insurance type or program should
 * not be treated as confirmation of network participation,
 * coverage, authorization, or payment.
 *
 * Families should confirm plan-specific information directly
 * with the appropriate insurance plan, benefits administrator,
 * provider, or other responsible organization.
 *
 * AI personalization may:
 *
 *   - Prioritize relevant template items
 *   - Connect preparation to the Current Journey
 *   - Add family-specific questions based on known context
 *
 * AI personalization should NOT:
 *
 *   - Invent plan benefits or requirements
 *   - State that a service is covered or not covered
 *   - State that a provider is in-network or out-of-network
 *   - Predict authorization or claim decisions
 *   - Determine medical necessity
 *   - Promise reimbursement
 *   - Present estimated costs as guaranteed costs
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


export const insuranceBenefitsTemplate:
  MeetingTemplate = {

  type:
    "insurance_benefits",

  title:
    "Insurance / Benefits Conversation",

  description:
    "Prepare for a conversation about insurance, benefits, coverage, network status, referrals, authorization, costs, or related services by organizing your questions and the information you may need.",


  /*
   * ==========================================================
   * PRIORITIES
   * ==========================================================
   */

  priorities: [
    {
      id:
        "insurance-identify-question",

      text:
        "Clearly identify the service, provider, program, medication, equipment, or benefit you are asking about.",
    },

    {
      id:
        "insurance-understand-plan-information",

      text:
        "Understand what the plan or organization can confirm about coverage, network requirements, authorization, costs, or next steps.",
    },

    {
      id:
        "insurance-identify-requirements",

      text:
        "Identify whether referrals, prior authorization, documentation, or other steps may be required.",
    },

    {
      id:
        "insurance-clarify-responsibilities",

      text:
        "Clarify which next steps the family, provider, insurance plan, or another organization is responsible for completing.",
    },

    {
      id:
        "insurance-document-conversation",

      text:
        "Keep a record of important information from the conversation and know how to follow up if needed.",
    },
  ],


  /*
   * ==========================================================
   * QUESTIONS TO ASK
   * ==========================================================
   *
   * These are suggested questions.
   *
   * Not every question will apply to every plan, program, or
   * conversation.
   * ==========================================================
   */

  questions: [
    {
      id:
        "insurance-question-coverage",

      text:
        "Can you explain what my specific plan says about coverage for this service or benefit?",
    },

    {
      id:
        "insurance-question-network-status",

      text:
        "Is this specific provider or facility considered in-network for my plan?",
    },

    {
      id:
        "insurance-question-network-requirements",

      text:
        "Are there network requirements or restrictions I should understand before scheduling or receiving the service?",
    },

    {
      id:
        "insurance-question-referral",

      text:
        "Does my plan require a referral for this service or provider?",
    },

    {
      id:
        "insurance-question-prior-authorization",

      text:
        "Is prior authorization or another approval process required before the service is provided?",
    },

    {
      id:
        "insurance-question-authorization-responsibility",

      text:
        "If authorization is required, who is responsible for submitting the request?",
    },

    {
      id:
        "insurance-question-documentation",

      text:
        "What information or documentation is needed, and who needs to provide it?",
    },

    {
      id:
        "insurance-question-cost-sharing",

      text:
        "What copay, coinsurance, deductible, or other cost-sharing information can you confirm for this service?",
    },

    {
      id:
        "insurance-question-limitations",

      text:
        "Are there plan limits, conditions, or other requirements that may apply to this service or benefit?",
    },

    {
      id:
        "insurance-question-next-step",

      text:
        "What should happen next, and is there anything our family needs to do?",
    },

    {
      id:
        "insurance-question-review-timing",

      text:
        "If additional review or authorization is needed, how can we check the status and when should we follow up?",
    },

    {
      id:
        "insurance-question-written-information",

      text:
        "Is there written plan information, a benefit document, or another resource you can direct me to for the information we discussed?",
    },

    {
      id:
        "insurance-question-reference-number",

      text:
        "Can I have a reference or call number for this conversation, if available?",
    },
  ],


  /*
   * ==========================================================
   * ITEMS TO CONSIDER HAVING AVAILABLE
   * ==========================================================
   *
   * These are suggestions rather than universal requirements.
   *
   * Families should avoid sharing information that is not
   * needed for the specific conversation.
   * ==========================================================
   */

  bringItems: [
    {
      id:
        "insurance-have-plan-information",

      text:
        "Your insurance card or relevant plan information.",
    },

    {
      id:
        "insurance-have-service-information",

      text:
        "The name or description of the service, benefit, medication, equipment, or program you are asking about.",
    },

    {
      id:
        "insurance-have-provider-information",

      text:
        "The provider or facility name and contact information, if applicable.",
    },

    {
      id:
        "insurance-have-provider-identifiers",

      text:
        "Provider or facility identifying information requested by the plan, if available.",
    },

    {
      id:
        "insurance-have-referral-information",

      text:
        "Referral information you already have, if applicable.",
    },

    {
      id:
        "insurance-have-authorization-information",

      text:
        "Prior authorization information, status, or reference numbers you already have, if applicable.",
    },

    {
      id:
        "insurance-have-notices",

      text:
        "Relevant letters, notices, explanations, or benefit information you already received.",
    },

    {
      id:
        "insurance-have-question-list",

      text:
        "A written list of the questions you want to discuss.",
    },

    {
      id:
        "insurance-have-notes",

      text:
        "A place to record the representative's answers, next steps, names, dates, and reference numbers.",
    },
  ],


  /*
   * ==========================================================
   * INFORMATION TO SHARE / RECORD
   * ==========================================================
   *
   * For insurance conversations, these note sections may be
   * used both to organize what the family needs to ask about
   * and to record what was confirmed during the conversation.
   * ==========================================================
   */

  informationToShare: [
    {
      id:
        "insurance-share-service",

      text:
        "Service, provider, program, medication, equipment, or benefit you are asking about",
    },

    {
      id:
        "insurance-share-goal",

      text:
        "What you are trying to confirm or accomplish during the conversation",
    },

    {
      id:
        "insurance-share-referral",

      text:
        "Referral information you already have, if applicable",
    },

    {
      id:
        "insurance-share-authorization",

      text:
        "Authorization information or status you already have, if applicable",
    },

    {
      id:
        "insurance-share-network",

      text:
        "Questions or information about provider or facility network status",
    },

    {
      id:
        "insurance-share-coverage",

      text:
        "Coverage or benefit information the representative confirms",
    },

    {
      id:
        "insurance-share-costs",

      text:
        "Copay, coinsurance, deductible, or other cost information discussed",
    },

    {
      id:
        "insurance-share-requirements",

      text:
        "Referral, authorization, documentation, or other requirements discussed",
    },

    {
      id:
        "insurance-share-representative",

      text:
        "Representative's name or identifier, if provided",
    },

    {
      id:
        "insurance-share-reference",

      text:
        "Reference, call, case, or authorization number, if provided",
    },

    {
      id:
        "insurance-share-next-steps",

      text:
        "Next steps and who is responsible for completing them",
    },

    {
      id:
        "insurance-share-follow-up",

      text:
        "When and how to follow up, if needed",
    },
  ],


  /*
   * ==========================================================
   * BEFORE YOU END THE CONVERSATION
   * ==========================================================
   *
   * These prompts help families document what was actually
   * confirmed and understand what happens next.
   * ==========================================================
   */

  beforeYouLeave: [
    {
      id:
        "insurance-close-confirm-information",

      text:
        "Repeat back the key information you heard to confirm your understanding.",
    },

    {
      id:
        "insurance-close-next-step",

      text:
        "Confirm the next step and whether there is anything your family needs to do.",
    },

    {
      id:
        "insurance-close-other-responsibilities",

      text:
        "Ask whether the provider, insurance plan, or another organization needs to take any action.",
    },

    {
      id:
        "insurance-close-documentation",

      text:
        "Confirm whether any additional documentation or information is needed and who should provide it.",
    },

    {
      id:
        "insurance-close-status-follow-up",

      text:
        "If something is still pending, ask how to check its status and when you should follow up.",
    },

    {
      id:
        "insurance-close-written-information",

      text:
        "Ask where you can find written information about the benefit, requirement, or process discussed, if available.",
    },

    {
      id:
        "insurance-close-representative",

      text:
        "Record the representative's name or identifier, if provided.",
    },

    {
      id:
        "insurance-close-reference",

      text:
        "Record the reference, call, case, or authorization number, if provided.",
    },
  ],
};