/*
 * ============================================================
 * FAMILY INTENT ENGINE
 * ============================================================
 *
 * The family's selected priority is the SOURCE OF TRUTH.
 *
 * Context such as:
 *
 * - age
 * - state
 * - insurance
 * - journey stage
 * - existing supports
 *
 * may personalize the journey, but MUST NOT replace the
 * family's stated priority.
 *
 * IMPORTANT:
 *
 * This engine intentionally uses the priority IDs from
 * data/priorities.ts as the authoritative intent values.
 *
 * Example:
 *
 *   "financial" -> financial assistance
 *   "insurance" -> insurance and coverage
 *
 * These are separate intents.
 */

/*
 * ============================================================
 * TYPES
 * ============================================================
 */

export type FamilyIntent = {
  type: "focused" | "clarify";

  statement: string;

  focus: string;

  forbiddenAssumptions: string[];
};


/*
 * ============================================================
 * NORMALIZE PRIORITY
 * ============================================================
 *
 * We normalize formatting only.
 *
 * We do NOT infer a different intent from the text.
 */

function normalizePriority(
  priority: unknown
): string {
  return String(priority || "")
    .toLowerCase()
    .trim()
    .replace(/[-_]/g, "");
}


/*
 * ============================================================
 * GET FAMILY INTENT
 * ============================================================
 *
 * The value passed here should normally be one of the IDs
 * from data/priorities.ts:
 *
 * evaluation
 * therapy
 * school
 * financial
 * insurance
 * education
 * community
 * unsure
 *
 * The exact ID determines the intent.
 */

export function getFamilyIntent(
  priority: string
): FamilyIntent {

  const normalized =
    normalizePriority(priority);


  /*
   * ==========================================================
   * EVALUATION
   * ==========================================================
   */

  if (
    normalized === "evaluation"
  ) {
    return {
      type: "focused",

      statement:
        "The family's current priority is getting an autism evaluation or understanding the diagnostic process.",

      focus:
        "Evaluation and diagnostic pathway actions.",

      forbiddenAssumptions: [
        "school",
        "IEP",
        "ESE",
        "therapy expansion",
        "financial assistance",
        "insurance problem",
      ],
    };
  }


  /*
   * ==========================================================
   * THERAPY
   * ==========================================================
   */

  if (
    normalized === "therapy"
  ) {
    return {
      type: "focused",

      statement:
        "The family's current priority is finding or improving therapy support.",

      focus:
        "Therapy access, provider coordination, service gaps, and therapy-related actions.",

      forbiddenAssumptions: [
        "school",
        "IEP",
        "ESE",
        "autism evaluation",
        "diagnostic testing",
      ],
    };
  }


  /*
   * ==========================================================
   * SCHOOL
   * ==========================================================
   */

  if (
    normalized === "school"
  ) {
    return {
      type: "focused",

      statement:
        "The family's current priority is school and educational support.",

      focus:
        "School services, IEP/504 support, educational planning, and communication with the school.",

      forbiddenAssumptions: [
        "therapy expansion",
        "autism evaluation",
        "diagnostic testing",
        "financial assistance",
        "insurance problem",
      ],
    };
  }


  /*
   * ==========================================================
   * FINANCIAL
   * ==========================================================
   *
   * IMPORTANT:
   *
   * Financial is NOT the same as insurance.
   *
   * The family is asking for help paying for care,
   * reducing out-of-pocket costs, finding grants,
   * assistance programs, payment assistance, etc.
   *
   * Insurance status may provide useful context, but it
   * cannot change this intent into an insurance journey.
   */

  if (
    normalized === "financial"
  ) {
    return {
      type: "focused",

      statement:
        "The family's current priority is paying for care and reducing the financial burden of autism-related services and expenses.",

      focus:
        "Financial assistance, grants, cost reduction, payment assistance, and access-related financial actions.",

      forbiddenAssumptions: [
        "insurance enrollment is the family's primary goal",
        "insurance coverage is the family's primary concern",
        "insurance denial is the family's primary concern",
        "school",
        "IEP",
        "ESE",
        "therapy expansion",
        "specialist evaluation",
      ],
    };
  }


  /*
   * ==========================================================
   * INSURANCE
   * ==========================================================
   *
   * IMPORTANT:
   *
   * Insurance is NOT the same as financial assistance.
   *
   * The family is asking about:
   *
   * - getting coverage
   * - understanding benefits
   * - coverage limitations
   * - denials
   * - prior authorization
   * - claims
   * - network issues
   *
   * The family's insurance status is context that helps
   * determine the appropriate insurance pathway.
   */

  if (
    normalized === "insurance"
  ) {
    return {
      type: "focused",

      statement:
        "The family's current priority is obtaining, understanding, or navigating health insurance coverage.",

      focus:
        "Insurance coverage, benefits, authorization, claims, denials, network access, and coverage-related actions.",

      forbiddenAssumptions: [
        "financial assistance is the family's primary goal",
        "grants are the family's primary goal",
        "school",
        "IEP",
        "ESE",
        "therapy expansion",
        "autism evaluation",
      ],
    };
  }


  /*
   * ==========================================================
   * EDUCATION
   * ==========================================================
   */

  if (
    normalized === "education"
  ) {
    return {
      type: "focused",

      statement:
        "The family's current priority is learning more about autism and understanding how to support their child.",

      focus:
        "Reliable autism education, understanding, and practical family information.",

      forbiddenAssumptions: [
        "insurance problem",
        "financial assistance",
        "school dispute",
        "therapy expansion",
        "autism evaluation",
      ],
    };
  }


  /*
   * ==========================================================
   * COMMUNITY
   * ==========================================================
   */

  if (
    normalized === "community"
  ) {
    return {
      type: "focused",

      statement:
        "The family's current priority is family and community support.",

      focus:
        "Support groups, community resources, family connections, and local support networks.",

      forbiddenAssumptions: [
        "insurance problem",
        "financial assistance",
        "school dispute",
        "therapy expansion",
        "autism evaluation",
      ],
    };
  }


  /*
   * ==========================================================
   * UNSURE
   * ==========================================================
   *
   * We do NOT guess.
   */

  if (
    normalized === "unsure" ||
    normalized === ""
  ) {
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
      ],
    };
  }


  /*
   * ==========================================================
   * UNKNOWN PRIORITY
   * ==========================================================
   *
   * Fail safely rather than guessing.
   */

  return {
    type: "clarify",

    statement:
      "The family's selected priority could not be identified with enough confidence to recommend a specific pathway.",

    focus:
      "Clarifying the family's priority before recommending a specific service or pathway.",

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
    ],
  };
}