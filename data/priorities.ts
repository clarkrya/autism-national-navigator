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
      title: "Finding therapies",
      description:
        "We're looking for therapy options and providers.",
    },
    {
      id: "school",
      icon: "🏫",
      title: "School & IEP support",
      description:
        "We need help navigating school services and educational planning.",
    },
    {
      id: "financial",
      icon: "💰",
      title: "Insurance & financial assistance",
      description:
        "We need help understanding insurance, Medicaid, grants, and financial resources.",
    },
    {
      id: "education",
      icon: "📚",
      title: "Learning about autism",
      description:
        "We want reliable information so we can better understand autism.",
    },
    {
      id: "community",
      icon: "🤝",
      title: "Family & community support",
      description:
        "We'd like to connect with support groups and other families.",
    },
    {
      id: "unsure",
      icon: "❤️",
      title: "I'm not sure where to start",
      description:
        "Help us figure out the best first steps.",
    },
  ];