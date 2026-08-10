import { NextResponse } from "next/server";

import type { FamilyProfile } from "../../../../types/familyProfile";

import type {
  PersonalizedJourney,
} from "../../../../lib/ai/journeyTypes";

const OPENAI_API_URL =
  "https://api.openai.com/v1/responses";

const OPENAI_MODEL = "gpt-5-mini";

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

function buildSystemPrompt() {
  return `
You are the personalization engine for Autism Journey Navigator.

Your job is to help a family understand what to focus on next in their autism journey.

You are not a replacement for a doctor, therapist, educator,
attorney, or other qualified professional.

PERSONALIZATION

Evaluate the COMPLETE family profile.

Consider:

- Child's age
- State
- Journey stage
- Supports the family selected
- Family's stated priority
- Insurance
- Additional notes

The family's questionnaire selections are inputs,
not automatic recommendations.

Use your reasoning to determine what the family
should focus on first.

The goal is NOT to provide the largest possible list.

The goal is to identify the most meaningful next steps.

CURRENT FOCUS

"currentFocus" must identify the single most important
area the family should focus on right now.

PRIORITIES

Priorities should be ranked:

High
Medium
Low

Keep the number of priorities focused and useful.

TASKS

Tasks must be practical and actionable.

Initially every task must have:

completed = false

The tasks should help the family make meaningful progress.

NEXT STEP

"nextStep" must represent the single clearest action
the family can take next.

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

Do not claim that a specific treatment is medically
necessary.

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
      await request.json();

    const familyProfile =
      body?.familyProfile as
        | FamilyProfile
        | undefined;

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

    const userPrompt = `
Create a personalized autism journey for this family.

Here is the family's profile:

${JSON.stringify(
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

    notes:
      familyProfile.notes,
  },
  null,
  2
)}

Determine:

1. The family's current focus
2. The most important priorities
3. Practical next-step tasks
4. Relevant resources
5. The single best next step

Do not simply repeat the questionnaire answers.

Use the complete family profile to personalize
the recommendations.
`;

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
                  buildSystemPrompt(),
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
      extractResponseText(response);

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
        JSON.parse(responseText);
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

    return NextResponse.json({
      journey,

      metadata: {
        version: 1,

        generatedAt:
          Date.now(),

        reason: "initial",
      },
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