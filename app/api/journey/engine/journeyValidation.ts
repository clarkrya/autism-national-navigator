/*
 * ============================================================
 * JOURNEY VALIDATION ENGINE
 * ============================================================
 *
 * The AI generates the first version of the journey.
 *
 * This file is the second line of defense.
 *
 * Its job is to verify:
 *
 * 1. The journey follows the family's stated priority.
 * 2. The journey does not introduce unrelated domains.
 * 3. Existing supports are respected.
 * 4. Financial does not accidentally become Insurance.
 * 5. Therapy does not accidentally become School.
 * 6. Unsure does not become a guessed service pathway.
 *
 * IMPORTANT:
 *
 * This validator does not attempt to rewrite the entire journey.
 *
 * It removes or replaces recommendations that clearly violate
 * the family's stated intent.
 */


/*
 * ============================================================
 * IMPORTS
 * ============================================================
 */

import {
    getFamilyIntent,
  } from "./familyIntent";
  
  import {
    getBlockedTermsForPriority,
    normalizeJourneyText,
    textContainsAnyTerm,
  } from "./journeyTerms";
  
  
  /*
   * ============================================================
   * TYPES
   * ============================================================
   */
  
  type JourneyItem = {
    id?: string;
    title?: string;
    description?: string;
    priority?: string;
    estimatedTime?: string;
    completed?: boolean;
    resourceLink?: string;
    url?: string;
    [key: string]: unknown;
  };
  
  
  type JourneyResponse = {
    summary?: string;
  
    currentFocus?: {
      title?: string;
      explanation?: string;
      [key: string]: unknown;
    };
  
    priorities?: JourneyItem[];
  
    tasks?: JourneyItem[];
  
    resources?: JourneyItem[];
  
    nextStep?: {
      title?: string;
      description?: string;
      [key: string]: unknown;
    };
  
    [key: string]: unknown;
  };
  
  
  export type FamilyProfile = {
    childName?: string;
    childAge?: string | number;
    state?: string;
    journeyStage?: string;
    insurance?: string;
    supports?: string | string[];
    priority?: string;
    [key: string]: unknown;
  };
  
  
  /*
   * ============================================================
   * NORMALIZE SUPPORTS
   * ============================================================
   */
  
  function normalizeSupports(
    supports: unknown
  ): string[] {
    if (Array.isArray(supports)) {
      return supports
        .map((item) =>
          normalizeJourneyText(item)
        )
        .filter(Boolean);
    }
  
    if (
      typeof supports === "string"
    ) {
      return supports
        .split(",")
        .map((item) =>
          normalizeJourneyText(item)
        )
        .filter(Boolean);
    }
  
    return [];
  }
  
  
  /*
   * ============================================================
   * GET SUPPORT CONTEXT
   * ============================================================
   */
  
  function hasSchoolSupport(
    supports: string[]
  ): boolean {
    return supports.some(
      (support) =>
        support.includes("school") ||
        support.includes("education") ||
        support.includes("ese") ||
        support.includes("iep")
    );
  }
  
  
  function hasTherapySupport(
    supports: string[]
  ): boolean {
    return supports.some(
      (support) =>
        support.includes("therapy") ||
        support.includes("therap")
    );
  }
  
  
  /*
   * ============================================================
   * GET ITEM TEXT
   * ============================================================
   *
   * We inspect the complete recommendation rather than only the
   * title.
   *
   * This matters because an AI may hide an unrelated
   * recommendation inside the description.
   */
  
  function getItemText(
    item: JourneyItem | undefined
  ): string {
    if (!item) {
      return "";
    }
  
    return normalizeJourneyText(
      [
        item.title,
        item.description,
        item.resourceLink,
        item.url,
      ]
        .filter(Boolean)
        .join(" ")
    );
  }
  
  
  /*
   * ============================================================
   * GET NEXT STEP TEXT
   * ============================================================
   */
  
  function getNextStepText(
    journey: JourneyResponse
  ): string {
    return normalizeJourneyText(
      [
        journey.nextStep?.title,
        journey.nextStep?.description,
      ]
        .filter(Boolean)
        .join(" ")
    );
  }
  
  
  /*
   * ============================================================
   * IS SCHOOL ACTION?
   * ============================================================
   *
   * Merely mentioning school is not necessarily an error.
   *
   * We are specifically looking for recommendations that tell the
   * family to DO something school-related.
   */
  
  function isSchoolAction(
    text: string
  ): boolean {
    const actionTerms = [
      "contact the school",
      "contact school",
      "meet with the school",
      "meet with school",
      "school meeting",
      "school coordinator",
      "special education coordinator",
      "special education teacher",
      "school referral",
      "school evaluation",
      "school based evaluation",
      "school-based evaluation",
      "request school documents",
      "request an iep",
      "request iep",
      "request ese",
      "start the iep",
      "start the ese",
      "educational evaluation",
      "education evaluation",
      "school services",
      "school support",
      "classroom support",
    ];
  
    return actionTerms.some(
      (term) =>
        text.includes(term)
    );
  }
  
  
  /*
   * ============================================================
   * IS INSURANCE ACTION?
   * ============================================================
   */
  
  function isInsuranceAction(
    text: string
  ): boolean {
    const actionTerms = [
      "call your insurance",
      "call insurance",
      "contact your insurance",
      "contact insurance",
      "insurance member services",
      "review your insurance",
      "review insurance",
      "verify benefits",
      "benefits verification",
      "check coverage",
      "review coverage",
      "prior authorization",
      "check network",
      "check in network",
      "check out of network",
      "review deductible",
      "review copay",
      "review co-pay",
      "review coinsurance",
      "appeal the claim",
      "file an insurance appeal",
    ];
  
    return actionTerms.some(
      (term) =>
        text.includes(term)
    );
  }
  
  
  /*
   * ============================================================
   * IS FINANCIAL ACTION?
   * ============================================================
   */
  
  function isFinancialAction(
    text: string
  ): boolean {
    const financialTerms = [
      "financial assistance",
      "financial aid",
      "grant",
      "grants",
      "funding",
      "waiver",
      "financial support",
      "payment assistance",
      "cost assistance",
      "assistance program",
      "help paying",
      "help pay",
      "reduce the cost",
      "reduce costs",
      "reduce cost",
      "nonprofit assistance",
      "government assistance",
      "financial resource",
    ];
  
    return financialTerms.some(
      (term) =>
        text.includes(term)
    );
  }
  
  
  /*
   * ============================================================
   * IS THERAPY ACTION?
   * ============================================================
   */
  
  function isTherapyAction(
    text: string
  ): boolean {
    const therapyTerms = [
      "therapy",
      "therapist",
      "therapy provider",
      "therapy providers",
      "therapy service",
      "therapy services",
      "speech therapy",
      "occupational therapy",
      "aba",
      "behavior therapy",
      "developmental therapy",
    ];
  
    return therapyTerms.some(
      (term) =>
        text.includes(term)
    );
  }
  
  
  /*
   * ============================================================
   * IS UNSURE RESPONSE?
   * ============================================================
   */
  
  function isUnsurePriority(
    priority: string
  ): boolean {
    const normalized =
      normalizeJourneyText(priority);
  
    return (
      normalized === "unsure" ||
      normalized === "not sure" ||
      normalized === "unknown" ||
      normalized === "general concern" ||
      normalized === "none"
    );
  }
  
  
  /*
   * ============================================================
   * SHOULD REMOVE SCHOOL?
   * ============================================================
   *
   * School should be removed when it has become an action even
   * though the family did not identify a school need.
   */
  
  function shouldRemoveSchoolRecommendation(
    priority: string,
    text: string
  ): boolean {
    const normalized =
      normalizeJourneyText(priority);
  
    const priorityIsSchool =
      normalized.includes("school") ||
      normalized.includes("education") ||
      normalized.includes("iep") ||
      normalized.includes("ese");
  
    if (priorityIsSchool) {
      return false;
    }
  
    return isSchoolAction(text);
  }
  
  
  /*
   * ============================================================
   * SHOULD REMOVE INSURANCE?
   * ============================================================
   */
  
  function shouldRemoveInsuranceRecommendation(
    priority: string,
    text: string
  ): boolean {
    const normalized =
      normalizeJourneyText(priority);
  
    const priorityIsInsurance =
      normalized.includes("insurance") ||
      normalized.includes("coverage");
  
    if (priorityIsInsurance) {
      return false;
    }
  
    /*
     * Financial is especially protected.
     *
     * If the family said Financial, an insurance action should
     * not become the primary recommendation unless the family
     * explicitly identified insurance as the problem.
     */
  
    if (
      normalized.includes("financial") ||
      normalized.includes("money") ||
      normalized.includes("funding") ||
      normalized.includes("cost")
    ) {
      return isInsuranceAction(text);
    }
  
    return false;
  }
  
  
  /*
   * ============================================================
   * SHOULD REMOVE FINANCIAL?
   * ============================================================
   */
  
  function shouldRemoveFinancialRecommendation(
    priority: string,
    text: string
  ): boolean {
    const normalized =
      normalizeJourneyText(priority);
  
    const priorityIsFinancial =
      normalized.includes("financial") ||
      normalized.includes("money") ||
      normalized.includes("funding") ||
      normalized.includes("cost");
  
    if (priorityIsFinancial) {
      return false;
    }
  
    /*
     * Financial recommendations should not suddenly become the
     * primary answer for another unrelated priority.
     */
  
    if (
      normalized.includes("school") ||
      normalized.includes("education") ||
      normalized.includes("iep") ||
      normalized.includes("ese") ||
      normalized.includes("therapy") ||
      normalized.includes("therap") ||
      normalized.includes("communication") ||
      normalized.includes("behavior") ||
      normalized.includes("evaluation")
    ) {
      return isFinancialAction(text);
    }
  
    return false;
  }
  
  
  /*
   * ============================================================
   * FILTER ITEM
   * ============================================================
   */
  
  function isValidJourneyItem(
    item: JourneyItem,
    priority: string
  ): boolean {
    const text =
      getItemText(item);
  
    if (!text) {
      return true;
    }
  
  
    /*
     * ----------------------------------------------------------
     * SCHOOL
     * ----------------------------------------------------------
     */
  
    if (
      shouldRemoveSchoolRecommendation(
        priority,
        text
      )
    ) {
      return false;
    }
  
  
    /*
     * ----------------------------------------------------------
     * INSURANCE
     * ----------------------------------------------------------
     */
  
    if (
      shouldRemoveInsuranceRecommendation(
        priority,
        text
      )
    ) {
      return false;
    }
  
  
    /*
     * ----------------------------------------------------------
     * FINANCIAL
     * ----------------------------------------------------------
     */
  
    if (
      shouldRemoveFinancialRecommendation(
        priority,
        text
      )
    ) {
      return false;
    }
  
  
    return true;
  }
  
  
  /*
   * ============================================================
   * FILTER ITEMS
   * ============================================================
   */
  
  function filterJourneyItems(
    items: JourneyItem[] | undefined,
    priority: string
  ): JourneyItem[] {
    if (!Array.isArray(items)) {
      return [];
    }
  
    return items.filter(
      (item) =>
        isValidJourneyItem(
          item,
          priority
        )
    );
  }
  
  
  /*
   * ============================================================
   * VALIDATE CURRENT FOCUS
   * ============================================================
   *
   * Current focus is too important to allow an unrelated domain
   * to take over the journey.
   */
  
  function validateCurrentFocus(
    journey: JourneyResponse,
    priority: string
  ): JourneyResponse {
    const focusText =
      normalizeJourneyText(
        [
          journey.currentFocus?.title,
          journey.currentFocus?.explanation,
        ]
          .filter(Boolean)
          .join(" ")
      );
  
    if (!focusText) {
      return journey;
    }
  
  
    /*
     * Financial priority
     */
  
    if (
      isFinancialPriority(priority) &&
      isInsuranceAction(focusText)
    ) {
      return {
        ...journey,
  
        currentFocus: {
          title:
            "Find financial assistance that may help reduce the cost of care",
  
          explanation:
            "You identified financial support as your top priority, so the journey focuses first on legitimate ways to reduce or offset the cost of care.",
        },
      };
    }
  
  
    /*
     * Therapy priority + school recommendation
     */
  
    if (
      isTherapyPriority(priority) &&
      isSchoolAction(focusText)
    ) {
      return {
        ...journey,
  
        currentFocus: {
          title:
            "Clarify the therapy need that is most important right now",
  
          explanation:
            "You identified therapy as your top priority, so the journey focuses on understanding and addressing the therapy need rather than introducing an unrelated school pathway.",
        },
      };
    }
  
  
    return journey;
  }
  
  
  /*
   * ============================================================
   * VALIDATE NEXT STEP
   * ============================================================
   */
  
  function validateNextStep(
    journey: JourneyResponse,
    priority: string
  ): JourneyResponse {
    const nextStepText =
      getNextStepText(journey);
  
    if (!nextStepText) {
      return journey;
    }
  
  
    /*
     * ----------------------------------------------------------
     * FINANCIAL
     * ----------------------------------------------------------
     */
  
    if (
      isFinancialPriority(priority) &&
      isInsuranceAction(nextStepText)
    ) {
      return {
        ...journey,
  
        nextStep: {
          title:
            "Find one financial assistance program",
  
          description:
            "Start by identifying one legitimate grant, assistance program, waiver, or other financial resource that may help reduce the cost of your child's care.",
        },
      };
    }
  
  
    /*
     * ----------------------------------------------------------
     * THERAPY
     * ----------------------------------------------------------
     */
  
    if (
      isTherapyPriority(priority) &&
      isSchoolAction(nextStepText)
    ) {
      return {
        ...journey,
  
        nextStep: {
          title:
            "Clarify the therapy gap",
  
          description:
            "Write down the therapy need that is not being met right now and identify what outcome you want to improve before pursuing another service.",
        },
      };
    }
  
  
    /*
     * ----------------------------------------------------------
     * SCHOOL
     * ----------------------------------------------------------
     *
     * School is allowed when School is the actual priority.
     */
  
    return journey;
  }
  
  
  /*
   * ============================================================
   * PRIORITY HELPERS
   * ============================================================
   */
  
  function isFinancialPriority(
    priority: string
  ): boolean {
    const normalized =
      normalizeJourneyText(priority);
  
    return (
      normalized.includes("financial") ||
      normalized.includes("money") ||
      normalized.includes("funding") ||
      normalized.includes("cost")
    );
  }
  
  
  function isTherapyPriority(
    priority: string
  ): boolean {
    const normalized =
      normalizeJourneyText(priority);
  
    return (
      normalized.includes("therapy") ||
      normalized.includes("therap")
    );
  }
  
  
  function isSchoolPriority(
    priority: string
  ): boolean {
    const normalized =
      normalizeJourneyText(priority);
  
    return (
      normalized.includes("school") ||
      normalized.includes("education") ||
      normalized.includes("iep") ||
      normalized.includes("ese")
    );
  }
  
  
  function isInsurancePriority(
    priority: string
  ): boolean {
    const normalized =
      normalizeJourneyText(priority);
  
    return (
      normalized.includes("insurance") ||
      normalized.includes("coverage")
    );
  }
  
  
  /*
   * ============================================================
   * VALIDATE UNSURE JOURNEY
   * ============================================================
   *
   * If the family is unsure, we must not allow the AI to invent
   * a specific pathway.
   */
  
  function validateUnsureJourney(
    journey: JourneyResponse
  ): JourneyResponse {
    const allText =
      normalizeJourneyText(
        [
          journey.currentFocus?.title,
          journey.currentFocus?.explanation,
          journey.nextStep?.title,
          journey.nextStep?.description,
          ...(journey.priorities || []).map(
            getItemText
          ),
          ...(journey.tasks || []).map(
            getItemText
          ),
        ]
          .filter(Boolean)
          .join(" ")
      );
  
  
    /*
     * If the journey has a clear school action, remove it.
     */
  
    const filteredPriorities =
      (journey.priorities || [])
        .filter(
          (item) =>
            !isSchoolAction(
              getItemText(item)
            )
        );
  
  
    const filteredTasks =
      (journey.tasks || [])
        .filter(
          (item) =>
            !isSchoolAction(
              getItemText(item)
            )
        );
  
  
    const filteredResources =
      (journey.resources || [])
        .filter(
          (item) =>
            !isSchoolAction(
              getItemText(item)
            )
        );
  
  
    /*
     * Detect whether the AI chose a specific pathway.
     */
  
    const choseSpecificPath =
      isSchoolAction(allText) ||
      isTherapyAction(allText) ||
      isFinancialAction(allText) ||
      isInsuranceAction(allText);
  
  
    if (!choseSpecificPath) {
      return journey;
    }
  
  
    return {
      ...journey,
  
      currentFocus: {
        title:
          "Clarify what concerns you most right now",
  
        explanation:
          "You have not identified one specific priority yet, so the first step is to organize what you have noticed and clarify what you want help understanding.",
      },
  
      priorities:
        filteredPriorities,
  
      tasks:
        filteredTasks,
  
      resources:
        filteredResources,
  
      nextStep: {
        title:
          "Write down the 2–3 concerns you want help understanding",
  
        description:
          "Start with what you have personally noticed. You do not need to determine a diagnosis or choose a service before identifying the concerns you want help understanding.",
      },
    };
  }
  
  
  /*
   * ============================================================
   * FILTER BLOCKED DOMAIN ITEMS
   * ============================================================
   *
   * This provides an additional generic safety layer using the
   * centralized terms from journeyTerms.ts.
   */
  
  function filterBlockedDomainItems(
    items: JourneyItem[] | undefined,
    priority: string
  ): JourneyItem[] {
    if (!Array.isArray(items)) {
      return [];
    }
  
    const blockedTerms =
      getBlockedTermsForPriority(
        priority
      );
  
    if (
      blockedTerms.length === 0
    ) {
      return items;
    }
  
    return items.filter(
      (item) => {
        const text =
          getItemText(item);
  
        /*
         * We use the specific action checks first because simply
         * mentioning a blocked domain does not necessarily make
         * the recommendation invalid.
         */
  
        if (
          isFinancialPriority(priority) &&
          isInsuranceAction(text)
        ) {
          return false;
        }
  
        if (
          isTherapyPriority(priority) &&
          isSchoolAction(text)
        ) {
          return false;
        }
  
        /*
         * For other priorities, use the blocked-term list as an
         * additional safeguard.
         */
  
        const hasBlockedTerm =
          textContainsAnyTerm(
            text,
            blockedTerms
          );
  
        if (!hasBlockedTerm) {
          return true;
        }
  
        /*
         * Keep the item if it is clearly about the selected
         * priority even though another domain is mentioned as
         * context.
         */
  
        if (
          isFinancialPriority(priority) &&
          isFinancialAction(text)
        ) {
          return true;
        }
  
        if (
          isTherapyPriority(priority) &&
          isTherapyAction(text) &&
          !isSchoolAction(text)
        ) {
          return true;
        }
  
        if (
          isSchoolPriority(priority) &&
          isSchoolAction(text)
        ) {
          return true;
        }
  
        if (
          isInsurancePriority(priority) &&
          isInsuranceAction(text)
        ) {
          return true;
        }
  
        /*
         * Otherwise the recommendation contains an unrelated
         * blocked domain and should be removed.
         */
  
        return false;
      }
    );
  }
  
  
  /*
   * ============================================================
   * VALIDATE JOURNEY
   * ============================================================
   *
   * This is the main function imported by generateJourney.ts.
   */
  
  export function validateJourney(
    journey: JourneyResponse,
    familyProfile: FamilyProfile
  ): JourneyResponse {
    /*
     * Never mutate the original AI response directly.
     */
  
    let validated: JourneyResponse = {
      ...journey,
    };
  
  
    const priority =
      String(
        familyProfile.priority || ""
      );
  
  
    /*
     * ----------------------------------------------------------
     * FAMILY INTENT
     * ----------------------------------------------------------
     */
  
    const intent =
      getFamilyIntent(
        priority
      );
  
  
    /*
     * ----------------------------------------------------------
     * EXISTING SUPPORTS
     * ----------------------------------------------------------
     */
  
    const supports =
      normalizeSupports(
        familyProfile.supports
      );
  
    const hasExistingSchoolSupport =
      hasSchoolSupport(
        supports
      );
  
    const hasExistingTherapySupport =
      hasTherapySupport(
        supports
      );
  
  
    /*
     * ----------------------------------------------------------
     * FILTER PRIORITIES
     * ----------------------------------------------------------
     */
  
    validated.priorities =
      filterJourneyItems(
        validated.priorities,
        priority
      );
  
    validated.priorities =
      filterBlockedDomainItems(
        validated.priorities,
        priority
      );
  
  
    /*
     * ----------------------------------------------------------
     * FILTER TASKS
     * ----------------------------------------------------------
     */
  
    validated.tasks =
      filterJourneyItems(
        validated.tasks,
        priority
      );
  
    validated.tasks =
      filterBlockedDomainItems(
        validated.tasks,
        priority
      );
  
  
    /*
     * ----------------------------------------------------------
     * FILTER RESOURCES
     * ----------------------------------------------------------
     */
  
    validated.resources =
      filterJourneyItems(
        validated.resources,
        priority
      );
  
    validated.resources =
      filterBlockedDomainItems(
        validated.resources,
        priority
      );
  
  
    /*
     * ----------------------------------------------------------
     * CURRENT FOCUS
     * ----------------------------------------------------------
     */
  
    validated =
      validateCurrentFocus(
        validated,
        priority
      );
  
  
    /*
     * ----------------------------------------------------------
     * NEXT STEP
     * ----------------------------------------------------------
     */
  
    validated =
      validateNextStep(
        validated,
        priority
      );
  
  
    /*
     * ----------------------------------------------------------
     * UNSURE
     * ----------------------------------------------------------
     */
  
    if (
      intent.type === "clarify" ||
      isUnsurePriority(priority)
    ) {
      validated =
        validateUnsureJourney(
          validated
        );
    }
  
  
    /*
     * ----------------------------------------------------------
     * EXISTING SCHOOL SUPPORT + THERAPY PRIORITY
     * ----------------------------------------------------------
     *
     * This is specifically designed to protect against the issue
     * we have been seeing in testing.
     *
     * Example:
     *
     * Priority = Therapy
     * Supports = School Services
     *
     * School should remain context.
     */
  
    if (
      isTherapyPriority(priority) &&
      hasExistingSchoolSupport
    ) {
      validated.tasks =
        (validated.tasks || [])
          .filter(
            (task) =>
              !isSchoolAction(
                getItemText(task)
              )
          );
  
      validated.priorities =
        (validated.priorities || [])
          .filter(
            (item) =>
              !isSchoolAction(
                getItemText(item)
              )
          );
  
      validated.resources =
        (validated.resources || [])
          .filter(
            (resource) =>
              !isSchoolAction(
                getItemText(resource)
              )
          );
  
  
      const focusText =
        normalizeJourneyText(
          [
            validated.currentFocus?.title,
            validated.currentFocus?.explanation,
          ]
            .filter(Boolean)
            .join(" ")
        );
  
  
      if (
        isSchoolAction(focusText)
      ) {
        validated.currentFocus = {
          title:
            "Clarify the therapy need that is most important right now",
  
          explanation:
            "You identified therapy as your top priority. Because your child already receives school services, the journey focuses on identifying what therapy need remains unmet.",
        };
      }
  
  
      const nextText =
        getNextStepText(
          validated
        );
  
  
      if (
        isSchoolAction(nextText)
      ) {
        validated.nextStep = {
          title:
            "Clarify the therapy gap",
  
          description:
            "Identify what therapy need is not being met right now and what outcome you want to improve.",
        };
      }
    }
  
  
    /*
     * ----------------------------------------------------------
     * EXISTING THERAPY SUPPORT + THERAPY PRIORITY
     * ----------------------------------------------------------
     *
     * If therapy is already being received, don't blindly tell
     * the family to find therapy.
     */
  
    if (
      isTherapyPriority(priority) &&
      hasExistingTherapySupport
    ) {
      validated.tasks =
        (validated.tasks || [])
          .filter(
            (task) => {
              const text =
                getItemText(task);
  
              /*
               * Keep tasks that identify a gap, barrier, goal,
               * progress issue, or coordination issue.
               */
  
              if (
                text.includes("gap") ||
                text.includes("barrier") ||
                text.includes("goal") ||
                text.includes("progress") ||
                text.includes("coordinate") ||
                text.includes("coordination")
              ) {
                return true;
              }
  
              /*
               * Remove generic "find a therapist" actions when
               * the family already has therapy.
               */
  
              if (
                text.includes("find a therapist") ||
                text.includes("find therapy") ||
                text.includes("find a therapy provider") ||
                text.includes("find therapy providers")
              ) {
                return false;
              }
  
              return true;
            }
          );
    }
  
  
    /*
     * ----------------------------------------------------------
     * FINANCIAL FINAL SAFETY CHECK
     * ----------------------------------------------------------
     *
     * Financial must remain financial.
     */
  
    if (
      isFinancialPriority(priority)
    ) {
      validated.tasks =
        (validated.tasks || [])
          .filter(
            (task) =>
              !isInsuranceAction(
                getItemText(task)
              )
          );
  
      validated.priorities =
        (validated.priorities || [])
          .filter(
            (item) =>
              !isInsuranceAction(
                getItemText(item)
              )
          );
  
      validated.resources =
        (validated.resources || [])
          .filter(
            (resource) =>
              !isInsuranceAction(
                getItemText(resource)
              )
          );
  
  
      const nextText =
        getNextStepText(
          validated
        );
  
  
      if (
        isInsuranceAction(nextText)
      ) {
        validated.nextStep = {
          title:
            "Find one financial assistance opportunity",
  
          description:
            "Start by identifying one legitimate grant, financial assistance program, waiver, or other resource that may help reduce the cost of care.",
        };
      }
  
  
      const focusText =
        normalizeJourneyText(
          [
            validated.currentFocus?.title,
            validated.currentFocus?.explanation,
          ]
            .filter(Boolean)
            .join(" ")
        );
  
  
      if (
        isInsuranceAction(focusText)
      ) {
        validated.currentFocus = {
          title:
            "Find financial assistance that may help reduce the cost of care",
  
          explanation:
            "You identified financial support as your top priority, so the journey focuses first on legitimate ways to reduce or offset the cost of care.",
        };
      }
    }
  
  
    /*
     * ----------------------------------------------------------
     * FINAL NORMALIZATION
     * ----------------------------------------------------------
     */
  
    validated.tasks =
      (validated.tasks || [])
        .map(
          (task) => ({
            ...task,
  
            /*
             * New AI-generated tasks always begin incomplete.
             */
            completed:
              false,
          })
        );
  
  
    /*
     * Remove empty arrays only if they are truly missing.
     *
     * Keeping arrays is safer for the front end because the UI
     * can always expect an array.
     */
  
    validated.priorities =
      Array.isArray(
        validated.priorities
      )
        ? validated.priorities
        : [];
  
  
    validated.tasks =
      Array.isArray(
        validated.tasks
      )
        ? validated.tasks
        : [];
  
  
    validated.resources =
      Array.isArray(
        validated.resources
      )
        ? validated.resources
        : [];
  
  
    return validated;
  }