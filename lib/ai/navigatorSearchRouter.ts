import "server-only";

import {
  classifyNavigatorIntent,
  type NavigatorIntent,
  type NavigatorIntentResult,
  type NavigatorTopic,
} from "./navigatorIntentEngine";

import type {
  NavigatorResearchType,
} from "./navigatorWebSearch";

/*
 * ============================================================
 * TYPES
 * ============================================================
 */

export type NavigatorSearchDecision = {
  shouldSearch: boolean;

  publicQuery: string | null;

  needsClarification: boolean;

  reason: string;

  researchType?: NavigatorResearchType;

  useJourneyContext?: boolean;

  requiresCurrentInformation?: boolean;

  geographicScope?:
    NavigatorIntentResult["geographicScope"];

  requestedState?: string | null;

  topics?: NavigatorTopic[];
};

type NavigatorConversationMessage = {
  role: "user" | "navigator";

  text: string;
};

type NavigatorSearchInput = {
  question: string;

  state?: unknown;

  messages?: NavigatorConversationMessage[];
};

/*
 * ============================================================
 * APPROVED UNITED STATES GEOGRAPHY
 * ============================================================
 */

const US_STATES = [
  "Alabama",
  "Alaska",
  "Arizona",
  "Arkansas",
  "California",
  "Colorado",
  "Connecticut",
  "Delaware",
  "Florida",
  "Georgia",
  "Hawaii",
  "Idaho",
  "Illinois",
  "Indiana",
  "Iowa",
  "Kansas",
  "Kentucky",
  "Louisiana",
  "Maine",
  "Maryland",
  "Massachusetts",
  "Michigan",
  "Minnesota",
  "Mississippi",
  "Missouri",
  "Montana",
  "Nebraska",
  "Nevada",
  "New Hampshire",
  "New Jersey",
  "New Mexico",
  "New York",
  "North Carolina",
  "North Dakota",
  "Ohio",
  "Oklahoma",
  "Oregon",
  "Pennsylvania",
  "Rhode Island",
  "South Carolina",
  "South Dakota",
  "Tennessee",
  "Texas",
  "Utah",
  "Vermont",
  "Virginia",
  "Washington",
  "West Virginia",
  "Wisconsin",
  "Wyoming",
  "District of Columbia",
] as const;

const STATE_CODES = [
  "AL", "AK", "AZ", "AR", "CA",
  "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA",
  "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO",
  "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH",
  "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT",
  "VA", "WA", "WV", "WI", "WY",
  "DC",
];

/*
 * ============================================================
 * TEXT HELPERS
 * ============================================================
 */

function normalizeQuestion(
  value: string
): string {
  return value
    .replace(/[’‘]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(
  value: string
): string {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
}

/*
 * ============================================================
 * STATE VALIDATION
 * ============================================================
 */

function normalizeState(
  value: unknown
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value
    .trim()
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase();

  const state = US_STATES.find(
    item =>
      item.toLowerCase() === normalized
  );

  if (state) {
    return state;
  }

  const codeIndex = STATE_CODES.indexOf(
    normalized.toUpperCase()
  );

  return codeIndex >= 0
    ? US_STATES[codeIndex]
    : null;
}

/*
 * ============================================================
 * EXPLICIT STATE DETECTION
 * ============================================================
 */

function detectRequestedState(
  question: string
): string | null {
  const normalized =
    normalizeQuestion(question);

  const standaloneState =
    normalizeState(
      normalized.replace(/[.!?]+$/, "")
    );

  if (standaloneState) {
    return standaloneState;
  }

  const states = [...US_STATES].sort(
    (a, b) => b.length - a.length
  );

  for (const state of states) {
    const escapedState =
      escapeRegExp(state);

    const locationPattern = new RegExp(
      `\\b(?:in|near|within|for|across|around|throughout|from)\\s+${escapedState}\\b`,
      "i"
    );

    const programPattern = new RegExp(
      `\\b${escapedState}\\s+(?:Medicaid|CHIP|law|laws|waiver|waivers|insurance|providers|programs|schools)\\b`,
      "i"
    );

    if (
      locationPattern.test(normalized) ||
      programPattern.test(normalized)
    ) {
      return state;
    }
  }

  for (
    let index = 0;
    index < STATE_CODES.length;
    index++
  ) {
    const code = STATE_CODES[index];

    const locationPattern = new RegExp(
      `\\b(?:in|near|within|across|around|throughout)\\s+${code}\\b`
    );

    const programPattern = new RegExp(
      `\\b${code}\\s+(?:Medicaid|CHIP)\\b`
    );

    if (
      locationPattern.test(normalized) ||
      programPattern.test(normalized)
    ) {
      return US_STATES[index];
    }
  }

  return null;
}

/*
 * ============================================================
 * CONVERSATION CONTEXT
 * ============================================================
 */

function getRecentConversation(
  messages: NavigatorSearchInput["messages"],
  question: string
): NavigatorConversationMessage[] {
  const recentMessages = (
    Array.isArray(messages)
      ? messages
      : []
  )
    .filter(
      message =>
        message &&
        (
          message.role === "user" ||
          message.role === "navigator"
        ) &&
        typeof message.text === "string" &&
        message.text.trim()
    )
    .slice(-7);

  const lastMessage =
    recentMessages[
      recentMessages.length - 1
    ];

  if (
    lastMessage?.role === "user" &&
    normalizeQuestion(lastMessage.text) ===
      normalizeQuestion(question)
  ) {
    recentMessages.pop();
  }

  return recentMessages
    .slice(-6)
    .map(message => ({
      role: message.role,

      text: message.text
        .trim()
        .slice(0, 1500),
    }));
}

/*
 * ============================================================
 * GEOGRAPHIC GROUNDING
 * ============================================================
 *
 * A classified state must be supported by
 * user-provided conversation text.
 *
 * Assistant-generated location assumptions
 * are not sufficient geographic evidence.
 */

function containsStateReference(
  text: string,
  state: string
): boolean {
  const normalized =
    normalizeQuestion(text);

  const detected =
    detectRequestedState(normalized);

  if (detected === state) {
    return true;
  }

  const escapedState =
    escapeRegExp(state);

  const statePattern = new RegExp(
    `\\b${escapedState}\\b`,
    "i"
  );

  if (statePattern.test(normalized)) {
    return true;
  }

  const stateIndex =
    US_STATES.findIndex(
      item => item === state
    );

  if (stateIndex < 0) {
    return false;
  }

  const code =
    STATE_CODES[stateIndex];

  const codePattern = new RegExp(
    `(?:,\\s*|\\b(?:in|near|within|across)\\s+)${code}\\b`
  );

  return codePattern.test(normalized);
}

function isGroundedState(
  state: string,
  question: string,
  messages: NavigatorConversationMessage[]
): boolean {
  if (
    containsStateReference(
      question,
      state
    )
  ) {
    return true;
  }

  return messages.some(
    message =>
      message.role === "user" &&
      containsStateReference(
        message.text,
        state
      )
  );
}

/*
 * ============================================================
 * SEARCH PREFERENCE
 * ============================================================
 */

function userDeclinesSearch(
  question: string
): boolean {
  return /\b(?:do not search|don't search|without searching|no web search|no internet search|do not browse|don't browse)\b/i.test(
    question
  );
}

function isIndividualTreatmentQuestion(
  question: string
): boolean {
  return /\b(?:should i give|should my child take|should my child start|should my child stop|what medication should|what medicine should|what dosage|what dose|how much should i give|which medication should|which treatment should|should i stop taking|should i start taking|should i increase the dose|should i decrease the dose)\b/i.test(
    question
  );
}

/*
 * ============================================================
 * GEOGRAPHIC PREFERENCES
 * ============================================================
 */

function isNationalSearch(
  question: string
): boolean {
  return /\b(?:nationwide|nationally|across the country|all states|across the united states|national programs?)\b/i.test(
    question
  );
}

function explicitlyRequestsSavedState(
  question: string
): boolean {
  return /\b(?:my state|our state|my home state|our home state|the state i live in|the state we live in|my journey state|state in my journey)\b/i.test(
    question
  );
}

function explicitlyRequestsLocalSearch(
  question: string
): boolean {
  return /\b(?:near me|nearby|local|in my area|in my city|in my county|closest to me|within driving distance|zip code)\b/i.test(
    question
  );
}

/*
 * ============================================================
 * SEARCH DECISION HELPERS
 * ============================================================
 */

function intentMetadata(
  intent?: NavigatorIntentResult
): Partial<NavigatorSearchDecision> {
  if (!intent) {
    return {};
  }

  return {
    useJourneyContext:
      intent.useJourneyContext,

    requiresCurrentInformation:
      intent.requiresCurrentInformation,

    geographicScope:
      intent.geographicScope,

    requestedState:
      intent.requestedState,

    topics:
      intent.topics,
  };
}

function noSearch(
  reason: string,
  intent?: NavigatorIntentResult
): NavigatorSearchDecision {
  return {
    ...intentMetadata(intent),

    shouldSearch: false,

    publicQuery: null,

    needsClarification: false,

    reason,
  };
}

function clarification(
  reason: string,
  intent?: NavigatorIntentResult
): NavigatorSearchDecision {
  return {
    ...intentMetadata(intent),

    shouldSearch: false,

    publicQuery: null,

    needsClarification: true,

    reason,
  };
}

/*
 * ============================================================
 * STRUCTURED RESEARCH CATEGORY
 * ============================================================
 *
 * Research categories are determined from
 * classified intent and approved topics.
 *
 * Never determine the research category
 * by scanning generated search instructions.
 */

function resolveResearchType(
  intent: NavigatorIntentResult
): NavigatorResearchType {
  switch (intent.intent) {
    case "provider_search":
      return "providers";

    case "resource_search":
      return "community_resources";

    case "financial_assistance":
      return intent.topics.includes("grants")
        ? "grants"
        : "financial_assistance";

    case "insurance_coverage":
      return "insurance";

    case "education_rights":
      return "education";

    case "research_evidence":
      return "medical_research";

    case "journey_guidance":
      return "community_resources";

    case "application_guidance":
      if (
        intent.topics.includes("grants")
      ) {
        return "grants";
      }

      if (
        intent.topics.includes("medicaid") ||
        intent.topics.includes("medicaid_waivers") ||
        intent.topics.includes("chip") ||
        intent.topics.includes("private_insurance")
      ) {
        return "insurance";
      }

      if (
        intent.topics.includes("financial_assistance") ||
        intent.topics.includes("scholarships")
      ) {
        return "financial_assistance";
      }

      return "general";

    case "current_information":
      if (
        intent.topics.includes("grants")
      ) {
        return "grants";
      }

      return "general";

    default:
      return "general";
  }
}

/*
 * ============================================================
 * APPROVED RESEARCH INSTRUCTIONS
 * ============================================================
 */

const INTENT_SEARCH_INSTRUCTIONS: Partial<
  Record<NavigatorIntent, string>
> = {
  general_information:
    "Provide a direct educational explanation supported by authoritative sources.",

  journey_guidance:
    "Find public resources relevant to the requested subject.",

  provider_search:
    "Find actual service providers offering the requested service. Include provider names, service locations, official websites, and publicly listed contact information. Prioritize actual providers over general insurance information. Include provider directories when useful. Do not claim availability or insurance acceptance unless confirmed.",

  resource_search:
    "Find relevant organizations, programs, and services. Include essential eligibility information and direct access links.",

  financial_assistance:
    "Find financial assistance relevant to the requested need. Include eligibility, funding amounts, restrictions, application requirements, and official application links when confirmed. Distinguish different forms of assistance.",

  insurance_coverage:
    "Answer whether the requested insurance program covers the specific requested service. Explain coverage requirements, restrictions, prior authorization, and relevant exceptions. Do not introduce unrelated insurance programs. Prioritize official coverage policies.",

  education_rights:
    "Research the specific educational right, requirement, or procedure. Prioritize official federal and state education authorities. Distinguish legal requirements from general recommendations.",

  research_evidence:
    "Research the specific requested subject. Prioritize peer-reviewed studies, systematic reviews, current clinical guidance, and authoritative medical organizations. Include publication dates, major findings, evidence limitations, and relevant safety considerations.",

  current_information:
    "Find the most current authoritative information about the requested subject. Verify dates and distinguish confirmed information from uncertainty.",

  application_guidance:
    "Explain how to apply for the requested program or service. Include essential eligibility requirements, application steps, and official application links.",
};

/*
 * ============================================================
 * GRANT RESEARCH INSTRUCTIONS
 * ============================================================
 */

function buildGrantInstructions(
  intent: NavigatorIntentResult
): string {
  if (
    intent.requiresCurrentInformation &&
    intent.intent === "financial_assistance"
  ) {
    return [
      "Find grants relevant to the requested need.",
      "Include only confirmed open or rolling application opportunities.",
      "Exclude closed, upcoming, and unconfirmed opportunities.",
      "Include award amounts, eligibility, deadlines, and official application links when confirmed.",
      "Distinguish monetary awards from in-kind assistance.",
      "Do not substitute insurance, loans, or public benefits for grants.",
      "If no matching open grants can be confirmed, say so clearly.",
    ].join(" ");
  }

  return [
    "Find relevant grant opportunities.",
    "Verify eligibility, application requirements, and application status.",
    "Clearly distinguish confirmed open, closed, and unconfirmed opportunities.",
    "Do not substitute insurance, loans, or public benefits for grants.",
  ].join(" ");
}

/*
 * ============================================================
 * GEOGRAPHIC RESOLUTION
 * ============================================================
 */

type GeographicResolution = {
  geography: string;

  requestedState: string | null;

  clarificationReason: string | null;
};

function resolveGeography(
  input: NavigatorSearchInput,
  question: string,
  messages: NavigatorConversationMessage[],
  intent: NavigatorIntentResult
): GeographicResolution {
  const savedState =
    normalizeState(input.state);

  const explicitState =
    detectRequestedState(question);

  const classifiedState =
    normalizeState(
      intent.requestedState
    );

  const groundedClassifiedState =
    classifiedState &&
    isGroundedState(
      classifiedState,
      question,
      messages
    )
      ? classifiedState
      : null;

  /*
   * Explicit nationwide requests override
   * saved or previous state restrictions.
   */

  if (
    isNationalSearch(question) &&
    !explicitState
  ) {
    return {
      geography:
        "Geographic focus: nationwide United States. Do not restrict results to an individual state.",

      requestedState: null,

      clarificationReason: null,
    };
  }

  /*
   * Local searches require validated local
   * geographic information.
   *
   * Do not forward arbitrary city names,
   * ZIP codes, street addresses, or other
   * private location information.
   */

  if (
    intent.geographicScope === "local" ||
    explicitlyRequestsLocalSearch(question)
  ) {
    return {
      geography: "",

      requestedState: null,

      clarificationReason:
        "LOCAL_SEARCH_LOCATION_REQUIRED",
    };
  }

  /*
   * Explicit current geography takes priority
   * over relevant conversation geography.
   */

  if (
    explicitState ||
    intent.geographicScope === "requested_state"
  ) {
    const requestedState =
      explicitState ||
      groundedClassifiedState;

    if (!requestedState) {
      return {
        geography: "",

        requestedState: null,

        clarificationReason:
          "REQUESTED_STATE_REQUIRED",
      };
    }

    let geography =
      `Geographic focus: ${requestedState}, United States.`;

    if (
      intent.intent === "financial_assistance"
    ) {
      geography +=
        " Include applicable nationwide funding opportunities.";
    }

    return {
      geography,

      requestedState,

      clarificationReason: null,
    };
  }

  /*
   * Saved state is optional personalization,
   * not a default geographic restriction.
   */

  const useSavedState =
    explicitlyRequestsSavedState(question) ||
    (
      intent.geographicScope === "saved_state" &&
      intent.useJourneyContext &&
      intent.intent === "journey_guidance"
    );

  if (useSavedState) {
    if (!savedState) {
      return {
        geography: "",

        requestedState: null,

        clarificationReason:
          "STATE_REQUIRED",
      };
    }

    let geography =
      `Geographic focus: ${savedState}, United States.`;

    if (
      intent.intent === "financial_assistance"
    ) {
      geography +=
        " Include applicable nationwide funding opportunities.";
    }

    return {
      geography,

      requestedState: savedState,

      clarificationReason: null,
    };
  }

  /*
   * Insurance and educational rights questions
   * default to general United States information.
   */

  if (
    intent.intent === "insurance_coverage" ||
    intent.intent === "education_rights"
  ) {
    return {
      geography:
        "Geographic focus: general United States information. Explain federal requirements and general principles. Acknowledge state-specific differences without selecting an individual state.",

      requestedState: null,

      clarificationReason: null,
    };
  }

  /*
   * Broad financial assistance and community
   * resource searches default to nationwide.
   */

  if (
    intent.intent === "financial_assistance" ||
    intent.intent === "resource_search"
  ) {
    return {
      geography:
        "Geographic focus: nationwide United States. Prioritize broadly accessible opportunities without unnecessary state restrictions.",

      requestedState: null,

      clarificationReason: null,
    };
  }

  /*
   * Provider searches normally require
   * meaningful geographic information.
   */

  if (
    intent.intent === "provider_search"
  ) {
    if (
      intent.geographicScope === "nationwide"
    ) {
      return {
        geography:
          "Geographic focus: nationwide United States. Prioritize national provider directories and clearly identify service areas.",

        requestedState: null,

        clarificationReason: null,
      };
    }

    return {
      geography: "",

      requestedState: null,

      clarificationReason:
        "PROVIDER_SEARCH_LOCATION_REQUIRED",
    };
  }

  if (
    intent.geographicScope === "nationwide"
  ) {
    return {
      geography:
        "Geographic focus: nationwide United States.",

      requestedState: null,

      clarificationReason: null,
    };
  }

  /*
   * General educational and scientific
   * information does not require geography.
   */

  return {
    geography: "",

    requestedState: null,

    clarificationReason: null,
  };
}

/*
 * ============================================================
 * MAIN AI SEARCH ROUTER
 * ============================================================
 */

export async function routeNavigatorSearchWithAI(
  input: NavigatorSearchInput
): Promise<NavigatorSearchDecision> {
  const question =
    typeof input.question === "string"
      ? normalizeQuestion(input.question)
      : "";

  if (!question) {
    return noSearch(
      "EMPTY_QUESTION"
    );
  }

  if (question.length > 2000) {
    return noSearch(
      "QUESTION_TOO_LONG"
    );
  }

  const recentConversation =
    getRecentConversation(
      input.messages,
      question
    );

  try {
    /*
     * Classify the current question together
     * with bounded recent conversation context.
     */

    const intent =
      await classifyNavigatorIntent({
        question,

        messages:
          recentConversation,
      });

    /*
     * Urgent safety and individualized
     * medical guidance always take priority.
     */

    if (
      intent.urgentSafetyConcern ||
      intent.intent === "urgent_safety"
    ) {
      return noSearch(
        "URGENT_SAFETY_CONCERN",
        intent
      );
    }

    if (
      intent.intent === "medical_guidance" ||
      isIndividualTreatmentQuestion(question)
    ) {
      return noSearch(
        "INDIVIDUAL_MEDICAL_GUIDANCE",
        intent
      );
    }

    /*
     * Respect explicit no-search preferences.
     */

    if (
      intent.searchPreference === "declined" ||
      userDeclinesSearch(question)
    ) {
      return noSearch(
        "USER_DECLINED_SEARCH",
        intent
      );
    }

    /*
     * Handle geographic clarification
     * separately from topic clarification.
     */

    if (intent.needsClarification) {
      if (
        intent.geographicScope === "local"
      ) {
        return clarification(
          "LOCAL_SEARCH_LOCATION_REQUIRED",
          intent
        );
      }

      if (
        intent.intent === "provider_search" &&
        intent.topics.length > 0 &&
        !intent.topics.includes("other") &&
        intent.geographicScope === "none"
      ) {
        return clarification(
          "PROVIDER_SEARCH_LOCATION_REQUIRED",
          intent
        );
      }

      if (
        intent.topics.length === 0 ||
        intent.topics.includes("other")
      ) {
        return clarification(
          "PUBLIC_SEARCH_TOPIC_REQUIRED",
          intent
        );
      }

      return clarification(
        "PUBLIC_SEARCH_CLARIFICATION_REQUIRED",
        intent
      );
    }

    /*
     * Direct educational or Journey answers
     * do not automatically require live search.
     */

    if (!intent.shouldSearch) {
      return noSearch(
        intent.intent.toUpperCase(),
        intent
      );
    }

    /*
     * Only approved intent categories and
     * topics may enter public research.
     */

    const researchType =
      resolveResearchType(intent);

    const baseInstructions =
      INTENT_SEARCH_INSTRUCTIONS[
        intent.intent
      ];

    if (!baseInstructions) {
      return noSearch(
        "UNSUPPORTED_SEARCH_INTENT",
        intent
      );
    }

    if (
      intent.topics.length === 0 ||
      intent.topics.includes("other")
    ) {
      return clarification(
        "PUBLIC_SEARCH_TOPIC_REQUIRED",
        intent
      );
    }

    const topics =
      intent.topics.map(
        topic =>
          topic.replace(/_/g, " ")
      );

    /*
     * Resolve geographic scope independently
     * of Journey personalization.
     */

    const geographicResolution =
      resolveGeography(
        input,
        question,
        recentConversation,
        intent
      );

    if (
      geographicResolution.clarificationReason
    ) {
      return clarification(
        geographicResolution.clarificationReason,
        intent
      );
    }

    /*
     * Grant-specific instructions apply only
     * to classified grant research.
     */

    const instructions =
      researchType === "grants"
        ? buildGrantInstructions(intent)
        : baseInstructions;

    const freshness =
      intent.requiresCurrentInformation
        ? "Verify current status, dates, and requirements."
        : "";

    /*
     * Construct public research queries using
     * approved topics, server-defined instructions,
     * and validated state information.
     *
     * Never forward the original user question,
     * raw conversation history, child names,
     * family profiles, private notes, medical
     * records, or contact information.
     */

    const publicQuery = [
      `Requested subjects: ${topics.join(", ")}.`,

      instructions,

      geographicResolution.geography,

      freshness,

      "Use authoritative sources and direct official links.",

      "Answer the specific requested intent without introducing unrelated subjects.",
    ]
      .filter(Boolean)
      .join(" ");

    if (publicQuery.length > 1200) {
      return clarification(
        "SEARCH_QUERY_TOO_BROAD",
        intent
      );
    }

    /*
     * Return structured routing information
     * for the Navigator API.
     */

    return {
      ...intentMetadata(intent),

      shouldSearch: true,

      publicQuery,

      needsClarification: false,

      reason:
        `AI_INTENT_${intent.intent.toUpperCase()}`,

      researchType,

      requestedState:
        geographicResolution.requestedState,
    };

  } catch {
    /*
     * Fail closed.
     *
     * Never forward an unvalidated question
     * to public web search when classification
     * or routing fails.
     */

    console.error(
      "Navigator AI intent routing failed."
    );

    return noSearch(
      "AI_INTENT_CLASSIFICATION_FAILED"
    );
  }
}

/*
 * ============================================================
 * LEGACY ROUTER COMPATIBILITY
 * ============================================================
 *
 * Retain the previous synchronous export
 * temporarily to avoid breaking imports.
 *
 * All live research must use the asynchronous
 * AI intent router.
 */

export function routeNavigatorSearch(
  _input: NavigatorSearchInput
): NavigatorSearchDecision {
  return noSearch(
    "AI_INTENT_ROUTER_REQUIRED"
  );
}