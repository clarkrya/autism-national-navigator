export interface PriorityOption {
  id: string;
  icon: string;
  title: string;
  description: string;
}

export const priorityOptions: PriorityOption[] = [
  {
    id: "evaluation",
    icon: "🔍",
    title: "Getting an autism evaluation",
    description:
      "We need help getting an evaluation or understanding the diagnostic process.",
  },

  {
    id: "therapy",
    icon: "🩺",
    title: "Finding or improving therapy",
    description:
      "We need help finding therapy, understanding therapy options, or addressing a gap in our child's current therapy support.",
  },

  {
    id: "school",
    icon: "🏫",
    title: "School & IEP support",
    description:
      "We need help with a school-related concern, educational services, IEP/504 support, or communicating with the school.",
  },

  {
    id: "financial",
    icon: "💰",
    title: "Paying for care",
    description:
      "We need help paying for therapy, evaluations, equipment, services, or other autism-related expenses.",
  },

  {
    id: "insurance",
    icon: "🛡️",
    title: "Insurance & coverage",
    description:
      "We need help getting insurance, understanding what is covered, dealing with a denial, authorization, claims, or other insurance issues.",
  },

  {
    id: "education",
    icon: "📚",
    title: "Learning about autism",
    description:
      "We want reliable information so we can better understand autism and support our child.",
  },

  {
    id: "community",
    icon: "🤝",
    title: "Family & community support",
    description:
      "We'd like to connect with support groups, community resources, or other families.",
  },

  {
    id: "unsure",
    icon: "❤️",
    title: "I'm not sure where to start",
    description:
      "We're not sure what kind of help we need yet and want help figuring out the best first step.",
  },
];