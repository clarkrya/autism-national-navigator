export interface SupportOption {
    id: string;
    label: string;
  }
  
  export const supportOptions: SupportOption[] = [
    {
      id: "early-intervention",
      label: "Early Intervention",
    },
    {
      id: "speech",
      label: "Speech Therapy",
    },
    {
      id: "occupational",
      label: "Occupational Therapy",
    },
    {
      id: "physical",
      label: "Physical Therapy",
    },
    {
      id: "aba",
      label: "ABA / Behavioral Therapy",
    },
    {
      id: "mental-health",
      label: "Mental Health Counseling",
    },
    {
      id: "feeding",
      label: "Feeding Therapy",
    },
    {
      id: "school-services",
      label: "School Services (IEP / 504)",
    },
    {
      id: "private-school",
      label: "Private School",
    },
    {
      id: "homeschool",
      label: "Homeschool",
    },
    {
      id: "none",
      label: "None Yet",
    },
  ];