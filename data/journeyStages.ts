export interface JourneyStageOption {
    id: string;
    emoji: string;
    title: string;
    description: string;
  }
  
  export const journeyStageOptions: JourneyStageOption[] = [
    {
      id: "concerned",
      emoji: "🌱",
      title: "We're concerned and looking for answers",
      description:
        "We're noticing developmental differences and want to better understand what they might mean.",
    },
    {
      id: "evaluation",
      emoji: "🩺",
      title: "We're waiting for an evaluation",
      description:
        "We've started the evaluation process or are waiting for an appointment.",
    },
    {
      id: "diagnosis",
      emoji: "💙",
      title: "We recently received a diagnosis",
      description:
        "We're learning what the diagnosis means and deciding on next steps.",
    },
    {
      id: "therapies",
      emoji: "🧩",
      title: "We're exploring therapies",
      description:
        "We're researching therapy options and support services for our child.",
    },
    {
      id: "school",
      emoji: "🏫",
      title: "We're navigating school services",
      description:
        "We're working with our child's school on supports such as an IEP or 504 Plan.",
    },
    {
      id: "adulthood",
      emoji: "🚀",
      title: "We're planning for adulthood",
      description:
        "We're preparing for higher education, employment, independent living, and long-term planning.",
    },
  ];