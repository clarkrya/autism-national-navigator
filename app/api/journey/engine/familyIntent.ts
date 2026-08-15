/*
 * ============================================================
 * FAMILY INTENT ENGINE
 * ============================================================
 *
 * This is one of the most important pieces of the
 * personalization engine.
 *
 * The family's stated priority is the SOURCE OF TRUTH.
 *
 * Context such as:
 *
 * - age
 * - state
 * - insurance
 * - journey stage
 * - existing supports
 *
 * can personalize the journey, but they must not replace
 * the family's stated need.
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
   */
  
  function normalizePriority(
    priority: unknown
  ): string {
    return String(priority || "")
      .toLowerCase()
      .replace(/[-_]/g, " ")
      .trim();
  }
  
  
  /*
   * ============================================================
   * GET FAMILY INTENT
   * ============================================================
   */
  
  export function getFamilyIntent(
    priority: string
  ): FamilyIntent {
    const normalized =
      normalizePriority(priority);
  
  
    /*
     * ----------------------------------------------------------
     * FINANCIAL
     * ----------------------------------------------------------
     *
     * Financial means the family is looking for ways to
     * obtain money, assistance, grants, funding, waivers,
     * or other legitimate ways to reduce the cost of care.
     *
     * Insurance is NOT automatically the answer.
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
          "The family's current need is financial support and/or reducing the financial burden of care.",
  
        focus:
          "Financial and access-related actions.",
  
        forbiddenAssumptions: [
          "school",
          "IEP",
          "ESE",
          "classroom support",
          "therapy expansion",
          "specialist evaluation",
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
     * UNSURE / NO CLEAR PRIORITY
     * ----------------------------------------------------------
     *
     * This is intentionally different.
     *
     * We do NOT guess what the family needs.
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
      ],
    };
  }