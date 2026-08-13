import { NextResponse } from "next/server";

import type { FamilyProfile } from "../../../../types/familyProfile";
import type { PersonalizedJourney } from "../../../../lib/ai/journeyTypes";

const OPENAI_API_URL =
  "https://api.openai.com/v1/responses";

const OPENAI_MODEL = "gpt-5-mini";

/*
 * ============================================================
 * JOURNEY RESPONSE SCHEMA
 * ============================================================
 */

const journeySchema = {
  type: "object",
  additionalProperties: false,

  properties: {
    summary: {
      type: "string",
    },

    currentFocus: {
      type: "object",
      additionalProperties: false,

      properties: {
        title: {
          type: "string",
        },

        explanation: {
          type: "string",
        },
      },

      required: [
        "title",
        "explanation",
      ],
    },

    priorities: {
      type: "array",

      items: {
        type: "object",
        additionalProperties: false,

        properties: {
          id: {
            type: "string",
          },

          title: {
            type: "string",
          },

          explanation: {
            type: "string",
          },

          priority: {
            type: "string",
            enum: [
              "High",
              "Medium",
              "Low",
            ],
          },
        },

        required: [
          "id",
          "title",
          "explanation",
          "priority",
        ],
      },
    },

    tasks: {
      type: "array",

      items: {
        type: "object",
        additionalProperties: false,

        properties: {
          id: {
            type: "string",
          },

          title: {
            type: "string",
          },

          description: {
            type: "string",
          },

          priority: {
            type: "string",
            enum: [
              "High",
              "Medium",
              "Low",
            ],
          },

          estimatedTime: {
            type: "string",
          },

          completed: {
            type: "boolean",
          },

          resourceLink: {
            type: "string",
          },
        },

        required: [
          "id",
          "title",
          "description",
          "priority",
          "estimatedTime",
          "completed",
          "resourceLink",
        ],
      },
    },

    resources: {
      type: "array",

      items: {
        type: "object",
        additionalProperties: false,

        properties: {
          id: {
            type: "string",
          },

          title: {
            type: "string",
          },

          description: {
            type: "string",
          },

          url: {
            type: "string",
          },
        },

        required: [
          "id",
          "title",
          "description",
          "url",
        ],
      },
    },

    nextStep: {
      type: "object",
      additionalProperties: false,

      properties: {
        title: {
          type: "string",
        },

        description: {
          type: "string",
        },
      },

      required: [
        "title",
        "description",
      ],
    },
  },

  required: [
    "summary",
    "currentFocus",
    "priorities",
    "tasks",
    "resources",
    "nextStep",
  ],
};

/*
 * ============================================================
 * FAMILY INTENT
 * ============================================================
 */

function getFamilyIntent(priority: string) {
  const normalized =
    String(priority || "")
      .toLowerCase()
      .replace(/[-_]/g, " ")
      .trim();

  /*
   * ----------------------------------------------------------
   * FINANCIAL
   * ----------------------------------------------------------
   *
   * Financial means:
   *
   * "I need help paying for things."
   *
   * The engine should prioritize:
   * - grants
   * - financial assistance
   * - government programs
   * - nonprofit assistance
   * - waivers
   * - funding
   * - cost-reduction opportunities
   *
   * Private insurance is context and should NOT automatically
   * become the primary answer.
   */

  if (
    normalized.includes("financial") ||
    normalized.includes("money") ||
    normalized.includes("cost") ||
    normalized.includes("funding")
  ) {
    return {
      type: "focused",

      statement:
        "The family is looking for financial help to reduce or offset the cost of care, services, supports, or other autism-related needs.",

      focus:
        "Finding legitimate financial assistance and cost-offsetting opportunities.",

      forbiddenAssumptions: [
        "school",
        "IEP",
        "ESE",
        "classroom support",
        "therapy expansion",
        "specialist evaluation",
        "employer benefits",
        "employer program",
        "FSA",
        "HSA",
        "tax advantaged account",
        "tax-advantaged account",
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
      type: "focused",

      statement:
        "The family's current need is school or educational support.",

      focus:
        "School and educational actions.",

      forbiddenAssumptions: [],
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
      type: "focused",

      statement:
        "The family's current need involves therapy or developmental services.",

      focus:
        "Therapy access, coordination, or service-related actions.",

      forbiddenAssumptions: [],
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
      type: "focused",

      statement:
        "The family's current need is understanding or navigating insurance coverage.",

      focus:
        "Insurance and coverage-related actions.",

      forbiddenAssumptions: [],
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
      type: "focused",

      statement:
        "The family's current need involves understanding the evaluation or assessment process.",

      focus:
        "Evaluation and assessment-related actions.",

      forbiddenAssumptions: [],
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
      type: "focused",

      statement:
        "The family's current need involves communication or speech support.",

      focus:
        "Communication-related actions.",

      forbiddenAssumptions: [],
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
      type: "focused",

      statement:
        "The family's current need involves behavioral support.",

      focus:
        "Behavior-related actions.",

      forbiddenAssumptions: [],
    };
  }

  /*
   * ----------------------------------------------------------
   * UNSURE
   * ----------------------------------------------------------
   */

  return {
    type: "clarify",

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
      "autism diagnosis",
      "financial assistance",
      "insurance problem",
      "behavioral treatment",
      "speech therapy",
      "occupational therapy",
      "grants",
      "employer benefits",
      "FSA",
      "HSA",
    ],
  };
}

/*
 * ============================================================
 * TEXT HELPERS
 * ============================================================
 */

function normalizeText(value: unknown) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function containsAny(
  text: string,
  terms: string[]
) {
  return terms.some((term) =>
    text.includes(term)
  );
}

function containsUnsupportedDomain(
  text: string,
  forbiddenTerms: string[]
) {
  const normalized =
    normalizeText(text);

  return forbiddenTerms.some(
    (term) =>
      normalized.includes(
        term.toLowerCase()
      )
  );
}
/*
 * ============================================================
 * EVIDENCE HIERARCHY
 * ============================================================
 *
 * Every recommendation must earn its place in the journey.
 */

const EVIDENCE_HIERARCHY = `
EVIDENCE HIERARCHY

LEVEL 1 — EXPLICIT
The parent directly identified the need, concern, barrier,
service, or goal.

ACTION:
Use it.

LEVEL 2 — DIRECTLY SUPPORTED
The questionnaire answers clearly support the recommendation.

ACTION:
Use it when the connection is meaningful.

LEVEL 3 — NECESSARY
The recommendation is necessary to accomplish an action that
is already supported by the family profile.

ACTION:
Use it.

LEVEL 4 — GENERALLY USEFUL
The recommendation is commonly useful for similar families
but was not supported by this family's answers.

ACTION:
DO NOT automatically introduce it.

LEVEL 5 — POSSIBLE FUTURE NEED
The recommendation may become useful later but is not supported
by the family's current situation.

ACTION:
DO NOT include it in today's journey.

A recommendation must have evidence.

"Commonly helpful" is not enough.

"Available in the state" is not enough.

"Families often do this" is not enough.

"Could be useful" is not enough.
`;

/*
 * ============================================================
 * FINANCIAL VALIDATION
 * ============================================================
 *
 * Financial means the family is looking for money or
 * assistance.
 *
 * Insurance is NOT automatically the answer simply because
 * the family has private insurance.
 */

function validateFinancialJourney(
  journey: PersonalizedJourney,
  familyProfile: FamilyProfile
): PersonalizedJourney {
  const allText =
    [
      journey.summary,

      journey.currentFocus.title,
      journey.currentFocus.explanation,

      journey.nextStep.title,
      journey.nextStep.description,

      ...journey.priorities.map(
        (item) =>
          `${item.title} ${item.explanation}`
      ),

      ...journey.tasks.map(
        (task) =>
          `${task.title} ${task.description}`
      ),

      ...journey.resources.map(
        (resource) =>
          `${resource.title} ${resource.description}`
      ),
    ].join(" ");

  const normalized =
    normalizeText(allText);

  /*
   * If the AI makes insurance the entire financial journey
   * without evidence that insurance is the actual problem,
   * redirect the journey toward financial assistance.
   */

  const hasAssistanceLanguage =
    normalized.includes("grant") ||
    normalized.includes("grants") ||
    normalized.includes("financial assistance") ||
    normalized.includes("financial help") ||
    normalized.includes("funding") ||
    normalized.includes("waiver") ||
    normalized.includes("program") ||
    normalized.includes("nonprofit") ||
    normalized.includes("government assistance");

  const hasInsuranceLanguage =
    normalized.includes("insurance") ||
    normalized.includes("coverage");

  /*
   * Financial + insurance only =
   * AI has likely misunderstood the family's intent.
   */

  if (
    hasInsuranceLanguage &&
    !hasAssistanceLanguage
  ) {
    return {
      ...journey,

      summary:
        "You told us your top priority is financial help. This journey focuses first on finding programs, grants, and other assistance that may help reduce what your family has to pay.",

      currentFocus: {
        title:
          "Find financial assistance that may help pay for care",

        explanation:
          "Your top priority is financial support. Start by identifying legitimate programs, grants, nonprofit assistance, government programs, waivers, or other funding opportunities that may help offset your family's costs.",
      },

      priorities: [
        {
          id:
            "financial-assistance",

          title:
            "Look for financial assistance that may help cover costs",

          explanation:
            "Focus first on legitimate assistance programs, grants, waivers, and nonprofit or government resources that may help families pay for eligible needs.",

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
            "Start with verified grants, government programs, waivers, nonprofit assistance, and other resources that may help offset eligible costs.",

          priority:
            "High",

          estimatedTime:
            "20–30 minutes",

          completed:
            false,

          resourceLink:
            "",
        },
      ],

      resources:
        journey.resources,

      nextStep: {
        title:
          "Start with financial assistance programs",

        description:
          "Look for verified grants, government programs, waivers, nonprofit assistance, and other financial resources that may help reduce your family's costs.",
      },
    };
  }

  return journey;
}

/*
 * ============================================================
 * UNSUPPORTED DOMAIN TERMS
 * ============================================================
 *
 * These terms help prevent the AI from introducing unrelated
 * pathways when they were not part of the family's stated need.
 */

const SCHOOL_RECOMMENDATION_TERMS = [
  "school documents",
  "request school documents",
  "contact the school",
  "contact school staff",
  "school staff",
  "school meeting",
  "school referral",
  "school evaluation",
  "school-based evaluation",
  "iep",
  "ese",
  "individualized education",
  "educational evaluation",
  "education evaluation",
];

const FINANCIAL_RECOMMENDATION_TERMS = [
  "financial assistance",
  "financial aid",
  "grant",
  "grants",
  "funding",
  "waiver",
  "nonprofit assistance",
  "government assistance",
];

const INSURANCE_RECOMMENDATION_TERMS = [
  "call your insurance",
  "call insurance",
  "insurance member services",
  "benefits verification",
  "benefit verification",
  "coverage review",
  "insurance appeal",
  "appeal the claim",
];

const THERAPY_TERMS = [
  "therapy",
  "therapist",
  "provider",
  "service",
  "treatment",
  "speech",
  "occupational",
  "behavior",
  "aba",
  "developmental",
];
/*
 * ============================================================
 * MAIN JOURNEY VALIDATION
 * ============================================================
 *
 * The family's selected priority is the primary driver.
 *
 * Existing supports provide context.
 *
 * Existing supports MUST NOT override the selected priority.
 */

function validateJourney(
  journey: PersonalizedJourney,
  familyProfile: FamilyProfile
): PersonalizedJourney {
  const intent =
    getFamilyIntent(
      familyProfile.priority
    );

  const priority =
    normalizeText(
      familyProfile.priority
    );

  const supports =
    Array.isArray(
      familyProfile.supports
    )
      ? familyProfile.supports.map(
          (support) =>
            normalizeText(support)
        )
      : [];

  /*
   * ==========================================================
   * DETERMINE ACTIVE INTENT
   * ==========================================================
   */

  const isTherapy =
    priority.includes("therapy") ||
    priority.includes("therap");

  const isSchool =
    priority.includes("school") ||
    priority.includes("education") ||
    priority.includes("iep") ||
    priority.includes("ese");

  const isFinancial =
    priority.includes("financial") ||
    priority.includes("money") ||
    priority.includes("cost") ||
    priority.includes("funding");

  const isInsurance =
    priority.includes("insurance") ||
    priority.includes("coverage");

  /*
   * ==========================================================
   * EXISTING SUPPORT CONTEXT
   * ==========================================================
   *
   * Existing support can refine the recommendation.
   *
   * It cannot replace the selected priority.
   */

  const hasSchoolSupport =
    supports.some(
      (support) =>
        support.includes("school") ||
        support.includes("iep") ||
        support.includes("ese")
    );

  const hasTherapySupport =
    supports.some(
      (support) =>
        support.includes("therapy") ||
        support.includes("speech") ||
        support.includes("occupational") ||
        support.includes("aba")
    );

  /*
   * ==========================================================
   * UNSURE / CLARIFY PATH
   * ==========================================================
   */

  if (
    intent.type === "clarify"
  ) {
    const currentFocusText =
      `${journey.currentFocus.title} ${journey.currentFocus.explanation}`;

    const nextStepText =
      `${journey.nextStep.title} ${journey.nextStep.description}`;

    const allJourneyText =
      [
        currentFocusText,
        nextStepText,

        ...journey.priorities.map(
          (item) =>
            `${item.title} ${item.explanation}`
        ),

        ...journey.tasks.map(
          (task) =>
            `${task.title} ${task.description}`
        ),

        ...journey.resources.map(
          (resource) =>
            `${resource.title} ${resource.description}`
        ),
      ].join(" ");

    const hasUnsupportedDomain =
      containsUnsupportedDomain(
        allJourneyText,
        intent.forbiddenAssumptions
      );

    if (
      hasUnsupportedDomain
    ) {
      return {
        summary:
          "You are not sure which area needs attention yet. Start by identifying the concerns you want help understanding.",

        currentFocus: {
          title:
            "Clarify what concerns you most right now",

          explanation:
            "You do not need to figure everything out at once. Start by identifying what you have noticed so you can better understand what kind of help, if any, may be needed.",
        },

        priorities: [
          {
            id:
              "clarify-concern",

            title:
              "Identify the concerns you want to address",

            explanation:
              "Write down the behaviors, developmental concerns, or situations that prompted you to seek help.",

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
              "Keep the list simple. Note what you are seeing, when it happens, and how it affects your child or family.",

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
              "discuss-with-clinician",

            title:
              "Discuss your concerns with your child's primary clinician",

            description:
              "Bring your short list of concerns to the appointment and ask what, if anything, should be evaluated or monitored next.",

            priority:
              "Medium",

            estimatedTime:
              "15–30 minutes",

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

    return {
      ...journey,

      priorities:
        journey.priorities.slice(
          0,
          2
        ),

      tasks:
        journey.tasks.slice(
          0,
          3
        ),

      resources:
        journey.resources.slice(
          0,
          3
        ),
    };
  }

  /*
   * ==========================================================
   * FINANCIAL PATH
   * ==========================================================
   *
   * Financial means:
   *
   * "Help me find ways to pay for things."
   *
   * Insurance is context unless the parent specifically
   * identifies insurance as the problem.
   */

  if (
    isFinancial
  ) {
    let validatedJourney =
      validateFinancialJourney(
        journey,
        familyProfile
      );

    const filteredPriorities =
      validatedJourney.priorities.filter(
        (item) =>
          !containsUnsupportedDomain(
            `${item.title} ${item.explanation}`,
            intent.forbiddenAssumptions
          )
      );

    const filteredTasks =
      validatedJourney.tasks.filter(
        (task) =>
          !containsUnsupportedDomain(
            `${task.title} ${task.description}`,
            intent.forbiddenAssumptions
          )
      );

    const filteredResources =
      validatedJourney.resources.filter(
        (resource) =>
          !containsUnsupportedDomain(
            `${resource.title} ${resource.description}`,
            intent.forbiddenAssumptions
          )
      );

    validatedJourney = {
      ...validatedJourney,

      priorities:
        filteredPriorities,

      tasks:
        filteredTasks,

      resources:
        filteredResources,
    };

    /*
     * Make sure the current focus actually reflects
     * financial assistance.
     */

    const currentFocusText =
      normalizeText(
        `${validatedJourney.currentFocus.title} ${validatedJourney.currentFocus.explanation}`
      );

    const financialFocusTerms = [
      "financial",
      "assistance",
      "grant",
      "funding",
      "waiver",
      "program",
      "financial help",
      "cost",
    ];

    const hasFinancialFocus =
      financialFocusTerms.some(
        (term) =>
          currentFocusText.includes(
            term
          )
      );

    if (
      !hasFinancialFocus
    ) {
      validatedJourney = {
        ...validatedJourney,

        currentFocus: {
          title:
            "Find financial assistance that may help pay for care",

          explanation:
            "Your top priority is financial help. Focus first on legitimate grants, assistance programs, waivers, nonprofit resources, government programs, and other options that may help reduce your family's costs.",
        },

        nextStep: {
          title:
            "Start with financial assistance programs",

          description:
            "Look for verified programs that may help offset eligible costs. Insurance can be considered separately when it is part of the financial problem.",
        },
      };
    }

    /*
     * If the AI's next step is primarily an insurance action,
     * redirect it to financial assistance.
     */

    const financialNextStepText =
      normalizeText(
        `${validatedJourney.nextStep.title} ${validatedJourney.nextStep.description}`
      );

    const insuranceOnlyTerms = [
      "call your insurance",
      "call insurance",
      "insurance member services",
      "benefits verification",
      "benefit verification",
      "coverage review",
      "insurance appeal",
      "appeal the claim",
      "review your insurance",
      "check your insurance",
    ];

    const nextStepIsInsurance =
      insuranceOnlyTerms.some(
        (term) =>
          financialNextStepText.includes(
            term
          )
      );

    if (
      nextStepIsInsurance
    ) {
      validatedJourney = {
        ...validatedJourney,

        nextStep: {
          title:
            "Start with financial assistance programs",

          description:
            "Look for verified grants, government programs, waivers, nonprofit assistance, and other financial resources that may help reduce your family's costs.",
        },
      };
    }

    return validatedJourney;
  }

  /*
   * ==========================================================
   * THERAPY PATH
   * ==========================================================
   *
   * THIS IS THE FIX FOR OUR CURRENT TEST.
   *
   * Priority = Therapy
   *
   * Existing support = School Services
   *
   * The journey MUST remain therapy-focused.
   *
   * School can be used as context, but school-related actions
   * cannot become the next step unless the questionnaire
   * specifically supports that need.
   */

  if (
    isTherapy
  ) {
    let filteredPriorities =
      journey.priorities.filter(
        (item) => {
          const text =
            normalizeText(
              `${item.title} ${item.explanation}`
            );

          return (
            !containsAny(
              text,
              SCHOOL_RECOMMENDATION_TERMS
            ) &&
            !containsAny(
              text,
              FINANCIAL_RECOMMENDATION_TERMS
            )
          );
        }
      );

    let filteredTasks =
      journey.tasks.filter(
        (task) => {
          const text =
            normalizeText(
              `${task.title} ${task.description}`
            );

          return (
            !containsAny(
              text,
              SCHOOL_RECOMMENDATION_TERMS
            ) &&
            !containsAny(
              text,
              FINANCIAL_RECOMMENDATION_TERMS
            )
          );
        }
      );

    let filteredResources =
      journey.resources.filter(
        (resource) => {
          const text =
            normalizeText(
              `${resource.title} ${resource.description}`
            );

          return (
            !containsAny(
              text,
              SCHOOL_RECOMMENDATION_TERMS
            ) &&
            !containsAny(
              text,
              FINANCIAL_RECOMMENDATION_TERMS
            )
          );
        }
      );

    /*
     * --------------------------------------------------------
     * THERAPY CURRENT FOCUS
     * --------------------------------------------------------
     */

    const therapyFocusText =
      normalizeText(
        `${journey.currentFocus.title} ${journey.currentFocus.explanation}`
      );

    const therapyFocusTerms = [
      "therapy",
      "therapist",
      "provider",
      "treatment",
      "service",
      "developmental",
      "speech",
      "occupational",
      "behavior",
      "aba",
    ];

    const currentFocusIsTherapy =
      therapyFocusTerms.some(
        (term) =>
          therapyFocusText.includes(
            term
          )
      );

    /*
     * If the AI did not create a therapy-focused current
     * focus, replace it.
     */

    if (
      !currentFocusIsTherapy
    ) {
      journey = {
        ...journey,

        currentFocus: {
          title:
            hasTherapySupport
              ? "Identify the therapy gap and what your child needs next"
              : "Identify the therapy support that best fits your child's needs",

          explanation:
            hasTherapySupport
              ? "You selected therapy as your top priority and your child already receives support. Focus on what is working, what is missing, and what additional therapy support may be needed."
              : "You selected therapy as your top priority. Start by identifying the therapy support you are looking for and the specific need you want the provider to address.",
        },
      };
    }

    /*
     * --------------------------------------------------------
     * THERAPY NEXT STEP
     * --------------------------------------------------------
     */

    const nextStepText =
      normalizeText(
        `${journey.nextStep.title} ${journey.nextStep.description}`
      );

    const nextStepIsSchool =
      containsAny(
        nextStepText,
        SCHOOL_RECOMMENDATION_TERMS
      );

    const nextStepIsFinancial =
      containsAny(
        nextStepText,
        FINANCIAL_RECOMMENDATION_TERMS
      );

    const nextStepHasTherapyContext =
      THERAPY_TERMS.some(
        (term) =>
          nextStepText.includes(
            term
          )
      );

    /*
     * If the AI generated a school or financial next step,
     * replace it with a therapy-specific action.
     */

    if (
      nextStepIsSchool ||
      nextStepIsFinancial ||
      !nextStepHasTherapyContext
    ) {
      journey = {
        ...journey,

        currentFocus: {
          title:
            hasTherapySupport
              ? "Identify the therapy gap and what your child needs next"
              : "Identify the therapy support that best fits your child's needs",

          explanation:
            hasTherapySupport
              ? "You selected therapy as your top priority and your child already receives support. Focus on what is missing or what additional help is needed."
              : "You selected therapy as your top priority. Focus first on identifying the therapy support that matches the need you are trying to address.",
        },

        priorities:
          filteredPriorities.length > 0
            ? filteredPriorities
            : [
                {
                  id:
                    "therapy-focus",

                  title:
                    hasTherapySupport
                      ? "Identify the therapy gap"
                      : "Clarify the therapy need",

                  explanation:
                    hasTherapySupport
                      ? "Look at the support your child already receives and identify what additional therapy need remains."
                      : "Identify the specific therapy support or gap you want to address.",

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
                : "Write down the main therapy need you want to address so you can identify an appropriate provider or next step.",

            priority:
              "High",

            estimatedTime:
              "10–15 minutes",

            completed:
              false,

            resourceLink:
              "",
          },

          ...filteredTasks.slice(
            0,
            2
          ),
        ],

        resources:
          filteredResources.slice(
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
     * Return the therapy-focused journey.
     */

    return {
      ...journey,

      priorities:
        filteredPriorities,

      tasks:
        filteredTasks,

      resources:
        filteredResources,
    };
  }
   /*
   * ==========================================================
   * SCHOOL PATH
   * ==========================================================
   *
   * School is allowed to be the focus because the family
   * explicitly selected School.
   *
   * Financial and insurance recommendations should not replace
   * the school priority.
   */

   if (
    isSchool
  ) {
    const filteredPriorities =
      journey.priorities.filter(
        (item) => {
          const text =
            normalizeText(
              `${item.title} ${item.explanation}`
            );

          return (
            !containsAny(
              text,
              FINANCIAL_RECOMMENDATION_TERMS
            ) &&
            !containsAny(
              text,
              INSURANCE_RECOMMENDATION_TERMS
            )
          );
        }
      );

    const filteredTasks =
      journey.tasks.filter(
        (task) => {
          const text =
            normalizeText(
              `${task.title} ${task.description}`
            );

          return (
            !containsAny(
              text,
              FINANCIAL_RECOMMENDATION_TERMS
            ) &&
            !containsAny(
              text,
              INSURANCE_RECOMMENDATION_TERMS
            )
          );
        }
      );

    const filteredResources =
      journey.resources.filter(
        (resource) => {
          const text =
            normalizeText(
              `${resource.title} ${resource.description}`
            );

          return (
            !containsAny(
              text,
              FINANCIAL_RECOMMENDATION_TERMS
            ) &&
            !containsAny(
              text,
              INSURANCE_RECOMMENDATION_TERMS
            )
          );
        }
      );

    const nextStepText =
      normalizeText(
        `${journey.nextStep.title} ${journey.nextStep.description}`
      );

    const nextStepIsFinancial =
      containsAny(
        nextStepText,
        FINANCIAL_RECOMMENDATION_TERMS
      );

    const nextStepIsInsurance =
      containsAny(
        nextStepText,
        INSURANCE_RECOMMENDATION_TERMS
      );

    /*
     * If School is the priority but the AI makes Financial or
     * Insurance the next action, redirect it back to School.
     */

    if (
      nextStepIsFinancial ||
      nextStepIsInsurance
    ) {
      return {
        ...journey,

        priorities:
          filteredPriorities,

        tasks:
          filteredTasks,

        resources:
          filteredResources,

        nextStep: {
          title:
            "Identify the school support your child needs",

          description:
            "Start with the school-related concern you want help addressing and identify the appropriate school contact or support process.",
        },
      };
    }

    return {
      ...journey,

      priorities:
        filteredPriorities,

      tasks:
        filteredTasks,

      resources:
        filteredResources,
    };
  }

  /*
   * ==========================================================
   * INSURANCE PATH
   * ==========================================================
   *
   * Insurance becomes the focus only when the family actually
   * selects Insurance/Coverage as the priority.
   */

  if (
    isInsurance
  ) {
    return {
      ...journey,
    };
  }

  /*
   * ==========================================================
   * GENERAL FOCUSED PATH
   * ==========================================================
   *
   * This covers Evaluation, Communication, Behavior, and
   * other supported priorities.
   */

  if (
    intent.type === "focused"
  ) {
    const filteredPriorities =
      journey.priorities.filter(
        (item) =>
          !containsUnsupportedDomain(
            `${item.title} ${item.explanation}`,
            intent.forbiddenAssumptions
          )
      );

    const filteredTasks =
      journey.tasks.filter(
        (task) =>
          !containsUnsupportedDomain(
            `${task.title} ${task.description}`,
            intent.forbiddenAssumptions
          )
      );

    const filteredResources =
      journey.resources.filter(
        (resource) =>
          !containsUnsupportedDomain(
            `${resource.title} ${resource.description}`,
            intent.forbiddenAssumptions
          )
      );

    /*
     * Make sure the AI's current focus does not contradict
     * the family's stated priority.
     */

    const currentFocusText =
      `${journey.currentFocus.title} ${journey.currentFocus.explanation}`;

    if (
      containsUnsupportedDomain(
        currentFocusText,
        intent.forbiddenAssumptions
      )
    ) {
      console.warn(
        "AI current focus did not match family intent:",
        {
          priority:
            familyProfile.priority,

          expected:
            intent.focus,

          actual:
            journey.currentFocus.title,
        }
      );

      return {
        ...journey,

        currentFocus: {
          title:
            `Focus on ${intent.focus.toLowerCase()}`,

          explanation:
            `You identified ${familyProfile.priority} as the area where you need the most help right now, so the journey is focused there first.`,
        },

        priorities:
          filteredPriorities,

        tasks:
          filteredTasks,

        resources:
          filteredResources,
      };
    }

    return {
      ...journey,

      priorities:
        filteredPriorities,

      tasks:
        filteredTasks,

      resources:
        filteredResources,
    };
  }

  /*
   * ==========================================================
   * FALLBACK
   * ==========================================================
   */

  return journey;
}

/*
 * ============================================================
 * SYSTEM PROMPT
 * ============================================================
 */

function buildSystemPrompt() {
  return `
You are the personalization engine for Autism Journey Navigator.

Your job is NOT to give a generic autism checklist.

Your job is to understand what THIS family told us, determine
what matters most RIGHT NOW, and give them a small number of
useful actions that help them move forward.

You are not a replacement for a doctor, therapist, educator,
attorney, insurance professional, or other qualified
professional.

============================================================
CORE PRODUCT PRINCIPLE
============================================================

THE FAMILY'S CURRENT NEED DRIVES THE JOURNEY.

Solve today's stated need before introducing tomorrow's needs.

Do not predict everything this family may eventually need.

Do not build a generic autism journey.

Do not give the family a list of everything that could
possibly be relevant to autism.

Build the journey for the situation the family described TODAY.

============================================================
EVIDENCE HIERARCHY
============================================================

${EVIDENCE_HIERARCHY}

Before adding ANY recommendation, ask:

"What evidence in this family's profile supports this?"

If you cannot identify the evidence, do not include the
recommendation.

============================================================
INTENT VS CONTEXT
============================================================

INTENT drives the journey.

Context helps personalize the journey.

INTENT includes:
- family's stated priority
- concerns described in notes
- barriers the family identified
- problems the family is trying to solve

CONTEXT includes:
- child's age
- state
- journey stage
- existing supports
- insurance

Context must NOT override explicit family intent.

Examples:

A child being six years old does NOT automatically create a
school need.

Private insurance does NOT automatically mean there is an
insurance problem.

No current supports does NOT automatically mean the family
needs every available therapy.

Existing school services do NOT automatically mean the next
step should involve the school.

============================================================
FINANCIAL PRIORITY
============================================================

When the family selects FINANCIAL, interpret that as:

"I am looking for help paying for things."

The primary goal is to find ways the family may be able to
reduce or offset costs.

Prioritize:

1. Financial assistance
2. Grants
3. Nonprofit assistance
4. Government assistance
5. State programs
6. Waivers
7. Financial aid
8. Programs that help pay for eligible services
9. Other legitimate cost-offsetting opportunities

Insurance is NOT automatically the first recommendation.

Private insurance is context.

Only make insurance the primary financial recommendation when
the family explicitly identifies insurance or coverage as part
of the problem.

Example:

FINANCIAL + PRIVATE INSURANCE

Does NOT automatically mean:

"Call your insurance company."

Instead think:

"This family wants financial help. What legitimate assistance
options may reduce what they have to pay?"

If the profile says:

"Insurance denied therapy"

or:

"We are paying high therapy copays"

then insurance becomes directly relevant.

============================================================
SCHOOL PRIORITY
============================================================

When the family selects SCHOOL, school becomes the focus.

However, do not automatically assume:

- IEP
- ESE
- evaluation
- school meeting
- school referral

unless the questionnaire supports that specific action.

School priority means:

"Help me navigate the school-related need I identified."

It does NOT automatically mean:

"This child needs an IEP."

============================================================
THERAPY PRIORITY
============================================================

When the family selects THERAPY, therapy is the primary focus.

Existing supports should help identify gaps.

Example:

Priority:
Therapy

Existing support:
School Services

Correct reasoning:

"The family wants therapy help and already has school support.
What therapy need or gap remains?"

Incorrect reasoning:

"The child has school services, so request school documents."

School can remain context.

It cannot replace the therapy priority.

============================================================
EXISTING SUPPORTS
============================================================

Existing supports are extremely important.

They tell you what the family already has.

Do NOT recommend obtaining the exact same support again.

Instead ask:

"What is missing?"

"What is the barrier?"

"What is the family trying to accomplish next?"

Example:

Existing support:
School Services

Priority:
Therapy

Useful:

"Identify what therapy support is still needed."

Not useful:

"Request school documents."

Unless the family explicitly says school documentation is a
problem.

============================================================
UNSURE
============================================================

If the family says:

- unsure
- not sure
- don't know
- general concern
- no specific priority

do NOT choose a specific service pathway.

Do not say:

"school, therapy, specialist evaluation, or monitoring."

Instead:

1. Help organize the concern.
2. Give one clarification action.
3. Help the family determine what they need before selecting
   a specific pathway.

============================================================
VALUE TEST
============================================================

Every recommendation must answer YES to BOTH questions:

1. Is this directly relevant to THIS family?

2. Will this help the family make meaningful progress?

If either answer is NO:

DO NOT INCLUDE IT.

============================================================
NO GENERIC RESOURCE DUMP
============================================================

Do not include resources merely because they are commonly
useful.

A resource must directly support the family's current journey.

For financial journeys, prioritize verified financial
assistance resources.

For school journeys, prioritize school resources only when
school is the stated priority.

For therapy journeys, prioritize therapy-related resources
only when therapy is the stated priority.

Never invent:

- organizations
- programs
- URLs
- phone numbers
- eligibility requirements
- benefits
- insurance coverage
- funding rules

If you do not have a verified URL, use an empty string.

============================================================
CURRENT FOCUS
============================================================

currentFocus answers:

"What matters most for this family right now?"

Make it specific to THIS family.

Avoid:

"Explore available resources."

Prefer:

"Find financial assistance that may help pay for care."

"Understand the school support available for your child."

"Identify the therapy support your child needs."

============================================================
NEXT STEP
============================================================

nextStep is ONE action.

It must directly relate to the family's selected priority.

Avoid:

"Explore options."

"Look into resources."

"Consider services."

Instead say exactly what the parent should do next.

============================================================
TASKS
============================================================

Tasks should be:

- practical
- concise
- specific
- achievable

Every task must begin with:

completed = false

============================================================
RESOURCES
============================================================

Only include resources that directly support the family's
current journey.

Never invent:

- organizations
- programs
- URLs
- phone numbers
- eligibility requirements
- insurance coverage
- benefits

If you do not have a verified URL, use an empty string.

============================================================
NO FUTURE-PATHWAY DUMPING
============================================================

Never write:

"Possible next steps include school, therapy, evaluation,
specialists, or monitoring."

That is not personalization.

If the family has not identified those needs, do not introduce
them as a list.

============================================================
FINAL QUALITY CHECK
============================================================

Before returning the structured response, silently ask:

1. What did this family explicitly tell me?

2. What problem are they actually trying to solve?

3. What services/supports do they already have?

4. What is the most useful action RIGHT NOW?

5. What evidence supports each recommendation?

6. Did I introduce something because it is common rather than
because this family needs it?

7. Did I introduce a domain the family never mentioned?

8. Did age influence me too much?

9. Did I mention school simply because the child is
school-aged?

10. Did I recommend something the family already receives?

11. If Financial was selected, did I actually focus on MONEY
and ASSISTANCE?

12. Did I make insurance the financial solution simply because
the family has private insurance?

13. If Therapy was selected, did I keep the next action
therapy-focused?

14. Did existing school services accidentally become the
recommended action?

15. Did I assume a benefit, program, grant, employer resource,
or financial mechanism without evidence?

16. Can the parent understand the main recommendation quickly?

17. Does this journey provide meaningful value rather than
simply listing resources?

If a recommendation fails this test, remove it.

Return ONLY the requested structured JSON response.
`;
}
/*
 * ============================================================
 * RESPONSE TEXT EXTRACTION
 * ============================================================
 */

function extractResponseText(
  response: any
): string | null {
  /*
   * Preferred Responses API output.
   */

  if (
    typeof response?.output_text ===
    "string"
  ) {
    return response.output_text;
  }

  /*
   * Fallback:
   * Look through the response output for output_text.
   */

  const output =
    response?.output;

  if (
    !Array.isArray(output)
  ) {
    return null;
  }

  for (
    const item of output
  ) {
    if (
      item?.type === "message" &&
      Array.isArray(item.content)
    ) {
      for (
        const content of item.content
      ) {
        if (
          content?.type ===
            "output_text" &&
          typeof content.text ===
            "string"
        ) {
          return content.text;
        }
      }
    }
  }

  return null;
}

/*
 * ============================================================
 * GENERATE PERSONALIZED JOURNEY
 * ============================================================
 */

async function generateJourney(
  familyProfile: FamilyProfile
): Promise<PersonalizedJourney> {
  /*
   * Determine the family's intent BEFORE asking the AI to
   * generate the journey.
   *
   * This gives the AI explicit direction instead of making it
   * guess what the selected priority means.
   */

  const intent =
    getFamilyIntent(
      familyProfile.priority
    );

  /*
   * ----------------------------------------------------------
   * FAMILY PROFILE SENT TO AI
   * ----------------------------------------------------------
   */

  const profileForAI = {
    childAge:
      familyProfile.childAge,

    state:
      familyProfile.state,

    journeyStage:
      familyProfile.journeyStage,

    supports:
      familyProfile.supports,

    priority:
      familyProfile.priority,

    insurance:
      familyProfile.insurance,

    notes:
      familyProfile.notes,

    /*
     * Explicit engine direction.
     *
     * This is important because the AI should not have to infer
     * what "Financial" or "Therapy" means.
     */

    engineDirection: {
      familyIntent:
        intent.statement,

      intendedFocus:
        intent.focus,

      forbiddenAssumptions:
        intent.forbiddenAssumptions,

      evidenceHierarchy:
        EVIDENCE_HIERARCHY,
    },
  };

  /*
   * ----------------------------------------------------------
   * USER PROMPT
   * ----------------------------------------------------------
   */

  const userPrompt = `
Create a personalized journey for this family.

The family's stated priority is the strongest signal.

Use the family's other answers as context.

DO NOT turn context into an assumed need.

DO NOT build a generic autism checklist.

DO NOT predict future needs.

DO NOT introduce school, therapy, financial assistance,
insurance, evaluation, or another service simply because it is
commonly useful.

Every recommendation must be supported by something in the
family profile.

============================================================
FAMILY INTENT
============================================================

The family selected:

${familyProfile.priority}

Interpret that selection using the engine direction provided
below.

============================================================
ENGINE DIRECTION
============================================================

${JSON.stringify(
  {
    familyIntent:
      intent.statement,

    intendedFocus:
      intent.focus,

    forbiddenAssumptions:
      intent.forbiddenAssumptions,
  },
  null,
  2
)}

============================================================
SPECIAL FINANCIAL RULE
============================================================

If the priority is FINANCIAL, understand the parent's intent as:

"I am looking for help paying for things."

Focus FIRST on:

- grants
- financial assistance
- nonprofit assistance
- government programs
- state assistance
- waivers
- funding programs
- cost-offsetting resources

DO NOT make private insurance the primary answer merely because
the family has private insurance.

Insurance can be included when the profile gives evidence that
insurance is part of the financial problem.

============================================================
SPECIAL THERAPY RULE
============================================================

If the priority is THERAPY:

THERAPY MUST remain the focus.

Existing school services are context.

Do NOT turn:

"Therapy + School Services"

into:

"Request school documents."

Instead ask:

"What therapy need or gap remains?"

If the family already receives therapy, identify what is missing
or what additional support may be needed.

If the family does not receive therapy, help identify the
therapy support they are looking for.

============================================================
SPECIAL SCHOOL RULE
============================================================

If the priority is SCHOOL:

School may be the focus.

However, do not automatically assume:

- IEP
- ESE
- evaluation
- school meeting
- school referral

unless the questionnaire supports that specific action.

============================================================
FAMILY PROFILE
============================================================

${JSON.stringify(
  profileForAI,
  null,
  2
)}

============================================================
JOURNEY REQUIREMENTS
============================================================

Determine:

1. The family's current focus.

2. The most meaningful supporting priorities.

3. Practical next-step tasks.

4. Relevant resources.

5. ONE clearest next step.

The journey should feel like:

"You listened to me and showed me what I should do next."

It should NOT feel like:

"Here is everything that could possibly apply to my child."

============================================================
CONCISENESS
============================================================

Keep the quick-view content concise.

The parent should be able to understand the main point in a
few sentences.

Do not create a giant list.

The application may later provide a more detailed guide when
the parent chooses to open it.

============================================================
RESOURCE RULE
============================================================

Only include resources that directly support the family's
current need.

Never invent:

- organizations
- programs
- grants
- URLs
- phone numbers
- eligibility requirements
- benefits
- insurance coverage
- funding rules

If you do not have a verified URL, return an empty string.

============================================================
FINAL INTERNAL CHECK
============================================================

Before returning the journey, silently verify:

- Did I listen to the family's stated priority?
- Did I use existing supports as context?
- Did I avoid turning context into a new priority?
- Did I avoid generic autism recommendations?
- Did I avoid assuming school because of age?
- Did I avoid assuming therapy because the child has autism?
- If Financial was selected, did I focus on assistance?
- If Therapy was selected, did I keep the next action therapy-focused?
- Did I accidentally turn School Services into a school action?
- Did I invent a resource or eligibility requirement?
- Is the next step something the parent can actually do?

Return ONLY the structured JSON response.
`;

  /*
   * ----------------------------------------------------------
   * OPENAI API KEY
   * ----------------------------------------------------------
   */

  const apiKey =
    process.env.OPENAI_API_KEY;

  if (
    !apiKey
  ) {
    throw new Error(
      "OpenAI API key is not configured."
    );
  }

  /*
   * ----------------------------------------------------------
   * CALL OPENAI RESPONSES API
   * ----------------------------------------------------------
   */

  const openAIResponse =
    await fetch(
      OPENAI_API_URL,
      {
        method:
          "POST",

        headers: {
          "Content-Type":
            "application/json",

          Authorization:
            `Bearer ${apiKey}`,
        },

        body:
          JSON.stringify({
            model:
              OPENAI_MODEL,

            store:
              false,

            input: [
              {
                role:
                  "system",

                content:
                  buildSystemPrompt(),
              },

              {
                role:
                  "user",

                content:
                  userPrompt,
              },
            ],

            /*
             * Force the model to return the structure our
             * application expects.
             */

            text: {
              format: {
                type:
                  "json_schema",

                name:
                  "personalized_autism_journey",

                strict:
                  true,

                schema:
                  journeySchema,
              },
            },
          }),
      }
    );

  /*
   * ----------------------------------------------------------
   * API ERROR
   * ----------------------------------------------------------
   */

  if (
    !openAIResponse.ok
  ) {
    const errorText =
      await openAIResponse.text();

    console.error(
      "OpenAI API error:",
      errorText
    );

    throw new Error(
      "Unable to generate the personalized journey."
    );
  }

  /*
   * ----------------------------------------------------------
   * PARSE RESPONSE
   * ----------------------------------------------------------
   */

  const response =
    await openAIResponse.json();

  const responseText =
    extractResponseText(
      response
    );

  if (
    !responseText
  ) {
    throw new Error(
      "OpenAI returned an empty response."
    );
  }

  /*
   * ----------------------------------------------------------
   * PARSE JOURNEY JSON
   * ----------------------------------------------------------
   */

  let journey:
    PersonalizedJourney;

  try {
    journey =
      JSON.parse(
        responseText
      );
  } catch (
    error
  ) {
    console.error(
      "Unable to parse OpenAI response:",
      error
    );

    console.error(
      "Raw response:",
      responseText
    );

    throw new Error(
      "The AI returned an invalid journey format."
    );
  }

  /*
   * ----------------------------------------------------------
   * BASIC SAFETY CHECK
   * ----------------------------------------------------------
   *
   * Make sure the AI returned the core journey properties
   * before validation runs.
   */

  if (
    !journey ||
    !journey.currentFocus ||
    !journey.nextStep ||
    !Array.isArray(
      journey.priorities
    ) ||
    !Array.isArray(
      journey.tasks
    ) ||
    !Array.isArray(
      journey.resources
    )
  ) {
    throw new Error(
      "The AI returned an incomplete journey."
    );
  }

  /*
   * Ensure every generated task begins incomplete.
   *
   * Completion is controlled by the application, not the AI.
   */

  journey.tasks =
    journey.tasks.map(
      (task) => ({
        ...task,

        completed:
          false,
      })
    );

  return journey;
}
/*
 * ============================================================
 * POST /api/journey/generate
 * ============================================================
 *
 * This is the endpoint your website calls when the parent
 * submits the questionnaire and asks the AI to generate the
 * personalized journey.
 */

export async function POST(
  request: Request
) {
  try {
    /*
     * --------------------------------------------------------
     * VERIFY API KEY
     * --------------------------------------------------------
     */

    const apiKey =
      process.env.OPENAI_API_KEY;

    if (
      !apiKey
    ) {
      return NextResponse.json(
        {
          error:
            "OpenAI API key is not configured.",
        },
        {
          status:
            500,
        }
      );
    }

    /*
     * --------------------------------------------------------
     * READ REQUEST
     * --------------------------------------------------------
     */

    const body =
      await request.json();

    const familyProfile =
      body?.familyProfile as
        | FamilyProfile
        | undefined;

    /*
     * --------------------------------------------------------
     * VALIDATE FAMILY PROFILE
     * --------------------------------------------------------
     */

    if (
      !familyProfile
    ) {
      return NextResponse.json(
        {
          error:
            "Family profile is required.",
        },
        {
          status:
            400,
        }
      );
    }

    /*
     * These are the minimum pieces of information required to
     * generate a meaningful personalized journey.
     */

    if (
      !familyProfile.childAge ||
      !familyProfile.state ||
      !familyProfile.journeyStage
    ) {
      return NextResponse.json(
        {
          error:
            "The family profile is incomplete.",
        },
        {
          status:
            400,
        }
      );
    }

    /*
     * --------------------------------------------------------
     * LOG REQUEST
     * --------------------------------------------------------
     *
     * Useful while we are validating the engine.
     *
     * Do not log sensitive information unnecessarily.
     */

    console.log(
      "Generating personalized journey:",
      {
        childAge:
          familyProfile.childAge,

        state:
          familyProfile.state,

        journeyStage:
          familyProfile.journeyStage,

        supports:
          familyProfile.supports,

        priority:
          familyProfile.priority,

        insurance:
          familyProfile.insurance,
      }
    );

    /*
     * --------------------------------------------------------
     * GENERATE AI JOURNEY
     * --------------------------------------------------------
     */

    const journey =
      await generateJourney(
        familyProfile
      );

    /*
     * --------------------------------------------------------
     * VALIDATE AI JOURNEY
     * --------------------------------------------------------
     *
     * This is an important part of our architecture.
     *
     * The AI generates the journey.
     *
     * The application then checks the journey against the
     * family's actual stated intent.
     *
     * This prevents the AI from drifting into generic
     * recommendations.
     */

    const validatedJourney =
      validateJourney(
        journey,
        familyProfile
      );

    /*
     * --------------------------------------------------------
     * LOG VALIDATED RESULT
     * --------------------------------------------------------
     *
     * This helps us test the engine while we are building it.
     */

    console.log(
      "Validated personalized journey:",
      {
        statedPriority:
          familyProfile.priority,

        currentFocus:
          validatedJourney
            .currentFocus
            ?.title,

        nextStep:
          validatedJourney
            .nextStep
            ?.title,

        priorities:
          validatedJourney
            .priorities
            ?.map(
              (item) =>
                item.title
            ),

        tasks:
          validatedJourney
            .tasks
            ?.map(
              (task) =>
                task.title
            ),

        resources:
          validatedJourney
            .resources
            ?.map(
              (resource) =>
                resource.title
            ),
      }
    );

    /*
     * --------------------------------------------------------
     * RETURN JOURNEY TO WEBSITE
     * --------------------------------------------------------
     */

    return NextResponse.json(
      {
        journey:
          validatedJourney,

        metadata: {
          /*
           * Increment this whenever we make a meaningful
           * engine-generation change.
           */

          version:
            5,

          generatedAt:
            Date.now(),

          reason:
            "initial",
        },
      }
    );
  } catch (
    error
  ) {
    /*
     * --------------------------------------------------------
     * ERROR HANDLING
     * --------------------------------------------------------
     */

    console.error(
      "Journey generation error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Something went wrong while creating the personalized journey.",
      },
      {
        status:
          500,
      }
    );
  }
} 