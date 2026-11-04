import type {
  JourneySignalSource,
  MeetingPreparationConcept,
} from "./meetingPrioritizationTypes";

export const SOURCE_WEIGHTS: Record<
  JourneySignalSource,
  number
> = {
  current_focus: 4,
  next_step: 5,
  action: 3,
  task: 2,
};

export const MINIMUM_PRIORITY_SCORE = 4;

export const MINIMUM_MULTI_CONCEPT_SCORE = 3;

export const MAXIMUM_PRIORITIZED_PER_SECTION = 3;

export const CONCEPT_TERMS: Record<
  MeetingPreparationConcept,
  string[]
> = {
  appointment_expectations: [
    "what to expect",
    "prepare for the appointment",
    "prepare for the visit",
    "prepare for the evaluation",
    "evaluation itself",
    "appointment preparation",
    "visit preparation",
    "what happens during",
    "what will happen during",
  ],

  appointment_scheduling: [
    "schedule an appointment",
    "schedule the appointment",
    "schedule a visit",
    "schedule the visit",
    "appointment date",
    "intake date",
    "intake appointment",
    "secure an intake",
    "request intake",
    "join the waitlist",
    "waitlist",
    "next appointment",
  ],

  clinic_requirements: [
    "clinic needs",
    "clinic requires",
    "clinic requests",
    "submission instructions",
    "intake requirements",
    "appointment instructions",
    "provide before the appointment",
    "bring to the appointment",
    "required before",
  ],

  forms_questionnaires: [
    "complete a form",
    "complete forms",
    "fill out a form",
    "fill out forms",
    "questionnaire",
    "questionnaires",
    "paperwork",
    "intake packet",
    "intake forms",
  ],

  records: [
    "medical records",
    "health records",
    "send records",
    "submit records",
    "upload records",
    "request records",
    "provide records",
    "bring records",
    "copies of records",
  ],

  evaluation_reports: [
    "evaluation report",
    "evaluation reports",
    "previous evaluation",
    "previous evaluations",
    "assessment report",
    "assessment reports",
    "psychological report",
    "diagnostic report",
  ],

  school_records: [
    "school record",
    "school records",
    "iep",
    "504 plan",
    "educational evaluation",
    "school evaluation",
    "school progress report",
  ],

  therapy_records: [
    "therapy report",
    "therapy reports",
    "therapy evaluation",
    "therapy evaluations",
    "therapy progress",
    "therapist report",
  ],

  medications: [
    "medication",
    "medications",
    "medicine",
    "medicines",
    "supplement",
    "supplements",
    "medication list",
  ],

  family_questions: [
    "questions for",
    "questions to ask",
    "questions about",
    "family questions",
    "write down questions",
    "list of questions",
    "questions you have",
  ],

  concerns_examples: [
    "concern",
    "concerns",
    "specific examples",
    "examples of",
    "observations",
    "behavior concerns",
    "behaviors",
    "changes noticed",
    "changes you have noticed",
  ],

  strengths: [
    "strength",
    "strengths",
    "interests",
    "preferences",
    "things going well",
    "areas of strength",
  ],

  developmental_history: [
    "developmental history",
    "development history",
    "developmental milestone",
    "developmental milestones",
    "early development",
  ],

  family_history: [
    "family history",
    "family medical history",
    "family developmental history",
    "relevant family history",
  ],

  communication: [
    "speech",
    "language",
    "aac",
    "aac device",
    "communication device",
    "communication support",
    "communication supports",
    "communication system",
    "communication systems",
  ],

  sensory_accommodations: [
    "sensory",
    "sensory needs",
    "sensory support",
    "sensory supports",
    "accommodation",
    "accommodations",
    "comfort item",
    "comfort items",
    "accessibility needs",
  ],

  current_supports: [
    "current therapy",
    "current therapies",
    "current services",
    "current supports",
    "services currently receiving",
    "supports currently receiving",
  ],

  results: [
    "evaluation results",
    "assessment results",
    "results appointment",
    "results discussion",
    "review the results",
    "discuss the results",
    "receive the results",
  ],

  written_report: [
    "written report",
    "final report",
    "evaluation report",
    "assessment report",
    "copy of the report",
  ],

  recommendations: [
    "recommendation",
    "recommendations",
    "recommended next steps",
    "next recommendations",
    "provider recommends",
    "team recommends",
  ],

  referrals: [
    "referral",
    "referrals",
    "referred to",
    "referral transmission",
    "referral was sent",
    "referral receipt",
  ],

  follow_up: [
    "follow up",
    "follow-up",
    "follow-up appointment",
    "follow-up meeting",
    "schedule follow-up",
    "schedule a follow-up",
    "follow up after",
    "follow-up after",
    "check back",
  ],

  contact: [
    "who to contact",
    "contact person",
    "contact information",
    "contact the clinic",
    "contact the provider",
    "contact the office",
    "call the clinic",
    "call the provider",
  ],

  responsibilities: [
    "responsible for",
    "responsibility",
    "who will complete",
    "who will handle",
    "family needs to",
    "provider will",
    "clinic will",
  ],

  progress: [
    "review progress",
    "progress review",
    "monitor progress",
    "track progress",
    "progress toward",
  ],

  goals: [
    "therapy goals",
    "treatment goals",
    "school goals",
    "iep goals",
    "family goals",
    "goal setting",
    "priority goals",
    "desired outcomes",
  ],

  school_supports: [
    "school support",
    "school supports",
    "educational support",
    "educational supports",
    "classroom support",
    "classroom supports",
    "accommodations at school",
    "iep services",
    "504 accommodations",
  ],

  insurance: [
    "insurance",
    "insurance plan",
    "health plan",
    "benefits",
    "benefit",
    "coverage",
  ],

  network: [
    "in network",
    "in-network",
    "out of network",
    "out-of-network",
    "network provider",
    "network providers",
  ],

  authorization: [
    "authorization",
    "prior authorization",
    "preauthorization",
    "pre-authorization",
    "approval required",
    "requires approval",
  ],

  costs: [
    "cost",
    "costs",
    "copay",
    "co-pay",
    "coinsurance",
    "deductible",
    "out of pocket",
    "out-of-pocket",
  ],
};

export const TEMPLATE_ITEM_CONCEPTS: Record<
  string,
  MeetingPreparationConcept[]
> = {
  // ============================================================
  // DIAGNOSTIC / EVALUATION
  // ============================================================

  "evaluation-understand-appointment": [
    "appointment_expectations",
  ],

  "evaluation-identify-concerns-strengths": [
    "family_questions",
    "concerns_examples",
    "strengths",
  ],

  "evaluation-organize-records": [
    "records",
    "evaluation_reports",
    "school_records",
    "therapy_records",
  ],

  "evaluation-understand-results-next-steps": [
    "results",
    "written_report",
    "recommendations",
    "follow_up",
  ],

  "evaluation-question-what-to-expect": [
    "appointment_expectations",
  ],

  "evaluation-question-duration": [
    "appointment_expectations",
  ],

  "evaluation-question-who-is-involved": [
    "appointment_expectations",
  ],

  "evaluation-question-assessment-process": [
    "appointment_expectations",
  ],

  "evaluation-question-before-appointment": [
    "clinic_requirements",
    "forms_questionnaires",
  ],

  "evaluation-question-helpful-records": [
    "records",
    "evaluation_reports",
    "school_records",
    "therapy_records",
  ],

  "evaluation-question-medication-instructions": [
    "medications",
  ],

  "evaluation-question-comfort-items": [
    "sensory_accommodations",
  ],

  "evaluation-question-accommodations": [
    "sensory_accommodations",
    "communication",
  ],

  "evaluation-question-family-concerns": [
    "family_questions",
    "concerns_examples",
  ],

  "evaluation-question-results-discussion": [
    "results",
  ],

  "evaluation-question-written-report": [
    "written_report",
    "results",
  ],

  "evaluation-question-results-contact": [
    "results",
    "contact",
  ],

  "evaluation-question-recommendations": [
    "recommendations",
    "follow_up",
  ],

  "evaluation-question-referrals": [
    "recommendations",
    "referrals",
    "follow_up",
  ],

  "evaluation-bring-clinic-instructions": [
    "clinic_requirements",
    "forms_questionnaires",
  ],

  "evaluation-bring-insurance-identification": [
    "insurance",
  ],

  "evaluation-bring-medication-list": [
    "medications",
  ],

  "evaluation-bring-previous-evaluations": [
    "evaluation_reports",
    "records",
  ],

  "evaluation-bring-medical-records": [
    "records",
  ],

  "evaluation-bring-school-records": [
    "school_records",
  ],

  "evaluation-bring-therapy-records": [
    "therapy_records",
    "current_supports",
  ],

  "evaluation-bring-support-items": [
    "sensory_accommodations",
    "communication",
  ],

  "evaluation-bring-family-question-list": [
    "family_questions",
    "concerns_examples",
  ],

  "evaluation-share-reason": [
    "concerns_examples",
  ],

  "evaluation-share-family-questions": [
    "family_questions",
  ],

  "evaluation-share-strengths-interests": [
    "strengths",
  ],

  "evaluation-share-developmental-concerns": [
    "concerns_examples",
    "developmental_history",
  ],

  "evaluation-share-specific-examples": [
    "concerns_examples",
  ],

  "evaluation-share-communication": [
    "communication",
  ],

  "evaluation-share-social": [
    "concerns_examples",
  ],

  "evaluation-share-sensory": [
    "sensory_accommodations",
  ],

  "evaluation-share-learning-attention": [
    "concerns_examples",
    "school_records",
  ],

  "evaluation-share-daily-living": [
    "concerns_examples",
  ],

  "evaluation-share-developmental-history": [
    "developmental_history",
  ],

  "evaluation-share-medical-history": [
    "medications",
    "records",
  ],

  "evaluation-share-current-supports": [
    "current_supports",
  ],

  "evaluation-share-previous-evaluations": [
    "evaluation_reports",
  ],

  "evaluation-share-family-history": [
    "family_history",
  ],

  "evaluation-share-accommodations": [
    "sensory_accommodations",
    "communication",
  ],

  "evaluation-share-other-questions": [
    "family_questions",
  ],

  "evaluation-close-next-process-step": [
    "follow_up",
    "recommendations",
  ],

  "evaluation-close-additional-information": [
    "records",
    "forms_questionnaires",
    "clinic_requirements",
  ],

  "evaluation-close-results-timing": [
    "results",
    "follow_up",
  ],

  "evaluation-close-written-report": [
    "written_report",
    "results",
  ],

  "evaluation-close-contact": [
    "contact",
    "follow_up",
  ],

  "evaluation-close-recommendations": [
    "recommendations",
    "referrals",
  ],

  "evaluation-close-follow-up": [
    "follow_up",
  ],

  // ============================================================
  // DOCTOR / SPECIALIST
  // ============================================================

  doctor_priority_reason: [
    "concerns_examples",
    "family_questions",
  ],

  doctor_priority_questions: [
    "family_questions",
  ],

  doctor_priority_history: [
    "records",
    "evaluation_reports",
    "medications",
  ],

  doctor_priority_supports: [
    "current_supports",
    "communication",
    "sensory_accommodations",
  ],

  doctor_question_expectations: [
    "appointment_expectations",
  ],

  doctor_question_previsit: [
    "clinic_requirements",
    "forms_questionnaires",
    "records",
  ],

  doctor_question_questions: [
    "family_questions",
    "concerns_examples",
  ],

  doctor_question_followup: [
    "follow_up",
  ],

  doctor_question_contact: [
    "contact",
  ],

  doctor_bring_records: [
    "records",
    "evaluation_reports",
  ],

  doctor_bring_medications: [
    "medications",
  ],

  doctor_bring_questions: [
    "family_questions",
    "concerns_examples",
  ],

  doctor_bring_supports: [
    "communication",
    "sensory_accommodations",
  ],

  doctor_share_concerns: [
    "concerns_examples",
  ],

  doctor_share_history: [
    "developmental_history",
    "records",
  ],

  doctor_share_supports: [
    "current_supports",
  ],

  doctor_leave_recommendations: [
    "recommendations",
  ],

  doctor_leave_referrals: [
    "referrals",
  ],

  doctor_leave_followup: [
    "follow_up",
  ],

  doctor_leave_contact: [
    "contact",
  ],

  // ============================================================
  // THERAPY
  // ============================================================

  therapy_priority_goals: [
    "goals",
  ],

  therapy_priority_progress: [
    "progress",
  ],

  therapy_priority_concerns: [
    "concerns_examples",
  ],

  therapy_priority_supports: [
    "current_supports",
    "communication",
    "sensory_accommodations",
  ],

  therapy_question_progress: [
    "progress",
  ],

  therapy_question_goals: [
    "goals",
  ],

  therapy_question_home: [
    "responsibilities",
  ],

  therapy_question_contact: [
    "contact",
  ],

  therapy_bring_reports: [
    "therapy_records",
    "evaluation_reports",
  ],

  therapy_bring_questions: [
    "family_questions",
  ],

  therapy_bring_supports: [
    "communication",
    "sensory_accommodations",
  ],

  therapy_share_progress: [
    "progress",
  ],

  therapy_share_concerns: [
    "concerns_examples",
  ],

  therapy_share_goals: [
    "goals",
  ],

  therapy_leave_goals: [
    "goals",
  ],

  therapy_leave_home: [
    "responsibilities",
  ],

  therapy_leave_followup: [
    "follow_up",
  ],

  therapy_leave_contact: [
    "contact",
  ],

  // ============================================================
  // SCHOOL / IEP
  // ============================================================

  school_priority_goals: [
    "goals",
    "school_supports",
  ],

  school_priority_supports: [
    "school_supports",
  ],

  school_priority_concerns: [
    "concerns_examples",
  ],

  school_priority_progress: [
    "progress",
    "school_records",
  ],

  school_question_progress: [
    "progress",
  ],

  school_question_supports: [
    "school_supports",
  ],

  school_question_goals: [
    "goals",
  ],

  school_question_responsibilities: [
    "responsibilities",
  ],

  school_question_followup: [
    "follow_up",
  ],

  school_bring_iep: [
    "school_records",
  ],

  school_bring_evaluations: [
    "school_records",
    "evaluation_reports",
  ],

  school_bring_questions: [
    "family_questions",
  ],

  school_share_strengths: [
    "strengths",
  ],

  school_share_concerns: [
    "concerns_examples",
  ],

  school_share_supports: [
    "school_supports",
    "current_supports",
  ],

  school_leave_goals: [
    "goals",
  ],

  school_leave_responsibilities: [
    "responsibilities",
  ],

  school_leave_followup: [
    "follow_up",
  ],

  school_leave_contact: [
    "contact",
  ],

  // ============================================================
  // INSURANCE / BENEFITS
  // ============================================================

  insurance_priority_coverage: [
    "insurance",
  ],

  insurance_priority_network: [
    "network",
  ],

  insurance_priority_authorization: [
    "authorization",
  ],

  insurance_priority_costs: [
    "costs",
  ],

  insurance_question_coverage: [
    "insurance",
  ],

  insurance_question_network: [
    "network",
  ],

  insurance_question_authorization: [
    "authorization",
  ],

  insurance_question_costs: [
    "costs",
  ],

  insurance_question_contact: [
    "contact",
  ],

  insurance_bring_plan: [
    "insurance",
  ],

  insurance_bring_referral: [
    "referrals",
    "authorization",
  ],

  insurance_bring_records: [
    "records",
  ],

  insurance_share_service: [
    "insurance",
    "authorization",
  ],

  insurance_share_provider: [
    "network",
  ],

  insurance_leave_reference: [
    "contact",
  ],

  insurance_leave_nextsteps: [
    "authorization",
    "responsibilities",
    "follow_up",
  ],

  insurance_leave_followup: [
    "follow_up",
  ],
};