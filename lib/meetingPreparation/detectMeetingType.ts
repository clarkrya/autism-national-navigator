/*
 * ============================================================
 * JOURNEY → MEETING TYPE DETECTOR
 * ============================================================
 *
 * Examines a child's validated Current Journey and determines
 * whether the Journey contains an interaction the family may
 * reasonably want to prepare for.
 *
 * IMPORTANT:
 *
 * This detector does NOT generate a Meeting Plan.
 *
 * Its responsibilities are:
 *
 *   1. Read structured Journey content
 *   2. Identify meeting-related signals
 *   3. Distinguish the upcoming interaction from referral /
 *      administrative context
 *   4. Select the most appropriate trusted meeting type
 *   5. Explain why that recommendation was made
 *
 * If there is not enough evidence for a reliable recommendation,
 * this function returns null.
 *
 * The family can still manually choose:
 *
 *   "Preparing for something else?"
 *
 * ============================================================
 */


import type {
  PersonalizedJourney,
} from "../ai/journeyTypes";

import type {
  MeetingRecommendation,
  MeetingType,
} from "../../types/meetingPreparation";


/*
 * ============================================================
 * INTERNAL TYPES
 * ============================================================
 */

type JourneySignalSource =
  | "current_focus"
  | "next_step"
  | "action"
  | "task";


type JourneySignal = {
  source:
    JourneySignalSource;

  id?:
    string;

  text:
    string;
};


type DetectableMeetingType =
  Exclude<
    MeetingType,
    "general"
  >;


type MeetingMatch = {
  meetingType:
    DetectableMeetingType;

  score:
    number;

  sources:
    JourneySignalSource[];

  sourceIds:
    string[];

  matchedTerms:
    string[];

  strongDestinationMatches:
    number;
};


/*
 * ============================================================
 * SOURCE WEIGHTS
 * ============================================================
 *
 * Current Focus and Next Step represent the strongest
 * description of what the family is actively working toward.
 *
 * Actions and Tasks provide supporting evidence.
 * ============================================================
 */

const SOURCE_WEIGHTS:
  Record<
    JourneySignalSource,
    number
  > = {

  current_focus:
    4,

  next_step:
    4,

  action:
    2,

  task:
    2,
};


/*
 * ============================================================
 * STRONG DESTINATION / INTERACTION TERMS
 * ============================================================
 *
 * These terms describe WHAT interaction the family is preparing
 * for rather than merely WHO appears somewhere in the Journey.
 *
 * These receive additional weight.
 * ============================================================
 */

const STRONG_DESTINATION_TERMS:
  Record<
    DetectableMeetingType,
    string[]
  > = {

  diagnostic_evaluation: [
    "diagnostic evaluation",
    "diagnostic appointment",
    "diagnostic clinic",
    "developmental evaluation",
    "developmental assessment",
    "autism evaluation",
    "autism assessment",
    "evaluation appointment",
    "evaluation clinic",
    "evaluation team",
    "evaluation results",
    "evaluation itself",
  ],

  doctor_specialist: [
    "doctor appointment",
    "doctor visit",
    "medical appointment",
    "medical visit",
    "provider appointment",
    "provider visit",
    "specialist appointment",
    "specialist visit",
    "pediatrician appointment",
    "pediatrician visit",
    "developmental pediatrician appointment",
    "developmental pediatrician visit",
    "neurologist appointment",
    "neurologist visit",
    "psychiatrist appointment",
    "psychiatrist visit",
    "physician appointment",
    "physician visit",
    "follow-up with your pediatrician",
    "follow up with your pediatrician",
    "follow-up with the pediatrician",
    "follow up with the pediatrician",
    "follow-up with your doctor",
    "follow up with your doctor",
    "follow-up with the doctor",
    "follow up with the doctor",
    "follow-up with your specialist",
    "follow up with your specialist",
    "follow-up with the specialist",
    "follow up with the specialist",
  ],

  therapy: [
    "therapy intake",
    "therapy appointment",
    "therapy consultation",
    "therapy meeting",
    "therapy evaluation",
    "speech therapy appointment",
    "speech therapy evaluation",
    "speech-language evaluation",
    "occupational therapy appointment",
    "occupational therapy evaluation",
    "physical therapy appointment",
    "physical therapy evaluation",
    "behavioral therapy appointment",
    "aba appointment",
    "aba assessment",
    "aba evaluation",
    "aba intake",
  ],

  school_iep: [
    "iep meeting",
    "iep team meeting",
    "school meeting",
    "school evaluation",
    "educational evaluation",
    "school team meeting",
    "education team meeting",
    "student support team meeting",
    "teacher meeting",
    "school conference",
    "504 meeting",
    "eligibility meeting",
  ],

  insurance_benefits: [
    "insurance call",
    "call your insurance",
    "call the insurance",
    "contact your insurance",
    "contact the insurance",
    "insurance conversation",
    "benefits call",
    "benefits conversation",
    "call member services",
    "contact member services",
    "speak with member services",
    "benefits representative",
    "insurance representative",
  ],
};


/*
 * ============================================================
 * SUPPORTING CONTEXT TERMS
 * ============================================================
 *
 * These terms provide context but do NOT automatically prove
 * that the named person or organization is the interaction the
 * family needs to prepare for.
 *
 * Example:
 *
 *   "Call the pediatrician to send the referral to the
 *    diagnostic clinic."
 *
 * "Pediatrician" is context.
 * "Diagnostic clinic" is the destination.
 *
 * ============================================================
 */

const SUPPORTING_TERMS:
  Record<
    DetectableMeetingType,
    string[]
  > = {

  diagnostic_evaluation: [
    "diagnostic",
    "evaluation",
    "assessment",
    "intake appointment",
    "intake visit",
    "intake requirements",
    "intake forms",
    "intake steps",
    "evaluation process",
  ],

  doctor_specialist: [
    "doctor",
    "specialist",
    "developmental pediatrician",
    "neurologist",
    "psychiatrist",
    "physician",
    "medical provider",
    "healthcare provider",
  ],

  therapy: [
    "therapy",
    "therapy provider",
    "therapist",
    "speech therapy",
    "speech-language",
    "occupational therapy",
    "physical therapy",
    "behavioral therapy",
    "aba provider",
    "aba therapy",
  ],

  school_iep: [
    "iep",
    "school team",
    "education team",
    "student support team",
    "teacher",
    "504 plan",
    "school evaluation",
    "educational evaluation",
  ],

  insurance_benefits: [
    "insurance company",
    "insurance plan",
    "health plan",
    "member services",
    "benefits department",
    "coverage",
    "prior authorization",
    "preauthorization",
    "authorization",
    "in network",
    "in-network",
    "out of network",
    "out-of-network",
    "benefits",
  ],
};


/*
 * ============================================================
 * REFERRAL / ADMINISTRATIVE SOURCE PATTERNS
 * ============================================================
 *
 * These patterns identify situations where a doctor or provider
 * is functioning as the SOURCE of a referral, record transfer,
 * or administrative action rather than the destination meeting.
 *
 * We use these patterns specifically to prevent:
 *
 *   "Call the pediatrician to send the referral..."
 *
 * from being interpreted as:
 *
 *   "Prepare for a Doctor / Specialist Appointment."
 *
 * ============================================================
 */

const DOCTOR_ADMINISTRATIVE_PATTERNS = [
  "call the pediatrician",
  "call your pediatrician",
  "contact the pediatrician",
  "contact your pediatrician",
  "ask the pediatrician",
  "ask your pediatrician",
  "pediatrician's office",
  "pediatricians office",
  "pediatrician office",
  "call the doctor's office",
  "call your doctor's office",
  "call the doctors office",
  "call your doctors office",
  "contact the doctor's office",
  "contact your doctor's office",
  "contact the doctors office",
  "contact your doctors office",
  "ask the doctor's office",
  "ask your doctor's office",
  "ask the doctors office",
  "ask your doctors office",
  "send the referral",
  "confirm the referral",
  "referral was sent",
  "referral transmission",
  "send records",
  "fax records",
  "upload records",
  "transmission of records",
];


/*
 * ============================================================
 * TEXT NORMALIZATION
 * ============================================================
 */

function normalizeText(
  value:
    string
):
  string {

  return value
    .toLowerCase()
    .replace(
      /[^a-z0-9\s'-]/g,
      " "
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}


/*
 * ============================================================
 * TERM MATCH
 * ============================================================
 */

function textContainsTerm(
  text:
    string,
  term:
    string
):
  boolean {

  const normalizedText =
    normalizeText(
      text
    );

  const normalizedTerm =
    normalizeText(
      term
    );


  if (
    !normalizedText ||
    !normalizedTerm
  ) {
    return false;
  }


  return normalizedText.includes(
    normalizedTerm
  );
}


/*
 * ============================================================
 * BUILD JOURNEY SIGNALS
 * ============================================================
 *
 * Meeting detection considers:
 *
 *   - Current Focus
 *   - Next Step
 *   - Actions
 *   - Open Tasks
 *
 * Completed tasks are intentionally excluded because Meeting
 * Preparation should focus on what the family is working toward
 * now.
 *
 * ============================================================
 */

function buildJourneySignals(
  journey:
    PersonalizedJourney
):
  JourneySignal[] {

  const signals:
    JourneySignal[] = [];


  /*
   * ----------------------------------------------------------
   * CURRENT FOCUS
   * ----------------------------------------------------------
   */

  if (
    journey.currentFocus
  ) {

    signals.push({
      source:
        "current_focus",

      text: [
        journey.currentFocus.title,
        journey.currentFocus.explanation,
      ]
        .filter(Boolean)
        .join(" "),
    });

  }


  /*
   * ----------------------------------------------------------
   * NEXT STEP
   * ----------------------------------------------------------
   */

  if (
    journey.nextStep
  ) {

    signals.push({
      source:
        "next_step",

      text: [
        journey.nextStep.title,
        journey.nextStep.description,
      ]
        .filter(Boolean)
        .join(" "),
    });

  }


  /*
   * ----------------------------------------------------------
   * ACTIONS
   * ----------------------------------------------------------
   */

  if (
    Array.isArray(
      journey.actions
    )
  ) {

    for (
      const action
      of journey.actions
    ) {

      signals.push({
        source:
          "action",

        id:
          action.id,

        text: [
          action.title,
          action.whyItMatters,
          action.action,
          action.howTo,
          action.nextStep,
        ]
          .filter(Boolean)
          .join(" "),
      });

    }

  }


  /*
   * ----------------------------------------------------------
   * OPEN TASKS
   * ----------------------------------------------------------
   */

  if (
    Array.isArray(
      journey.tasks
    )
  ) {

    for (
      const task
      of journey.tasks
    ) {

      if (
        task.completed
      ) {
        continue;
      }


      signals.push({
        source:
          "task",

        id:
          task.id,

        text: [
          task.title,
          task.description,
        ]
          .filter(Boolean)
          .join(" "),
      });

    }

  }


  return signals;
}


/*
 * ============================================================
 * DETECT ADMINISTRATIVE DOCTOR CONTEXT
 * ============================================================
 */

function isDoctorAdministrativeContext(
  signal:
    JourneySignal
):
  boolean {

  return DOCTOR_ADMINISTRATIVE_PATTERNS.some(
    (
      pattern
    ) =>
      textContainsTerm(
        signal.text,
        pattern
      )
  );
}


/*
 * ============================================================
 * SCORE ONE MEETING TYPE
 * ============================================================
 *
 * Scoring rules:
 *
 * STRONG DESTINATION MATCH
 *   Current Focus / Next Step: base weight + 4
 *   Action / Task:             base weight + 4
 *
 * SUPPORTING MATCH
 *   Receives base source weight.
 *
 * Doctor / Specialist receives an additional safeguard:
 * supporting doctor language inside referral / records /
 * administrative context does NOT earn Doctor/Specialist
 * points.
 *
 * ============================================================
 */

function scoreMeetingType(
  signals:
    JourneySignal[],
  meetingType:
    DetectableMeetingType
):
  MeetingMatch {

  let score =
    0;

  let strongDestinationMatches =
    0;


  const sources =
    new Set<
      JourneySignalSource
    >();


  const sourceIds =
    new Set<string>();


  const matchedTerms =
    new Set<string>();


  const strongTerms =
    STRONG_DESTINATION_TERMS[
      meetingType
    ];


  const supportingTerms =
    SUPPORTING_TERMS[
      meetingType
    ];


  for (
    const signal
    of signals
  ) {

    const sourceWeight =
      SOURCE_WEIGHTS[
        signal.source
      ];


    let signalMatched =
      false;


    /*
     * --------------------------------------------------------
     * STRONG DESTINATION MATCHES
     * --------------------------------------------------------
     */

    const strongMatches =
      strongTerms.filter(
        (
          term
        ) =>
          textContainsTerm(
            signal.text,
            term
          )
      );


    if (
      strongMatches.length >
        0
    ) {

      signalMatched =
        true;

      strongDestinationMatches +=
        1;


      /*
       * We score once per signal rather than once per synonym.
       *
       * A sentence containing both "diagnostic clinic" and
       * "diagnostic evaluation" is stronger evidence, but should
       * not receive unlimited points merely because several
       * related phrases appear in the same text block.
       */

      score +=
        sourceWeight +
        4;


      for (
        const term
        of strongMatches
      ) {

        matchedTerms.add(
          term
        );

      }

    }


    /*
     * --------------------------------------------------------
     * SUPPORTING CONTEXT MATCHES
     * --------------------------------------------------------
     */

    const supportingMatches =
      supportingTerms.filter(
        (
          term
        ) =>
          textContainsTerm(
            signal.text,
            term
          )
      );


    if (
      supportingMatches.length >
        0
    ) {

      /*
       * Doctor / Specialist safeguard:
       *
       * Do not treat a pediatrician / doctor as the destination
       * when the signal describes referral transmission,
       * records, calling the office, or similar administrative
       * work.
       */

      const suppressDoctorSupport =
        meetingType ===
          "doctor_specialist" &&
        strongMatches.length ===
          0 &&
        isDoctorAdministrativeContext(
          signal
        );


      if (
        !suppressDoctorSupport
      ) {

        signalMatched =
          true;


        /*
         * If this signal already earned strong destination
         * points, supporting synonyms do not add another full
         * score. They are still recorded for debugging.
         */

        if (
          strongMatches.length ===
            0
        ) {

          score +=
            sourceWeight;

        }


        for (
          const term
          of supportingMatches
        ) {

          matchedTerms.add(
            term
          );

        }

      }

    }


    /*
     * --------------------------------------------------------
     * RECORD SOURCE
     * --------------------------------------------------------
     */

    if (
      signalMatched
    ) {

      sources.add(
        signal.source
      );


      if (
        signal.id
      ) {

        sourceIds.add(
          signal.id
        );

      }

    }

  }


  return {
    meetingType,

    score,

    sources:
      Array.from(
        sources
      ),

    sourceIds:
      Array.from(
        sourceIds
      ),

    matchedTerms:
      Array.from(
        matchedTerms
      ),

    strongDestinationMatches,
  };
}


/*
 * ============================================================
 * DOCTOR / SPECIALIST ELIGIBILITY
 * ============================================================
 *
 * Doctor / Specialist is different from the other categories.
 *
 * A pediatrician or physician may appear throughout a Journey
 * simply because that person:
 *
 *   - made the referral
 *   - needs to send records
 *   - needs to confirm transmission
 *   - needs to provide documentation
 *
 * Therefore Doctor / Specialist cannot win from generic doctor
 * vocabulary alone.
 *
 * It must have at least one strong interaction signal such as:
 *
 *   "pediatrician appointment"
 *   "specialist visit"
 *   "follow up with your neurologist"
 *
 * ============================================================
 */

function isEligibleMatch(
  match:
    MeetingMatch
):
  boolean {

  if (
    match.meetingType !==
      "doctor_specialist"
  ) {

    return match.score >=
      4;

  }


  return (
    match.score >=
      4 &&
    match.strongDestinationMatches >
      0
  );
}


/*
 * ============================================================
 * MEETING TITLES
 * ============================================================
 */

function getRecommendationTitle(
  meetingType:
    DetectableMeetingType
):
  string {

  switch (
    meetingType
  ) {

    case "diagnostic_evaluation":
      return "Prepare for a Diagnostic / Evaluation Appointment";

    case "doctor_specialist":
      return "Prepare for a Doctor / Specialist Appointment";

    case "therapy":
      return "Prepare for a Therapy Meeting";

    case "school_iep":
      return "Prepare for a School / IEP Meeting";

    case "insurance_benefits":
      return "Prepare for an Insurance / Benefits Conversation";

  }
}


/*
 * ============================================================
 * RECOMMENDATION REASON
 * ============================================================
 */

function getRecommendationReason(
  meetingType:
    DetectableMeetingType,
  childName?:
    string
):
  string {

  const name =
    childName?.trim() ||
    "your child";


  switch (
    meetingType
  ) {

    case "diagnostic_evaluation":
      return `${name}'s current Journey includes steps related to a diagnostic or evaluation process.`;

    case "doctor_specialist":
      return `${name}'s current Journey includes steps related to an upcoming appointment with a healthcare provider or specialist.`;

    case "therapy":
      return `${name}'s current Journey includes steps related to an upcoming therapy interaction or therapy provider.`;

    case "school_iep":
      return `${name}'s current Journey includes steps related to an upcoming school or IEP interaction.`;

    case "insurance_benefits":
      return `${name}'s current Journey includes steps related to an upcoming insurance, benefits, or coverage conversation.`;

  }
}


/*
 * ============================================================
 * MAP SOURCE
 * ============================================================
 */

function mapRecommendationSource(
  sources:
    JourneySignalSource[]
):
  MeetingRecommendation["source"] {

  if (
    sources.length >
      1
  ) {

    return "multiple";

  }


  const source =
    sources[0];


  if (
    source ===
      "current_focus"
  ) {

    return "current_focus";

  }


  if (
    source ===
      "next_step"
  ) {

    return "next_step";

  }


  if (
    source ===
      "action"
  ) {

    return "action";

  }


  return "task";
}


/*
 * ============================================================
 * DETECT MEETING TYPE
 * ============================================================
 */

export function detectMeetingType(
  journey:
    PersonalizedJourney,
  childName?:
    string
):
  MeetingRecommendation | null {

  const signals =
    buildJourneySignals(
      journey
    );


  if (
    signals.length ===
      0
  ) {

    return null;

  }


  /*
   * ----------------------------------------------------------
   * SCORE ALL TRUSTED MEETING TYPES
   * ----------------------------------------------------------
   */

  const allMatches:
    MeetingMatch[] = [

    scoreMeetingType(
      signals,
      "diagnostic_evaluation"
    ),

    scoreMeetingType(
      signals,
      "doctor_specialist"
    ),

    scoreMeetingType(
      signals,
      "therapy"
    ),

    scoreMeetingType(
      signals,
      "school_iep"
    ),

    scoreMeetingType(
      signals,
      "insurance_benefits"
    ),
  ];


  /*
   * ----------------------------------------------------------
   * REMOVE MATCHES THAT DO NOT HAVE ENOUGH EVIDENCE
   * ----------------------------------------------------------
   */

  const eligibleMatches =
    allMatches
      .filter(
        isEligibleMatch
      )
      .sort(
        (
          first,
          second
        ) =>
          second.score -
          first.score
      );


  const bestMatch =
    eligibleMatches[0];


  if (
    !bestMatch
  ) {

    return null;

  }


  /*
   * ==========================================================
   * DESTINATION PRECEDENCE
   * ==========================================================
   *
   * If one category has strong destination evidence and another
   * category only has general supporting language, prefer the
   * category describing the actual upcoming interaction.
   *
   * Example:
   *
   *   "Ask the pediatrician to send records to the diagnostic
   *    clinic before the evaluation."
   *
   * Diagnostic / Evaluation should win.
   *
   * ==========================================================
   */

  const strongDestinationMatches =
    eligibleMatches.filter(
      (
        match
      ) =>
        match.strongDestinationMatches >
          0
    );


  let selectedMatch =
    bestMatch;


  if (
    strongDestinationMatches.length >
      0
  ) {

    strongDestinationMatches.sort(
      (
        first,
        second
      ) => {

        if (
          second.score !==
            first.score
        ) {

          return second.score -
            first.score;

        }


        return (
          second.strongDestinationMatches -
          first.strongDestinationMatches
        );

      }
    );


    selectedMatch =
      strongDestinationMatches[0];

  }


  /*
   * ==========================================================
   * AMBIGUITY GUARD
   * ==========================================================
   *
   * If two categories have equally strong evidence for two
   * genuinely different upcoming interactions, we should not
   * pretend to know which one the family intends to prepare for.
   *
   * In that situation, return null and allow manual selection.
   *
   * ==========================================================
   */

  const competingMatches =
    eligibleMatches.filter(
      (
        match
      ) =>
        match.meetingType !==
          selectedMatch.meetingType &&
        match.score ===
          selectedMatch.score &&
        match.strongDestinationMatches ===
          selectedMatch.strongDestinationMatches
    );


  if (
    competingMatches.length >
      0
  ) {

    return null;

  }


  /*
   * ==========================================================
   * CONFIDENCE
   * ==========================================================
   *
   * HIGH
   *
   * Strong destination evidence plus either:
   *   - repeated evidence across Journey locations, or
   *   - a sufficiently strong total score.
   *
   * MEDIUM
   *
   * Enough evidence to make a recommendation, but with less
   * repetition or specificity.
   *
   * ==========================================================
   */

  const confidence:
    MeetingRecommendation["confidence"] =

      selectedMatch
        .strongDestinationMatches >
        0 &&
      (
        selectedMatch
          .score >=
          8 ||
        selectedMatch
          .sources
          .length >=
          2
      )

        ? "high"

        : "medium";


  /*
   * ==========================================================
   * RETURN RECOMMENDATION
   * ==========================================================
   */

  return {
    meetingType:
      selectedMatch.meetingType,

    title:
      getRecommendationTitle(
        selectedMatch.meetingType
      ),

    reason:
      getRecommendationReason(
        selectedMatch.meetingType,
        childName
      ),

    source:
      mapRecommendationSource(
        selectedMatch.sources
      ),

    sourceIds:
      selectedMatch
        .sourceIds
        .length >
        0

        ? selectedMatch.sourceIds

        : undefined,

    confidence,
  };
}