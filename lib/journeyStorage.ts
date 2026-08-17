import type { FamilyProfile } from "../types/familyProfile";
import type { PersonalizedJourney } from "./ai/journeyTypes";

const STORAGE_KEY = "ajn_pending_journey";

export type PendingJourney = {
  familyProfile: FamilyProfile;
  personalizedJourney: PersonalizedJourney;
  createdAt: number;
};

export function savePendingJourney(
  familyProfile: FamilyProfile,
  personalizedJourney: PersonalizedJourney
): void {
  if (typeof window === "undefined") {
    return;
  }

  const pendingJourney: PendingJourney = {
    familyProfile,
    personalizedJourney,
    createdAt: Date.now(),
  };

  sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(pendingJourney)
  );
}

export function getPendingJourney():
  | PendingJourney
  | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const stored =
      sessionStorage.getItem(STORAGE_KEY);

    if (!stored) {
      return null;
    }

    return JSON.parse(
      stored
    ) as PendingJourney;
  } catch (error) {
    console.error(
      "Unable to restore pending journey:",
      error
    );

    return null;
  }
}

export function clearPendingJourney(): void {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.removeItem(
    STORAGE_KEY
  );
}