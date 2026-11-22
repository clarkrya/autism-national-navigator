
import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
  } from "firebase/firestore";
  
  import { db } from "./firebase";
  import type { FamilyProfile } from "../types/familyProfile";
  
  export type ReusableChildInformation = Pick<
    FamilyProfile,
    "childDetails" | "careTeam" | "education"
  >;
  
  function childDocumentRef(
    ownerUserId: string,
    childId: string
  ) {
    if (!ownerUserId.trim() || !childId.trim()) {
      throw new Error(
        "A valid owner and child are required."
      );
    }
  
    return doc(
      db,
      "users",
      ownerUserId,
      "children",
      childId
    );
  }
  
  function cleanFields(
    value: unknown
  ): Record<string, string> {
    if (
      !value ||
      typeof value !== "object" ||
      Array.isArray(value)
    ) {
      return {};
    }
  
    return Object.fromEntries(
      Object.entries(value)
        .filter(
          ([, field]) => typeof field === "string"
        )
        .map(([key, field]) => [
          key,
          (field as string).trim(),
        ])
    );
  }
  
  export async function getReusableChildInformation(
    ownerUserId: string,
    childId: string
  ): Promise<ReusableChildInformation> {
    const snapshot = await getDoc(
      childDocumentRef(ownerUserId, childId)
    );
  
    if (!snapshot.exists()) {
      throw new Error("Child profile not found.");
    }
  
    const profile = snapshot.data()
      .familyProfile as Partial<FamilyProfile> | undefined;
  
    return {
      childDetails: cleanFields(profile?.childDetails),
      careTeam: cleanFields(profile?.careTeam),
      education: cleanFields(profile?.education),
    };
  }
  
  export async function saveReusableChildInformation(
    ownerUserId: string,
    childId: string,
    information: ReusableChildInformation
  ): Promise<void> {
    const reference = childDocumentRef(
      ownerUserId,
      childId
    );
  
    const snapshot = await getDoc(reference);
  
    if (!snapshot.exists()) {
      throw new Error("Child profile not found.");
    }
  
    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };
  
    if (information.childDetails !== undefined) {
      updates["familyProfile.childDetails"] =
        cleanFields(information.childDetails);
    }
  
    if (information.careTeam !== undefined) {
      updates["familyProfile.careTeam"] =
        cleanFields(information.careTeam);
    }
  
    if (information.education !== undefined) {
      updates["familyProfile.education"] =
        cleanFields(information.education);
    }
  
    await updateDoc(reference, updates);
  }
  