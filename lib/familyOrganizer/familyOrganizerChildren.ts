import {
    getSavedChildren,
    type SavedChild,
  } from "../journeyRepository";
  
  import type {
    FamilyOrganizerChildReference,
  } from "./familyOrganizerTypes";
  
  /*
   * ============================================================
   * FAMILY ORGANIZER CHILDREN
   * ============================================================
   *
   * Provides the Family Organizer with the user's canonical
   * Myriad children.
   *
   * IMPORTANT:
   *
   * Family Organizer does NOT create separate child records.
   *
   * Existing child records remain the canonical source:
   *
   * users/{ownerUserId}/children/{childId}
   *
   * This file converts those existing child records into the
   * lightweight format needed by Family Organizer.
   * ============================================================
   */
  
  
  /*
   * ============================================================
   * FAMILY ORGANIZER CHILD
   * ============================================================
   */
  
  export interface FamilyOrganizerChild
    extends FamilyOrganizerChildReference {
    childName: string;
  
    /*
     * Existing saved child record.
     *
     * Keeping this available prevents Family Organizer from
     * duplicating child/profile data.
     */
    savedChild: SavedChild;
  }
  
  
  /*
   * ============================================================
   * NORMALIZE CHILD NAME
   * ============================================================
   */
  
  function getFamilyOrganizerChildName(
    child: SavedChild
  ): string {
    const childName =
      child.familyProfile?.childName;
  
    if (
      typeof childName === "string" &&
      childName.trim()
    ) {
      return childName.trim();
    }
  
    return "Child";
  }
  
  
  /*
   * ============================================================
   * GET OWNER CHILDREN
   * ============================================================
   *
   * Returns children owned by the authenticated user.
   *
   * Uses the existing Journey repository so Family Organizer
   * and My Journey always reference the SAME canonical child.
   * ============================================================
   */
  
  export async function getFamilyOrganizerOwnerChildren(
    ownerUserId: string
  ): Promise<FamilyOrganizerChild[]> {
    if (!ownerUserId) {
      throw new Error(
        "A user ID is required to load Family Organizer children."
      );
    }
  
    const savedChildren =
      await getSavedChildren(
        ownerUserId
      );
  
    return savedChildren.map(
      (
        child
      ): FamilyOrganizerChild => ({
        ownerUserId,
  
        childId:
          child.childId,
  
        childName:
          getFamilyOrganizerChildName(
            child
          ),
  
        savedChild:
          child,
      })
    );
  }
  
  
  /*
   * ============================================================
   * GET ONE OWNER CHILD
   * ============================================================
   */
  
  export async function getFamilyOrganizerOwnerChild(
    ownerUserId: string,
    childId: string
  ): Promise<FamilyOrganizerChild | null> {
    if (!ownerUserId) {
      throw new Error(
        "A user ID is required to load a Family Organizer child."
      );
    }
  
    if (!childId) {
      throw new Error(
        "A child ID is required to load a Family Organizer child."
      );
    }
  
    const children =
      await getFamilyOrganizerOwnerChildren(
        ownerUserId
      );
  
    return (
      children.find(
        (child) =>
          child.childId === childId
      ) ?? null
    );
  }
  
  
  /*
   * ============================================================
   * CHECK OWNER CHILD
   * ============================================================
   *
   * Convenience helper for Family Organizer access logic.
   * ============================================================
   */
  
  export async function isFamilyOrganizerChildOwner(
    userId: string,
    ownerUserId: string,
    childId: string
  ): Promise<boolean> {
    if (
      !userId ||
      !ownerUserId ||
      !childId
    ) {
      return false;
    }
  
    if (
      userId !== ownerUserId
    ) {
      return false;
    }
  
    const child =
      await getFamilyOrganizerOwnerChild(
        ownerUserId,
        childId
      );
  
    return child !== null;
  }