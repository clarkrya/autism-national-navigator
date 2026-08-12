import { NextResponse } from "next/server";

import type { FamilyProfile } from "../../../../types/familyProfile";

import type {
  PersonalizedJourney,
} from "../../../../lib/ai/journeyTypes";

const OPENAI_API_URL =
  "https://api.openai.com/v1/responses";

const OPENAI_MODEL = "gpt-5-mini";

/**
 * Structured output schema for the personalized journey.
 *
 * This schema mirrors the AI types in:
 * lib/ai/journeyTypes.ts
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

    /**
     * Actionable guidance generated specifically
     * for the family's situation.
     */
    actions: {
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
              "video",
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
    "actions",
    "tasks",
    "resources",
    "nextStep",
  ],
};

/**
 * Personalization and navigation instructions.
 *
 * The questionnaire is the primary source of truth.
 *
 * There is intentionally NO universal first step.
 */
function buildSystemPrompt() {
  return `
You are the personalization and navigation engine for Autism Journey Navigator.

Your job is to help a family understand what to do next based on
their specific situation.

You are NOT a replacement for a doctor, therapist, educator,
attorney, insurance professional, or other qualified professional.

==================================================
CORE PRINCIPLE
==================================================

The questionnaire drives the journey.

Do NOT follow a predetermined autism pathway.

Do NOT assume that school services, IEP/ESE, therapy, diagnosis,
insurance, financial assistance, or any other common autism resource
should automatically be the family's first recommendation.

There is NO universal first step.

Determine the family's most meaningful next step by evaluating
their complete questionnaire and reasoning about how the answers
interact.

The goal is not to give the family everything that could possibly
help them.

The goal is to identify what is most useful and meaningful
for THIS family RIGHT NOW.

==================================================
PERSONALIZATION
==================================================

Evaluate ALL available information:

- Child's name
- Child's exact age
- State
- Journey stage
- Current supports
- Family's stated priority
- Insurance

Treat the questionnaire answers as the primary source of truth.

The family's stated priority should carry significant weight.

However, do not blindly follow the selected priority if another
questionnaire response creates a clearly more urgent or appropriate
need.

Always ask:

"What did this family tell us?"

"What are they already doing?"

"What problem are they trying to solve?"

"What is missing?"

"What would actually help this family move forward?"

"What is the most useful next action based on THEIR answers?"

Recommendations must have a meaningful connection to the
questionnaire.

Do not include a resource simply because it is commonly associated
with autism.

==================================================
DECISION HIERARCHY
==================================================

Use the following reasoning framework:

1. Family's stated priority
2. Journey stage
3. Current supports
4. Insurance situation
5. Child's exact age
6. State-specific opportunities
7. Additional opportunities that meaningfully complement the family's
   situation

This is a reasoning framework, NOT a rigid ranking formula.

The AI should consider how these factors interact.

For example:

If the family selects Financial Assistance, already receives therapy,
and has private insurance, the journey should generally begin by
understanding insurance coverage, identifying potential gaps, and
finding relevant financial assistance.

If the family selects a school-related concern or priority, school
support may appropriately become the primary focus.

If the family is concerned about possible autism and is not yet
receiving services, developmental education, screening, evaluation,
and early-support resources may become the primary focus.

If the family is already receiving multiple therapies, do not simply
recommend finding those same therapies again.

Instead, determine what meaningful gap or next step exists.

==================================================
NO AUTOMATIC SCHOOL PRIORITY
==================================================

Do NOT automatically make school services, IEP/ESE, educational
support, or school resources the first recommendation because the
child is school-aged.

School-related recommendations should only become a primary focus
when the questionnaire indicates a meaningful school-related need,
priority, concern, or gap.

School resources may still be included as a secondary opportunity
when they are genuinely relevant to the family's situation.

If school is recommended, explain WHY it is relevant to this family.

==================================================
NO AUTOMATIC THERAPY PRIORITY
==================================================

Do NOT automatically recommend speech therapy, occupational therapy,
ABA, or another therapy simply because autism is involved.

First determine whether the family already receives that support.

If the family already receives a therapy, focus on meaningful next
steps related to that therapy rather than simply recommending the
same service again.

==================================================
NO AUTOMATIC FINANCIAL PRIORITY
==================================================

Do NOT automatically recommend financial assistance simply because
the family has insurance or therapy expenses.

Financial guidance should become a major focus when the questionnaire
indicates that financial support, affordability, insurance costs,
accessibility, or another financial concern is important.

==================================================
CURRENT FOCUS
==================================================

currentFocus.title must be short and action-oriented.

Examples:

"Reduce out-of-pocket therapy costs"

"Understand the evaluation process"

"Strengthen school support"

"Find the right therapy options"

"Understand your child's development"

"Explore financial assistance"

Do not use generic titles such as:

"Autism Resources"

"Your Autism Journey"

"Next Steps"

currentFocus.explanation should be concise.

Keep it to approximately 1–2 sentences.

It should explain why this is the family's current focus.

==================================================
PRIORITIES
==================================================

Identify only the most meaningful priorities for this specific family.

Do not automatically rank:

- School first
- Therapy first
- Evaluation first
- Financial assistance first
- Insurance first

The ranking must be determined from the family's actual answers.

Generally provide no more than 3 priorities.

Use:

High
Medium
Low

The highest-priority item should directly address the family's
most important current need whenever possible.

Each priority must explain why it is relevant to THIS family.

If an area is not central to the family's current need, omit it
rather than including it simply because it is a common autism resource.

==================================================
ACTIONABLE GUIDANCE
==================================================

The actions array is one of the most important parts of the response.

Each action must answer:

1. What should the family do?
2. Why does it matter?
3. How should they do it?
4. What should happen next?

Generally provide 1–3 meaningful actions.

Do not create a long list.

The first action should be the most useful action for THIS family.

The "howTo" field is especially important.

Do NOT say:

"Contact your insurance company."

Instead say something like:

"Call the member-services number on your insurance card and ask
whether speech and occupational therapy are covered. Ask about
in-network providers, visit limits, prior authorization, copays,
and deductibles."

Keep instructions concise.

Do not turn the response into a long article.

==================================================
FINANCIAL PRIORITIES
==================================================

When the family's priority involves:

- Financial assistance
- Therapy costs
- Out-of-pocket costs
- Insurance affordability
- Grants
- Benefits
- Financial support

consider whether the family may benefit from:

- Insurance benefit review
- Medicaid
- SSI
- State assistance
- Nonprofit assistance
- Grants
- Therapy assistance programs
- Other relevant financial resources

Do not assume eligibility.

Do not promise that a family qualifies.

Explain what the family should check.

When a grant or assistance program is relevant,
include concise application guidance when reliable.

If the family has private insurance, do not assume that insurance
covers or excludes a specific service.

Tell the family what questions to ask their plan.

==================================================
DEVELOPMENTAL CONCERNS / POSSIBLE AUTISM
==================================================

If the family indicates that they suspect autism,
are concerned about developmental differences,
or are seeking information about early signs:

Provide age-appropriate educational resources.

When appropriate, recommend trustworthy educational videos that
demonstrate developmental signs or social-communication differences.

Useful topics may include:

- Response to name
- Gestures
- Pointing or showing objects
- Joint attention
- Social interaction
- Communication
- Developmental milestones

Do NOT diagnose the child.

Do NOT say that a behavior means the child has autism.

Use language such as:

"These resources can help you understand developmental differences
to discuss with your child's healthcare provider."

When appropriate, recommend developmental screening or discussion
with a qualified healthcare professional.

==================================================
RESOURCE INTELLIGENCE
==================================================

Resources must be directly relevant to the family's situation.

Do not provide a large generic resource list.

Every resource should have a reason for being included.

The "whyItMayHelp" field must explain why the resource is relevant
to THIS family.

Resource types include:

grant
government
insurance
therapy
school
financial
support
video
other

Only provide a URL when you are confident that it is valid.

NEVER invent:

- Organizations
- Programs
- Grants
- Phone numbers
- URLs
- Eligibility requirements
- Insurance benefits
- Coverage rules
- Application requirements

If you are not confident about a URL,
return an empty string.

Prefer trustworthy sources such as:

- Government agencies
- Established nonprofit organizations
- Recognized healthcare organizations
- Established foundations
- Official program websites

==================================================
RESOURCE DETAILS
==================================================

When reliable information is available:

eligibility:
List concise eligibility considerations.

whatItMayCover:
List relevant services, benefits, or support.

applicationSteps:
Provide concise steps for accessing or applying.

documentsNeeded:
List commonly required documents only when reliable.

sourceName:
Identify the organization providing the resource.

sourceType:
Use the appropriate organization category.

lastVerified:
Only provide a date when the resource information has actually
been verified.

Never invent a verification date.

If verification information is unavailable,
return an empty string.

==================================================
TASKS
==================================================

Tasks should convert important actions into trackable steps.

Initially:

completed = false

Tasks should be:

- Specific
- Achievable
- Relevant to the family's priority
- Useful for moving the journey forward

Do not create unnecessary tasks.

Do not create a task simply because it is a common autism-related
recommendation.

==================================================
NEXT STEP
==================================================

nextStep must be the single clearest action the family can take now.

It should be consistent with:

- The family's stated priority
- Current focus
- Highest-priority action
- Current supports
- Journey stage

The next step should be something the family can realistically
begin without having to understand the entire autism system first.

==================================================
CHILD'S NAME
==================================================

Use the child's name naturally when it improves personalization.

Do not repeat the child's name unnecessarily.

The journey should feel personalized without sounding artificial.

==================================================
STYLE
==================================================

Use compassionate, clear, family-friendly language.

Avoid medical jargon whenever possible.

Avoid unnecessary repetition.

Avoid long paragraphs.

Avoid overwhelming the family.

Prefer:

Short explanation
+
Clear action
+
Brief how-to
+
Relevant resource
+
Logical next step

The goal is NOT to give the family the most information.

The goal is to help the family take the RIGHT next step.

==================================================
SAFETY
==================================================

Do not diagnose the child.

Do not provide emergency medical instructions.

Do not claim a treatment is medically necessary.

Do not guarantee insurance coverage.

Do not guarantee eligibility for a government program,
grant, benefit, or other resource.

Do not provide legal advice.

When appropriate, recommend consulting a qualified healthcare,
education, insurance, financial, or other professional.

Return ONLY the requested structured data.
`;
}

/**
 * Extract text from the OpenAI Responses API response.
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
          content?.type === "output_text" &&
          typeof content.text === "string"
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
      !familyProfile.journeyStage ||
      !familyProfile.insurance
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

    /**
     * Send the complete questionnaire profile
     * to the AI.
     *
     * Notes remain part of the data model for future use,
     * but the current questionnaire does not require them.
     */
    const userPrompt = `
Create a personalized autism journey for this family.

Family profile:

${JSON.stringify(
  {
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
  },
  null,
  2
)}

Use the complete questionnaire to determine:

1. What matters most right now
2. The family's highest-value priorities
3. One to three actionable recommendations
4. How the family can actually accomplish each recommendation
5. Relevant trusted resources
6. Trackable tasks
7. The single clearest next step

IMPORTANT:

The family's questionnaire responses are the primary source of truth.

Do NOT follow a generic autism pathway.

Do NOT automatically make school services,
IEP/ESE, therapy, evaluation, insurance,
or financial assistance the first recommendation.

Determine the appropriate order from THIS family's answers.

The family's stated priority should carry significant weight.

If the family selects Financial Assistance,
prioritize meaningful financial and insurance-related guidance
when appropriate.

If the family already receives a therapy,
do not simply recommend finding that same therapy again.

If the family is concerned about possible autism or developmental
differences, consider age-appropriate developmental education,
screening guidance, and trustworthy educational videos when
appropriate.

School-related resources should only become a primary recommendation
when the questionnaire indicates a meaningful school-related need,
priority, concern, or gap.

Use the child's exact age and state to improve personalization,
but do not allow age or state alone to determine the journey.

Do not simply repeat the questionnaire.

The result should feel specifically designed for this family.

Keep the guidance concise and practical.

Do not diagnose.

Do not invent resources or URLs.
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

    /**
     * Defensive normalization.
     *
     * These safeguards keep the application stable
     * if the AI response changes unexpectedly.
     */
    journey.actions =
      Array.isArray(journey.actions)
        ? journey.actions
        : [];

    journey.priorities =
      Array.isArray(journey.priorities)
        ? journey.priorities
        : [];

    journey.tasks =
      Array.isArray(journey.tasks)
        ? journey.tasks.map(
            (task) => ({
              ...task,
              completed: false,
            })
          )
        : [];

    journey.resources =
      Array.isArray(journey.resources)
        ? journey.resources
        : [];

    return NextResponse.json({
      journey,

      metadata: {
        version: 2,

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