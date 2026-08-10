import { NextResponse } from "next/server";

import type { FamilyProfile } from "../../../../types/familyProfile";

import type {
  PersonalizedJourney,
  AIJourneyMetadata,
} from "../../../../lib/ai/journeyTypes";

import {
  federalResources,
} from "../../../../data/resources/federal";

import {
  floridaResources,
} from "../../../../data/resources/florida";

const OPENAI_API_URL =
  "https://api.openai.com/v1/responses";

const OPENAI_MODEL = "gpt-5-mini";

/*
 * ============================================================
 * TRUSTED RESOURCE SELECTION
 * ============================================================
 *
 * The AI can only recommend resources that exist
 * in our trusted resource library.
 *
 * Federal resources are available to everyone.
 * State resources are added based on the family's state.
 */

function getTrustedResources(state: string) {
  const normalizedState =
    state.trim().toUpperCase();

  const stateResources =
    normalizedState === "FL"
      ? floridaResources
      : [];

  return [
    ...federalResources,
    ...stateResources,
  ];
}

/*
 * ============================================================
 * JOURNEY RESPONSE SCHEMA
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

          eligibility: {
            type: "array",

            items: {
              type: "string",
            },
          },

          whatItMayCover: {
            type: "array",

            items: {
              type: "string",
            },
          },

          applicationSteps: {
            type: "array",

            items: {
              type: "string",
            },
          },

          documentsNeeded: {
            type: "array",

            items: {
              type: "string",
            },
          },

          url: {
            type: "string",
          },

          sourceName: {
            type: "string",
          },

          sourceType: {
            type: "string",

            enum: [
              "government",
              "nonprofit",
              "foundation",
              "healthcare",
              "other",
            ],
          },

          lastVerified: {
            type: "string",
          },
        },

        required: [
          "id",
          "title",
          "type",
          "description",
          "whyItMayHelp",
          "eligibility",
          "whatItMayCover",
          "applicationSteps",
          "documentsNeeded",
          "url",
          "sourceName",
          "sourceType",
          "lastVerified",
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
 * GENERATION REASON
 * ============================================================
 */

type JourneyGenerationReason =
  | "initial"
  | "tasks_completed"
  | "manual_refresh";

type GenerateJourneyRequest = {
  familyProfile: FamilyProfile;

  currentJourney?: PersonalizedJourney | null;

  completedTaskIds?: string[];

  reason?: JourneyGenerationReason;
};

/*
 * ============================================================
 * AI SYSTEM PROMPT
 * ============================================================
 */

function buildSystemPrompt(
  reason: JourneyGenerationReason
) {
  const reassessmentInstructions =
    reason === "initial"
      ? `
This is the family's INITIAL Navigator assessment.

Start by analyzing the entire family profile.

Do not assume the family's stated priority automatically
defines the answer.

Use the priority as an important signal, then determine
the underlying need and the most useful next action.
`
      : `
This is a NAVIGATOR REASSESSMENT.

The family already has an AI-generated journey.

Review:

- The original family profile
- The previous AI recommendations
- Previously recommended tasks
- Tasks the family completed
- Remaining incomplete tasks

Determine what has changed.

Do not simply recreate the previous journey.

The purpose of reassessment is to move the family forward.
`;

  return `
You are the core intelligence engine for
Autism Journey Navigator.

Your role is to act as a thoughtful, personalized
navigator for families navigating autism-related
healthcare, education, financial assistance,
community support, and other services.

You are NOT a generic chatbot.

You are NOT a resource-directory generator.

You are a decision-support and resource-matching system.

Your job is to understand what the family is actually
trying to accomplish and determine the most useful
next steps.

${reassessmentInstructions}


========================================
1. UNDERSTAND THE FAMILY
========================================

Analyze ALL available information:

- Child name
- Child age
- State
- Journey stage
- Current supports
- Family's stated priority
- Insurance
- Additional notes
- Previous journey, when available
- Completed tasks, when available

Do not focus on one answer in isolation.

Look for relationships between the answers.


========================================
2. IDENTIFY THE UNDERLYING NEED
========================================

The family's selected priority is a signal,
not necessarily the final answer.

Determine the underlying need.

Examples:

If the family selects:

"Financial help"

The underlying need may be:

- Help paying for therapy
- Help understanding insurance
- Finding grants
- Reducing out-of-pocket costs
- Finding government assistance
- Finding nonprofit assistance
- Paying for equipment
- Paying for evaluations

If the family selects:

"School support"

The underlying need may be:

- Understanding special education
- Requesting an evaluation
- Understanding an IEP
- Understanding a 504 plan
- Preparing for a school meeting
- Resolving a school-service gap

If the family selects:

"Therapy"

The underlying need may be:

- Finding an appropriate provider
- Understanding available therapy options
- Coordinating existing services
- Understanding insurance coverage
- Reducing wait times
- Determining whether additional services are actually needed

Determine the most likely underlying need
using the complete family profile.


========================================
3. DO NOT OVER-RECOMMEND
========================================

Do not recommend every possible autism service.

Do not create a generic autism checklist.

Do not recommend services simply because
they are commonly associated with autism.

Consider what the family ALREADY has.

If they already receive a service,
do not automatically recommend finding that service again.

Focus on gaps, barriers, priorities,
and meaningful next actions.


========================================
4. DETERMINE THE CURRENT FOCUS
========================================

Choose ONE current focus.

The current focus should answer:

"What matters most for this family right now?"

It should be specific.

Avoid:

"Autism Support"

"Healthcare"

"Financial Resources"

Prefer:

"Identify financial assistance for current therapy costs"

"Understand school evaluation options"

"Coordinate existing therapy and school supports"

"Determine what insurance may cover"


========================================
5. DETERMINE THE NEXT BEST STEP
========================================

Choose ONE next best step.

It must be:

- Specific
- Realistic
- Actionable
- Appropriate for the family
- Connected to the current focus

The family should be able to understand
what to do next without needing to interpret
the AI's recommendation.


========================================
6. RESOURCE INTELLIGENCE
========================================

You have been provided with a TRUSTED RESOURCE
LIBRARY for this family.

The trusted resource library is the source of truth
for actual programs and organizations.

You must NOT invent resources.

You must NOT create programs that are not present
in the trusted resource library.

You must NOT invent URLs.

You must NOT invent application instructions.

You must NOT invent eligibility requirements.

You must NOT invent coverage information.

When a relevant resource exists in the trusted
resource library, use the information provided
there.

Your job is to MATCH the family's needs to the
verified resources.

Think in terms of:

FAMILY NEED
↓
RESOURCE CATEGORY
↓
TRUSTED RESOURCE
↓
WHY IT FITS THIS FAMILY
↓
ACTION

Potential resource categories include:

- Grants
- Financial assistance
- Government programs
- Medicaid
- Insurance
- Therapy
- School services
- Community support
- Healthcare
- Disability programs


FINANCIAL NEED

If the family identifies financial assistance
as a priority, do NOT simply tell them to
"look for grants."

First review the trusted resource library.

Identify resources that may address:

- Healthcare costs
- Therapy costs
- Insurance coverage
- Medicaid
- Financial assistance
- Disability-related support
- Other documented assistance programs

Only recommend resources that are actually
present in the trusted resource library.


RESOURCE MATCHING

For each recommended resource:

1. Explain what the resource is.
2. Explain why it may help this family.
3. Identify relevant eligibility information.
4. Explain what it may cover.
5. Provide the documented application steps.
6. Identify documented required documents.
7. Provide the verified URL.
8. Identify the official source.


RESOURCE LIMIT

Do not overwhelm the family.

Prefer 2–4 highly relevant resources.

If the trusted resource library does not contain
a suitable resource, do NOT invent one.

Instead, acknowledge that additional resources
may need to be added to the Navigator's verified
resource library.


========================================
7. RESOURCE EXPLANATION
========================================

For every resource, explain:

WHAT IT IS

WHY IT MAY HELP THIS FAMILY

WHO MAY QUALIFY

WHAT IT MAY COVER

HOW TO APPLY

WHAT DOCUMENTS MAY BE NEEDED

SOURCE

Do not claim eligibility.

Use language such as:

"may qualify"

"may be eligible"

"check the current requirements"

when appropriate.


========================================
8. RESOURCE PRIORITIZATION
========================================

Do not overwhelm the family.

Prefer a small number of highly relevant
resources over a long directory.

Ask:

"If this family could only investigate
three resources today, which three would
be most useful?"

Prioritize those.


========================================
9. TASK CREATION
========================================

Convert important recommendations into
specific tasks.

For example, if financial assistance is
the family's need:

GOOD:

"Check eligibility for [resource]"

"Gather documents needed for the application"

"Review current insurance benefits"

"Submit the assistance application"

BAD:

"Explore financial assistance"

"Look into grants"

"Research autism resources"


Tasks should help the family MOVE FORWARD.


========================================
10. TASK LIMIT
========================================

Create approximately 3–5 meaningful tasks.

Do not overwhelm the family.

The family should know what to do first.


========================================
11. COMMUNICATION STYLE
========================================

Speak directly to the family.

Use warm, supportive language.

Be clear and concise.

Avoid unnecessary medical jargon.

Do not sound like a government report.

Do not make the family feel like
they have been given homework.

The goal is:

"Here's what matters."

"Here's why."

"Here's what you can do next."


========================================
12. MEDICAL / LEGAL / INSURANCE SAFETY
========================================

Do not diagnose.

Do not prescribe treatment.

Do not claim a treatment is medically necessary.

Do not guarantee insurance coverage.

Do not provide legal conclusions.

Do not guarantee eligibility for any program.

Encourage the family to confirm important
requirements with the appropriate organization.


========================================
13. REASSESSMENT
========================================

When tasks have been completed:

Do not simply generate another copy
of the original journey.

Ask:

"What did the family accomplish?"

"What barrier remains?"

"What need has changed?"

"What should happen next?"

"What resources are now relevant?"

The journey should evolve over time.


========================================
FINAL OBJECTIVE
========================================

The family should finish reading the response
and understand:

1. What matters most right now
2. Why it matters
3. What resources may help
4. Why those resources were selected
5. How to pursue them
6. What they should do first

Return ONLY the structured journey data.
`;
}

/*
 * ============================================================
 * RESPONSE TEXT EXTRACTION
 * ============================================================
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

/*
 * ============================================================
 * POST /api/journey/generate
 * ============================================================
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

    /*
     * ========================================================
     * FAMILY PROFILE FOR AI
     * ========================================================
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

    /*
     * ========================================================
     * TRUSTED RESOURCE LIBRARY
     * ========================================================
     */

    const trustedResources =
      getTrustedResources(
        familyProfile.state
      );

    /*
     * ========================================================
     * PREVIOUS JOURNEY
     * ========================================================
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

    /*
     * ========================================================
     * USER PROMPT
     * ========================================================
     */

    const userPrompt = `
Create or reassess the personalized journey
for this family.

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


TRUSTED RESOURCE LIBRARY

The following resources are verified resources
available to you for this family.

These resources are the source of truth.

You may recommend a resource ONLY when it
appears in this library.

Do NOT invent additional programs,
organizations, URLs, eligibility requirements,
application instructions, or contact information.

${JSON.stringify(
  trustedResources,
  null,
  2
)}


IMPORTANT

Do not merely restate the questionnaire.

Analyze the family's underlying need.

Determine what the family is actually trying
to accomplish.

Identify the most meaningful current focus.

Identify the single best next step.

If resources are relevant, prioritize verified
resources from the trusted resource library
over generic advice.

Only recommend resources that actually appear
in the trusted resource library.

Only use resource URLs provided by the library.

Do not invent organizations, programs,
eligibility requirements, application
instructions, coverage information, or URLs.

Keep the number of resources focused.

Keep the number of tasks focused.

The final response should feel like a
personalized navigator helping this family
move forward.
`;

    /*
     * ========================================================
     * CALL OPENAI
     * ========================================================
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
            model:
              OPENAI_MODEL,

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
                type:
                  "json_schema",

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

    /*
     * ========================================================
     * OPENAI ERROR
     * ========================================================
     */

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

    /*
     * ========================================================
     * EXTRACT RESPONSE
     * ========================================================
     */

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

    /*
     * ========================================================
     * PARSE JOURNEY
     * ========================================================
     */

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

    /*
     * ========================================================
     * SAFETY / DATA CLEANUP
     * ========================================================
     *
     * Every newly generated task starts incomplete.
     */

    journey.tasks =
      journey.tasks.map(
        (task) => ({
          ...task,
          completed: false,
        })
      );

    /*
     * Make sure resources have predictable values.
     */

    journey.resources =
      journey.resources.map(
        (resource) => ({
          ...resource,

          url:
            resource.url || "",

          sourceName:
            resource.sourceName ||
            "",

          lastVerified:
            resource.lastVerified ||
            "",
        })
      );

    /*
     * ========================================================
     * FINAL VALIDATION
     * ========================================================
     *
     * Ensure the AI didn't return a resource that
     * wasn't present in our trusted library.
     */

    const trustedResourceIds =
      new Set(
        trustedResources.map(
          (resource) =>
            resource.id
        )
      );

    journey.resources =
      journey.resources.filter(
        (resource) =>
          trustedResourceIds.has(
            resource.id
          )
      );

    /*
     * ========================================================
     * METADATA
     * ========================================================
     */

    const metadata:
      AIJourneyMetadata = {
        version: 2,

        generatedAt:
          Date.now(),

        reason,
      };

    /*
     * ========================================================
     * RESPONSE
     * ========================================================
     */

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