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

import {
  validateNavigatorGeography,
  buildNavigatorGeographicFocus,
  normalizeNavigatorState,
  type NavigatorGeographicLocation,
} from "./navigatorGeography";

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
  geographicScope?: NavigatorIntentResult["geographicScope"];
  requestedState?: string | null;
  topics?: NavigatorTopic[];
  location?: NavigatorGeographicLocation | null;
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

type GeographicResolution = {
  geography: string;
  requestedState: string | null;
  clarificationReason: string | null;
  location?: NavigatorGeographicLocation | null;
};

/*
 * ============================================================
 * UNITED STATES GEOGRAPHY
 * ============================================================
 */

const STATES = [
  ["AL", "Alabama"],
  ["AK", "Alaska"],
  ["AZ", "Arizona"],
  ["AR", "Arkansas"],
  ["CA", "California"],
  ["CO", "Colorado"],
  ["CT", "Connecticut"],
  ["DE", "Delaware"],
  ["DC", "District of Columbia"],
  ["FL", "Florida"],
  ["GA", "Georgia"],
  ["HI", "Hawaii"],
  ["ID", "Idaho"],
  ["IL", "Illinois"],
  ["IN", "Indiana"],
  ["IA", "Iowa"],
  ["KS", "Kansas"],
  ["KY", "Kentucky"],
  ["LA", "Louisiana"],
  ["ME", "Maine"],
  ["MD", "Maryland"],
  ["MA", "Massachusetts"],
  ["MI", "Michigan"],
  ["MN", "Minnesota"],
  ["MS", "Mississippi"],
  ["MO", "Missouri"],
  ["MT", "Montana"],
  ["NE", "Nebraska"],
  ["NV", "Nevada"],
  ["NH", "New Hampshire"],
  ["NJ", "New Jersey"],
  ["NM", "New Mexico"],
  ["NY", "New York"],
  ["NC", "North Carolina"],
  ["ND", "North Dakota"],
  ["OH", "Ohio"],
  ["OK", "Oklahoma"],
  ["OR", "Oregon"],
  ["PA", "Pennsylvania"],
  ["RI", "Rhode Island"],
  ["SC", "South Carolina"],
  ["SD", "South Dakota"],
  ["TN", "Tennessee"],
  ["TX", "Texas"],
  ["UT", "Utah"],
  ["VT", "Vermont"],
  ["VA", "Virginia"],
  ["WA", "Washington"],
  ["WV", "West Virginia"],
  ["WI", "Wisconsin"],
  ["WY", "Wyoming"],
] as const;

/*
 * ============================================================
 * TEXT HELPERS
 * ============================================================
 */

function normalizeQuestion(value: string): string {
  return value
    .replace(/[’‘]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeGeographicText(value: string): string {
  return normalizeQuestion(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");
}

function escapeRegExp(value: string): string {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
}

function normalizeState(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  return normalizeNavigatorState(
    value
      .trim()
      .replace(/[_-]/g, " ")
      .replace(/\s+/g, " ")
  );
}

/*
 * ============================================================
 * EXPLICIT STATE DETECTION
 * ============================================================
 */

function detectRequestedState(
  question: string
): string | null {
  const normalized = normalizeQuestion(question);

  const standalone = normalized.replace(
    /[.!?]+$/,
    ""
  );

  /*
   * Require uppercase standalone abbreviations
   * to avoid interpreting ordinary words such
   * as "in", "or", and "me" as states.
   */

  if (
    standalone.length !== 2 ||
    /^[A-Z]{2}$/.test(standalone)
  ) {
    const standaloneState =
      normalizeState(standalone);

    if (standaloneState) {
      return standaloneState;
    }
  }

  const sortedStates = [...STATES].sort(
    (a, b) => b[1].length - a[1].length
  );

  for (const [, state] of sortedStates) {
    const escapedState = escapeRegExp(state);

    const locationPattern = new RegExp(
      `\\b(?:in|near|within|for|across|around|throughout|from)\\s+${escapedState}\\b`,
      "i"
    );

    const programPattern = new RegExp(
      `\\b${escapedState}\\s+(?:Medicaid|CHIP|law|laws|waiver|waivers|insurance|providers|programs|schools)\\b`,
      "i"
    );

    const commaPattern = new RegExp(
      `,\\s*${escapedState}\\b`,
      "i"
    );

    if (
      locationPattern.test(normalized) ||
      programPattern.test(normalized) ||
      commaPattern.test(normalized)
    ) {
      return state;
    }
  }

  for (const [code, state] of STATES) {
    const locationPattern = new RegExp(
      `\\b(?:in|near|within|across|around|throughout)\\s+${code}\\b`
    );

    const programPattern = new RegExp(
      `\\b${code}\\s+(?:Medicaid|CHIP)\\b`
    );

    const commaPattern = new RegExp(
      `,\\s*${code}\\b`,
      "i"
    );

    if (
      locationPattern.test(normalized) ||
      programPattern.test(normalized) ||
      commaPattern.test(normalized)
    ) {
      return state;
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
    recentMessages[recentMessages.length - 1];

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
      text: message.text.trim().slice(0, 1500),
    }));
}

/*
 * ============================================================
 * GEOGRAPHIC GROUNDING
 * ============================================================
 */

function containsLocalReference(
  text: string,
  location: string
): boolean {
  const normalizedText =
    normalizeGeographicText(text);

  const normalizedLocation =
    normalizeGeographicText(location);

  if (!normalizedLocation) {
    return false;
  }

  const pattern = new RegExp(
    `(?:^|[^\\p{L}\\p{N}])${escapeRegExp(normalizedLocation)}(?:$|[^\\p{L}\\p{N}])`,
    "iu"
  );

  return pattern.test(normalizedText);
}

function containsStateReference(
  text: string,
  state: string
): boolean {
  const normalized =
    normalizeQuestion(text);

  if (
    detectRequestedState(normalized) === state
  ) {
    return true;
  }

  if (
    containsLocalReference(normalized, state)
  ) {
    return true;
  }

  const entry = STATES.find(
    item => item[1] === state
  );

  if (!entry) {
    return false;
  }

  const code = entry[0];

  const codePattern = new RegExp(
    `(?:,\\s*|\\b(?:in|near|within|across)\\s+)${code}\\b`
  );

  const commaPattern = new RegExp(
    `,\\s*${code}\\b`,
    "i"
  );

  return (
    codePattern.test(normalized) ||
    commaPattern.test(normalized)
  );
}

function isGroundedState(
  state: string,
  question: string,
  messages: NavigatorConversationMessage[]
): boolean {
  return (
    containsStateReference(question, state) ||
    messages.some(
      message =>
        message.role === "user" &&
        containsStateReference(
          message.text,
          state
        )
    )
  );
}

function isGroundedLocalLocation(
  location: string,
  question: string,
  messages: NavigatorConversationMessage[]
): boolean {
  return (
    containsLocalReference(
      question,
      location
    ) ||
    messages.some(
      message =>
        message.role === "user" &&
        containsLocalReference(
          message.text,
          location
        )
    )
  );
}

/*
 * ============================================================
 * ZIP CODE GROUNDING
 * ============================================================
 */

function containsZipReference(
  text: string,
  zipCode: string
): boolean {
  if (!/^\d{5}$/.test(zipCode)) {
    return false;
  }

  const normalized =
    normalizeQuestion(text);

  const standalonePattern = new RegExp(
    `^${zipCode}[.!?]?$`
  );

  if (
    standalonePattern.test(normalized)
  ) {
    return true;
  }

  const zipPattern = new RegExp(
    `\\b(?:zip(?:\\s+code)?|postal\\s+code)\\s*[:#-]?\\s*${zipCode}\\b(?![-\\d])`,
    "i"
  );

  const locationPattern = new RegExp(
    `\\b(?:in|near|around|within|for|serving)\\s+${zipCode}\\b(?![-\\d])`,
    "i"
  );

  return (
    zipPattern.test(normalized) ||
    locationPattern.test(normalized)
  );
}

function isGroundedZipCode(
  zipCode: string,
  question: string,
  messages: NavigatorConversationMessage[]
): boolean {
  return (
    containsZipReference(
      question,
      zipCode
    ) ||
    messages.some(
      message =>
        message.role === "user" &&
        containsZipReference(
          message.text,
          zipCode
        )
    )
  );
}

/*
 * ============================================================
 * SEARCH PREFERENCES AND SAFETY
 * ============================================================
 */

function userDeclinesSearch(
  question: string
): boolean {
  return /\b(?:do not search|don't search|without searching|no web search|no internet search|do not browse|don't browse)\b/i
    .test(question);
}

function isIndividualTreatmentQuestion(
  question: string
): boolean {
  return /\b(?:should i give|should my child take|should my child start|should my child stop|what medication should|what medicine should|what dosage|what dose|how much should i give|which medication should|which treatment should|should i stop taking|should i start taking|should i increase the dose|should i decrease the dose)\b/i
    .test(question);
}

/*
 * ============================================================
 * GEOGRAPHIC PREFERENCES
 * ============================================================
 */

function isNationalSearch(
  question: string
): boolean {
  return /\b(?:nationwide|nationally|across the country|all states|across the united states|national programs?)\b/i
    .test(question);
}

function explicitlyRequestsSavedState(
  question: string
): boolean {
  return /\b(?:my state|our state|my home state|our home state|the state i live in|the state we live in|my journey state|state in my journey)\b/i
    .test(question);
}

function explicitlyRequestsLocalSearch(
  question: string
): boolean {
  return /\b(?:near me|nearby|local|in my area|in my city|in my county|closest to me|within driving distance|zip code)\b/i
    .test(question);
}

function explicitlyRequestsStatewideSearch(
  question: string
): boolean {
  return /\b(?:statewide|entire state|whole state|across the state|anywhere in the state|all of the state)\b/i
    .test(question);
}

function hasLocalCandidate(
  intent: NavigatorIntentResult
): boolean {
  return Boolean(
    intent.requestedCity ||
    intent.requestedCounty ||
    intent.requestedZipCode
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

function geographicClarification(
  reason: string
): GeographicResolution {
  return {
    geography: "",
    requestedState: null,
    clarificationReason: reason,
    location: null,
  };
}

/*
 * ============================================================
 * STRUCTURED RESEARCH CATEGORY
 * ============================================================
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
      if (intent.topics.includes("grants")) {
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
      return intent.topics.includes("grants")
        ? "grants"
        : "general";

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
    "Find actual providers offering the requested services. Include names, locations, official websites, and public contact information. Prioritize actual providers. Do not claim availability or insurance acceptance unless confirmed.",

  resource_search:
    "Find relevant organizations, programs, and services. Include eligibility and direct access links.",

  financial_assistance:
    "Find relevant financial assistance. Include eligibility, funding amounts, restrictions, application requirements, and official application links when confirmed.",

  insurance_coverage:
    "Explain coverage for the requested service and insurance program. Include restrictions, prior authorization, and exceptions. Prioritize official coverage policies.",

  education_rights:
    "Research the requested educational right or procedure. Prioritize official education authorities. Distinguish legal requirements from recommendations.",

  research_evidence:
    "Prioritize peer-reviewed studies, systematic reviews, clinical guidance, and authoritative medical organizations. Include dates, findings, limitations, and safety considerations.",

  current_information:
    "Find current authoritative information. Verify dates and distinguish confirmed information from uncertainty.",

  application_guidance:
    "Explain eligibility, application requirements, application steps, and official application links.",
};

/*
 * ============================================================
 * GRANT RESEARCH
 * ============================================================
 */

function buildGrantInstructions(
  intent: NavigatorIntentResult
): string {
  if (
    intent.requiresCurrentInformation &&
    (
      intent.intent === "financial_assistance" ||
      intent.intent === "current_information"
    )
  ) {
    return [
      "Find grants relevant to the requested need.",
      "Include only confirmed open or rolling opportunities.",
      "Exclude closed, upcoming, and unconfirmed opportunities.",
      "Include awards, eligibility, deadlines, and official application links.",
      "Distinguish monetary awards from in-kind assistance.",
      "Do not substitute insurance, loans, or public benefits.",
      "If no matching open grants can be confirmed, say so.",
    ].join(" ");
  }

  return [
    "Find relevant grants.",
    "Verify eligibility, requirements, and application status.",
    "Distinguish open, closed, and unconfirmed opportunities.",
    "Do not substitute insurance, loans, or public benefits.",
  ].join(" ");
}

/*
 * ============================================================
 * GEOGRAPHIC RESEARCH FOCUS
 * ============================================================
 *
 * State names are checked against the state list.
 * Local candidates receive format and grounding
 * checks before live geographic verification.
 */

function buildGeographicResolution(
  location: NavigatorGeographicLocation,
  intent: NavigatorIntentResult
): GeographicResolution {
  let geography =
    buildNavigatorGeographicFocus(location);

  if (
    intent.intent === "financial_assistance"
  ) {
    geography +=
      " Include applicable nationwide funding opportunities.";
  }

  if (
    intent.intent === "insurance_coverage" &&
    location.state
  ) {
    geography +=
      ` Apply relevant ${location.state} insurance requirements.`;
  }

  return {
    geography,
    requestedState: location.state,
    clarificationReason: null,
    location,
  };
}

/*
 * ============================================================
 * LOCAL GEOGRAPHIC RESOLUTION
 * ============================================================
 */

async function resolveLocalGeography(
  question: string,
  messages: NavigatorConversationMessage[],
  intent: NavigatorIntentResult,
  explicitState: string | null,
  groundedClassifiedState: string | null
): Promise<GeographicResolution> {
  let requestedZipCode =
    intent.requestedZipCode;

  let requestedCity =
    intent.requestedCity;

  let requestedCounty =
    intent.requestedCounty;

  const localState =
    explicitState ||
    groundedClassifiedState;

  const currentZip = Boolean(
    requestedZipCode &&
    containsZipReference(
      question,
      requestedZipCode
    )
  );

  const currentCity = Boolean(
    requestedCity &&
    containsLocalReference(
      question,
      requestedCity
    )
  );

  const currentCounty = Boolean(
    requestedCounty &&
    containsLocalReference(
      question,
      requestedCounty
    )
  );

  /*
   * Current geographic candidates take
   * priority over inherited candidates.
   */

  if (
    currentZip ||
    currentCity ||
    currentCounty
  ) {
    if (!currentZip) {
      requestedZipCode = null;
    }

    if (!currentCity) {
      requestedCity = null;
    }

    if (!currentCounty) {
      requestedCounty = null;
    }
  }

  /*
   * Preserve city or county when the
   * user supplies a missing state.
   *
   * Clear local geography only when
   * statewide coverage is explicitly requested.
   */

  if (
    explicitlyRequestsStatewideSearch(question) &&
    localState
  ) {
    requestedZipCode = null;
    requestedCity = null;
    requestedCounty = null;
  }

  const classifiedState =
    normalizeState(intent.requestedState);

  if (
    explicitState &&
    classifiedState &&
    explicitState !== classifiedState
  ) {
    if (!currentCity) {
      requestedCity = null;
    }

    if (!currentCounty) {
      requestedCounty = null;
    }

    if (!currentZip) {
      requestedZipCode = null;
    }
  }

  /*
   * Do not silently combine conflicting
   * city, county, and ZIP candidates.
   */

  const candidateCount = [
    requestedZipCode,
    requestedCity,
    requestedCounty,
  ].filter(Boolean).length;

  if (candidateCount > 1) {
    return geographicClarification(
      "LOCAL_SEARCH_LOCATION_AMBIGUOUS"
    );
  }

  try {
    /*
     * ZIP CODE
     */

    if (requestedZipCode) {
      if (
        !isGroundedZipCode(
          requestedZipCode,
          question,
          messages
        )
      ) {
        return geographicClarification(
          "LOCAL_SEARCH_LOCATION_INVALID"
        );
      }

      const location =
        await validateNavigatorGeography({
          type: "zip",
          zipCode: requestedZipCode,
        });

      if (!location) {
        return geographicClarification(
          "LOCAL_SEARCH_LOCATION_INVALID"
        );
      }

      const resolution =
        buildGeographicResolution(
          location,
          intent
        );

      /*
       * When a state is supplied with a ZIP,
       * require live research to confirm that
       * the ZIP belongs to that state.
       */

      if (localState) {
        resolution.geography +=
          ` Confirm this ZIP is in ${localState}; otherwise request clarification.`;
      }

      return resolution;
    }

    /*
     * COUNTY
     */

    if (requestedCounty) {
      if (
        !isGroundedLocalLocation(
          requestedCounty,
          question,
          messages
        )
      ) {
        return geographicClarification(
          "LOCAL_SEARCH_LOCATION_INVALID"
        );
      }

      if (!localState) {
        return geographicClarification(
          "LOCAL_SEARCH_STATE_REQUIRED"
        );
      }

      const location =
        await validateNavigatorGeography({
          type: "county",
          county: requestedCounty,
          state: localState,
        });

      if (!location) {
        return geographicClarification(
          "LOCAL_SEARCH_LOCATION_INVALID"
        );
      }

      return buildGeographicResolution(
        location,
        intent
      );
    }

    /*
     * CITY
     */

    if (requestedCity) {
      if (
        !isGroundedLocalLocation(
          requestedCity,
          question,
          messages
        )
      ) {
        return geographicClarification(
          "LOCAL_SEARCH_LOCATION_INVALID"
        );
      }

      if (!localState) {
        return geographicClarification(
          "LOCAL_SEARCH_STATE_REQUIRED"
        );
      }

      const location =
        await validateNavigatorGeography({
          type: "city",
          city: requestedCity,
          state: localState,
        });

      if (!location) {
        return geographicClarification(
          "LOCAL_SEARCH_LOCATION_INVALID"
        );
      }

      return buildGeographicResolution(
        location,
        intent
      );
    }

    /*
     * STATEWIDE FALLBACK
     */

    if (
      localState &&
      (
        explicitState ||
        explicitlyRequestsStatewideSearch(question)
      )
    ) {
      const location =
        await validateNavigatorGeography({
          type: "state",
          state: localState,
        });

      if (location) {
        return buildGeographicResolution(
          location,
          intent
        );
      }
    }

    return geographicClarification(
      "LOCAL_SEARCH_LOCATION_REQUIRED"
    );

  } catch {
    console.error(
      "Navigator geographic preparation failed."
    );

    return geographicClarification(
      "LOCAL_SEARCH_VALIDATION_UNAVAILABLE"
    );
  }
}

/*
 * ============================================================
 * GEOGRAPHIC RESOLUTION
 * ============================================================
 */

async function resolveGeography(
  input: NavigatorSearchInput,
  question: string,
  messages: NavigatorConversationMessage[],
  intent: NavigatorIntentResult
): Promise<GeographicResolution> {
  const savedState =
    normalizeState(input.state);

  const explicitState =
    detectRequestedState(question);

  const classifiedState =
    normalizeState(intent.requestedState);

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
   * Nationwide requests must not inherit
   * unrelated geographic restrictions.
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
      location: null,
    };
  }

  /*
   * LOCAL SEARCH
   */

  if (
    intent.geographicScope === "local" ||
    explicitlyRequestsLocalSearch(question) ||
    hasLocalCandidate(intent)
  ) {
    return resolveLocalGeography(
      question,
      messages,
      intent,
      explicitState,
      groundedClassifiedState
    );
  }

  /*
   * EXPLICIT STATE SEARCH
   */

  if (
    explicitState ||
    intent.geographicScope === "requested_state"
  ) {
    const requestedState =
      explicitState ||
      groundedClassifiedState;

    if (!requestedState) {
      return geographicClarification(
        "REQUESTED_STATE_REQUIRED"
      );
    }

    const location =
      await validateNavigatorGeography({
        type: "state",
        state: requestedState,
      });

    if (!location) {
      return geographicClarification(
        "REQUESTED_STATE_REQUIRED"
      );
    }

    return buildGeographicResolution(
      location,
      intent
    );
  }

  /*
   * SAVED JOURNEY STATE
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
      return geographicClarification(
        "STATE_REQUIRED"
      );
    }

    const location =
      await validateNavigatorGeography({
        type: "state",
        state: savedState,
      });

    if (!location) {
      return geographicClarification(
        "STATE_REQUIRED"
      );
    }

    return buildGeographicResolution(
      location,
      intent
    );
  }

  /*
   * GENERAL INSURANCE AND EDUCATION
   */

  if (
    intent.intent === "insurance_coverage" ||
    intent.intent === "education_rights"
  ) {
    return {
      geography:
        "Geographic focus: general United States information. Explain federal requirements and general principles. Acknowledge state-specific differences.",
      requestedState: null,
      clarificationReason: null,
      location: null,
    };
  }

  /*
   * FINANCIAL ASSISTANCE AND RESOURCES
   */

  if (
    intent.intent === "financial_assistance" ||
    intent.intent === "resource_search"
  ) {
    return {
      geography:
        "Geographic focus: nationwide United States. Prioritize broadly accessible opportunities.",
      requestedState: null,
      clarificationReason: null,
      location: null,
    };
  }

  /*
   * PROVIDER SEARCH
   */

  if (
    intent.intent === "provider_search"
  ) {
    if (
      intent.geographicScope === "nationwide"
    ) {
      return {
        geography:
          "Geographic focus: nationwide United States. Prioritize national provider directories and identify service areas.",
        requestedState: null,
        clarificationReason: null,
        location: null,
      };
    }

    return geographicClarification(
      "PROVIDER_SEARCH_LOCATION_REQUIRED"
    );
  }

  if (
    intent.geographicScope === "nationwide"
  ) {
    return {
      geography:
        "Geographic focus: nationwide United States.",
      requestedState: null,
      clarificationReason: null,
      location: null,
    };
  }

  /*
   * GENERAL EDUCATIONAL QUESTIONS
   */

  return {
    geography: "",
    requestedState: null,
    clarificationReason: null,
    location: null,
  };
}

/*
 * ============================================================
 * INTELLIGENT CLARIFICATION
 * ============================================================
 */

function resolveIntentClarification(
  intent: NavigatorIntentResult,
  question: string
): string {
  if (
    intent.topics.length === 0 ||
    intent.topics.includes("other")
  ) {
    return "PUBLIC_SEARCH_TOPIC_REQUIRED";
  }

  if (
    intent.geographicScope === "local"
  ) {
    if (
      (
        intent.requestedCity ||
        intent.requestedCounty
      ) &&
      !intent.requestedState &&
      !detectRequestedState(question)
    ) {
      return "LOCAL_SEARCH_STATE_REQUIRED";
    }

    if (
      !hasLocalCandidate(intent) &&
      !detectRequestedState(question)
    ) {
      return "LOCAL_SEARCH_LOCATION_REQUIRED";
    }

    return "PUBLIC_SEARCH_CLARIFICATION_REQUIRED";
  }

  if (
    intent.intent === "provider_search" &&
    intent.geographicScope === "none"
  ) {
    return "PROVIDER_SEARCH_LOCATION_REQUIRED";
  }

  if (
    intent.geographicScope === "requested_state" &&
    !intent.requestedState &&
    !detectRequestedState(question)
  ) {
    return "REQUESTED_STATE_REQUIRED";
  }

  return "PUBLIC_SEARCH_CLARIFICATION_REQUIRED";
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
    return noSearch("EMPTY_QUESTION");
  }

  if (question.length > 2000) {
    return noSearch("QUESTION_TOO_LONG");
  }

  const recentConversation =
    getRecentConversation(
      input.messages,
      question
    );

  try {
    /*
     * CLASSIFY CURRENT INTENT
     */

    const intent =
      await classifyNavigatorIntent({
        question,
        messages: recentConversation,
      });

    /*
     * URGENT SAFETY
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

    /*
     * INDIVIDUAL MEDICAL GUIDANCE
     */

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
     * USER SEARCH PREFERENCE
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
     * CLARIFICATION
     */

    if (intent.needsClarification) {
      return clarification(
        resolveIntentClarification(
          intent,
          question
        ),
        intent
      );
    }

    if (!intent.shouldSearch) {
      return noSearch(
        intent.intent.toUpperCase(),
        intent
      );
    }

    /*
     * STRUCTURED RESEARCH CATEGORY
     */

    const researchType =
      resolveResearchType(intent);

    const baseInstructions =
      INTENT_SEARCH_INSTRUCTIONS[intent.intent];

    if (!baseInstructions) {
      return noSearch(
        "UNSUPPORTED_SEARCH_INTENT",
        intent
      );
    }

    /*
     * APPROVED PUBLIC RESEARCH TOPICS
     */

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
        topic => topic.replace(/_/g, " ")
      );

    /*
     * GEOGRAPHIC FOCUS
     */

    const geographicResolution =
      await resolveGeography(
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
     * RESEARCH INSTRUCTIONS
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
     * PUBLIC QUERY CONSTRUCTION
     *
     * Never forward raw questions, raw history,
     * family profiles, private notes, account
     * identifiers, or complete street addresses.
     *
     * Local geographic candidates are treated
     * as data, not as instructions. Their actual
     * existence must be verified by live research.
     */

    const publicQuery = [
      `Requested subjects: ${topics.join(", ")}.`,

      instructions,

      geographicResolution.geography,

      freshness,

      "Use authoritative sources and direct official links.",

      "Do not introduce unrelated subjects.",
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
     * STRUCTURED SEARCH DECISION
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

      geographicScope:
        geographicResolution.location
          ? geographicResolution.location.type === "state"
            ? "requested_state"
            : "local"
          : isNationalSearch(question)
            ? "nationwide"
            : intent.geographicScope,

      location:
        geographicResolution.location ??
        null,
    };

  } catch {
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
 */

export function routeNavigatorSearch(
  _input: NavigatorSearchInput
): NavigatorSearchDecision {
  return noSearch(
    "AI_INTENT_ROUTER_REQUIRED"
  );
}