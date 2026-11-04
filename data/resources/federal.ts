/*
 * ============================================================
 * ADVANCED PERSONALIZED RESOURCES
 * FEDERAL TRUSTED RESOURCE CATALOG
 * ============================================================
 *
 * This file contains trusted national/federal resources used by
 * Myriad's Advanced Personalized Resources feature.
 *
 * IMPORTANT:
 *
 * Resource facts such as URLs, eligibility requirements,
 * benefits, application steps, and source information should
 * come from trusted sources.
 *
 * Personalization metadata such as topics, journey stages, and
 * age groups is used only by Myriad's recommendation engine to
 * determine relevance.
 *
 * Personalization metadata does not change the underlying facts
 * of a trusted resource.
 * ============================================================
 */


/*
 * ============================================================
 * PERSONALIZATION METADATA TYPES
 * ============================================================
 */

export type ResourceTopic =
  | "autism_information"
  | "developmental_monitoring"
  | "screening"
  | "evaluation"
  | "diagnosis"
  | "early_intervention"
  | "therapy"
  | "school"
  | "iep"
  | "insurance"
  | "medicaid"
  | "financial_support"
  | "family_support"
  | "transition"
  | "employment"
  | "independent_living"
  | "adult_services";


export type ResourceJourneyStage =
  | "concerned"
  | "evaluating"
  | "diagnosed"
  | "services"
  | "school"
  | "transition"
  | "adult";


export type ResourceAgeGroup =
  | "early_childhood"
  | "school_age"
  | "teen"
  | "adult";


/*
 * ============================================================
 * TRUSTED RESOURCE TYPE
 * ============================================================
 */

export type TrustedResource = {
  id: string;

  title: string;

  type:
    | "grant"
    | "government"
    | "insurance"
    | "therapy"
    | "school"
    | "financial"
    | "support"
    | "other";

  description: string;

  whyItMayHelp: string;

  eligibility: string[];

  whatItMayCover: string[];

  applicationSteps: string[];

  documentsNeeded: string[];

  url: string;

  sourceName: string;

  sourceType:
    | "government"
    | "nonprofit"
    | "foundation"
    | "healthcare"
    | "other";

  lastVerified: string;

  /*
   * ----------------------------------------------------------
   * PERSONALIZATION METADATA
   * ----------------------------------------------------------
   *
   * These fields are used only by the recommendation engine.
   *
   * They do not represent eligibility requirements or guarantee
   * that a resource applies to a particular family.
   */

  topics?: ResourceTopic[];

  journeyStages?: ResourceJourneyStage[];

  ageGroups?: ResourceAgeGroup[];

  states?: string[];
};


/*
 * ============================================================
 * FEDERAL / NATIONAL TRUSTED RESOURCES
 * ============================================================
 */

export const federalResources: TrustedResource[] = [

  /*
   * ----------------------------------------------------------
   * CDC — AUTISM SCREENING AND DIAGNOSIS
   * ----------------------------------------------------------
   */

  {
    id:
      "cdc-autism-screening-diagnosis",

    title:
      "Autism Screening and Diagnosis",

    type:
      "government",

    description:
      "CDC information for families about developmental monitoring, developmental screening, autism screening, formal developmental evaluation, and the autism diagnostic process.",

    whyItMayHelp:
      "This resource can help families understand the steps that may occur when developmental concerns lead to autism screening or a formal developmental evaluation.",

    eligibility: [
      "Information is publicly available.",
      "No program enrollment is required to review this resource."
    ],

    whatItMayCover: [
      "Developmental monitoring.",
      "Developmental screening.",
      "Autism screening.",
      "Formal developmental evaluation.",
      "Information about the autism diagnostic process."
    ],

    applicationSteps: [
      "Review the information about developmental monitoring and screening.",
      "Review what may happen when additional evaluation is recommended.",
      "Discuss developmental concerns, screening, or evaluation questions with your child's healthcare provider."
    ],

    documentsNeeded: [],

    url:
      "https://www.cdc.gov/autism/diagnosis/index.html",

    sourceName:
      "Centers for Disease Control and Prevention",

    sourceType:
      "government",

    lastVerified:
      "2026-09-16",

    topics: [
      "developmental_monitoring",
      "screening",
      "evaluation",
      "diagnosis"
    ],

    journeyStages: [
      "concerned",
      "evaluating"
    ],

    ageGroups: [
      "early_childhood",
      "school_age",
      "teen"
    ]
  },


  /*
   * ----------------------------------------------------------
   * HHS — AUTISM INFORMATION
   * ----------------------------------------------------------
   */

  {
    id:
      "hhs-autism-information",

    title:
      "Autism Information and Resources",

    type:
      "government",

    description:
      "Federal autism information and resources from the U.S. Department of Health and Human Services, including information about signs, screening and diagnosis, services, research, and support.",

    whyItMayHelp:
      "This resource can help families understand autism-related information, find additional federal resources, and identify areas of support that may be relevant to their family's needs.",

    eligibility: [
      "Information is publicly available.",
      "No program enrollment is required to review this resource."
    ],

    whatItMayCover: [
      "General autism information.",
      "Signs and early detection.",
      "Screening and diagnosis.",
      "Resources for parents and families.",
      "Treatment and services information.",
      "Federal autism programs and research resources."
    ],

    applicationSteps: [
      "Review the autism information and resources available through HHS.",
      "Identify information or programs that may match your family's current needs.",
      "Follow links to the appropriate federal agency or program for additional information."
    ],

    documentsNeeded: [],

    url:
      "https://www.hhs.gov/programs/topic-sites/autism/index.html",

    sourceName:
      "U.S. Department of Health and Human Services",

    sourceType:
      "government",

    lastVerified:
      "2026-09-19",

    topics: [
      "autism_information",
      "family_support"
    ],

    journeyStages: [
      "concerned",
      "evaluating",
      "diagnosed",
      "services",
      "school",
      "transition",
      "adult"
    ],

    ageGroups: [
      "early_childhood",
      "school_age",
      "teen",
      "adult"
    ]
  },


  /*
   * ----------------------------------------------------------
   * SUPPLEMENTAL SECURITY INCOME
   * ----------------------------------------------------------
   */

  {
    id:
      "ssa-ssi",

    title:
      "Supplemental Security Income (SSI)",

    type:
      "financial",

    description:
      "A federal program administered by the Social Security Administration that provides payments to people with limited income and resources who meet disability requirements.",

    whyItMayHelp:
      "Families seeking financial assistance may want to determine whether their child could qualify for SSI based on the Social Security Administration's disability and financial requirements.",

    eligibility: [
      "Eligibility depends on Social Security disability requirements.",
      "Income and resource requirements apply.",
      "The Social Security Administration makes the eligibility determination."
    ],

    whatItMayCover: [
      "Monthly financial assistance for individuals who meet program requirements."
    ],

    applicationSteps: [
      "Review the current SSI eligibility requirements.",
      "Gather information about the child's medical condition and treatment.",
      "Gather household income and resource information.",
      "Contact the Social Security Administration to begin the application process."
    ],

    documentsNeeded: [
      "Medical information",
      "Treatment information",
      "Household income information",
      "Resource information",
      "Identification documents"
    ],

    url:
      "https://www.ssa.gov/ssi/",

    sourceName:
      "Social Security Administration",

    sourceType:
      "government",

    lastVerified:
      "2026-08-10",

    topics: [
      "financial_support"
    ],

    journeyStages: [
      "diagnosed",
      "services",
      "school",
      "transition",
      "adult"
    ],

    ageGroups: [
      "early_childhood",
      "school_age",
      "teen",
      "adult"
    ]
  },


  /*
   * ----------------------------------------------------------
   * MEDICAID
   * ----------------------------------------------------------
   */

  {
    id:
      "medicaid",

    title:
      "Medicaid",

    type:
      "government",

    description:
      "A joint federal and state health coverage program that provides health coverage to eligible individuals and families.",

    whyItMayHelp:
      "Families concerned about the cost of healthcare or autism-related services may want to determine whether their child qualifies for Medicaid or related state programs.",

    eligibility: [
      "Eligibility requirements vary by state.",
      "Income and other eligibility requirements may apply.",
      "The state Medicaid agency determines eligibility."
    ],

    whatItMayCover: [
      "Health coverage and services covered under the applicable state Medicaid program."
    ],

    applicationSteps: [
      "Review your state's Medicaid eligibility requirements.",
      "Determine whether your child may qualify.",
      "Apply through the appropriate state Medicaid agency.",
      "Confirm which services are covered by your specific plan."
    ],

    documentsNeeded: [
      "Household income information",
      "Identification information",
      "Household information",
      "Other documentation requested by the state"
    ],

    url:
      "https://www.medicaid.gov/",

    sourceName:
      "Medicaid.gov",

    sourceType:
      "government",

    lastVerified:
      "2026-08-10",

    topics: [
      "insurance",
      "medicaid",
      "financial_support"
    ],

    journeyStages: [
      "concerned",
      "evaluating",
      "diagnosed",
      "services",
      "school",
      "transition",
      "adult"
    ],

    ageGroups: [
      "early_childhood",
      "school_age",
      "teen",
      "adult"
    ]
  }
];