import type {
    FamilyProfile,
  } from "../types/familyProfile";
  
  import type {
    PersonalizedJourney,
  } from "./ai/journeyTypes";
  
  
  const STORAGE_KEY =
    "ajn_pending_journey";
  
  
  export type PendingJourney = {
    familyProfile:
      FamilyProfile;
  
    personalizedJourney:
      PersonalizedJourney;
  
    createdAt:
      number;
  };
  
  
  /*
   * ============================================================
   * SAVE PENDING JOURNEY
   * ============================================================
   *
   * Used for guest users before they create an account or log in.
   *
   * This is temporary session state only.
   * Permanent Journeys belong in Firestore.
   * ============================================================
   */
  
  export function savePendingJourney(
    familyProfile:
      FamilyProfile,
  
    personalizedJourney:
      PersonalizedJourney
  ): void {
  
    if (
      typeof window ===
      "undefined"
    ) {
  
      return;
  
    }
  
  
    const pendingJourney:
      PendingJourney = {
  
      familyProfile,
  
      personalizedJourney,
  
      createdAt:
        Date.now(),
    };
  
  
    sessionStorage.setItem(
      STORAGE_KEY,
  
      JSON.stringify(
        pendingJourney
      )
    );
  
  }
  
  
  /*
   * ============================================================
   * GET PENDING JOURNEY
   * ============================================================
   */
  
  export function getPendingJourney():
    PendingJourney | null {
  
    if (
      typeof window ===
      "undefined"
    ) {
  
      return null;
  
    }
  
  
    const raw =
      sessionStorage.getItem(
        STORAGE_KEY
      );
  
  
    if (
      !raw
    ) {
  
      return null;
  
    }
  
  
    try {
  
      const parsed =
        JSON.parse(
          raw
        ) as PendingJourney;
  
  
      if (
        !parsed ||
        !parsed.familyProfile ||
        !parsed.personalizedJourney
      ) {
  
        return null;
  
      }
  
  
      return parsed;
  
    } catch {
  
      return null;
  
    }
  
  }
  
  
  /*
   * ============================================================
   * CLEAR PENDING JOURNEY
   * ============================================================
   */
  
  export function clearPendingJourney():
    void {
  
    if (
      typeof window ===
      "undefined"
    ) {
  
      return;
  
    }
  
  
    sessionStorage.removeItem(
      STORAGE_KEY
    );
  
  }