import type {
    MeetingRecommendation,
    MeetingType,
  } from "../../types/meetingPreparation";
  
  export type JourneySignalSource =
    | "current_focus"
    | "next_step"
    | "action"
    | "task";
  
  export type JourneySignal = {
    source: JourneySignalSource;
    text: string;
    weight: number;
  };
  
  export type MeetingStage =
    | "before"
    | "during"
    | "after"
    | "unknown";
  
  export type MeetingPreparationConcept =
    | "appointment_expectations"
    | "appointment_scheduling"
    | "clinic_requirements"
    | "forms_questionnaires"
    | "records"
    | "evaluation_reports"
    | "school_records"
    | "therapy_records"
    | "medications"
    | "family_questions"
    | "concerns_examples"
    | "strengths"
    | "developmental_history"
    | "family_history"
    | "communication"
    | "sensory_accommodations"
    | "current_supports"
    | "results"
    | "written_report"
    | "recommendations"
    | "referrals"
    | "follow_up"
    | "contact"
    | "responsibilities"
    | "progress"
    | "goals"
    | "school_supports"
    | "insurance"
    | "network"
    | "authorization"
    | "costs";
  
  export type PrioritizedMeetingTemplateItem = {
    id: string;
    text: string;
    score: number;
    prioritized: boolean;
    matchedConcepts: string[];
  };
  
  export type PrioritizedMeetingTemplateSection = {
    prioritized: PrioritizedMeetingTemplateItem[];
    additional: PrioritizedMeetingTemplateItem[];
  };
  
  export type PrioritizedMeetingTemplate = {
    meetingType: MeetingType;
    title: string;
    description: string;
    recommendation: MeetingRecommendation;
    priorities: PrioritizedMeetingTemplateSection;
    questions: PrioritizedMeetingTemplateSection;
    bringItems: PrioritizedMeetingTemplateSection;
    informationToShare: PrioritizedMeetingTemplateSection;
    beforeYouLeave: PrioritizedMeetingTemplateSection;
  };