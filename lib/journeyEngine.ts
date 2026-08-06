export type JourneyAnswers = {
  age: number;
  state: string;
  diagnosisStatus: "new" | "existing";
  insurance: "private" | "medicaid" | "none";
  priorities: string[];
};

export type Task = {
  id: string;
  title: string;
  description: string;
  priority: "High" | "Medium" | "Low";
  estimatedTime: string;
  completed: boolean;
  resourceLink?: string;
};

export type Milestone = {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  current: boolean;
  tasks: Task[];
};

export function generateJourney(
  answers: JourneyAnswers
): Milestone[] {
  const milestones: Milestone[] = [
    {
      id: "medical",
      title: "Medical Evaluation",
      description:
        "Confirm diagnosis and establish your care team.",
      completed: true,
      current: false,
      tasks: [
        {
          id: "diagnosis",
          title: "Complete developmental evaluation",
          description:
            "Receive an official developmental evaluation and diagnosis.",
          priority: "High",
          estimatedTime: "2–3 hours",
          completed: true,
          resourceLink: "",
        },
      ],
    },
    {
      id: "insurance",
      title: "Insurance",
      description:
        "Understand and maximize your insurance benefits.",
      completed: true,
      current: false,
      tasks: [
        {
          id: "insurance-review",
          title: "Review insurance benefits",
          description:
            "Understand what autism services your insurance covers.",
          priority: "High",
          estimatedTime: "30 minutes",
          completed: true,
          resourceLink: "",
        },
      ],
    },
  ];

  if (answers.age <= 5) {
    milestones.push({
      id: "early-intervention",
      title: "Early Intervention",
      description:
        "Connect with early childhood intervention services.",
      completed: false,
      current: true,
      tasks: [
        {
          id: "ei-contact",
          title: "Contact Early Steps",
          description:
            "Reach out to your local Early Steps program.",
          priority: "High",
          estimatedTime: "20 minutes",
          completed: false,
          resourceLink: "",
        },
        {
          id: "ei-intake",
          title: "Schedule Intake Evaluation",
          description:
            "Complete the intake process for eligibility.",
          priority: "High",
          estimatedTime: "45 minutes",
          completed: false,
          resourceLink: "",
        },
        {
          id: "ei-paperwork",
          title: "Complete Required Paperwork",
          description:
            "Submit forms requested by the Early Steps team.",
          priority: "Medium",
          estimatedTime: "30 minutes",
          completed: false,
          resourceLink: "",
        },
      ],
    });
  } else {
    milestones.push({
      id: "education",
      title: "School Services",
      description:
        "Coordinate educational supports through your school district.",
      completed: false,
      current: true,
      tasks: [
        {
          id: "school-eval",
          title: "Request School Evaluation",
          description:
            "Ask your school district for a special education evaluation.",
          priority: "High",
          estimatedTime: "20 minutes",
          completed: false,
          resourceLink: "",
        },
        {
          id: "iep",
          title: "Discuss IEP Eligibility",
          description:
            "Meet with the school team to discuss supports.",
          priority: "High",
          estimatedTime: "1 hour",
          completed: false,
          resourceLink: "",
        },
      ],
    });
  }

  milestones.push({
    id: "community",
    title: "Community Support",
    description:
      "Connect with your local autism community.",
    completed: false,
    current: false,
    tasks: [
      {
        id: "support-group",
        title: "Find a Parent Support Group",
        description:
          "Join a local or online autism parent support community.",
        priority: "Medium",
        estimatedTime: "30 minutes",
        completed: false,
        resourceLink: "",
      },
    ],
  });

  milestones.push({
    id: "future",
    title: "Future Planning",
    description:
      "Prepare for future milestones and long-term independence.",
    completed: false,
    current: false,
    tasks: [
      {
        id: "future-plan",
        title: "Create a Long-Term Plan",
        description:
          "Document your family's long-term goals and priorities.",
        priority: "Low",
        estimatedTime: "1 hour",
        completed: false,
        resourceLink: "",
      },
    ],
  });

  return milestones;
}