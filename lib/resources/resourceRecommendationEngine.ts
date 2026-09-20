/*
 * ============================================================
 * ADVANCED PERSONALIZED RESOURCES
 * RESOURCE RECOMMENDATION ENGINE
 * ============================================================
 *
 * PURPOSE
 *
 * Match a family's saved profile and current Journey against
 * Myriad's trusted resource catalog.
 *
 * MATCHING PRIORITY
 *
 * 1. Explicit trusted-resource topic metadata
 * 2. Current Journey context
 * 3. Resource Journey-stage metadata
 * 4. Family profile context
 * 5. Broad text matching
 *
 * IMPORTANT BADGE RULE
 *
 * "Supports Current Journey" is intentionally stricter than
 * overall recommendation ranking.
 *
 * A resource earns that badge only when:
 *
 * 1. The resource has explicit ResourceTopic metadata, AND
 * 2. One of those topics is detected using Myriad's strict
 *    active-Journey topic vocabulary, AND
 * 3. That topic appears in the family's current focus.
 *
 * A shared Journey stage alone does NOT qualify.
 *
 * Broad words such as:
 *
 * - assistance
 * - benefits
 * - services
 * - support
 *
 * do NOT independently establish direct Journey support.
 *
 * ============================================================
 */

import type {
  FamilyProfile,
} from "../../types/familyProfile";

import type {
  PersonalizedJourney,
} from "../ai/journeyTypes";

import {
  federalResources,
} from "../../data/resources/federal";

import {
  floridaResources,
} from "../../data/resources/florida";

import type {
  ResourceAgeGroup,
  ResourceJourneyStage,
  ResourceTopic,
  TrustedResource,
} from "../../data/resources/federal";


/*
 * ============================================================
 * TYPES
 * ============================================================
 */

export type ResourceMatchReason =
  | "state"
  | "age"
  | "journey_stage"
  | "family_priority"
  | "existing_support"
  | "insurance"
  | "current_focus"
  | "journey_priority"
  | "journey_action"
  | "journey_task"
  | "resource_topic"
  | "resource_stage"
  | "resource_age_group"
  | "general";


export type PersonalizedResourceRecommendation = {
  resource: TrustedResource;

  score: number;

  matchLevel:
    | "high"
    | "medium"
    | "general";

  reasons:
    ResourceMatchReason[];

  whyRecommended:
    string;

  supportsCurrentJourney:
    boolean;
};


export type PersonalizedResourceRecommendationResult = {
  recommendations:
    PersonalizedResourceRecommendation[];

  totalTrustedResourcesConsidered:
    number;

  state:
    string;

  generatedAt:
    number;
};


/*
 * ============================================================
 * NORMALIZATION
 * ============================================================
 */

function normalizeText(
  value:
    | string
    | undefined
    | null
): string {
  return (
    value || ""
  )
    .trim()
    .toLowerCase();
}


function normalizeState(
  value:
    | string
    | undefined
    | null
): string {
  const state =
    normalizeText(
      value
    );

  if (
    state === "fl" ||
    state === "florida"
  ) {
    return "FL";
  }

  return (
    value || ""
  )
    .trim()
    .toUpperCase();
}


/*
 * ============================================================
 * TEXT HELPERS
 * ============================================================
 */

function includesAny(
  text:
    string,
  terms:
    string[]
): boolean {
  const normalized =
    normalizeText(
      text
    );

  return terms.some(
    (
      term
    ) =>
      normalized.includes(
        normalizeText(
          term
        )
      )
  );
}


/*
 * ============================================================
 * STRICT PHRASE MATCHING
 * ============================================================
 *
 * Used ONLY for direct active-Journey topic detection.
 *
 * Unlike includesAny(), this requires a strict term to appear
 * as a complete word or phrase.
 *
 * This prevents false positives such as:
 *
 * "ssi" matching inside "transmission"
 *
 * Broad recommendation ranking continues to use includesAny().
 * ============================================================
 */

function includesStrictPhrase(
  text:
    string,
  terms:
    string[]
): boolean {
  const normalizedText =
    normalizeText(
      text
    );

  if (
    !normalizedText
  ) {
    return false;
  }

  return terms.some(
    (
      term
    ) => {
      const normalizedTerm =
        normalizeText(
          term
        );

      if (
        !normalizedTerm
      ) {
        return false;
      }

      const escapedTerm =
        normalizedTerm.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        );

      const flexibleWhitespaceTerm =
        escapedTerm.replace(
          /\s+/g,
          "\\s+"
        );

      const pattern =
        new RegExp(
          `(^|[^a-z0-9])${flexibleWhitespaceTerm}(?=$|[^a-z0-9])`,
          "i"
        );

      return pattern.test(
        normalizedText
      );
    }
  );
}


function combineText(
  values:
    Array<
      | string
      | undefined
      | null
    >
): string {
  return values
    .filter(
      (
        value
      ):
        value is string =>
        typeof value === "string" &&
        value.trim().length > 0
    )
    .join(" ")
    .toLowerCase();
}


/*
 * ============================================================
 * RESOURCE SEARCH TEXT
 * ============================================================
 */

function getResourceSearchText(
  resource:
    TrustedResource
): string {
  return combineText(
    [
      resource.title,
      resource.type,
      resource.description,
      resource.whyItMayHelp,
      resource.sourceName,
      ...resource.eligibility,
      ...resource.whatItMayCover,
      ...resource.applicationSteps,
      ...resource.documentsNeeded,
    ]
  );
}


/*
 * ============================================================
 * FAMILY PROFILE SEARCH TEXT
 * ============================================================
 */

function getFamilySearchText(
  familyProfile:
    FamilyProfile
): string {
  return combineText(
    [
      familyProfile.journeyStage,
      familyProfile.priority,
      familyProfile.insurance,
      familyProfile.notes,
      ...(
        familyProfile.supports ||
        []
      ),
    ]
  );
}


/*
 * ============================================================
 * COMPLETE JOURNEY SEARCH TEXT
 * ============================================================
 *
 * Used for recommendation RANKING.
 *
 * The complete Journey can influence ranking.
 * ============================================================
 */

function getJourneySearchText(
  journey?:
    PersonalizedJourney | null
): string {
  if (
    !journey
  ) {
    return "";
  }

  return combineText(
    [
      journey.summary,

      journey.currentFocus
        ?.title,

      journey.currentFocus
        ?.explanation,

      journey.nextStep
        ?.title,

      journey.nextStep
        ?.description,

      ...(
        journey.priorities ||
        []
      ).flatMap(
        (
          priority
        ) => [
          priority.title,
          priority.explanation,
        ]
      ),

      ...(
        journey.actions ||
        []
      ).flatMap(
        (
          action
        ) => [
          action.title,
          action.whyItMatters,
          action.action,
          action.howTo,
          action.nextStep,
        ]
      ),

      ...(
        journey.tasks ||
        []
      ).flatMap(
        (
          task
        ) => [
          task.title,
          task.description,
        ]
      ),
    ]
  );
}


/*
 * ============================================================
 * ACTIVE JOURNEY SEARCH TEXT
 * ============================================================
 *
 * Used ONLY for the purple "Supports Current Journey" badge.
 *
 * The badge represents the family's displayed current focus.
 *
 * Do not add:
 *
 * - summary
 * - explanation
 * - nextStep
 * - priorities
 * - actions
 * - tasks
 *
 * Those belong in overall ranking.
 * ============================================================
 */

function getActiveJourneySearchText(
  journey?:
    PersonalizedJourney | null
): string {
  if (
    !journey
  ) {
    return "";
  }

  return combineText(
    [
      journey.currentFocus
        ?.title,
    ]
  );
}


/*
 * ============================================================
 * AGE HELPERS
 * ============================================================
 */

function parseChildAge(
  value:
    FamilyProfile["childAge"]
): number | null {
  if (
    typeof value === "number" &&
    Number.isFinite(
      value
    )
  ) {
    return value;
  }

  if (
    typeof value !== "string"
  ) {
    return null;
  }

  const match =
    value.match(
      /\d+(\.\d+)?/
    );

  if (
    !match
  ) {
    return null;
  }

  const parsed =
    Number(
      match[0]
    );

  return Number.isFinite(
    parsed
  )
    ? parsed
    : null;
}


function getAgeGroup(
  childAge:
    number | null
): ResourceAgeGroup | null {
  if (
    childAge === null
  ) {
    return null;
  }

  if (
    childAge < 5
  ) {
    return "early_childhood";
  }

  if (
    childAge < 13
  ) {
    return "school_age";
  }

  if (
    childAge < 18
  ) {
    return "teen";
  }

  return "adult";
}


/*
 * ============================================================
 * BROAD RESOURCE TOPIC TERMS
 * ============================================================
 *
 * Used for overall recommendation ranking.
 *
 * These are intentionally broader than the strict active-topic
 * vocabulary below.
 * ============================================================
 */

const RESOURCE_TOPIC_TERMS:
  Record<
    ResourceTopic,
    string[]
  > = {

  autism_information: [
    "autism",
    "autistic",
    "autism information",
    "autism resources",
  ],

  developmental_monitoring: [
    "development",
    "developmental",
    "developmental concern",
    "developmental concerns",
    "developmental monitoring",
    "developmental milestone",
    "developmental milestones",
    "milestone",
    "milestones",
  ],

  screening: [
    "screen",
    "screening",
    "autism screening",
    "developmental screening",
  ],

  evaluation: [
    "evaluation",
    "evaluate",
    "evaluating",
    "assessment",
    "assess",
    "diagnostic evaluation",
    "developmental evaluation",
    "testing",
    "intake",
    "diagnostic clinic",
    "evaluation appointment",
  ],

  diagnosis: [
    "diagnosis",
    "diagnostic",
    "diagnosed",
    "diagnosing",
    "autism diagnosis",
    "diagnostic clinic",
  ],

  early_intervention: [
    "early intervention",
    "early steps",
    "infant",
    "toddler",
    "developmental delay",
  ],

  therapy: [
    "therapy",
    "therapies",
    "therapist",
    "speech",
    "speech therapy",
    "occupational therapy",
    "occupational",
    "behavior therapy",
    "behavioral therapy",
    "aba",
    "applied behavior analysis",
    "intervention",
  ],

  school: [
    "school",
    "education",
    "educational",
    "classroom",
    "teacher",
    "student",
    "district",
  ],

  iep: [
    "iep",
    "individualized education program",
    "special education",
    "504",
    "school accommodations",
    "educational accommodations",
  ],

  insurance: [
    "insurance",
    "coverage",
    "covered",
    "health plan",
    "authorization",
    "prior authorization",
    "benefits",
  ],

  medicaid: [
    "medicaid",
  ],

  financial_support: [
    "financial",
    "financial support",
    "financial assistance",
    "cost",
    "costs",
    "grant",
    "grants",
    "benefit",
    "benefits",
    "ssi",
    "income",
    "assistance",
  ],

  family_support: [
    "family support",
    "parent support",
    "caregiver",
    "caregiver support",
    "parent",
    "parents",
    "family navigation",
    "navigation",
    "support group",
  ],

  transition: [
    "transition",
    "transition planning",
    "transition services",
    "adulthood",
    "adult transition",
  ],

  employment: [
    "employment",
    "job",
    "jobs",
    "career",
    "work",
    "workplace",
    "vocational",
  ],

  independent_living: [
    "independent living",
    "independence",
    "daily living",
    "life skills",
    "housing",
  ],

  adult_services: [
    "adult services",
    "adult support",
    "adult supports",
    "adult program",
    "adult programs",
  ],
};


/*
 * ============================================================
 * STRICT ACTIVE-JOURNEY TOPIC TERMS
 * ============================================================
 *
 * Controls "Supports Current Journey."
 *
 * These terms must remain deliberately specific.
 *
 * Do NOT casually add broad words such as:
 *
 * - support
 * - services
 * - assistance
 * - benefits
 * - help
 *
 * A false positive here changes the meaning of the badge.
 * ============================================================
 */

const STRICT_ACTIVE_TOPIC_TERMS:
  Record<
    ResourceTopic,
    string[]
  > = {

  autism_information: [
    "autism information",
    "information about autism",
    "learn about autism",
    "understand autism",
  ],

  developmental_monitoring: [
    "developmental monitoring",
    "developmental milestone",
    "developmental milestones",
    "monitor development",
    "track development",
    "track developmental milestones",
  ],

  screening: [
    "autism screening",
    "developmental screening",
    "screen for autism",
    "screening appointment",
    "screening results",
  ],

  evaluation: [
    "evaluation",
    "diagnostic evaluation",
    "developmental evaluation",
    "evaluation appointment",
    "assessment",
    "assessment appointment",
    "diagnostic clinic",
    "intake appointment",
    "intake visit",
  ],

  diagnosis: [
    "autism diagnosis",
    "diagnostic process",
    "diagnostic appointment",
    "diagnostic clinic",
    "receive a diagnosis",
    "received a diagnosis",
  ],

  early_intervention: [
    "early intervention",
    "early steps",
    "early intervention services",
  ],

  therapy: [
    "speech therapy",
    "occupational therapy",
    "behavior therapy",
    "behavioral therapy",
    "aba therapy",
    "applied behavior analysis",
    "therapy appointment",
    "therapy evaluation",
    "therapy provider",
  ],

  school: [
    "school meeting",
    "school support",
    "school supports",
    "school services",
    "school accommodations",
    "special education",
    "school district",
  ],

  iep: [
    "iep",
    "iep meeting",
    "iep evaluation",
    "iep goals",
    "individualized education program",
    "504 plan",
    "504 meeting",
  ],

  insurance: [
    "health insurance",
    "insurance coverage",
    "insurance plan",
    "insurance company",
    "insurance authorization",
    "prior authorization",
    "health plan",
  ],

  medicaid: [
    "medicaid",
    "medicaid coverage",
    "medicaid eligibility",
    "medicaid application",
  ],

  financial_support: [
    "financial support",
    "financial assistance",
    "financial aid",
    "ssi",
    "supplemental security income",
    "disability benefits",
    "apply for benefits",
    "financial eligibility",
  ],

  family_support: [
    "family support",
    "parent support",
    "caregiver support",
    "support group",
    "parent group",
    "family navigation",
  ],

  transition: [
    "transition planning",
    "transition plan",
    "transition services",
    "transition to adulthood",
    "adult transition",
  ],

  employment: [
    "employment",
    "job training",
    "job search",
    "vocational training",
    "vocational rehabilitation",
    "workplace accommodations",
  ],

  independent_living: [
    "independent living",
    "daily living skills",
    "life skills",
    "independent housing",
    "supported living",
  ],

  adult_services: [
    "adult services",
    "adult disability services",
    "adult autism services",
    "adult support program",
    "adult support programs",
  ],
};


/*
 * ============================================================
 * BROAD FALLBACK TOPIC GROUPS
 * ============================================================
 */

const SCHOOL_TERMS = [
  "school",
  "education",
  "educational",
  "iep",
  "504",
  "classroom",
  "teacher",
  "student",
  "district",
];


const THERAPY_TERMS = [
  "therapy",
  "therapies",
  "therapist",
  "intervention",
  "developmental",
  "speech",
  "occupational",
  "behavior",
  "aba",
];


const FINANCIAL_TERMS = [
  "financial",
  "cost",
  "costs",
  "money",
  "grant",
  "benefit",
  "benefits",
  "ssi",
  "income",
  "assistance",
];


const INSURANCE_TERMS = [
  "insurance",
  "coverage",
  "covered",
  "medicaid",
  "authorization",
  "benefits",
  "health plan",
];


const SUPPORT_TERMS = [
  "support",
  "supports",
  "services",
  "community",
  "family",
  "caregiver",
  "navigation",
];


const EARLY_INTERVENTION_TERMS = [
  "early intervention",
  "early steps",
  "infant",
  "toddler",
  "developmental delay",
];


/*
 * ============================================================
 * BROAD STRUCTURED TOPIC EXTRACTION
 * ============================================================
 *
 * Used for recommendation ranking.
 * ============================================================
 */

function getTopicsFromText(
  text:
    string
): ResourceTopic[] {
  const topics:
    ResourceTopic[] =
    [];

  const entries =
    Object.entries(
      RESOURCE_TOPIC_TERMS
    ) as Array<
      [
        ResourceTopic,
        string[]
      ]
    >;

  for (
    const [
      topic,
      terms,
    ] of entries
  ) {
    if (
      includesAny(
        text,
        terms
      )
    ) {
      topics.push(
        topic
      );
    }
  }

  return Array.from(
    new Set(
      topics
    )
  );
}


/*
 * ============================================================
 * STRICT ACTIVE TOPIC EXTRACTION
 * ============================================================
 *
 * Used ONLY for "Supports Current Journey."
 *
 * IMPORTANT:
 *
 * This intentionally uses includesStrictPhrase(), not
 * includesAny().
 *
 * That prevents short terms such as "ssi" from matching inside
 * unrelated words such as "transmission".
 * ============================================================
 */

function getStrictActiveTopicsFromText(
  text:
    string
): ResourceTopic[] {
  const topics:
    ResourceTopic[] =
    [];

  const entries =
    Object.entries(
      STRICT_ACTIVE_TOPIC_TERMS
    ) as Array<
      [
        ResourceTopic,
        string[]
      ]
    >;

  for (
    const [
      topic,
      terms,
    ] of entries
  ) {
    if (
      includesStrictPhrase(
        text,
        terms
      )
    ) {
      topics.push(
        topic
      );
    }
  }

  return Array.from(
    new Set(
      topics
    )
  );
}


/*
 * ============================================================
 * JOURNEY STAGE EXTRACTION
 * ============================================================
 */

function getJourneyStagesFromContext(
  familyProfile:
    FamilyProfile,
  journey?:
    PersonalizedJourney | null
): ResourceJourneyStage[] {
  const stages:
    ResourceJourneyStage[] =
    [];

  const profileStage =
    normalizeText(
      familyProfile.journeyStage
    );

  const journeyText =
    getJourneySearchText(
      journey
    );

  const combined =
    combineText(
      [
        profileStage,
        journeyText,
      ]
    );

  if (
    includesAny(
      combined,
      [
        "concerned",
        "concern",
        "concerns",
        "developmental concern",
        "developmental concerns",
      ]
    )
  ) {
    stages.push(
      "concerned"
    );
  }

  if (
    includesAny(
      combined,
      [
        "evaluation",
        "evaluating",
        "evaluate",
        "assessment",
        "diagnostic",
        "diagnosis appointment",
        "diagnostic clinic",
        "intake appointment",
        "screening",
      ]
    )
  ) {
    stages.push(
      "evaluating"
    );
  }

  if (
    includesAny(
      profileStage,
      [
        "diagnosed",
        "diagnosis received",
        "newly diagnosed",
      ]
    )
  ) {
    stages.push(
      "diagnosed"
    );
  }

  if (
    includesAny(
      combined,
      [
        "services",
        "therapy",
        "therapies",
        "treatment",
        "aba",
        "speech therapy",
        "occupational therapy",
      ]
    )
  ) {
    stages.push(
      "services"
    );
  }

  if (
    includesAny(
      combined,
      [
        "school",
        "iep",
        "504",
        "special education",
        "classroom",
      ]
    )
  ) {
    stages.push(
      "school"
    );
  }

  if (
    includesAny(
      combined,
      [
        "transition",
        "transition planning",
        "transition services",
      ]
    )
  ) {
    stages.push(
      "transition"
    );
  }

  if (
    includesAny(
      combined,
      [
        "adult services",
        "adult support",
        "adult supports",
        "adulthood",
        "independent living",
        "employment",
      ]
    )
  ) {
    stages.push(
      "adult"
    );
  }

  return Array.from(
    new Set(
      stages
    )
  );
}


/*
 * ============================================================
 * DIRECT CURRENT-JOURNEY TOPIC MATCH
 * ============================================================
 *
 * THIS FUNCTION CONTROLS THE PURPLE BADGE.
 *
 * It intentionally uses:
 *
 * - current-focus title only
 * - strict topic vocabulary only
 * - strict whole-word / whole-phrase matching
 * - explicit resource metadata only
 *
 * ============================================================
 */

function getDirectJourneyTopicMatches(
  resource:
    TrustedResource,
  journey?:
    PersonalizedJourney | null
): ResourceTopic[] {
  if (
    !journey
  ) {
    return [];
  }

  const resourceTopics =
    resource.topics ||
    [];

  if (
    resourceTopics.length === 0
  ) {
    return [];
  }

  const activeJourneyText =
    getActiveJourneySearchText(
      journey
    );

  if (
    !activeJourneyText
  ) {
    return [];
  }

  const activeJourneyTopics =
    getStrictActiveTopicsFromText(
      activeJourneyText
    );

  return resourceTopics.filter(
    (
      topic
    ) =>
      activeJourneyTopics.includes(
        topic
      )
  );
}


/*
 * ============================================================
 * EXPLICIT RESOURCE METADATA MATCH
 * ============================================================
 */

function getMetadataScore(
  resource:
    TrustedResource,
  familyProfile:
    FamilyProfile,
  journey?:
    PersonalizedJourney | null
): {
  score:
    number;

  reasons:
    ResourceMatchReason[];

  supportsCurrentJourney:
    boolean;
} {
  let score =
    0;

  const reasons:
    ResourceMatchReason[] =
    [];

  /*
   * FAMILY + COMPLETE JOURNEY CONTEXT
   */

  const familyText =
    getFamilySearchText(
      familyProfile
    );

  const journeyText =
    getJourneySearchText(
      journey
    );

  const completeContext =
    combineText(
      [
        familyText,
        journeyText,
      ]
    );

  /*
   * EXPLICIT RESOURCE TOPICS
   */

  const contextTopics =
    getTopicsFromText(
      completeContext
    );

  const resourceTopics =
    resource.topics ||
    [];

  const topicMatches =
    resourceTopics.filter(
      (
        topic
      ) =>
        contextTopics.includes(
          topic
        )
    );

  if (
    topicMatches.length > 0
  ) {
    score +=
      Math.min(
        topicMatches.length,
        3
      ) * 24;

    reasons.push(
      "resource_topic"
    );
  }

  /*
   * RESOURCE JOURNEY STAGE
   *
   * Stage contributes to ranking.
   * Stage does NOT establish direct current-Journey support.
   */

  const contextStages =
    getJourneyStagesFromContext(
      familyProfile,
      journey
    );

  const resourceStages =
    resource.journeyStages ||
    [];

  const stageMatches =
    resourceStages.filter(
      (
        stage
      ) =>
        contextStages.includes(
          stage
        )
    );

  if (
    stageMatches.length > 0
  ) {
    score +=
      Math.min(
        stageMatches.length,
        2
      ) * 12;

    reasons.push(
      "resource_stage"
    );
  }

  /*
   * AGE GROUP
   */

  const childAge =
    parseChildAge(
      familyProfile.childAge
    );

  const familyAgeGroup =
    getAgeGroup(
      childAge
    );

  const resourceAgeGroups =
    resource.ageGroups ||
    [];

  const ageMatched =
    Boolean(
      familyAgeGroup &&
      resourceAgeGroups.includes(
        familyAgeGroup
      )
    );

  if (
    ageMatched
  ) {
    score +=
      10;

    reasons.push(
      "resource_age_group"
    );
  }

  /*
   * STRICT CURRENT JOURNEY SUPPORT
   */

  const directJourneyTopicMatches =
    getDirectJourneyTopicMatches(
      resource,
      journey
    );

  const supportsCurrentJourney =
    directJourneyTopicMatches.length >
    0;

  return {
    score,
    reasons,
    supportsCurrentJourney,
  };
}


/*
 * ============================================================
 * BROAD TOPIC MATCHING
 * ============================================================
 */

function getBroadTopicScore(
  resourceText:
    string,
  contextText:
    string
): {
  score:
    number;

  matched:
    boolean;
} {
  let score =
    0;

  const topicGroups =
    [
      SCHOOL_TERMS,
      THERAPY_TERMS,
      FINANCIAL_TERMS,
      INSURANCE_TERMS,
      SUPPORT_TERMS,
    ];

  for (
    const group of
    topicGroups
  ) {
    const resourceHasTopic =
      includesAny(
        resourceText,
        group
      );

    const contextHasTopic =
      includesAny(
        contextText,
        group
      );

    if (
      resourceHasTopic &&
      contextHasTopic
    ) {
      score +=
        4;
    }
  }

  return {
    score,

    matched:
      score > 0,
  };
}


/*
 * ============================================================
 * STATE MATCH
 * ============================================================
 */

function getStateScore(
  resource:
    TrustedResource,
  familyState:
    string
): {
  score:
    number;

  matched:
    boolean;
} {
  if (
    !resource.states ||
    resource.states.length === 0
  ) {
    return {
      score:
        0,

      matched:
        false,
    };
  }

  const normalizedStates =
    resource.states.map(
      (
        state
      ) =>
        normalizeState(
          state
        )
    );

  if (
    familyState &&
    normalizedStates.includes(
      familyState
    )
  ) {
    return {
      score:
        30,

      matched:
        true,
    };
  }

  return {
    score:
      -1000,

    matched:
      false,
  };
}


/*
 * ============================================================
 * LEGACY AGE SAFETY
 * ============================================================
 */

function getLegacyAgeScore(
  resource:
    TrustedResource,
  childAge:
    number | null
): {
  score:
    number;

  matched:
    boolean;
} {
  if (
    childAge === null
  ) {
    return {
      score:
        0,

      matched:
        false,
    };
  }

  const resourceText =
    getResourceSearchText(
      resource
    );

  if (
    includesAny(
      resourceText,
      EARLY_INTERVENTION_TERMS
    )
  ) {
    if (
      childAge < 3
    ) {
      return {
        score:
          resource.ageGroups
            ? 0
            : 10,

        matched:
          !resource.ageGroups,
      };
    }

    const explicitlyEarlyIntervention =
      includesAny(
        combineText(
          [
            resource.title,
            resource.type,
          ]
        ),
        [
          "early intervention",
          "early steps",
        ]
      ) ||
      resource.topics
        ?.includes(
          "early_intervention"
        );

    if (
      explicitlyEarlyIntervention
    ) {
      return {
        score:
          -100,

        matched:
          false,
      };
    }
  }

  return {
    score:
      0,

    matched:
      false,
  };
}


/*
 * ============================================================
 * FAMILY PROFILE MATCH
 * ============================================================
 */

function getFamilyProfileScore(
  resource:
    TrustedResource,
  familyProfile:
    FamilyProfile
): {
  score:
    number;

  reasons:
    ResourceMatchReason[];
} {
  let score =
    0;

  const reasons:
    ResourceMatchReason[] =
    [];

  const resourceText =
    getResourceSearchText(
      resource
    );

  /*
   * FAMILY PRIORITY
   */

  const priority =
    normalizeText(
      familyProfile.priority
    );

  if (
    priority
  ) {
    const priorityMatch =
      getBroadTopicScore(
        resourceText,
        priority
      );

    if (
      priorityMatch.matched
    ) {
      score +=
        Math.min(
          priorityMatch.score + 4,
          12
        );

      reasons.push(
        "family_priority"
      );
    }
  }

  /*
   * EXISTING SUPPORTS
   */

  const supports =
    combineText(
      familyProfile.supports ||
      []
    );

  if (
    supports
  ) {
    const supportMatch =
      getBroadTopicScore(
        resourceText,
        supports
      );

    if (
      supportMatch.matched
    ) {
      score +=
        Math.min(
          supportMatch.score,
          8
        );

      reasons.push(
        "existing_support"
      );
    }
  }

  /*
   * INSURANCE
   */

  const insurance =
    normalizeText(
      familyProfile.insurance
    );

  if (
    insurance &&
    includesAny(
      resourceText,
      INSURANCE_TERMS
    )
  ) {
    score +=
      6;

    reasons.push(
      "insurance"
    );
  }

  /*
   * JOURNEY STAGE — LOW-WEIGHT FALLBACK
   */

  const journeyStage =
    normalizeText(
      familyProfile.journeyStage
    );

  if (
    journeyStage
  ) {
    const stageMatch =
      getBroadTopicScore(
        resourceText,
        journeyStage
      );

    if (
      stageMatch.matched
    ) {
      score +=
        Math.min(
          stageMatch.score,
          6
        );

      reasons.push(
        "journey_stage"
      );
    }
  }

  return {
    score,
    reasons,
  };
}


/*
 * ============================================================
 * CURRENT JOURNEY RANKING MATCH
 * ============================================================
 *
 * This contributes to ranking only.
 *
 * It does NOT control the purple badge.
 * ============================================================
 */

function getCurrentJourneyScore(
  resource:
    TrustedResource,
  journey?:
    PersonalizedJourney | null
): {
  score:
    number;

  reasons:
    ResourceMatchReason[];
} {
  if (
    !journey
  ) {
    return {
      score:
        0,

      reasons:
        [],
    };
  }

  let score =
    0;

  const reasons:
    ResourceMatchReason[] =
    [];

  const resourceText =
    getResourceSearchText(
      resource
    );

  /*
   * CURRENT FOCUS
   */

  const currentFocusText =
    combineText(
      [
        journey.currentFocus
          ?.title,

        journey.currentFocus
          ?.explanation,
      ]
    );

  const currentFocusMatch =
    getBroadTopicScore(
      resourceText,
      currentFocusText
    );

  if (
    currentFocusMatch.matched
  ) {
    score +=
      Math.min(
        currentFocusMatch.score + 6,
        12
      );

    reasons.push(
      "current_focus"
    );
  }

  /*
   * JOURNEY PRIORITIES
   */

  const priorityText =
    combineText(
      (
        journey.priorities ||
        []
      ).flatMap(
        (
          priority
        ) => [
          priority.title,
          priority.explanation,
        ]
      )
    );

  const priorityMatch =
    getBroadTopicScore(
      resourceText,
      priorityText
    );

  if (
    priorityMatch.matched
  ) {
    score +=
      Math.min(
        priorityMatch.score + 4,
        10
      );

    reasons.push(
      "journey_priority"
    );
  }

  /*
   * JOURNEY ACTIONS
   */

  const actionText =
    combineText(
      (
        journey.actions ||
        []
      ).flatMap(
        (
          action
        ) => [
          action.title,
          action.whyItMatters,
          action.action,
          action.howTo,
          action.nextStep,
        ]
      )
    );

  const actionMatch =
    getBroadTopicScore(
      resourceText,
      actionText
    );

  if (
    actionMatch.matched
  ) {
    score +=
      Math.min(
        actionMatch.score + 4,
        10
      );

    reasons.push(
      "journey_action"
    );
  }

  /*
   * JOURNEY TASKS
   */

  const taskText =
    combineText(
      (
        journey.tasks ||
        []
      ).flatMap(
        (
          task
        ) => [
          task.title,
          task.description,
        ]
      )
    );

  const taskMatch =
    getBroadTopicScore(
      resourceText,
      taskText
    );

  if (
    taskMatch.matched
  ) {
    score +=
      Math.min(
        taskMatch.score + 4,
        10
      );

    reasons.push(
      "journey_task"
    );
  }

  return {
    score,
    reasons,
  };
}


/*
 * ============================================================
 * UNIQUE REASONS
 * ============================================================
 */

function uniqueReasons(
  reasons:
    ResourceMatchReason[]
):
  ResourceMatchReason[] {
  return Array.from(
    new Set(
      reasons
    )
  );
}


/*
 * ============================================================
 * MATCH LEVEL
 * ============================================================
 */

function getMatchLevel(
  score:
    number
):
  | "high"
  | "medium"
  | "general" {
  if (
    score >= 65
  ) {
    return "high";
  }

  if (
    score >= 30
  ) {
    return "medium";
  }

  return "general";
}


/*
 * ============================================================
 * PERSONALIZED EXPLANATION
 * ============================================================
 */

function buildWhyRecommended(
  resource:
    TrustedResource,
  familyProfile:
    FamilyProfile,
  reasons:
    ResourceMatchReason[],
  supportsCurrentJourney:
    boolean
): string {
  const childName =
    familyProfile.childName
      ?.trim();

  const subject =
    childName
      ? `${childName}'s`
      : "your family's";

  /*
   * DIRECT CURRENT JOURNEY SUPPORT
   */

  if (
    supportsCurrentJourney
  ) {
    return (
      `This resource closely matches ${subject} current Journey ` +
      "and provides information related to an area you are actively working on."
    );
  }

  /*
   * RESOURCE TOPIC MATCH
   */

  if (
    reasons.includes(
      "resource_topic"
    )
  ) {
    return (
      `This resource matches topics identified in ${subject} ` +
      "profile and Journey and may be useful as you plan next steps."
    );
  }

  /*
   * FAMILY PRIORITY
   */

  if (
    reasons.includes(
      "family_priority"
    )
  ) {
    return (
      `This resource relates to one of ${subject} current ` +
      "priorities and may help you identify an appropriate next step."
    );
  }

  /*
   * STATE
   */

  if (
    reasons.includes(
      "state"
    )
  ) {
    const state =
      familyProfile.state
        ?.trim();

    return state
      ? (
          `This resource is specific to ${state} and may be ` +
          `relevant to ${subject} current needs.`
        )
      : (
          "This state-specific resource may be relevant to your family."
        );
  }

  /*
   * AGE
   */

  if (
    reasons.includes(
      "resource_age_group"
    ) ||
    reasons.includes(
      "age"
    )
  ) {
    return (
      `This resource may be relevant based on ${subject} ` +
      "current age and stage."
    );
  }

  /*
   * INSURANCE
   */

  if (
    reasons.includes(
      "insurance"
    )
  ) {
    return (
      "This resource may help your family explore coverage, " +
      "benefits, or service-access options."
    );
  }

  /*
   * EXISTING SUPPORTS
   */

  if (
    reasons.includes(
      "existing_support"
    )
  ) {
    return (
      `This resource relates to supports already identified in ` +
      `${subject} profile.`
    );
  }

  return resource.whyItMayHelp;
}


/*
 * ============================================================
 * TRUSTED RESOURCE CATALOG
 * ============================================================
 */

function getTrustedResourceCatalog(
  familyState:
    string
):
  TrustedResource[] {
  const resources:
    TrustedResource[] =
    [
      ...federalResources,
    ];

  /*
   * FLORIDA
   */

  if (
    familyState === "FL"
  ) {
    resources.push(
      ...floridaResources
    );
  }

  return resources;
}


/*
 * ============================================================
 * SCORE ONE RESOURCE
 * ============================================================
 */

function scoreResource(
  resource:
    TrustedResource,
  familyProfile:
    FamilyProfile,
  journey?:
    PersonalizedJourney | null
):
  PersonalizedResourceRecommendation | null {
  const familyState =
    normalizeState(
      familyProfile.state
    );

  /*
   * STATE
   */

  const stateMatch =
    getStateScore(
      resource,
      familyState
    );

  if (
    stateMatch.score <= -1000
  ) {
    return null;
  }

  /*
   * AGE SAFETY
   */

  const childAge =
    parseChildAge(
      familyProfile.childAge
    );

  const legacyAgeMatch =
    getLegacyAgeScore(
      resource,
      childAge
    );

  if (
    legacyAgeMatch.score <= -100
  ) {
    return null;
  }

  /*
   * STRUCTURED RESOURCE METADATA
   */

  const metadataMatch =
    getMetadataScore(
      resource,
      familyProfile,
      journey
    );

  /*
   * FAMILY PROFILE
   */

  const familyMatch =
    getFamilyProfileScore(
      resource,
      familyProfile
    );

  /*
   * COMPLETE JOURNEY RANKING
   */

  const journeyMatch =
    getCurrentJourneyScore(
      resource,
      journey
    );

  /*
   * TOTAL SCORE
   */

  let score =
    stateMatch.score +
    legacyAgeMatch.score +
    metadataMatch.score +
    familyMatch.score +
    journeyMatch.score;

  const reasons:
    ResourceMatchReason[] =
    [
      ...metadataMatch.reasons,
      ...familyMatch.reasons,
      ...journeyMatch.reasons,
    ];

  if (
    stateMatch.matched
  ) {
    reasons.push(
      "state"
    );
  }

  if (
    legacyAgeMatch.matched
  ) {
    reasons.push(
      "age"
    );
  }

  /*
   * GENERAL TRUSTED RESOURCE BASELINE
   */

  if (
    score === 0
  ) {
    score =
      5;

    reasons.push(
      "general"
    );
  }

  const unique =
    uniqueReasons(
      reasons
    );

  /*
   * PURPLE BADGE
   *
   * Only strict active-Journey metadata matching controls this.
   */

  const supportsCurrentJourney =
    metadataMatch
      .supportsCurrentJourney;

  return {
    resource,

    score,

    matchLevel:
      getMatchLevel(
        score
      ),

    reasons:
      unique,

    whyRecommended:
      buildWhyRecommended(
        resource,
        familyProfile,
        unique,
        supportsCurrentJourney
      ),

    supportsCurrentJourney,
  };
}


/*
 * ============================================================
 * SORT RECOMMENDATIONS
 * ============================================================
 */

function sortRecommendations(
  recommendations:
    PersonalizedResourceRecommendation[]
):
  PersonalizedResourceRecommendation[] {
  return [
    ...recommendations,
  ].sort(
    (
      first,
      second
    ) => {

      /*
       * Higher score first.
       */

      if (
        second.score !==
        first.score
      ) {
        return (
          second.score -
          first.score
        );
      }

      /*
       * Direct active-Journey support wins a tie.
       */

      if (
        first.supportsCurrentJourney !==
        second.supportsCurrentJourney
      ) {
        return first
          .supportsCurrentJourney
          ? -1
          : 1;
      }

      /*
       * Stable alphabetical fallback.
       */

      return first
        .resource
        .title
        .localeCompare(
          second
            .resource
            .title
        );
    }
  );
}


/*
 * ============================================================
 * GET PERSONALIZED RESOURCE RECOMMENDATIONS
 * ============================================================
 */

export function getPersonalizedResourceRecommendations(
  familyProfile:
    FamilyProfile,
  journey?:
    PersonalizedJourney | null,
  options?: {
    limit?:
      number;
  }
):
  PersonalizedResourceRecommendationResult {
  const familyState =
    normalizeState(
      familyProfile.state
    );

  /*
   * BUILD TRUSTED CATALOG
   */

  const catalog =
    getTrustedResourceCatalog(
      familyState
    );

  /*
   * SCORE
   */

  const scored =
    catalog
      .map(
        (
          resource
        ) =>
          scoreResource(
            resource,
            familyProfile,
            journey
          )
      )
      .filter(
        (
          recommendation
        ):
          recommendation is
            PersonalizedResourceRecommendation =>
          recommendation !==
          null
      );

  /*
   * SORT
   */

  const sorted =
    sortRecommendations(
      scored
    );

  /*
   * LIMIT
   */

  const requestedLimit =
    options?.limit;

  const recommendations =
    typeof requestedLimit === "number" &&
    Number.isInteger(
      requestedLimit
    ) &&
    requestedLimit > 0

      ? sorted.slice(
          0,
          requestedLimit
        )

      : sorted;

  /*
   * RESULT
   */

  return {
    recommendations,

    totalTrustedResourcesConsidered:
      catalog.length,

    state:
      familyState,

    generatedAt:
      Date.now(),
  };
}