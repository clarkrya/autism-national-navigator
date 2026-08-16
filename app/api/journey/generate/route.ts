/*
 * ============================================================
 * POST /api/journey/generate
 * ============================================================
 *
 * This route is intentionally small.
 *
 * The journey engine is separated into:
 *
 *   app/api/journey/engine/
 *   lib/ai/
 *
 * This route is responsible only for:
 *
 *   1. Receiving the family profile
 *   2. Basic request validation
 *   3. Generating the initial AI journey
 *   4. Running the final intent guard
 *   5. Returning the validated journey
 *
 * IMPORTANT:
 *
 * The final intent guard is the last application-level
 * protection between AI output and the family-facing website.
 *
 * AI output should NEVER be trusted as the final answer
 * without passing through the intent guard.
 *
 * ============================================================
 */


/*
 * ============================================================
 * IMPORTS
 * ============================================================
 */

import {
  NextResponse,
} from "next/server";

import type {
  FamilyProfile,
} from "../../../../types/familyProfile";

import {
  generateJourney,
} from "../engine/generateJourney";

import {
  validateJourney,
} from "../engine/journeyValidation";

/*
 * ============================================================
 * POST
 * ============================================================
 */

export async function POST(
  request: Request
) {

  try {

    /*
     * ----------------------------------------------------------
     * STEP 1 — READ REQUEST
     * ----------------------------------------------------------
     */

    const body =
      await request.json();


    /*
     * ----------------------------------------------------------
     * STEP 2 — GET FAMILY PROFILE
     * ----------------------------------------------------------
     */

    const familyProfile =
      body?.familyProfile as
        | FamilyProfile
        | undefined;


    /*
     * ----------------------------------------------------------
     * STEP 3 — VERIFY FAMILY PROFILE
     * ----------------------------------------------------------
     */

    if (
      !familyProfile
    ) {

      return NextResponse.json(
        {
          error:
            "Family profile is required.",
        },
        {
          status:
            400,
        }
      );
    }


    /*
     * ----------------------------------------------------------
     * STEP 4 — VERIFY REQUIRED INFORMATION
     * ----------------------------------------------------------
     *
     * These are the minimum pieces of information needed
     * to create a meaningful personalized journey.
     */

    if (
      familyProfile.childAge === undefined ||
      familyProfile.childAge === null ||
      !familyProfile.state ||
      !familyProfile.journeyStage
    ) {

      return NextResponse.json(
        {
          error:
            "The family profile is incomplete.",
        },
        {
          status:
            400,
        }
      );
    }


    /*
     * ==========================================================
     * ENGINE DEBUG INFORMATION
     * ==========================================================
     *
     * Useful during development.
     *
     * We intentionally log only the information needed to
     * understand how personalization is working.
     *
     * Do not add unnecessary personal information here.
     */

    console.log(
      "Generating personalized journey:",
      {
        childAge:
          familyProfile.childAge,

        state:
          familyProfile.state,

        journeyStage:
          familyProfile.journeyStage,

        supports:
          familyProfile.supports,

        priority:
          familyProfile.priority,

        insurance:
          familyProfile.insurance,
      }
    );


    /*
     * ==========================================================
     * STEP 5 — INITIAL AI GENERATION
     * ==========================================================
     *
     * The AI creates the initial journey.
     *
     * IMPORTANT:
     *
     * This is NOT yet considered the final journey.
     *
     * The result must pass through the final intent guard
     * below.
     */

    const generatedJourney =
      await generateJourney(
        familyProfile
      );


    /*
     * ==========================================================
     * STEP 6 — FINAL INTENT GUARD
     * ==========================================================
     *
     * This is the most important step.
     *
     * The guard evaluates the generated journey against the
     * family's actual stated priority.
     *
     * Examples:
     *
     * ----------------------------------------------------------
     *
     * Therapy + School Services
     *
     *     Priority = Therapy
     *     Supports = School Services
     *
     *     RESULT:
     *     Therapy remains the focus.
     *
     * ----------------------------------------------------------
     *
     * Financial + Private Insurance
     *
     *     Priority = Financial
     *     Insurance = Private
     *
     *     RESULT:
     *     Financial assistance remains the focus.
     *
     *     Private insurance alone does NOT create an
     *     insurance-navigation journey.
     *
     * ----------------------------------------------------------
     *
     * School + no supports
     *
     *     RESULT:
     *     School/educational support remains the focus.
     *
     * ----------------------------------------------------------
     *
     * Unsure
     *
     *     RESULT:
     *     The engine asks the family to clarify their concern
     *     instead of guessing.
     *
     * ==========================================================
     */

    const finalJourney =
    validateJourney(
        generatedJourney,
        familyProfile
      );


    /*
     * ==========================================================
     * STEP 7 — FINAL DEBUG LOG
     * ==========================================================
     *
     * This lets us see what the engine actually decided.
     *
     * Particularly useful while testing:
     *
     *   - Therapy
     *   - Financial
     *   - School
     *   - Insurance
     *   - Unsure
     *
     * We can compare the family's stated priority against
     * the final journey that reaches the website.
     */

    console.log(
      "Final personalized journey:",
      {
        statedPriority:
          familyProfile.priority,

        journeyStage:
          familyProfile.journeyStage,

        currentFocus:
          finalJourney
            .currentFocus
            ?.title,

        nextStep:
          finalJourney
            .nextStep
            ?.title,

        priorities:
          finalJourney
            .priorities
            ?.map(
              (item) =>
                item.title
            ),

        tasks:
          finalJourney
            .tasks
            ?.map(
              (task) =>
                task.title
            ),

        resources:
          finalJourney
            .resources
            ?.map(
              (resource) =>
                resource.title
            ),
      }
    );


    /*
     * ==========================================================
     * STEP 8 — RETURN FINAL JOURNEY
     * ==========================================================
     *
     * Only the guarded/sanitized journey is returned.
     *
     * The raw AI journey is NEVER returned directly to the
     * browser.
     */

    return NextResponse.json(
      {
        journey:
          finalJourney,

        metadata: {
          version:
            5,

          generatedAt:
            Date.now(),

          reason:
            "initial",
        },
      }
    );


  } catch (
    error
  ) {

    /*
     * ==========================================================
     * ERROR HANDLING
     * ==========================================================
     */

    console.error(
      "Journey generation error:",
      error
    );


    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Something went wrong while creating the personalized journey.",
      },
      {
        status:
          500,
      }
    );
  }
}