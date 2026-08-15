/*
 * ============================================================
 * GENERATE PERSONALIZED JOURNEY
 * ============================================================
 *
 * This file is responsible ONLY for generating the initial
 * AI journey.
 *
 * It does NOT make the final decision about whether a
 * recommendation belongs in the family's journey.
 *
 * Final relevance / intent enforcement happens in:
 *
 *   lib/ai/finalIntentGuard.ts
 *
 * Architecture:
 *
 *   Family Profile
 *        ↓
 *   generateJourney()
 *        ↓
 *   Initial AI Journey
 *        ↓
 *   finalIntentGuard
 *        ↓
 *   Family-facing Journey
 *
 * ============================================================
 */

import type {
  FamilyProfile,
} from "../../../../types/familyProfile";

import type {
  PersonalizedJourney,
} from "../../../../lib/ai/journeyTypes";

import {
  getFamilyIntent,
} from "../../../../lib/ai/finalIntentGuard";

import {
  buildSystemPrompt,
} from "./systemPrompt";

/*
 * ============================================================
 * OPENAI CONFIGURATION
 * ============================================================
 */

const OPENAI_API_URL =
  "https://api.openai.com/v1/responses";

const OPENAI_MODEL =
  "gpt-5-mini";


/*
 * ============================================================
 * JOURNEY RESPONSE SCHEMA
 * ============================================================
 *
 * The AI must return exactly the structure expected by the
 * application.
 *
 * "completed" is an application field.
 *
 * The AI must NEVER put:
 *
 *   completed = false
 *
 * into a title or description.
 *
 * It belongs only in the structured boolean property.
 * ============================================================
 */

const journeySchema = {
  type: "object",

  additionalProperties: false,

  properties: {

    summary: {
      type: "string",
    },

    currentFocus: {
      type: "object",

      additionalProperties: false,

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

        additionalProperties: false,

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

    tasks: {
      type: "array",

      items: {

        type: "object",

        additionalProperties: false,

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

        additionalProperties: false,

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

          url: {
            type: "string",
          },

        },

        required: [
          "id",
          "title",
          "description",
          "url",
        ],
      },
    },

    nextStep: {
      type: "object",

      additionalProperties: false,

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
    "tasks",
    "resources",
    "nextStep",
  ],
};


/*
 * ============================================================
 * NORMALIZE TEXT
 * ============================================================
 */

function normalizeText(
  value: unknown
): string {

  return String(
    value || ""
  )
    .toLowerCase()
    .replace(
      /[-_]/g,
      " "
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}


/*
 * ============================================================
 * BUILD AI PROFILE
 * ============================================================
 *
 * We explicitly tell the AI what the family selected.
 *
 * This is important because the model should not have to
 * infer what "Financial" or "Therapy" means.
 * ============================================================
 */

function buildProfileForAI(
  familyProfile: FamilyProfile
) {

  const intent =
    getFamilyIntent(
      familyProfile.priority
    );

  return {

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

    notes:
      familyProfile.notes,

    engineDirection: {

      familyIntent:
        intent.statement,

      intendedFocus:
        intent.focus,

      forbiddenAssumptions:
        intent.forbiddenAssumptions,

    },

  };
}


/*
 * ============================================================
 * SYSTEM PROMPT
 * ============================================================
 *
 * This is the AI's generation rulebook.
 *
 * The final guard still has authority over the result.
 * ============================================================
 */


/*
 * ============================================================
 * RESPONSE TEXT EXTRACTION
 * ============================================================
 */

function extractResponseText(
  response: any
): string | null {

  /*
   * Preferred Responses API output.
   */

  if (
    typeof response?.output_text ===
    "string"
  ) {

    return response.output_text;
  }


  /*
   * Fallback:
   * Search the response output for output_text.
   */

  const output =
    response?.output;


  if (
    !Array.isArray(
      output
    )
  ) {

    return null;
  }


  for (
    const item of output
  ) {

    if (
      item?.type ===
        "message" &&
      Array.isArray(
        item.content
      )
    ) {

      for (
        const content of
          item.content
      ) {

        if (
          content?.type ===
            "output_text" &&
          typeof content.text ===
            "string"
        ) {

          return content.text;
        }
      }
    }
  }


  return null;
}


/*
 * ============================================================
 * BASIC JOURNEY VALIDATION
 * ============================================================
 *
 * This is NOT the final intent guard.
 *
 * It only verifies that the AI returned the structure required
 * by the application.
 * ============================================================
 */

function validateGeneratedStructure(
  journey: PersonalizedJourney
): boolean {

  if (
    !journey
  ) {

    return false;
  }


  if (
    !journey.currentFocus
  ) {

    return false;
  }


  if (
    !journey.nextStep
  ) {

    return false;
  }


  if (
    !Array.isArray(
      journey.priorities
    )
  ) {

    return false;
  }


  if (
    !Array.isArray(
      journey.tasks
    )
  ) {

    return false;
  }


  if (
    !Array.isArray(
      journey.resources
    )
  ) {

    return false;
  }


  return true;
}


/*
 * ============================================================
 * GENERATE JOURNEY
 * ============================================================
 */

export async function generateJourney(
  familyProfile: FamilyProfile
): Promise<PersonalizedJourney> {

  /*
   * ----------------------------------------------------------
   * DETERMINE FAMILY INTENT
   * ----------------------------------------------------------
   */

  const intent =
    getFamilyIntent(
      familyProfile.priority
    );


  /*
   * ----------------------------------------------------------
   * BUILD PROFILE FOR AI
   * ----------------------------------------------------------
   */

  const profileForAI =
    buildProfileForAI(
      familyProfile
    );


  /*
   * ----------------------------------------------------------
   * USER PROMPT
   * ----------------------------------------------------------
   */

  const userPrompt = `
Create a personalized journey for this family.

The family's selected priority is the strongest signal.

Use the other answers as context.

Do NOT turn context into an assumed need.

Do NOT build a generic autism checklist.

Do NOT predict future needs.

Do NOT introduce a new domain unless the family profile
supports it.

============================================================
FAMILY PROFILE
============================================================

${JSON.stringify(
  profileForAI,
  null,
  2
)}

============================================================
FAMILY INTENT
============================================================

Selected priority:

${familyProfile.priority}

The engine has interpreted that priority as:

${intent.statement}

The intended focus is:

${intent.focus}

============================================================
IMPORTANT
============================================================

The final application guard will independently check your
recommendations against the family's stated priority.

Therefore:

- Stay tightly aligned with the stated priority.
- Do not create unrelated recommendations.
- Do not use existing supports to replace the priority.
- Do not make insurance the answer simply because insurance
  exists.
- Do not make school the answer simply because school services
  exist.
- Do not recommend a service simply because it is commonly
  associated with autism.

The journey should answer:

1. What matters most right now?
2. Why does it matter for THIS family?
3. What should the parent do next?
4. What supporting actions are actually useful?
5. Which resources directly help?

Keep the journey focused.

The parent should feel:

"You listened to what I told you and showed me what to do next."

Not:

"You gave me a generic autism checklist."
`;


  /*
   * ----------------------------------------------------------
   * API KEY
   * ----------------------------------------------------------
   */

  const apiKey =
    process.env.OPENAI_API_KEY;


  if (
    !apiKey
  ) {

    throw new Error(
      "OpenAI API key is not configured."
    );
  }


  /*
   * ----------------------------------------------------------
   * OPENAI RESPONSES API
   * ----------------------------------------------------------
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
                  buildSystemPrompt(),
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
                  "personalized_autism_journey",

                strict:
                  true,

                schema:
                  journeySchema,

              },

            },

          }),

      }
    );


  /*
   * ----------------------------------------------------------
   * API ERROR
   * ----------------------------------------------------------
   */

  if (
    !openAIResponse.ok
  ) {

    const errorText =
      await openAIResponse.text();


    console.error(
      "OpenAI API error:",
      errorText
    );


    throw new Error(
      "Unable to generate the personalized journey."
    );
  }


  /*
   * ----------------------------------------------------------
   * PARSE RESPONSE
   * ----------------------------------------------------------
   */

  const response =
    await openAIResponse.json();


  const responseText =
    extractResponseText(
      response
    );


  if (
    !responseText
  ) {

    throw new Error(
      "OpenAI returned an empty response."
    );
  }


  /*
   * ----------------------------------------------------------
   * PARSE JOURNEY JSON
   * ----------------------------------------------------------
   */

  let journey:
    PersonalizedJourney;


  try {

    journey =
      JSON.parse(
        responseText
      );

  } catch (
    error
  ) {

    console.error(
      "Unable to parse OpenAI response:",
      error
    );

    console.error(
      "Raw OpenAI response:",
      responseText
    );


    throw new Error(
      "The AI returned an invalid journey format."
    );
  }


  /*
   * ----------------------------------------------------------
   * VERIFY STRUCTURE
   * ----------------------------------------------------------
   */

  if (
    !validateGeneratedStructure(
      journey
    )
  ) {

    throw new Error(
      "The AI returned an incomplete journey."
    );
  }


  /*
   * ----------------------------------------------------------
   * APPLICATION-OWNED COMPLETION STATE
   * ----------------------------------------------------------
   *
   * The AI may return the boolean because it is required by
   * the schema, but the application owns this value.
   *
   * Every new task starts incomplete.
   */

  journey.tasks =
    journey.tasks.map(
      (task) => ({

        ...task,

        completed:
          false,

      })
    );


  /*
   * ----------------------------------------------------------
   * REMOVE INTERNAL TEXT LEAKAGE AT GENERATION TIME
   * ----------------------------------------------------------
   *
   * The finalIntentGuard also performs sanitization.
   *
   * This first layer gives us additional protection.
   */

  journey.tasks =
    journey.tasks.map(
      (task) => ({

        ...task,

        title:
          sanitizeGeneratedText(
            task.title
          ),

        description:
          sanitizeGeneratedText(
            task.description
          ),

      })
    );


  journey.summary =
    sanitizeGeneratedText(
      journey.summary
    );


  journey.currentFocus = {

    ...journey.currentFocus,

    title:
      sanitizeGeneratedText(
        journey.currentFocus.title
      ),

    explanation:
      sanitizeGeneratedText(
        journey.currentFocus.explanation
      ),

  };


  journey.priorities =
    journey.priorities.map(
      (item) => ({

        ...item,

        title:
          sanitizeGeneratedText(
            item.title
          ),

        explanation:
          sanitizeGeneratedText(
            item.explanation
          ),

      })
    );


  journey.resources =
    journey.resources.map(
      (resource) => ({

        ...resource,

        title:
          sanitizeGeneratedText(
            resource.title
          ),

        description:
          sanitizeGeneratedText(
            resource.description
          ),

      })
    );


  journey.nextStep = {

    ...journey.nextStep,

    title:
      sanitizeGeneratedText(
        journey.nextStep.title
      ),

    description:
      sanitizeGeneratedText(
        journey.nextStep.description
      ),

  };


  /*
   * ----------------------------------------------------------
   * RETURN INITIAL JOURNEY
   * ----------------------------------------------------------
   *
   * IMPORTANT:
   *
   * This is still only the AI-generated journey.
   *
   * finalIntentGuard.ts gets the final say.
   */

  return journey;
}


/*
 * ============================================================
 * GENERATED TEXT SANITIZATION
 * ============================================================
 *
 * Prevent internal implementation fields from appearing in
 * family-facing text.
 * ============================================================
 */

function sanitizeGeneratedText(
  value: unknown
): string {

  let text =
    String(
      value || ""
    );


  /*
   * Remove common completion-field leakage.
   */

  text =
    text.replace(
      /["']?completed["']?\s*[:=]\s*false/gi,
      ""
    );


  text =
    text.replace(
      /\bcompleted\s*=\s*false\b/gi,
      ""
    );


  text =
    text.replace(
      /\bcompleted\s*:\s*false\b/gi,
      ""
    );


  /*
   * Clean whitespace left behind.
   */

  return text
    .replace(
      /\s{2,}/g,
      " "
    )
    .replace(
      /\s+([,.!?])/g,
      "$1"
    )
    .trim();
}