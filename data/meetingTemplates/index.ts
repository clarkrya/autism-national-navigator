/*
 * ============================================================
 * MEETING PREPARATION TEMPLATE LIBRARY
 * ============================================================
 *
 * Central registry for Myriad's trusted Meeting Preparation
 * templates.
 *
 * Other parts of the application should retrieve templates
 * through this file rather than importing individual templates
 * directly.
 * ============================================================
 */

import type {
    MeetingTemplate,
    MeetingType,
  } from "../../types/meetingPreparation";
  
  import {
    diagnosticEvaluationTemplate,
  } from "./diagnosticEvaluation";
  
  import {
    doctorSpecialistTemplate,
  } from "./doctorSpecialist";
  
  import {
    therapyTemplate,
  } from "./therapy";
  
  import {
    schoolIepTemplate,
  } from "./schoolIep";
  
  import {
    insuranceBenefitsTemplate,
  } from "./insuranceBenefits";
  
  import {
    generalMeetingTemplate,
  } from "./general";
  
  
  /*
   * ============================================================
   * TEMPLATE REGISTRY
   * ============================================================
   */
  
  export const meetingTemplates:
    Record<
      MeetingType,
      MeetingTemplate
    > = {
  
    diagnostic_evaluation:
      diagnosticEvaluationTemplate,
  
    doctor_specialist:
      doctorSpecialistTemplate,
  
    therapy:
      therapyTemplate,
  
    school_iep:
      schoolIepTemplate,
  
    insurance_benefits:
      insuranceBenefitsTemplate,
  
    general:
      generalMeetingTemplate,
  };
  
  
  /*
   * ============================================================
   * GET MEETING TEMPLATE
   * ============================================================
   *
   * Returns the trusted template associated with a MeetingType.
   *
   * MeetingType is intentionally constrained by TypeScript, so
   * callers cannot request an unsupported template.
   * ============================================================
   */
  
  export function getMeetingTemplate(
    meetingType: MeetingType
  ):
    MeetingTemplate {
  
    return meetingTemplates[
      meetingType
    ];
  }
  
  
  /*
   * ============================================================
   * GET ALL MEETING TEMPLATES
   * ============================================================
   *
   * Useful for the manual:
   *
   * "Preparing for something else?"
   *
   * experience.
   *
   * General is included because it provides a fallback option for
   * meetings that do not fit one of Myriad's specific categories.
   * ============================================================
   */
  
  export function getAllMeetingTemplates():
    MeetingTemplate[] {
  
    return Object.values(
      meetingTemplates
    );
  }