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
  
    states?: string[];
  };
  
  export const federalResources: TrustedResource[] = [
    {
      id: "usa-autism-support",
  
      title:
        "Autism Resources and Information",
  
      type: "government",
  
      description:
        "Federal information and resources related to autism, including information about services, research, and support.",
  
      whyItMayHelp:
        "This can help families understand available autism-related resources and identify additional areas of support.",
  
      eligibility: [
        "Resource information is publicly available.",
        "Specific programs may have their own eligibility requirements."
      ],
  
      whatItMayCover: [
        "Information about autism-related services and programs.",
        "Connections to additional government resources."
      ],
  
      applicationSteps: [
        "Review the available autism resources.",
        "Identify programs that may match your family's needs.",
        "Review the individual program's eligibility and application requirements."
      ],
  
      documentsNeeded: [],
  
      url:
        "https://www.autism.gov/",
  
      sourceName:
        "Autism.gov",
  
      sourceType:
        "government",
  
      lastVerified:
        "2026-08-10"
    },
  
    {
      id: "ssa-ssi",
  
      title:
        "Supplemental Security Income (SSI)",
  
      type: "financial",
  
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
        "2026-08-10"
    },
  
    {
      id: "medicaid",
  
      title:
        "Medicaid",
  
      type: "government",
  
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
        "2026-08-10"
    }
  ];