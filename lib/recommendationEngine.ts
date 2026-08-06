import { FamilyProfile } from "../types/familyProfile";

export interface RoadmapTask {
  id: string;
  title: string;
  description: string;
  estimatedTime: string;
  category: string;
  completed: boolean;
  actionButton: string;
}

export function buildRoadmap(
  profile: FamilyProfile
): RoadmapTask[] {
  const tasks: RoadmapTask[] = [];

  // -----------------------------
  // EARLY CHILDHOOD + EVALUATION
  // -----------------------------
  if (
    profile.childAge === "under-3" &&
    profile.priority === "evaluation"
  ) {
    tasks.push(
      {
        id: "early-intervention",
        title: "Contact Early Intervention",
        description:
          "Early Intervention services can begin before a formal autism diagnosis and provide developmental support as early as possible.",
        estimatedTime: "10 minutes",
        category: "Evaluation",
        completed: false,
        actionButton: "Start Here",
      },
      {
        id: "schedule-evaluation",
        title: "Schedule a Developmental Evaluation",
        description:
          "Ask your pediatrician for a referral or locate a developmental specialist experienced with autism evaluations.",
        estimatedTime: "20 minutes",
        category: "Evaluation",
        completed: false,
        actionButton: "Start Here",
      },
      {
        id: "evaluation-checklist",
        title: "Download an Evaluation Checklist",
        description:
          "Prepare observations and questions before your child's evaluation appointment.",
        estimatedTime: "15 minutes",
        category: "Evaluation",
        completed: false,
        actionButton: "Start Here",
      }
    );
  }

  // -----------------------------
  // THERAPY
  // -----------------------------
  if (profile.priority === "therapy") {
    tasks.push(
      {
        id: "therapy-options",
        title: "Explore Therapy Options",
        description:
          "Learn about speech, occupational, physical, behavioral, and feeding therapies available for your child.",
        estimatedTime: "15 minutes",
        category: "Therapy",
        completed: false,
        actionButton: "Start Here",
      },
      {
        id: "find-provider",
        title: "Find Therapy Providers",
        description:
          "Create a list of therapy providers that accept your insurance or serve your area.",
        estimatedTime: "20 minutes",
        category: "Therapy",
        completed: false,
        actionButton: "Start Here",
      }
    );
  }

  // -----------------------------
  // SCHOOL
  // -----------------------------
  if (profile.priority === "school") {
    tasks.push(
      {
        id: "iep-guide",
        title: "Learn About IEPs and 504 Plans",
        description:
          "Understand educational services and accommodations available through your child's school.",
        estimatedTime: "20 minutes",
        category: "Education",
        completed: false,
        actionButton: "Start Here",
      },
      {
        id: "school-meeting",
        title: "Prepare for Your School Meeting",
        description:
          "Gather documents and questions before meeting with your child's educational team.",
        estimatedTime: "15 minutes",
        category: "Education",
        completed: false,
        actionButton: "Start Here",
      }
    );
  }

  // -----------------------------
  // FINANCIAL
  // -----------------------------
  if (profile.priority === "financial") {
    tasks.push(
      {
        id: "insurance-benefits",
        title: "Review Insurance Benefits",
        description:
          "Understand therapy coverage, prior authorizations, deductibles, and out-of-pocket costs.",
        estimatedTime: "20 minutes",
        category: "Financial",
        completed: false,
        actionButton: "Start Here",
      },
      {
        id: "grant-programs",
        title: "Research Financial Assistance Programs",
        description:
          "Explore grants and assistance programs that may help cover autism-related services.",
        estimatedTime: "25 minutes",
        category: "Financial",
        completed: false,
        actionButton: "Start Here",
      }
    );
  }

  // -----------------------------
  // EDUCATION
  // -----------------------------
  if (profile.priority === "education") {
    tasks.push(
      {
        id: "autism-basics",
        title: "Learn the Basics of Autism",
        description:
          "Start with trusted educational resources to better understand autism and available supports.",
        estimatedTime: "20 minutes",
        category: "Education",
        completed: false,
        actionButton: "Start Here",
      }
    );
  }

  // -----------------------------
  // COMMUNITY
  // -----------------------------
  if (profile.priority === "community") {
    tasks.push(
      {
        id: "support-groups",
        title: "Connect with Other Families",
        description:
          "Find local or online autism parent support groups and community organizations.",
        estimatedTime: "20 minutes",
        category: "Community",
        completed: false,
        actionButton: "Start Here",
      }
    );
  }

  // -----------------------------
  // UNSURE WHERE TO START
  // -----------------------------
  if (profile.priority === "unsure") {
    tasks.push(
      {
        id: "first-steps",
        title: "Start with a Personalized Action Plan",
        description:
          "We'll guide you through the first steps based on your child's age and current journey.",
        estimatedTime: "10 minutes",
        category: "Getting Started",
        completed: false,
        actionButton: "Start Here",
      }
    );
  }

  // -----------------------------
  // FALLBACK
  // -----------------------------
  if (tasks.length === 0) {
    tasks.push({
      id: "getting-started",
      title: "Start Your Autism Journey",
      description:
        "We'll help you identify the next best steps for your family's situation.",
      estimatedTime: "10 minutes",
      category: "General",
      completed: false,
      actionButton: "Start Here",
    });
  }

  return tasks;
}