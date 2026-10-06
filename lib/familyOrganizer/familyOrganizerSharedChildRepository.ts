import {
    doc,
    getDoc,
  } from "firebase/firestore";
  
  import { db } from "../firebase";
  
  import {
    canAccessFamilyOrganizerChild,
  } from "./familyOrganizerAccess";
  
  import type {
    FamilyOrganizerChildReference,
  } from "./familyOrganizerTypes";
  
  /*
   * ============================================================
   * FAMILY ORGANIZER SHARED CHILD REPOSITORY
   * ============================================================
   *
   * Reads the canonical child record for an authorized Family
   * Organizer user.
   *
   * IMPORTANT:
   *
   * The shared child is never copied into the invited user's
   * account.
   *
   * Canonical child:
   *
   * users/{ownerUserId}/children/{childId}
   * ============================================================
   */
  
  
  /*
   * ============================================================
   * SHARED CHILD RECORD
   * ============================================================
   */
  
  export interface FamilyOrganizerSharedChildRecord
    extends FamilyOrganizerChildReference {
    childName: string;
  
    familyProfile:
      Record<string, unknown>;
  
    role:
      "owner" |
      "family_member";
  }
  
  
  /*
   * ============================================================
   * CHILD NAME
   * ============================================================
   */
  
  function getChildName(
    familyProfile:
      Record<string, unknown>
  ): string {
    const childName =
      familyProfile.childName;
  
    if (
      typeof childName ===
        "string" &&
      childName.trim()
    ) {
      return childName.trim();
    }
  
    return "Child";
  }
  
  
  /*
   * ============================================================
   * GET SHARED CHILD
   * ============================================================
   *
   * Security flow:
   *
   * 1. Verify the authenticated user has Family Organizer access.
   * 2. Read the canonical child from the owner's child collection.
   * 3. Return the child without creating a duplicate record.
   * ============================================================
   */
  
  export async function getFamilyOrganizerSharedChild(
    currentUserId: string,
    ownerUserId: string,
    childId: string
  ): Promise<FamilyOrganizerSharedChildRecord | null> {
    const normalizedCurrentUserId =
      currentUserId.trim();
  
    const normalizedOwnerUserId =
      ownerUserId.trim();
  
    const normalizedChildId =
      childId.trim();
  
    if (
      !normalizedCurrentUserId ||
      !normalizedOwnerUserId ||
      !normalizedChildId
    ) {
      return null;
    }
  
    /*
     * ----------------------------------------------------------
     * VERIFY ACCESS
     * ----------------------------------------------------------
     */
  
    const access =
      await canAccessFamilyOrganizerChild(
        normalizedCurrentUserId,
        normalizedOwnerUserId,
        normalizedChildId
      );
  
    if (!access.allowed) {
      return null;
    }
  
    /*
     * ----------------------------------------------------------
     * READ CANONICAL CHILD
     * ----------------------------------------------------------
     */
  
    const childReference =
      doc(
        db,
        "users",
        normalizedOwnerUserId,
        "children",
        normalizedChildId
      );
  
    const childSnapshot =
      await getDoc(
        childReference
      );
  
    if (!childSnapshot.exists()) {
      return null;
    }
  
    const data =
      childSnapshot.data();
  
    const familyProfile =
      data.familyProfile &&
      typeof data.familyProfile ===
        "object"
        ? (
            data.familyProfile as
              Record<
                string,
                unknown
              >
          )
        : {};
  
    return {
      ownerUserId:
        normalizedOwnerUserId,
  
      childId:
        normalizedChildId,
  
      childName:
        getChildName(
          familyProfile
        ),
  
      familyProfile,
  
      role:
        access.role,
    };
  }
  
  
  /*
   * ============================================================
   * GET SHARED CHILD NAME
   * ============================================================
   */
  
  export async function getFamilyOrganizerSharedChildName(
    currentUserId: string,
    ownerUserId: string,
    childId: string
  ): Promise<string | null> {
    const child =
      await getFamilyOrganizerSharedChild(
        currentUserId,
        ownerUserId,
        childId
      );
  
    return (
      child?.childName ??
      null
    );
  }