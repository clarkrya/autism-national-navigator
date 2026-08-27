import { NextResponse } from "next/server";

import type {
  FamilyProfile,
} from "../../../../types/familyProfile";

import type {
  PersonalizedJourney,
} from "../../../../lib/ai/journeyTypes";

import {
  validateJourney,
} from "../engine/journeyValidation";


const OPENAI_API_URL =
  "https://api.openai.com/v1/responses";

const OPENAI_MODEL =
  "gpt-5-mini";


/*
 * ============================================================
 * FIREBASE AUTH CONFIGURATION
 * ============================================================
 *
 * The Firebase Web API key is not a secret credential.
 *
 * It is used here to call Firebase's accounts:lookup REST
 * endpoint so the server can verify that the Firebase ID token
 * belongs to a real authenticated Firebase account.
 *
 * Prefer FIREBASE_WEB_API_KEY in production, but fall back to
 * NEXT_PUBLIC_FIREBASE_API_KEY because that is already part of
 * the project's current Firebase configuration.
 * ============================================================
 */

const FIREBASE_WEB_API_KEY =
  process.env.FIREBASE_WEB_API_KEY ||
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY;


/*
 * ============================================================
 * VERIFY FIREBASE ID TOKEN
 * ============================================================
 *
 * Firebase exposes:
 *
 * POST
 * https://identitytoolkit.googleapis.com/v1/accounts:lookup
 *
 * with:
 *
 * {
 *   idToken: "..."
 * }
 *
 * A successful response contains the authenticated user's
 * Firebase localId / UID.
 * ============================================================
 */

async function verifyFirebaseIdToken(
  idToken: string
): Promise<{
  uid: string;
  email?: string;
}> {

  if (
    !FIREBASE_WEB_API_KEY
  ) {

    throw new Error(
      "Firebase Web API key is not configured."
    );

  }


  const response =
    await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(
        FIREBASE_WEB_API_KEY
      )}`,
      {
        method:
          "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify({
            idToken,
          }),
      }
    );


  if (
    !response.ok
  ) {

    const errorText =
      await response.text();


    console.error(
      "Firebase token verification failed:",
      errorText
    );


    throw new Error(
      "AUTH_INVALID"
    );

  }


  const data =
    await response.json();


  const user =
    Array.isArray(
      data?.users
    )
      ? data.users[0]
      : undefined;


  if (
    !user?.localId
  ) {

    throw new Error(
      "AUTH_INVALID"
    );

  }


  return {
    uid:
      String(
        user.localId
      ),

    email:
      typeof user.email ===
      "string"
        ? user.email
        : undefined,
  };
}


/*
 * ============================================================
 * NEXT JOURNEY RESPONSE SCHEMA
 * ============================================================
 */

const nextJourneySchema = {
  type: "object",

  additionalProperties:
    false,

  properties: {

    summary: {
      type: "string",
    },


    currentFocus: {
      type: "object",

      additionalProperties:
        false,

      properties: {

        title: {
          type: "string",
        },

        explanation: {
          type: "string",
        },

      },

      required: [
        "title",
        "explanation",
      ],
    },


    priorities: {
      type: "array",

      items: {
        type: "object",

        additionalProperties:
          false,

        properties: {

          id: {
            type: "string",
          },

          title: {
            type: "string",
          },

          explanation: {
            type: "string",
          },

          priority: {
            type: "string",

            enum: [
              "High",
              "Medium",
              "Low",
            ],
          },

        },

        required: [
          "id",
          "title",
          "explanation",
          "priority",
        ],
      },
    },


    actions: {
      type: "array",

      items: {
        type: "object",

        additionalProperties:
          false,

        properties: {

          id: {
            type: "string",
          },

          title: {
            type: "string",
          },

          whyItMatters: {
            type: "string",
          },

          action: {
            type: "string",
          },

          howTo: {
            type: "string",
          },

          nextStep: {
            type: "string",
          },

          priority: {
            type: "string",

            enum: [
              "High",
              "Medium",
              "Low",
            ],
          },

          estimatedTime: {
            type: "string",
          },

          resourceIds: {
            type: "array",

            items: {
              type: "string",
            },
          },

        },

        required: [
          "id",
          "title",
          "whyItMatters",
          "action",
          "howTo",
          "nextStep",
          "priority",
          "estimatedTime",
          "resourceIds",
        ],
      },
    },


    tasks: {
      type: "array",

      items: {
        type: "object",

        additionalProperties:
          false,

        properties: {

          id: {
            type: "string",
          },

          title: {
            type: "string",
          },

          description: {
            type: "string",
          },

          priority: {
            type: "string",

            enum: [
              "High",
              "Medium",
              "Low",
            ],
          },

          estimatedTime: {
            type: "string",
          },

          completed: {
            type: "boolean",
          },

          resourceLink: {
            type: "string",
          },

        },

        required: [
          "id",
          "title",
          "description",
          "priority",
          "estimatedTime",
          "completed",
          "resourceLink",
        ],
      },
    },


    resources: {
      type: "array",

      items: {
        type: "object",

        additionalProperties:
          false,

        properties: {

          id: {
            type: "string",
          },

          title: {
            type: "string",
          },

          type: {
            type: "string",

            enum: [
              "grant",
              "government",
              "insurance",
              "therapy",
              "school",
              "financial",
              "support",
              "other",
            ],
          },

          description: {
            type: "string",
          },

          whyItMayHelp: {
            type: "string",
          },

          url: {
            type: "string",
          },

          sourceName: {
            type: "string",
          },

        },

        required: [
          "id",
          "title",
          "type",
          "description",
          "whyItMayHelp",
          "url",
          "sourceName",
        ],
      },
    },


    nextStep: {
      type: "object",

      additionalProperties:
        false,

      properties: {

        title: {
          type: "string",
        },

        description: {
          type: "string",
        },

      },

      required: [
        "title",
        "description",
      ],
    },

  },


  required: [
    "summary",
    "currentFocus",
    "priorities",
    "actions",
    "tasks",
    "resources",
    "nextStep",
  ],
};


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
     * ========================================================
     * STEP 1 — VERIFY AUTHENTICATION
     * ========================================================
     *
     * This happens BEFORE:
     *
     * - reading the journey
     * - making the OpenAI request
     * - generating AI content
     *
     * A guest cannot bypass the UI and call this endpoint
     * directly.
     */

    const authorization =
      request.headers.get(
        "authorization"
      );


    if (
      !authorization ||
      !authorization
        .toLowerCase()
        .startsWith(
          "bearer "
        )
    ) {

      return NextResponse.json(
        {
          error:
            "You must be logged in to continue your journey.",
        },
        {
          status:
            401,
        }
      );

    }


    const idToken =
      authorization
        .slice(7)
        .trim();


    if (!idToken) {

      return NextResponse.json(
        {
          error:
            "Authentication token is missing.",
        },
        {
          status:
            401,
        }
      );

    }


    let authenticatedUser:
      {
        uid: string;
        email?: string;
      };


    try {

      authenticatedUser =
        await verifyFirebaseIdToken(
          idToken
        );

    } catch {

      return NextResponse.json(
        {
          error:
            "Your login session is no longer valid. Please log in again.",
        },
        {
          status:
            401,
        }
      );

    }


    /*
     * ========================================================
     * STEP 2 — API KEY
     * ========================================================
     */

    const apiKey =
      process.env.OPENAI_API_KEY;


    if (!apiKey) {

      return NextResponse.json(
        {
          error:
            "OpenAI API key is not configured.",
        },
        {
          status:
            500,
        }
      );

    }


    /*
     * ========================================================
     * STEP 3 — READ REQUEST
     * ========================================================
     */

    const body =
      await request.json();


    const familyProfile =
      body?.familyProfile as
        | FamilyProfile
        | undefined;


    const currentJourney =
      body?.currentJourney as
        | PersonalizedJourney
        | undefined;


    const completedTaskIds =
      Array.isArray(
        body?.completedTaskIds
      )
        ? body.completedTaskIds
        : [];


    const completedTasks =
      Array.isArray(
        body?.completedTasks
      )
        ? body.completedTasks
        : [];


    /*
     * ========================================================
     * STEP 4 — VALIDATE REQUEST
     * ========================================================
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


    if (
      !currentJourney
    ) {

      return NextResponse.json(
        {
          error:
            "Current journey is required.",
        },
        {
          status:
            400,
        }
      );

    }


    if (
      completedTaskIds.length ===
      0
    ) {

      return NextResponse.json(
        {
          error:
            "Completed tasks are required before generating the next stage.",
        },
        {
          status:
            400,
        }
      );

    }


    /*
     * ========================================================
     * DEVELOPMENT LOG
     * ========================================================
     *
     * Do not log the full family profile or AI question content.
     */

    console.log(
      "Generating next journey stage:",
      {
        uid:
          authenticatedUser.uid,

        priority:
          familyProfile.priority,

        journeyStage:
          familyProfile.journeyStage,

        completedTaskCount:
          completedTaskIds.length,
      }
    );


    /*
     * ========================================================
     * SYSTEM PROMPT
     * ========================================================
     */

    const systemPrompt = `
You are the next-stage personalization engine for Autism Journey Navigator.

Your job is to determine what THIS family should work on NEXT after completing their current recommended actions.

This is NOT a brand-new journey.

This is a continuation of the family's existing journey.

The family already completed meaningful actions.

You must build on what they accomplished.

============================================================
CORE PRINCIPLE
============================================================

The family's original stated priority remains the primary driver.

Do not abandon the family's original need simply because the first
set of tasks has been completed.

Move the family forward within that same area unless the completed
work clearly demonstrates that the original need has been resolved.

============================================================
DO NOT REPEAT COMPLETED WORK
============================================================

The family has already completed specific tasks.

Do NOT recommend the same task again.

Do NOT simply rewrite a completed task using different words.

Do NOT tell the family to repeat an action they already completed.

Instead ask:

"What did completing this task accomplish?"

"What remains unresolved?"

"What is the logical next action?"

============================================================
BUILD ON PROGRESS
============================================================

The next journey should represent meaningful progression.

For example:

Stage 1:
Identify financial assistance opportunities.

Stage 2:
After the family has identified programs, help them determine
which programs they may actually pursue and what information they
need to prepare.

Stage 1:
Identify a therapy need.

Stage 2:
After identifying the therapy need, help the family address the
remaining access or coordination step.

The examples above are only illustrations.

Do NOT assume those situations apply to this family.

Use the actual completed tasks and journey context.

============================================================
DO NOT INTRODUCE UNRELATED DOMAINS
============================================================

Do not introduce:

- school
- IEP
- ESE
- therapy
- ABA
- specialist evaluation
- insurance
- financial assistance
- behavioral treatment
- speech therapy
- occupational therapy

unless the family's existing profile or completed work provides
evidence that the domain is relevant.

The original family priority remains the anchor.

============================================================
EXISTING SUPPORTS REMAIN CONTEXT
============================================================

Do not turn existing supports into a new problem.

They may help explain what has already been accomplished or what
remains available.

============================================================
NEXT STAGE SHOULD BE SMALL
============================================================

Do not generate a giant list.

Provide a small number of highly relevant next actions.

The family should immediately understand:

"What did we accomplish?"

"What should we do next?"

============================================================
TASKS
============================================================

Every new task must begin with:

completed: false

The family has not completed these new tasks yet.

Do not mark a new task completed merely because a related previous
task was completed.

============================================================
RESOURCES
============================================================

Only include resources that directly support the NEW next-stage
actions.

Do not repeat resources solely because they appeared in the prior
journey.

Do not invent organizations, URLs, phone numbers, grants,
eligibility requirements, coverage, or benefits.

If an official URL is not verified, return an empty string.

============================================================
NEXT STEP
============================================================

The nextStep must be ONE clear action.

It must represent the most useful action after the work already
completed.

Do not say:

"Explore your options."

"Review resources."

"Continue your journey."

Instead describe the actual next action.

============================================================
CURRENT FOCUS
============================================================

currentFocus must describe what matters most NOW after the family
completed the previous task set.

It should represent progression, not repetition.

============================================================
FINAL QUALITY CHECK
============================================================

Before returning the response, silently verify:

1. What was the family's original priority?

2. What did the family actually complete?

3. What progress did those completed actions create?

4. What remains unresolved?

5. What is the most logical next action?

6. Did I accidentally repeat a completed task?

7. Did I introduce a new domain without evidence?

8. Is this genuinely the NEXT stage rather than a rewritten
   version of Stage 1?

9. Are the new tasks practical and achievable?

10. Does every new recommendation have evidence?

Return ONLY the requested structured JSON.
`;


    /*
     * ========================================================
     * USER PROMPT
     * ========================================================
     */

    const userPrompt = `
Build the NEXT stage of this family's personalized journey.

IMPORTANT:

The family has already completed the tasks identified below.

Use that completed work to determine what should come next.

Do NOT restart the journey.

Do NOT repeat completed tasks.

Do NOT create a generic autism checklist.

============================================================
FAMILY PROFILE
============================================================

${JSON.stringify(
  familyProfile,
  null,
  2
)}

============================================================
CURRENT JOURNEY
============================================================

${JSON.stringify(
  currentJourney,
  null,
  2
)}

============================================================
COMPLETED TASK IDS
============================================================

${JSON.stringify(
  completedTaskIds,
  null,
  2
)}

============================================================
COMPLETED TASKS
============================================================

${JSON.stringify(
  completedTasks,
  null,
  2
)}

============================================================
PROGRESSION QUESTION
============================================================

Based on the family's original priority, their current journey,
and what they have already completed:

What is the most useful next stage?

The new stage should:

- build on completed work
- avoid repeating completed work
- remain aligned with the original priority
- provide a small number of useful new tasks
- provide a clear next action
- provide only directly relevant resources
- start every new task as incomplete
`;


    /*
     * ========================================================
     * OPENAI REQUEST
     * ========================================================
     */

    const openAIResponse =
      await fetch(
        OPENAI_API_URL,
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${apiKey}`,
          },

          body:
            JSON.stringify({
              model:
                OPENAI_MODEL,

              store:
                false,

              input: [
                {
                  role:
                    "system",

                  content:
                    systemPrompt,
                },

                {
                  role:
                    "user",

                  content:
                    userPrompt,
                },
              ],

              text: {
                format: {
                  type:
                    "json_schema",

                  name:
                    "next_autism_journey",

                  strict:
                    true,

                  schema:
                    nextJourneySchema,
                },
              },
            }),
        }
      );


    /*
     * ========================================================
     * OPENAI ERROR
     * ========================================================
     */

    if (
      !openAIResponse.ok
    ) {

      const errorText =
        await openAIResponse.text();


      console.error(
        "OpenAI next journey error:",
        errorText
      );


      throw new Error(
        "Unable to generate the next stage of the personalized journey."
      );

    }


    /*
     * ========================================================
     * PARSE RESPONSE
     * ========================================================
     */

    const response =
      await openAIResponse.json();


    let responseText =
      "";


    if (
      Array.isArray(
        response?.output
      )
    ) {

      for (
        const outputItem
        of response.output
      ) {

        if (
          outputItem?.type ===
            "message" &&
          Array.isArray(
            outputItem?.content
          )
        ) {

          for (
            const contentItem
            of outputItem.content
          ) {

            if (
              contentItem?.type ===
                "output_text" &&
              typeof contentItem.text ===
                "string"
            ) {

              responseText +=
                contentItem.text;

            }

          }

        }

      }

    }


    if (
      !responseText
    ) {

      throw new Error(
        "OpenAI returned an empty next-stage journey."
      );

    }


    /*
     * ========================================================
     * PARSE JOURNEY
     * ========================================================
     */

    let nextJourney:
      PersonalizedJourney;


    try {

      nextJourney =
        JSON.parse(
          responseText
        );

    } catch (error) {

      console.error(
        "Unable to parse next journey:",
        error
      );


      console.error(
        "Raw next journey response:",
        responseText
      );


      throw new Error(
        "The AI returned an invalid next-stage journey format."
      );

    }


    /*
     * ========================================================
     * FORCE NEW TASKS TO START INCOMPLETE
     * ========================================================
     */

    nextJourney = {
      ...nextJourney,

      tasks:
        (nextJourney.tasks || []).map(
          (task) => ({
            ...task,

            completed:
              false,
          })
        ),
    };


    /*
     * ========================================================
     * FINAL APPLICATION VALIDATION
     * ========================================================
     */

    const validatedJourney =
      validateJourney(
        nextJourney,
        familyProfile
      );


    /*
     * ========================================================
     * FINAL TASK SAFETY
     * ========================================================
     */

    const finalJourney = {
      ...validatedJourney,

      tasks:
        (validatedJourney.tasks || []).map(
          (task) => ({
            ...task,

            completed:
              false,
          })
        ),
    };


    /*
     * ========================================================
     * FINAL DEBUG INFORMATION
     * ========================================================
     */

    console.log(
      "Next personalized journey created:",
      {
        uid:
          authenticatedUser.uid,

        priority:
          familyProfile.priority,

        completedTaskCount:
          completedTaskIds.length,

        currentFocus:
          finalJourney
            .currentFocus
            ?.title,

        nextStep:
          finalJourney
            .nextStep
            ?.title,

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
     * ========================================================
     * RETURN
     * ========================================================
     */

    return NextResponse.json(
      {
        journey:
          finalJourney,

        metadata: {
          version:
            1,

          generatedAt:
            Date.now(),

          reason:
            "tasks_completed",
        },

        completedTaskIds,
      }
    );


  } catch (error) {

    /*
     * ========================================================
     * ERROR HANDLING
     * ========================================================
     */

    console.error(
      "Next journey generation error:",
      error
    );


    /*
     * Authentication failures should be handled above as 401.
     * Any remaining unexpected error is a server error.
     */

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Something went wrong while creating the next stage of the journey.",
      },
      {
        status:
          500,
      }
    );

  }
}