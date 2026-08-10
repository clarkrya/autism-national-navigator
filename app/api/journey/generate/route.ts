import { NextResponse } from "next/server";

import type { FamilyProfile } from "../../../../types/familyProfile";

import type {
  PersonalizedJourney,
  AIJourneyMetadata,
} from "../../../../lib/ai/journeyTypes";

const OPENAI_API_URL =
  "https://api.openai.com/v1/responses";

const OPENAI_MODEL = "gpt-5-mini";

/**
 * Structured response schema returned by OpenAI.
 *
 * This schema must stay synchronized with
 * PersonalizedJourney in journeyTypes.ts.
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

/**
 * The AI can generate a journey initially,
 * or reassess an existing journey after
 * meaningful task completion.
 */
type JourneyGenerationReason =
  | "initial"
  | "tasks_completed"
  | "manual_refresh";

type GenerateJourneyRequest = {
  familyProfile: FamilyProfile;

  /**
   * Existing AI journey.
   *
   * This is optional because the initial generation
   * does not have an existing journey yet.
   */
  currentJourney?: PersonalizedJourney | null;

  /**
   * IDs of tasks the family has completed.
   */
  completedTaskIds?: string[];

  /**
   * Why the AI is being called.
   */
  reason?: JourneyGenerationReason;
};

/**
 * Build the system instructions for the AI.
 */
function buildSystemPrompt(
  reason: JourneyGenerationReason
) {
  const reassessmentInstructions =
    reason === "initial"
      ? `
This is the family's INITIAL journey generation.

Start with a clean assessment of the family profile.

Do not assume that questionnaire selections are automatically
the correct recommendations.

Determine what matters most right now.
`
      : `
This is a JOURNEY REASSESSMENT.

The family already has an AI-generated journey.

You MUST consider:
- The family's original profile
- The existing journey
- Tasks the family has completed
- What remains unfinished

Do NOT simply recreate the previous journey.

Determine what has changed because of the completed tasks.

The new journey should move the family forward.

Do not recommend completed tasks again unless there is a
clear reason they genuinely need to be repeated.
`;

  return `
You are the personalization engine for Autism Journey Navigator.

Your job is to help a family understand what to focus on next
in their autism journey.

You are not a replacement for a doctor, therapist, educator,
attorney, insurance professional, or other qualified professional.

PERSONALIZATION

Evaluate the COMPLETE information provided.

Consider:

- Child's age
- State
- Journey stage
- Supports the family selected
- Family's stated priority
- Insurance
- Additional notes
- Existing AI journey, when provided
- Completed tasks, when provided

${reassessmentInstructions}

CURRENT FOCUS

"currentFocus" must identify the SINGLE most important area
the family should focus on right now.

This should represent the most meaningful next area of progress,
not simply repeat one of the questionnaire answers.

PRIORITIES

Priorities should be ranked:

High
Medium
Low

Keep the number of priorities focused and useful.

Do not overwhelm the family with a large list.

TASKS

Tasks must be:

- Practical
- Specific
- Actionable
- Appropriate to the family's situation
- Focused on meaningful progress

Initially generated tasks must have:

completed = false

When reassessing an existing journey:

- Do not mark newly generated tasks as completed.
- Do not reissue completed tasks as new tasks.
- Build recommendations around what remains to be done.
- Move the family toward the next meaningful stage.

Each task should have a stable, descriptive ID.

NEXT STEP

"nextStep" must represent the SINGLE clearest action
the family can take next.

It should align with the current focus and highest-priority task.

RESOURCES

Only provide a resource URL when you are confident
the URL is valid.

Never invent:

- Organizations
- Programs
- Phone numbers
- URLs
- Insurance benefits
- Eligibility requirements
- Coverage rules

If you do not have a verified URL, return an empty string.

SAFETY

Do not diagnose the child.

Do not provide emergency medical instructions.

Do not claim that a specific treatment is medically necessary.

Do not guarantee insurance coverage.

When appropriate, recommend that the family consult
a qualified healthcare, education, insurance, or other
professional.

STYLE

Use compassionate, clear, family-friendly language.

Avoid medical jargon whenever possible.

Avoid overwhelming the family.

Focus on one meaningful step at a time.

Return ONLY the requested structured data.
`;
}

/**
 * Extract structured text from an OpenAI Responses API response.
 */
function extractResponseText(
  response: any
): string | null {
  if (
    typeof response?.output_text ===
    "string"
  ) {
    return response.output_text;
  }

  const output =
    response?.output;

  if (!Array.isArray(output)) {
    return null;
  }

  for (const item of output) {
    if (
      item?.type === "message" &&
      Array.isArray(item.content)
    ) {
      for (const content of item.content) {
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

/**
 * POST /api/journey/generate
 */
export async function POST(
  request: Request
) {
  try {
    const apiKey =
      process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "OpenAI API key is not configured.",
        },
        {
          status: 500,
        }
      );
    }

    const body =
      (await request.json()) as GenerateJourneyRequest;

    const familyProfile =
      body?.familyProfile;

    if (!familyProfile) {
      return NextResponse.json(
        {
          error:
            "Family profile is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !familyProfile.childAge ||
      !familyProfile.state ||
      !familyProfile.journeyStage
    ) {
      return NextResponse.json(
        {
          error:
            "The family profile is incomplete.",
        },
        {
          status: 400,
        }
      );
    }

    const reason: JourneyGenerationReason =
      body.reason ||
      "initial";

    const completedTaskIds =
      body.completedTaskIds || [];

    const currentJourney =
      body.currentJourney || null;

    /**
     * Build the family profile portion
     * of the AI request.
     */
    const profileForAI = {
      childName:
        familyProfile.childName,
    
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
    };

    /**
     * Build the existing journey portion
     * only when reassessing.
     */
    const existingJourneyForAI =
      currentJourney
        ? {
            summary:
              currentJourney.summary,

            currentFocus:
              currentJourney.currentFocus,

            priorities:
              currentJourney.priorities,

            tasks:
              currentJourney.tasks,

            resources:
              currentJourney.resources,

            nextStep:
              currentJourney.nextStep,
          }
        : null;

    const userPrompt = `
Create or reassess a personalized autism journey for this family.

GENERATION REASON

${reason}

FAMILY PROFILE

${JSON.stringify(
  profileForAI,
  null,
  2
)}

COMPLETED TASK IDS

${JSON.stringify(
  completedTaskIds,
  null,
  2
)}

EXISTING AI JOURNEY

${JSON.stringify(
  existingJourneyForAI,
  null,
  2
)}

IMPORTANT

If this is an initial generation:

Create the family's personalized journey
from the complete family profile.

If this is a reassessment:

Use the existing AI journey and completed task IDs
to determine what the family should focus on next.

The completed tasks represent actions the family
has already accomplished.

Do not simply repeat those completed actions.

Determine the next meaningful progression.

Return:

1. Current focus
2. Ranked priorities
3. Practical tasks
4. Relevant resources
5. Single best next step

The AI should determine the journey.

Do not simply convert questionnaire answers
into recommendations.
`;

    /**
     * Call OpenAI Responses API.
     */
    const openAIResponse =
      await fetch(
        OPENAI_API_URL,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${apiKey}`,
          },

          body: JSON.stringify({
            model: OPENAI_MODEL,

            store: false,

            input: [
              {
                role: "system",

                content:
                  buildSystemPrompt(
                    reason
                  ),
              },

              {
                role: "user",

                content:
                  userPrompt,
              },
            ],

            text: {
              format: {
                type: "json_schema",

                name:
                  "personalized_autism_journey",

                strict: true,

                schema:
                  journeySchema,
              },
            },
          }),
        }
      );

    if (!openAIResponse.ok) {
      const errorText =
        await openAIResponse.text();

      console.error(
        "OpenAI API error:",
        errorText
      );

      return NextResponse.json(
        {
          error:
            "Unable to generate the personalized journey.",
        },
        {
          status: 502,
        }
      );
    }

    const response =
      await openAIResponse.json();

    const responseText =
      extractResponseText(
        response
      );

    if (!responseText) {
      return NextResponse.json(
        {
          error:
            "OpenAI returned an empty response.",
        },
        {
          status: 502,
        }
      );
    }

    let journey:
      PersonalizedJourney;

    try {
      journey =
        JSON.parse(
          responseText
        );
    } catch (error) {
      console.error(
        "Unable to parse OpenAI response:",
        error
      );

      return NextResponse.json(
        {
          error:
            "The AI returned an invalid journey format.",
        },
        {
          status: 502,
        }
      );
    }

    /**
     * Ensure newly generated tasks
     * are never accidentally marked complete.
     */
    journey.tasks =
      journey.tasks.map(
        (task) => ({
          ...task,
          completed: false,
        })
      );

    /**
     * Create journey metadata.
     */
    const metadata: AIJourneyMetadata = {
      version: 1,

      generatedAt:
        Date.now(),

      reason,
    };

    return NextResponse.json({
      journey,

      metadata,

      completedTaskIds,
    });
  } catch (error) {
    console.error(
      "Journey generation error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Something went wrong while creating the personalized journey.",
      },
      {
        status: 500,
      }
    );
  }
}