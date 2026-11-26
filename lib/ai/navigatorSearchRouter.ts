import "server-only";

export type NavigatorSearchDecision = {
  shouldSearch: boolean;
  publicQuery: string | null;
  needsClarification: boolean;
  reason: string;
};

type NavigatorSearchInput = {
  question: string;
  state?: unknown;
};

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

function normalizeState(
  value: unknown
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value
    .trim()
    .replace(/[_-]/g, " ")
    .toLowerCase();

  const state = US_STATES.find(
    item =>
      item.toLowerCase() === normalized
  );

  if (state) {
    return state;
  }

  const codeIndex =
    STATE_CODES.indexOf(
      normalized.toUpperCase()
    );

  return codeIndex >= 0
    ? US_STATES[codeIndex]
    : null;
}

function detectRequestedState(
  question: string
): string | null {
  const states = [...US_STATES].sort(
    (a, b) => b.length - a.length
  );

  for (const state of states) {
    const pattern = new RegExp(
      `\\b(?:in|near|within|for|across)\\s+${state}\\b`,
      "i"
    );

    if (pattern.test(question)) {
      return state;
    }
  }

  return null;
}

const SEARCH_TOPICS: {
  pattern: RegExp;
  query: string;
  geographic: boolean;
}[] = [
  {
    pattern:
      /\b(grants?|scholarships?|financial assistance|financial aid|funding|financial support)\b/i,

    query:
      "Autism family grants and financial assistance programs, current application status, eligibility and official application links",

    geographic: true,
  },

  {
    pattern:
      /\b(food|foods|groceries|nutrition assistance|food assistance|food banks?|food pantr(?:y|ies)|snap|wic)\b/i,

    query:
      "Family food assistance programs, SNAP, WIC, food banks and nutrition assistance eligibility and official application resources",

    geographic: true,
  },

  {
    pattern:
      /\b(medicaid|medicaid waiver|waivers?|chip)\b/i,

    query:
      "Medicaid and disability assistance programs for autistic children, eligibility, waivers and official enrollment information",

    geographic: true,
  },

  {
    pattern:
      /\b(ssi|social security|disability benefits)\b/i,

    query:
      "Social Security disability benefits and Supplemental Security Income for children with disabilities, official eligibility and application information",

    geographic: false,
  },

  {
    pattern:
      /\b(iep|504 plan|special education|school rights|idea)\b/i,

    query:
      "Official special education resources, IDEA, IEP and Section 504 requirements and family rights",

    geographic: true,
  },

  {
    pattern:
      /\b(early intervention|child find|ifsp)\b/i,

    query:
      "Official early intervention and Child Find programs, eligibility and referral resources",

    geographic: true,
  },

  {
    pattern:
      /\b(respite|respite care|caregiver support)\b/i,

    query:
      "Autism family respite care and caregiver support programs, eligibility and official access information",

    geographic: true,
  },

  {
    pattern:
      /\b(support groups?|parent groups?|community resources)\b/i,

    query:
      "Established autism family support organizations, parent support groups and community resources",

    geographic: true,
  },

  {
    pattern:
      /\b(speech therapy|speech therapist|speech therapists)\b/i,

    query:
      "Speech language therapy public provider directories and family access resources",

    geographic: true,
  },

  {
    pattern:
      /\b(occupational therapy|occupational therapist)\b/i,

    query:
      "Occupational therapy public provider directories and family access resources",

    geographic: true,
  },

  {
    pattern:
      /\b(aba|applied behavior analysis)\b/i,

    query:
      "Applied behavior analysis public provider directories and family access resources",

    geographic: true,
  },

  {
    pattern:
      /\b(evaluations?|diagnostic services|autism testing|autism diagnosis)\b/i,

    query:
      "Autism evaluation and diagnostic service directories and official family referral resources",

    geographic: true,
  },

  {
    pattern:
      /\b(insurance|insurance coverage|insurance benefits)\b/i,

    query:
      "Official autism insurance coverage information, applicable requirements and consumer assistance resources",

    geographic: true,
  },

  {
    pattern:
      /\b(assistive technology|aac|communication devices)\b/i,

    query:
      "Assistive technology and augmentative alternative communication funding programs and family resources",

    geographic: true,
  },

  {
    pattern:
      /\b(research|studies|clinical trials|scientific evidence)\b/i,

    query:
      "Recent peer-reviewed autism research and official scientific research updates",

    geographic: false,
  },

  {
    pattern:
      /\b(autism resources|autism services|autism programs|autism organizations)\b/i,

    query:
      "Established autism family resource organizations, public assistance programs and official service directories",

    geographic: true,
  },
];

function isExplicitSearchRequest(
  question: string
): boolean {
  return (
    /\b(search|browse|look up|research)\b/i
      .test(question) ||

    /\b(find|check)\b.{0,40}\b(online|internet|web|website|sources?)\b/i
      .test(question)
  );
}

function requiresCurrentInformation(
  question: string
): boolean {
  return (
    /\b(latest|current|currently|recent|updated|available|availability|deadline|deadlines|open now|still open|this year|today)\b/i
      .test(question) ||

    /\b(grants?|scholarships?|financial assistance|food assistance|food banks?|funding opportunities)\b/i
      .test(question) ||

    /\b(find|locate|list|recommend|where|apply|application|eligibility|qualify)\b/i
      .test(question)
  );
}

function isJourneyOnlyQuestion(
  question: string
): boolean {
  return (
    /\b(my child'?s journey|my journey|current journey|saved journey|current focus|next step|completed tasks|already completed)\b/i
      .test(question)
  );
}

function isGeneralDefinition(
  question: string
): boolean {
  return (
    /^(?:what is|what are|define|explain|what does)\b/i
      .test(question) &&

    !requiresCurrentInformation(question)
  );
}

function isIndividualTreatmentQuestion(
  question: string
): boolean {
  return (
    /\b(should i give|should my child take|what medication|what medicine|what dosage|what dose|how much should|which medication|which treatment|should i stop|should i start)\b/i
      .test(question)
  );
}

function noSearch(
  reason: string
): NavigatorSearchDecision {
  return {
    shouldSearch: false,
    publicQuery: null,
    needsClarification: false,
    reason,
  };
}

function clarification(
  reason: string
): NavigatorSearchDecision {
  return {
    shouldSearch: false,
    publicQuery: null,
    needsClarification: true,
    reason,
  };
}

export function routeNavigatorSearch(
  input: NavigatorSearchInput
): NavigatorSearchDecision {
  const question =
    typeof input.question === "string"
      ? input.question.trim()
      : "";

  if (!question) {
    return noSearch("EMPTY_QUESTION");
  }

  if (question.length > 2000) {
    return noSearch("QUESTION_TOO_LONG");
  }

  const explicitSearch =
    isExplicitSearchRequest(question);

  /*
   * Individualized treatment decisions remain
   * within the Navigator's medical safety flow.
   */

  if (
    isIndividualTreatmentQuestion(question)
  ) {
    return noSearch(
      "INDIVIDUAL_MEDICAL_GUIDANCE"
    );
  }

  /*
   * Saved Journey questions normally do not
   * require public internet research.
   */

  if (
    !explicitSearch &&
    isJourneyOnlyQuestion(question)
  ) {
    return noSearch(
      "SAVED_JOURNEY_QUESTION"
    );
  }

  if (
    !explicitSearch &&
    isGeneralDefinition(question)
  ) {
    return noSearch(
      "GENERAL_INFORMATION"
    );
  }

  if (
    !explicitSearch &&
    !requiresCurrentInformation(question)
  ) {
    return noSearch(
      "LIVE_SEARCH_NOT_REQUIRED"
    );
  }

  /*
   * Construct queries using approved public
   * topic descriptions only.
   *
   * Never forward the original question,
   * child name, family notes, medical records,
   * school records, or conversation history.
   */

  const matchedTopics = SEARCH_TOPICS
    .filter(topic =>
      topic.pattern.test(question)
    )
    .slice(0, 3);

  if (matchedTopics.length === 0) {
    return explicitSearch
      ? clarification(
          "PUBLIC_SEARCH_TOPIC_REQUIRED"
        )
      : noSearch(
          "NO_SUPPORTED_SEARCH_TOPIC"
        );
  }

  const requestedState =
    detectRequestedState(question);

  const savedState =
    normalizeState(input.state);

  const state =
    requestedState || savedState;

  const needsLocation =
    matchedTopics.some(
      topic => topic.geographic
    );

  const nationalSearch =
    /\b(nationwide|nationally|across the country|all states)\b/i
      .test(question);

  const location =
    needsLocation &&
    state &&
    !nationalSearch

      ? ` Geographic focus: ${state}, United States. Include relevant nationwide programs.`

      : " Geographic focus: United States.";

  const topicQuery = matchedTopics
    .map(topic => topic.query)
    .join(". ");

  const publicQuery =
    `${topicQuery}.${location} Prioritize current official sources.`;

  if (publicQuery.length > 500) {
    return clarification(
      "SEARCH_QUERY_TOO_BROAD"
    );
  }

  return {
    shouldSearch: true,
    publicQuery,
    needsClarification: false,
    reason: explicitSearch
      ? "EXPLICIT_SEARCH_REQUEST"
      : "CURRENT_INFORMATION_REQUIRED",
  };
}