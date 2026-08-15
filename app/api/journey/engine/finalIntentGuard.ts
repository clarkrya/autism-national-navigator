/*
 * ============================================================
 * AUTISM JOURNEY NAVIGATOR
 * FINAL INTENT GUARD
 * ============================================================
 *
 * This is the final personalization protection layer.
 *
 * CORE RULE:
 *
 * The family's selected priority determines the journey domain.
 *
 * Context can personalize the journey:
 *
 * - child age
 * - state
 * - journey stage
 * - existing supports
 * - insurance
 * - notes
 *
 * Context MUST NOT replace the family's stated priority.
 *
 * Examples:
 *
 * Financial + Private Insurance
 *     -> financial assistance
 *
 * Therapy + School Services
 *     -> therapy need/gap
 *
 * School + Private Insurance
 *     -> school-related need
 *
 * Insurance + School Services
 *     -> insurance/coverage issue
 *
 * Unsure
 *     -> clarify the concern
 *
 * ============================================================
 */

import type { FamilyProfile } from "../../../../types/familyProfile";
import type { PersonalizedJourney } from "../../../../lib/ai/journeyTypes";


/*
 * ============================================================
 * TYPES
 * ============================================================
 */

type PriorityDomain =
  | "financial"
  | "therapy"
  | "school"
  | "insurance"
  | "evaluation"
  | "communication"
  | "behavior"
  | "unsure"
  | "other";


type FamilyIntent = {
  type:
    | "focused"
    | "clarify";

  statement: string;

  focus: string;

  forbiddenAssumptions: string[];
};


/*
 * ============================================================
 * TEXT NORMALIZATION
 * ============================================================
 */

function normalizeText(
  value: unknown
): string {

  return String(
    value ?? ""
  )
    .toLowerCase()
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}


/*
 * ============================================================
 * CONTAINS ANY
 * ============================================================
 */

function containsAny(
  text: string,
  terms: string[]
): boolean {

  const normalized =
    normalizeText(text);

  return terms.some(
    (term) =>
      normalized.includes(
        normalizeText(term)
      )
  );
}


/*
 * ============================================================
 * FAMILY INTENT
 * ============================================================
 *
 * Converts the family's selected priority into an explicit
 * intent instruction.
 *
 * This function does NOT use age, insurance, supports, or
 * journey stage to determine the priority.
 *
 * Priority comes first.
 * ============================================================
 */

export function getFamilyIntent(
  priority: unknown
): FamilyIntent {

  const normalized =
    normalizeText(
      priority
    );


  /*
   * ----------------------------------------------------------
   * FINANCIAL
   * ----------------------------------------------------------
   */

  if (
    normalized.includes("financial") ||
    normalized.includes("money") ||
    normalized.includes("funding") ||
    normalized.includes("cost")
  ) {

    return {

      type:
        "focused",

      statement:
        "The family's current need is financial support and/or reducing the financial burden of care.",

      focus:
        "Financial assistance and cost-reduction actions.",

      forbiddenAssumptions: [
        "school",
        "IEP",
        "ESE",
        "classroom support",
        "school evaluation",
        "therapy expansion",
        "specialist evaluation",
        "insurance problem",
        "insurance appeal",
      ],
    };
  }


  /*
   * ----------------------------------------------------------
   * THERAPY
   * ----------------------------------------------------------
   */

  if (
    normalized.includes("therapy") ||
    normalized.includes("therap")
  ) {

    return {

      type:
        "focused",

      statement:
        "The family's current need involves therapy or developmental services.",

      focus:
        "Therapy access, therapy gaps, coordination, or service-related actions.",

      forbiddenAssumptions: [
        "school referral",
        "school evaluation",
        "IEP",
        "ESE",
        "school meeting",
        "insurance problem",
        "insurance appeal",
        "financial assistance",
      ],
    };
  }


  /*
   * ----------------------------------------------------------
   * SCHOOL
   * ----------------------------------------------------------
   */

  if (
    normalized.includes("school") ||
    normalized.includes("education") ||
    normalized.includes("iep") ||
    normalized.includes("ese")
  ) {

    return {

      type:
        "focused",

      statement:
        "The family's current need involves school or educational support.",

      focus:
        "School and educational actions.",

      forbiddenAssumptions: [
        "financial assistance",
        "grant",
        "funding",
        "insurance appeal",
        "insurance problem",
      ],
    };
  }


  /*
   * ----------------------------------------------------------
   * INSURANCE
   * ----------------------------------------------------------
   */

  if (
    normalized.includes("insurance") ||
    normalized.includes("coverage")
  ) {

    return {

      type:
        "focused",

      statement:
        "The family's current need involves understanding or navigating insurance coverage.",

      focus:
        "Insurance and coverage-related actions.",

      forbiddenAssumptions: [
        "school referral",
        "school evaluation",
        "IEP",
        "ESE",
        "financial assistance",
        "grant",
        "nonprofit funding",
      ],
    };
  }


  /*
   * ----------------------------------------------------------
   * EVALUATION
   * ----------------------------------------------------------
   */

  if (
    normalized.includes("evaluation") ||
    normalized.includes("diagnosis") ||
    normalized.includes("assessment")
  ) {

    return {

      type:
        "focused",

      statement:
        "The family's current need involves understanding an evaluation or assessment process.",

      focus:
        "Evaluation and assessment-related actions.",

      forbiddenAssumptions: [
        "school referral",
        "IEP",
        "ESE",
        "financial assistance",
        "insurance appeal",
      ],
    };
  }


  /*
   * ----------------------------------------------------------
   * COMMUNICATION
   * ----------------------------------------------------------
   */

  if (
    normalized.includes("communication") ||
    normalized.includes("speech")
  ) {

    return {

      type:
        "focused",

      statement:
        "The family's current need involves communication or speech support.",

      focus:
        "Communication-related actions.",

      forbiddenAssumptions: [
        "school referral",
        "IEP",
        "ESE",
        "financial assistance",
        "insurance appeal",
      ],
    };
  }


  /*
   * ----------------------------------------------------------
   * BEHAVIOR
   * ----------------------------------------------------------
   */

  if (
    normalized.includes("behavior")
  ) {

    return {

      type:
        "focused",

      statement:
        "The family's current need involves behavioral support.",

      focus:
        "Behavior-related actions.",

      forbiddenAssumptions: [
        "school referral",
        "IEP",
        "ESE",
        "financial assistance",
        "insurance appeal",
      ],
    };
  }


  /*
   * ----------------------------------------------------------
   * UNSURE / NO CLEAR PRIORITY
   * ----------------------------------------------------------
   */

  return {

    type:
      "clarify",

    statement:
      "The family has not identified a specific area of need yet.",

    focus:
      "Clarifying the family's concern before recommending a specific service or pathway.",

    forbiddenAssumptions: [
      "school",
      "IEP",
      "ESE",
      "therapy",
      "ABA",
      "specialist evaluation",
      "autism evaluation",
      "financial assistance",
      "insurance problem",
      "insurance appeal",
      "behavioral treatment",
      "speech therapy",
      "occupational therapy",
    ],
  };
}


/*
 * ============================================================
 * PRIORITY DOMAIN
 * ============================================================
 */

function getPriorityDomain(
  priority: unknown
): PriorityDomain {

  const normalized =
    normalizeText(
      priority
    );


  if (
    normalized.includes("financial") ||
    normalized.includes("money") ||
    normalized.includes("funding") ||
    normalized.includes("cost")
  ) {
    return "financial";
  }


  if (
    normalized.includes("therapy") ||
    normalized.includes("therap")
  ) {
    return "therapy";
  }


  if (
    normalized.includes("school") ||
    normalized.includes("education") ||
    normalized.includes("iep") ||
    normalized.includes("ese")
  ) {
    return "school";
  }


  if (
    normalized.includes("insurance") ||
    normalized.includes("coverage")
  ) {
    return "insurance";
  }


  if (
    normalized.includes("evaluation") ||
    normalized.includes("diagnosis") ||
    normalized.includes("assessment")
  ) {
    return "evaluation";
  }


  if (
    normalized.includes("communication") ||
    normalized.includes("speech")
  ) {
    return "communication";
  }


  if (
    normalized.includes("behavior")
  ) {
    return "behavior";
  }


  if (
    normalized.includes("unsure") ||
    normalized.includes("not sure") ||
    normalized.includes("dont know") ||
    normalized.includes("don't know") ||
    normalized === ""
  ) {
    return "unsure";
  }


  return "other";
}


/*
 * ============================================================
 * DOMAIN TERMS
 * ============================================================
 *
 * These are used to determine whether generated content
 * belongs to the selected priority.
 * ============================================================
 */

const FINANCIAL_TERMS = [

  "financial assistance",

  "financial aid",

  "financial help",

  "grant",

  "grants",

  "funding",

  "funds",

  "waiver",

  "waivers",

  "scholarship",

  "scholarships",

  "nonprofit assistance",

  "government assistance",

  "assistance program",

  "payment assistance",

  "payment help",

  "help paying",

  "help pay",

  "reduce costs",

  "reduce cost",

  "lower costs",

  "lower cost",

  "cost assistance",

  "financial support",

  "respite funding",

];


const THERAPY_TERMS = [

  "therapy",

  "therapies",

  "therapist",

  "therapists",

  "therapy provider",

  "therapy providers",

  "therapy service",

  "therapy services",

  "therapy support",

  "therapy need",

  "therapy needs",

  "therapy gap",

  "therapy gaps",

  "treatment",

  "clinical support",

  "developmental service",

  "developmental services",

];


const SCHOOL_TERMS = [

  "school",

  "school services",

  "school support",

  "school supports",

  "teacher",

  "teachers",

  "classroom",

  "education",

  "educational",

  "iep",

  "ese",

  "special education",

  "school meeting",

  "school staff",

];


const INSURANCE_TERMS = [

  "insurance",

  "coverage",

  "covered",

  "claim",

  "claims",

  "authorization",

  "prior authorization",

  "denial",

  "denied",

  "appeal",

  "appeals",

  "insurance appeal",

  "benefits",

  "benefit",

  "network",

  "in network",

  "out of network",

  "copay",

  "co pay",

  "deductible",

  "reimbursement",

];


const EVALUATION_TERMS = [

  "evaluation",

  "evaluations",

  "assessment",

  "assessments",

  "diagnosis",

  "diagnostic",

  "autism evaluation",

];


const COMMUNICATION_TERMS = [

  "communication",

  "speech",

  "speech language",

  "speech-language",

  "language support",

];


const BEHAVIOR_TERMS = [

  "behavior",

  "behavioral",

  "behavior support",

  "behavioral support",

];


function getDomainTerms(
  domain: PriorityDomain
): string[] {

  switch (
    domain
  ) {

    case "financial":
      return FINANCIAL_TERMS;

    case "therapy":
      return THERAPY_TERMS;

    case "school":
      return SCHOOL_TERMS;

    case "insurance":
      return INSURANCE_TERMS;

    case "evaluation":
      return EVALUATION_TERMS;

    case "communication":
      return COMMUNICATION_TERMS;

    case "behavior":
      return BEHAVIOR_TERMS;

    default:
      return [];
  }
}


/*
 * ============================================================
 * UNSUPPORTED DOMAIN TERMS
 * ============================================================
 */

const SCHOOL_ACTION_TERMS = [

  "request school documents",

  "request school records",

  "request school summary",

  "school service summary",

  "contact the school",

  "contact school staff",

  "contact the teacher",

  "school meeting",

  "school referral",

  "school evaluation",

  "school-based evaluation",

  "school based evaluation",

  "request an iep",

  "start the iep",

  "request ese",

];


const INSURANCE_ACTION_TERMS = [

  "call your insurance",

  "call insurance",

  "call your insurer",

  "contact your insurance",

  "contact the insurance company",

  "insurance member services",

  "verify insurance benefits",

  "benefits verification",

  "coverage verification",

  "coverage review",

  "review your coverage",

  "prior authorization",

  "appeal the claim",

  "insurance appeal",

];


const FINANCIAL_ACTION_TERMS = [

  "financial assistance",

  "financial aid",

  "grant",

  "grants",

  "funding",

  "waiver",

  "scholarship",

  "nonprofit assistance",

  "government assistance",

  "assistance program",

  "payment assistance",

  "payment help",

  "help paying",

  "help pay",

];


const THERAPY_ACTION_TERMS = [

  "therapy",

  "therapist",

  "therapy provider",

  "therapy providers",

  "therapy service",

  "therapy services",

  "therapy support",

  "therapy gap",

  "therapy need",

  "treatment",

  "speech therapy",

  "occupational therapy",

  "behavior therapy",

  "aba",
];


/*
 * ============================================================
 * JOURNEY TEXT
 * ============================================================
 */

function getCurrentFocusText(
  journey: PersonalizedJourney
): string {

  return [

    journey?.currentFocus?.title,

    journey?.currentFocus?.explanation,

  ]
    .filter(Boolean)
    .join(" ");
}


function getNextStepText(
  journey: PersonalizedJourney
): string {

  return [

    journey?.nextStep?.title,

    journey?.nextStep?.description,

  ]
    .filter(Boolean)
    .join(" ");
}


function getJourneyText(
  journey: PersonalizedJourney
): string {

  const parts: string[] = [];


  parts.push(
    journey?.summary ?? ""
  );


  parts.push(
    getCurrentFocusText(
      journey
    )
  );


  parts.push(
    getNextStepText(
      journey
    )
  );


  for (
    const item of
      journey?.priorities ?? []
  ) {

    parts.push(
      `${item?.title ?? ""} ${
        item?.explanation ?? ""
      }`
    );
  }


  for (
    const task of
      journey?.tasks ?? []
  ) {

    parts.push(
      `${task?.title ?? ""} ${
        task?.description ?? ""
      }`
    );
  }


  for (
    const resource of
      journey?.resources ?? []
  ) {

    parts.push(
      `${resource?.title ?? ""} ${
        resource?.description ?? ""
      }`
    );
  }


  return parts
    .filter(Boolean)
    .join(" ");
}


/*
 * ============================================================
 * UNSURE JOURNEY
 * ============================================================
 */

function buildClarificationJourney(
  journey: PersonalizedJourney
): PersonalizedJourney {

  return {

    ...journey,

    summary:
      "You have not identified one specific priority yet. The best first step is to clarify what concerns you want help understanding.",

    currentFocus: {

      title:
        "Clarify what concerns you most right now",

      explanation:
        "Start with what you have personally noticed. You do not need to choose a specific service before you understand the concern you want help addressing.",
    },

    priorities: [

      {

        id:
          "clarify-concern",

        title:
          "Identify the concerns you want to address",

        explanation:
          "Write down the 2–3 concerns, situations, or changes that prompted you to look for help.",

        priority:
          "High",
      },

    ],

    tasks: [

      {

        id:
          "document-concerns",

        title:
          "Write down 2–3 concerns you have noticed",

        description:
          "Keep the list simple. Note what you are seeing, when it happens, and why it matters to your family.",

        priority:
          "High",

        estimatedTime:
          "10–15 minutes",

        completed:
          false,

        resourceLink:
          "",
      },

      {

        id:
          "clarify-next-question",

        title:
          "Write down the question you most want answered",

        description:
          "Focus on the one question that would make it easier to decide what help you need next.",

        priority:
          "Medium",

        estimatedTime:
          "5–10 minutes",

        completed:
          false,

        resourceLink:
          "",
      },

    ],

    resources: [],

    nextStep: {

      title:
        "Write down the 2–3 concerns you want help understanding",

      description:
        "Start with what you have personally noticed. You do not need to determine a diagnosis or choose a service before taking this step.",
    },
  };
}


/*
 * ============================================================
 * FINANCIAL FALLBACK
 * ============================================================
 */

function buildFinancialJourney(
  journey: PersonalizedJourney
): PersonalizedJourney {

  return {

    ...journey,

    summary:
      "Your top priority is financial support. This journey focuses first on legitimate assistance that may help reduce what your family has to pay.",

    currentFocus: {

      title:
        "Find financial assistance that may help pay for care",

      explanation:
        "Because financial support is your stated priority, start with legitimate grants, assistance programs, nonprofit support, government programs, waivers, scholarships, or other funding opportunities that may help offset eligible costs.",
    },

    priorities: [

      {

        id:
          "financial-assistance",

        title:
          "Look for financial assistance that may help reduce costs",

        explanation:
          "Focus first on legitimate assistance programs, grants, waivers, scholarships, nonprofit support, government programs, or other resources that may help with eligible expenses.",

        priority:
          "High",
      },

    ],

    tasks: [

      {

        id:
          "find-financial-assistance",

        title:
          "Check financial assistance programs you may qualify for",

        description:
          "Start with legitimate grants, government programs, waivers, nonprofit assistance, and other resources that may help offset eligible costs. Verify current eligibility before applying.",

        priority:
          "High",

        estimatedTime:
          "20–30 minutes",

        completed:
          false,

        resourceLink:
          "",
      },

      ...(
        journey?.tasks ?? []
      )
        .filter(
          (task) =>
            !containsAny(
              `${task.title} ${task.description}`,
              SCHOOL_ACTION_TERMS
            ) &&
            !containsAny(
              `${task.title} ${task.description}`,
              INSURANCE_ACTION_TERMS
            )
        )
        .slice(
          0,
          2
        ),
    ],

    resources:
      (
        journey?.resources ?? []
      )
        .filter(
          (resource) =>
            !containsAny(
              `${resource.title} ${resource.description}`,
              SCHOOL_ACTION_TERMS
            ) &&
            !containsAny(
              `${resource.title} ${resource.description}`,
              INSURANCE_ACTION_TERMS
            )
        )
        .slice(
          0,
          3
        ),

    nextStep: {

      title:
        "Start with financial assistance programs",

      description:
        "Look for legitimate grants, government programs, waivers, nonprofit assistance, scholarships, or other financial resources that may help reduce your family's eligible costs.",
    },
  };
}


/*
 * ============================================================
 * THERAPY FALLBACK
 * ============================================================
 */

function buildTherapyJourney(
  journey: PersonalizedJourney,
  familyProfile: FamilyProfile
): PersonalizedJourney {

  const supports =
    Array.isArray(
      familyProfile?.supports
    )
      ? familyProfile.supports
      : [];


  const normalizedSupports =
    supports.map(
      (support) =>
        normalizeText(
          support
        )
    );


  const hasTherapySupport =
    normalizedSupports.some(
      (support) =>
        support.includes("therapy") ||
        support.includes("therap") ||
        support.includes("speech") ||
        support.includes("occupational") ||
        support.includes("aba")
    );


  return {

    ...journey,

    summary:
      hasTherapySupport
        ? "Therapy is your family's stated priority. Because your child already receives support, the first step is to identify what is still missing."
        : "Therapy is your family's stated priority. The first step is to identify the therapy support your child needs.",

    currentFocus: {

      title:
        hasTherapySupport
          ? "Identify what is missing from your child's current therapy support"
          : "Identify the therapy support your child needs",

      explanation:
        hasTherapySupport
          ? "Your child already receives therapy-related support. The next step is to identify what is working, what is missing, and what additional support you want."
          : "Therapy is your stated priority. Start by identifying the therapy need you want help addressing before assuming a specific therapy or provider.",
    },

    priorities: [

      {

        id:
          "therapy-need",

        title:
          hasTherapySupport
            ? "Identify the therapy gap"
            : "Identify the therapy support you are looking for",

        explanation:
          hasTherapySupport
            ? "Write down what your child receives now, what is working, and what you believe is still missing."
            : "Write down the main therapy need you want to address so you can determine the most appropriate next step.",

        priority:
          "High",
      },

    ],

    tasks: [

      {

        id:
          "therapy-next-action",

        title:
          hasTherapySupport
            ? "Identify what is missing from your child's current therapy support"
            : "Identify the therapy support you are looking for",

        description:
          hasTherapySupport
            ? "Note what your child currently receives, what is working, and what you believe is still missing."
            : "Write down the main therapy need you want to address before choosing a specific provider or therapy.",

        priority:
          "High",

        estimatedTime:
          "10–15 minutes",

        completed:
          false,

        resourceLink:
          "",
      },

      ...(
        journey?.tasks ?? []
      )
        .filter(
          (task) =>
            !containsAny(
              `${task.title} ${task.description}`,
              SCHOOL_ACTION_TERMS
            ) &&
            !containsAny(
              `${task.title} ${task.description}`,
              FINANCIAL_ACTION_TERMS
            ) &&
            !containsAny(
              `${task.title} ${task.description}`,
              INSURANCE_ACTION_TERMS
            )
        )
        .slice(
          0,
          2
        ),
    ],

    resources:
      (
        journey?.resources ?? []
      )
        .filter(
          (resource) =>
            !containsAny(
              `${resource.title} ${resource.description}`,
              SCHOOL_ACTION_TERMS
            ) &&
            !containsAny(
              `${resource.title} ${resource.description}`,
              FINANCIAL_ACTION_TERMS
            ) &&
            !containsAny(
              `${resource.title} ${resource.description}`,
              INSURANCE_ACTION_TERMS
            )
        )
        .slice(
          0,
          3
        ),

    nextStep: {

      title:
        hasTherapySupport
          ? "Identify what is missing from your child's current therapy support"
          : "Identify the therapy support your child needs",

      description:
        hasTherapySupport
          ? "Start by identifying the gap between the support your child receives now and the help you want next."
          : "Write down the main therapy need you want help addressing before choosing a provider.",
    },
  };
}


/*
 * ============================================================
 * SCHOOL FALLBACK
 * ============================================================
 */

function buildSchoolJourney(
  journey: PersonalizedJourney
): PersonalizedJourney {

  return {

    ...journey,

    currentFocus: {

      title:
        "Address the school-related concern that matters most to your family",

      explanation:
        "School is your family's stated priority. The next step should be based on the specific school concern you want help addressing rather than assuming an IEP, ESE process, evaluation, or other school service.",
    },

    nextStep: {

      title:
        "Identify the specific school concern you want to address",

      description:
        "Write down what is happening at school, what support your child receives now, and what you would like to improve. Use that information to determine the appropriate next step.",
    },

  };
}


/*
 * ============================================================
 * INSURANCE FALLBACK
 * ============================================================
 */

function buildInsuranceJourney(
  journey: PersonalizedJourney
): PersonalizedJourney {

  return {

    ...journey,

    currentFocus: {

      title:
        "Understand the insurance issue affecting your child's care",

      explanation:
        "Insurance is your family's stated priority. The journey should focus on the specific coverage, authorization, claim, denial, cost, or other insurance issue you want help resolving.",
    },

    nextStep: {

      title:
        "Identify the specific insurance problem you need help resolving",

      description:
        "Write down the service or expense involved and what your insurance has told you so far. This will help identify the appropriate coverage, authorization, appeal, or other insurance-related next step.",
    },

  };
}


/*
 * ============================================================
 * GENERIC DOMAIN FALLBACK
 * ============================================================
 */

function buildGenericPriorityJourney(
  journey: PersonalizedJourney,
  familyProfile: FamilyProfile,
  intent: FamilyIntent
): PersonalizedJourney {

  return {

    ...journey,

    currentFocus: {

      title:
        `Focus on ${intent.focus.toLowerCase()}`,

      explanation:
        `You identified ${familyProfile.priority} as the area where you need the most help right now, so the journey is focused there first.`,
    },

    nextStep: {

      title:
        `Take the next action related to ${familyProfile.priority}`,

      description:
        `Start with the specific ${String(
          familyProfile.priority ?? ""
        ).toLowerCase()} need you identified rather than adding an unrelated service or pathway.`,
    },

  };
}


/*
 * ============================================================
 * REMOVE UNRELATED SUPPORTING CONTENT
 * ============================================================
 */

function removeUnrelatedContent(
  journey: PersonalizedJourney,
  domain: PriorityDomain
): PersonalizedJourney {

  let priorities =
    journey?.priorities ?? [];

  let tasks =
    journey?.tasks ?? [];

  let resources =
    journey?.resources ?? [];


  /*
   * ----------------------------------------------------------
   * FINANCIAL
   * ----------------------------------------------------------
   */

  if (
    domain === "financial"
  ) {

    priorities =
      priorities.filter(
        (item) =>
          !containsAny(
            `${item.title} ${item.explanation}`,
            SCHOOL_ACTION_TERMS
          ) &&
          !containsAny(
            `${item.title} ${item.explanation}`,
            INSURANCE_ACTION_TERMS
          )
      );


    tasks =
      tasks.filter(
        (task) =>
          !containsAny(
            `${task.title} ${task.description}`,
            SCHOOL_ACTION_TERMS
          ) &&
          !containsAny(
            `${task.title} ${task.description}`,
            INSURANCE_ACTION_TERMS
          )
      );


    resources =
      resources.filter(
        (resource) =>
          !containsAny(
            `${resource.title} ${resource.description}`,
            SCHOOL_ACTION_TERMS
          ) &&
          !containsAny(
            `${resource.title} ${resource.description}`,
            INSURANCE_ACTION_TERMS
          )
      );
  }


  /*
   * ----------------------------------------------------------
   * THERAPY
   * ----------------------------------------------------------
   */

  if (
    domain === "therapy"
  ) {

    priorities =
      priorities.filter(
        (item) =>
          !containsAny(
            `${item.title} ${item.explanation}`,
            SCHOOL_ACTION_TERMS
          ) &&
          !containsAny(
            `${item.title} ${item.explanation}`,
            FINANCIAL_ACTION_TERMS
          ) &&
          !containsAny(
            `${item.title} ${item.explanation}`,
            INSURANCE_ACTION_TERMS
          )
      );


    tasks =
      tasks.filter(
        (task) =>
          !containsAny(
            `${task.title} ${task.description}`,
            SCHOOL_ACTION_TERMS
          ) &&
          !containsAny(
            `${task.title} ${task.description}`,
            FINANCIAL_ACTION_TERMS
          ) &&
          !containsAny(
            `${task.title} ${task.description}`,
            INSURANCE_ACTION_TERMS
          )
      );


    resources =
      resources.filter(
        (resource) =>
          !containsAny(
            `${resource.title} ${resource.description}`,
            SCHOOL_ACTION_TERMS
          ) &&
          !containsAny(
            `${resource.title} ${resource.description}`,
            FINANCIAL_ACTION_TERMS
          ) &&
          !containsAny(
            `${resource.title} ${resource.description}`,
            INSURANCE_ACTION_TERMS
          )
      );
  }


  /*
   * ----------------------------------------------------------
   * SCHOOL
   * ----------------------------------------------------------
   */

  if (
    domain === "school"
  ) {

    priorities =
      priorities.filter(
        (item) =>
          !containsAny(
            `${item.title} ${item.explanation}`,
            FINANCIAL_ACTION_TERMS
          ) &&
          !containsAny(
            `${item.title} ${item.explanation}`,
            INSURANCE_ACTION_TERMS
          )
      );


    tasks =
      tasks.filter(
        (task) =>
          !containsAny(
            `${task.title} ${task.description}`,
            FINANCIAL_ACTION_TERMS
          ) &&
          !containsAny(
            `${task.title} ${task.description}`,
            INSURANCE_ACTION_TERMS
          )
      );


    resources =
      resources.filter(
        (resource) =>
          !containsAny(
            `${resource.title} ${resource.description}`,
            FINANCIAL_ACTION_TERMS
          ) &&
          !containsAny(
            `${resource.title} ${resource.description}`,
            INSURANCE_ACTION_TERMS
          )
      );
  }


  /*
   * ----------------------------------------------------------
   * INSURANCE
   * ----------------------------------------------------------
   */

  if (
    domain === "insurance"
  ) {

    priorities =
      priorities.filter(
        (item) =>
          !containsAny(
            `${item.title} ${item.explanation}`,
            SCHOOL_ACTION_TERMS
          ) &&
          !containsAny(
            `${item.title} ${item.explanation}`,
            FINANCIAL_ACTION_TERMS
          )
      );


    tasks =
      tasks.filter(
        (task) =>
          !containsAny(
            `${task.title} ${task.description}`,
            SCHOOL_ACTION_TERMS
          ) &&
          !containsAny(
            `${task.title} ${task.description}`,
            FINANCIAL_ACTION_TERMS
          )
      );


    resources =
      resources.filter(
        (resource) =>
          !containsAny(
            `${resource.title} ${resource.description}`,
            SCHOOL_ACTION_TERMS
          ) &&
          !containsAny(
            `${resource.title} ${resource.description}`,
            FINANCIAL_ACTION_TERMS
          )
      );
  }


  return {

    ...journey,

    priorities,

    tasks,

    resources,

  };
}


/*
 * ============================================================
 * INTERNAL TEXT LEAK SANITIZATION
 * ============================================================
 *
 * The structured task field "completed" is valid and required
 * by the application.
 *
 * What we prevent is implementation language accidentally
 * appearing inside family-facing text.
 *
 * Examples that should NEVER appear:
 *
 * completed = false
 * completed: false
 * completed=false
 *
 * ============================================================
 */

function sanitizeFamilyText(
  value: unknown
): string {

  let text =
    String(
      value ?? ""
    );


  text =
    text.replace(
      /\bcompleted\s*=\s*(true|false)\b/gi,
      ""
    );


  text =
    text.replace(
      /\bcompleted\s*:\s*(true|false)\b/gi,
      ""
    );


  text =
    text.replace(
      /\bcompleted\s*=\s*(true|false)\b/gi,
      ""
    );


  text =
    text.replace(
      /\s{2,}/g,
      " "
    );


  return text.trim();
}


/*
 * ============================================================
 * SANITIZE JOURNEY
 * ============================================================
 */

function sanitizeJourney(
  journey: PersonalizedJourney
): PersonalizedJourney {

  return {

    ...journey,

    summary:
      sanitizeFamilyText(
        journey?.summary
      ),

    currentFocus: {

      ...journey.currentFocus,

      title:
        sanitizeFamilyText(
          journey?.currentFocus?.title
        ),

      explanation:
        sanitizeFamilyText(
          journey?.currentFocus?.explanation
        ),
    },

    priorities:
      (
        journey?.priorities ?? []
      ).map(
        (item) => ({

          ...item,

          title:
            sanitizeFamilyText(
              item?.title
            ),

          explanation:
            sanitizeFamilyText(
              item?.explanation
            ),

        })
      ),

    tasks:
      (
        journey?.tasks ?? []
      ).map(
        (task) => ({

          ...task,

          title:
            sanitizeFamilyText(
              task?.title
            ),

          description:
            sanitizeFamilyText(
              task?.description
            ),

        })
      ),

    resources:
      (
        journey?.resources ?? []
      ).map(
        (resource) => ({

          ...resource,

          title:
            sanitizeFamilyText(
              resource?.title
            ),

          description:
            sanitizeFamilyText(
              resource?.description
            ),

        })
      ),

    nextStep: {

      ...journey.nextStep,

      title:
        sanitizeFamilyText(
          journey?.nextStep?.title
        ),

      description:
        sanitizeFamilyText(
          journey?.nextStep?.description
        ),
    },

  };
}


/*
 * ============================================================
 * PRIMARY DOMAIN ENFORCEMENT
 * ============================================================
 *
 * This is the key new protection.
 *
 * We do NOT ask:
 *
 * "Does this journey contain the word therapy?"
 *
 * We ask:
 *
 * "Does the journey's primary focus and next step actually
 * belong to the family's selected priority?"
 *
 * ============================================================
 */

function enforcePriorityDomain(
  journey: PersonalizedJourney,
  familyProfile: FamilyProfile
): PersonalizedJourney {

  const domain =
    getPriorityDomain(
      familyProfile?.priority
    );


  /*
   * ----------------------------------------------------------
   * UNSURE
   * ----------------------------------------------------------
   */

  if (
    domain === "unsure"
  ) {

    return buildClarificationJourney(
      journey
    );
  }


  /*
   * ----------------------------------------------------------
   * UNKNOWN / OTHER
   * ----------------------------------------------------------
   */

  if (
    domain === "other"
  ) {

    return journey;
  }


  const focusText =
    getCurrentFocusText(
      journey
    );


  const nextStepText =
    getNextStepText(
      journey
    );


  const domainTerms =
    getDomainTerms(
      domain
    );


  const focusMatches =
    containsAny(
      focusText,
      domainTerms
    );


  const nextStepMatches =
    containsAny(
      nextStepText,
      domainTerms
    );


  /*
   * ----------------------------------------------------------
   * FINANCIAL
   * ----------------------------------------------------------
   *
   * Financial means the parent is looking for money/help paying.
   *
   * Private insurance does not automatically become the
   * solution.
   */

  if (
    domain === "financial"
  ) {

    const nextStepIsInsurance =
      containsAny(
        nextStepText,
        INSURANCE_ACTION_TERMS
      );


    const focusIsInsurance =
      containsAny(
        focusText,
        INSURANCE_ACTION_TERMS
      );


    const hasFinancialLanguage =
      containsAny(
        getJourneyText(
          journey
        ),
        FINANCIAL_TERMS
      );


    if (
      nextStepIsInsurance ||
      focusIsInsurance ||
      !focusMatches ||
      !nextStepMatches ||
      !hasFinancialLanguage
    ) {

      return buildFinancialJourney(
        journey
      );
    }


    return journey;
  }


  /*
   * ----------------------------------------------------------
   * THERAPY
   * ----------------------------------------------------------
   *
   * Existing school services are context.
   *
   * They cannot turn a Therapy journey into a School journey.
   */

  if (
    domain === "therapy"
  ) {

    const nextStepIsSchool =
      containsAny(
        nextStepText,
        SCHOOL_ACTION_TERMS
      );


    const focusIsSchool =
      containsAny(
        focusText,
        SCHOOL_ACTION_TERMS
      );


    const nextStepIsFinancial =
      containsAny(
        nextStepText,
        FINANCIAL_ACTION_TERMS
      );


    const nextStepIsInsurance =
      containsAny(
        nextStepText,
        INSURANCE_ACTION_TERMS
      );


    if (
      nextStepIsSchool ||
      focusIsSchool ||
      nextStepIsFinancial ||
      nextStepIsInsurance ||
      !focusMatches ||
      !nextStepMatches
    ) {

      return buildTherapyJourney(
        journey,
        familyProfile
      );
    }


    return journey;
  }


  /*
   * ----------------------------------------------------------
   * SCHOOL
   * ----------------------------------------------------------
   */

  if (
    domain === "school"
  ) {

    const nextStepIsFinancial =
      containsAny(
        nextStepText,
        FINANCIAL_ACTION_TERMS
      );


    const nextStepIsInsurance =
      containsAny(
        nextStepText,
        INSURANCE_ACTION_TERMS
      );


    if (
      nextStepIsFinancial ||
      nextStepIsInsurance ||
      !focusMatches ||
      !nextStepMatches
    ) {

      return buildSchoolJourney(
        journey
      );
    }


    return journey;
  }


  /*
   * ----------------------------------------------------------
   * INSURANCE
   * ----------------------------------------------------------
   */

  if (
    domain === "insurance"
  ) {

    const nextStepIsSchool =
      containsAny(
        nextStepText,
        SCHOOL_ACTION_TERMS
      );


    const nextStepIsFinancial =
      containsAny(
        nextStepText,
        FINANCIAL_ACTION_TERMS
      );


    if (
      nextStepIsSchool ||
      nextStepIsFinancial ||
      !focusMatches ||
      !nextStepMatches
    ) {

      return buildInsuranceJourney(
        journey
      );
    }


    return journey;
  }


  /*
   * ----------------------------------------------------------
   * OTHER RECOGNIZED DOMAINS
   * ----------------------------------------------------------
   */

  if (
    !focusMatches ||
    !nextStepMatches
  ) {

    return buildGenericPriorityJourney(
      journey,
      familyProfile,
      getFamilyIntent(
        familyProfile?.priority
      )
    );
  }


  return journey;
}


/*
 * ============================================================
 * FINAL INTENT GUARD
 * ============================================================
 *
 * This is the function imported by route.ts.
 *
 * The order matters:
 *
 * 1. Sanitize
 * 2. Enforce priority domain
 * 3. Remove unrelated supporting content
 * 4. Sanitize again
 * 5. Return final family-facing journey
 *
 * ============================================================
 */

export function enforceFinalIntentGuard(
  journey: PersonalizedJourney,
  familyProfile: FamilyProfile
): PersonalizedJourney {

  /*
   * ----------------------------------------------------------
   * STEP 1
   * INITIAL SANITIZATION
   * ----------------------------------------------------------
   */

  let finalJourney =
    sanitizeJourney(
      journey
    );


  /*
   * ----------------------------------------------------------
   * STEP 2
   * PRIORITY DOMAIN
   * ----------------------------------------------------------
   */

  finalJourney =
    enforcePriorityDomain(
      finalJourney,
      familyProfile
    );


  /*
   * ----------------------------------------------------------
   * STEP 3
   * REMOVE UNRELATED CONTENT
   * ----------------------------------------------------------
   */

  const domain =
    getPriorityDomain(
      familyProfile?.priority
    );


  finalJourney =
    removeUnrelatedContent(
      finalJourney,
      domain
    );


  /*
   * ----------------------------------------------------------
   * STEP 4
   * SANITIZE AGAIN
   * ----------------------------------------------------------
   *
   * Some fallback journeys are created after the first
   * sanitization, so run it one more time.
   */

  finalJourney =
    sanitizeJourney(
      finalJourney
    );


  /*
   * ----------------------------------------------------------
   * STEP 5
   * FINAL TASK SAFETY
   * ----------------------------------------------------------
   *
   * completed remains an internal boolean.
   *
   * We make sure every task has a valid boolean value without
   * putting that implementation detail into the visible text.
   */

  finalJourney = {

    ...finalJourney,

    tasks:
      (
        finalJourney?.tasks ?? []
      ).map(
        (task) => ({

          ...task,

          completed:
            typeof task.completed ===
            "boolean"
              ? task.completed
              : false,

        })
      ),
  };


  /*
   * ----------------------------------------------------------
   * FINAL RETURN
   * ----------------------------------------------------------
   */

  return finalJourney;
}


/*
 * ============================================================
 * PUBLIC TEST HELPERS
 * ============================================================
 *
 * These are useful when testing the engine independently.
 * ============================================================
 */

export {

  normalizeText,

  getPriorityDomain,

  sanitizeJourney,

};