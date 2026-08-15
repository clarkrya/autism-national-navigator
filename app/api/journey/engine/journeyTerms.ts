/*
 * ============================================================
 * JOURNEY TERMS
 * ============================================================
 *
 * Centralized vocabulary used by the personalization engine.
 *
 * Keeping these terms in one file makes the engine easier to
 * maintain and prevents the same rules from being duplicated
 * throughout route.ts.
 *
 * IMPORTANT:
 *
 * These terms are primarily used to identify whether the AI
 * has introduced an unrelated domain into the family's journey.
 *
 * A word appearing in content does NOT automatically mean the
 * content is wrong.
 *
 * The validation layer determines whether that domain has
 * become the family's actual recommended action.
 */


/*
 * ============================================================
 * SCHOOL
 * ============================================================
 */

export const schoolTerms = [
    "school documents",
    "request school documents",
    "contact the school",
    "contact school staff",
    "school staff",
    "school meeting",
    "school referral",
    "school evaluation",
    "school based evaluation",
    "school-based evaluation",
    "iep",
    "ese",
    "individualized education",
    "educational evaluation",
    "education evaluation",
    "educational support",
    "classroom support",
  ] as const;
  
  
  /*
   * ============================================================
   * THERAPY
   * ============================================================
   */
  
  export const therapyTerms = [
    "therapy",
    "therapist",
    "therapy provider",
    "therapy service",
    "therapy services",
    "speech therapy",
    "occupational therapy",
    "aba",
    "behavior therapy",
    "developmental therapy",
  ] as const;
  
  
  /*
   * ============================================================
   * FINANCIAL
   * ============================================================
   *
   * Financial is intentionally broader than "insurance."
   *
   * If a family selects Financial, the engine should think about:
   *
   * - grants
   * - assistance
   * - funding
   * - waivers
   * - nonprofit help
   * - government programs
   * - ways to reduce the family's financial burden
   *
   * Insurance may sometimes be relevant context, but it should
   * not replace Financial as the family's stated priority.
   */
  
  export const financialTerms = [
    "financial assistance",
    "financial aid",
    "grant",
    "grants",
    "funding",
    "waiver",
    "nonprofit assistance",
    "government assistance",
    "assistance program",
    "help paying",
    "help pay",
    "reduce costs",
    "reduce cost",
    "out of pocket",
    "out-of-pocket",
    "financial support",
    "cost assistance",
    "payment assistance",
    "care assistance",
  ] as const;
  
  
  /*
   * ============================================================
   * INSURANCE
   * ============================================================
   *
   * These terms represent insurance-navigation actions.
   *
   * They should be protected separately from Financial because:
   *
   * Financial = "Help me find money / assistance to pay."
   *
   * Insurance = "Help me understand or navigate my insurance."
   */
  
  export const insuranceTerms = [
    "insurance",
    "insurance benefits",
    "insurance coverage",
    "coverage review",
    "benefits verification",
    "benefit verification",
    "prior authorization",
    "network status",
    "in network",
    "out of network",
    "deductible",
    "copay",
    "co-pay",
    "coinsurance",
    "insurance appeal",
    "appeal the claim",
    "call your insurance",
    "call insurance",
    "insurance member services",
    "insurance company",
    "insurance plan",
  ] as const;
  
  
  /*
   * ============================================================
   * EVALUATION
   * ============================================================
   */
  
  export const evaluationTerms = [
    "evaluation",
    "assessment",
    "diagnosis",
    "diagnostic evaluation",
    "autism evaluation",
  ] as const;
  
  
  /*
   * ============================================================
   * COMMUNICATION
   * ============================================================
   */
  
  export const communicationTerms = [
    "communication",
    "speech",
    "speech-language",
    "speech language",
    "language support",
    "communication support",
  ] as const;
  
  
  /*
   * ============================================================
   * BEHAVIOR
   * ============================================================
   */
  
  export const behaviorTerms = [
    "behavior",
    "behavioral",
    "behavior support",
    "behavioral support",
  ] as const;
  
  
  /*
   * ============================================================
   * ALL MAJOR DOMAIN TERMS
   * ============================================================
   *
   * Useful when we need to inspect content across the entire
   * journey for unrelated recommendations.
   */
  
  export const allJourneyDomainTerms = [
    ...schoolTerms,
    ...therapyTerms,
    ...financialTerms,
    ...insuranceTerms,
    ...evaluationTerms,
    ...communicationTerms,
    ...behaviorTerms,
  ] as const;
  
  
  /*
   * ============================================================
   * NORMALIZE TEXT
   * ============================================================
   *
   * Keeps matching consistent.
   */
  
  export function normalizeJourneyText(
    value: unknown
  ): string {
    return String(value || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }
  
  
  /*
   * ============================================================
   * CONTAINS ANY TERM
   * ============================================================
   *
   * Returns true when the supplied text contains at least one
   * term from the supplied list.
   */
  
  export function textContainsAnyTerm(
    text: unknown,
    terms: readonly string[]
  ): boolean {
    const normalized =
      normalizeJourneyText(text);
  
    return terms.some(
      (term) =>
        normalized.includes(
          normalizeJourneyText(term)
        )
    );
  }
  
  
  /*
   * ============================================================
   * CONTAINS UNSUPPORTED DOMAIN
   * ============================================================
   *
   * Used primarily for the UNSURE path.
   *
   * If the family has not identified a specific need, the engine
   * should not invent one.
   */
  
  export function containsUnsupportedDomain(
    text: unknown,
    forbiddenTerms: readonly string[]
  ): boolean {
    return textContainsAnyTerm(
      text,
      forbiddenTerms
    );
  }
  
  
  /*
   * ============================================================
   * GET DOMAIN TERMS
   * ============================================================
   *
   * Allows the validation engine to retrieve the appropriate
   * vocabulary for a family's stated priority.
   */
  
  export function getDomainTerms(
    priority: unknown
  ): readonly string[] {
    const normalized =
      normalizeJourneyText(priority);
  
  
    /*
     * Financial
     */
  
    if (
      normalized.includes("financial") ||
      normalized.includes("money") ||
      normalized.includes("cost") ||
      normalized.includes("funding")
    ) {
      return financialTerms;
    }
  
  
    /*
     * School
     */
  
    if (
      normalized.includes("school") ||
      normalized.includes("education") ||
      normalized.includes("iep") ||
      normalized.includes("ese")
    ) {
      return schoolTerms;
    }
  
  
    /*
     * Therapy
     */
  
    if (
      normalized.includes("therapy") ||
      normalized.includes("therap")
    ) {
      return therapyTerms;
    }
  
  
    /*
     * Insurance
     */
  
    if (
      normalized.includes("insurance") ||
      normalized.includes("coverage")
    ) {
      return insuranceTerms;
    }
  
  
    /*
     * Evaluation
     */
  
    if (
      normalized.includes("evaluation") ||
      normalized.includes("diagnosis") ||
      normalized.includes("assessment")
    ) {
      return evaluationTerms;
    }
  
  
    /*
     * Communication
     */
  
    if (
      normalized.includes("communication") ||
      normalized.includes("speech")
    ) {
      return communicationTerms;
    }
  
  
    /*
     * Behavior
     */
  
    if (
      normalized.includes("behavior")
    ) {
      return behaviorTerms;
    }
  
  
    return [];
  }
  
  
  /*
   * ============================================================
   * GET BLOCKED TERMS FOR PRIORITY
   * ============================================================
   *
   * This is one of the most important functions in the engine.
   *
   * It defines which unrelated domains should NOT become the
   * family's next action.
   *
   * Example:
   *
   * Priority = Financial
   *
   * BLOCK:
   * - School
   * - Insurance
   *
   * ALLOW:
   * - Financial assistance
   *
   *
   * Priority = Therapy
   *
   * BLOCK:
   * - School
   * - Financial
   * - Insurance
   *
   * ALLOW:
   * - Therapy
   */
  
  export function getBlockedTermsForPriority(
    priority: unknown
  ): readonly string[] {
    const normalized =
      normalizeJourneyText(priority);
  
  
    /*
     * ----------------------------------------------------------
     * FINANCIAL
     * ----------------------------------------------------------
     *
     * Financial is intentionally protected from automatically
     * becoming an insurance-navigation journey.
     */
  
    if (
      normalized.includes("financial") ||
      normalized.includes("money") ||
      normalized.includes("cost") ||
      normalized.includes("funding")
    ) {
      return [
        ...schoolTerms,
        ...insuranceTerms,
      ];
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
      return [
        ...financialTerms,
        ...insuranceTerms,
      ];
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
      return [
        ...schoolTerms,
        ...financialTerms,
        ...insuranceTerms,
      ];
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
      return [
        ...schoolTerms,
        ...financialTerms,
      ];
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
      return [
        ...schoolTerms,
        ...financialTerms,
        ...insuranceTerms,
      ];
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
      return [
        ...schoolTerms,
        ...financialTerms,
        ...insuranceTerms,
      ];
    }
  
  
    /*
     * ----------------------------------------------------------
     * BEHAVIOR
     * ----------------------------------------------------------
     */
  
    if (
      normalized.includes("behavior")
    ) {
      return [
        ...schoolTerms,
        ...financialTerms,
        ...insuranceTerms,
      ];
    }
  
  
    return [];
  }