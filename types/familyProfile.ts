
export interface FamilyProfile {
  childId?: string;

  childName: string;
  childAge: string;
  state: string;
  journeyStage: string;
  supports: string[];
  priority: string;
  insurance: string;
  notes: string;

  // Reusable child information
  childDetails?: {
    diagnoses?: string;
    communicationPreferences?: string;
    strengths?: string;
    challenges?: string;
    accommodations?: string;
    familyPriorities?: string;
  };

  // Healthcare and therapy information
  careTeam?: {
    primaryCareProvider?: string;
    specialists?: string;
    therapists?: string;
    currentTherapies?: string;
    medications?: string;
  };

  // School and educational support
  education?: {
    schoolName?: string;
    gradeLevel?: string;
    iepStatus?: string;
    schoolSupports?: string;
    educationalGoals?: string;
  };
}
