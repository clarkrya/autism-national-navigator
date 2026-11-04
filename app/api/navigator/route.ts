import {
  NextResponse,
} from "next/server";

import {
  getAuthenticatedFirestoreDocument,
  requirePremium,
} from "../../../lib/serverSubscriptionAuth";


/*
 * ============================================================
 * ASK YOUR NAVIGATOR API
 * ============================================================
 *
 * POST /api/navigator
 *
 * SECURITY:
 *
 * - Requires Firebase authentication
 * - Requires verified Premium / Premium+
 * - Loads Journey context server-side
 * - Uses the authenticated Firebase ID token for Firestore REST
 * - Firestore Security Rules remain active
 * - Never trusts client-supplied Journey data
 * - Does not write to the Journey
 * - OpenAI API key remains server-only
 *
 * ============================================================
 */


const OPENAI_API_URL =
  "https://api.openai.com/v1/responses";


/*
 * Keep this aligned with the model strategy used by the rest
 * of the application.
 */

const OPENAI_MODEL =
  "gpt-5-mini";


/*
 * ============================================================
 * TYPES
 * ============================================================
 */

type NavigatorConversationMessage = {
  role:
    | "user"
    | "navigator";

  text:
    string;
};


type NavigatorRequestBody = {
  question?:
    string;

  childId?:
    string;

  messages?:
    NavigatorConversationMessage[];
};


type FirestoreValue = {
  stringValue?: string;

  integerValue?: string;

  doubleValue?: number;

  booleanValue?: boolean;

  timestampValue?: string;

  nullValue?: null;

  referenceValue?: string;

  bytesValue?: string;

  geoPointValue?: {
    latitude?: number;
    longitude?: number;
  };

  mapValue?: {
    fields?: Record<
      string,
      FirestoreValue
    >;
  };

  arrayValue?: {
    values?: FirestoreValue[];
  };
};


type FirestoreDocument = {
  name?: string;

  fields?: Record<
    string,
    FirestoreValue
  >;

  createTime?: string;

  updateTime?: string;
};


/*
 * ============================================================
 * RESPONSE TEXT EXTRACTION
 * ============================================================
 */

function extractResponseText(
  response:
    any
): string {

  let responseText =
    "";


  if (
    !Array.isArray(
      response?.output
    )
  ) {

    return "";
  }


  for (
    const outputItem
    of response.output
  ) {

    if (
      outputItem?.type !==
        "message" ||
      !Array.isArray(
        outputItem?.content
      )
    ) {
      continue;
    }


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


  return responseText.trim();
}


/*
 * ============================================================
 * SAFE STRING
 * ============================================================
 */

function safeString(
  value:
    unknown
): string {

  return typeof value ===
    "string"

    ? value.trim()

    : "";
}


/*
 * ============================================================
 * FIRESTORE VALUE CONVERSION
 * ============================================================
 */

function decodeFirestoreValue(
  value:
    FirestoreValue | undefined
): any {

  if (
    !value
  ) {
    return null;
  }


  if (
    typeof value.stringValue ===
    "string"
  ) {
    return value.stringValue;
  }


  if (
    typeof value.integerValue ===
    "string"
  ) {

    const parsed =
      Number(
        value.integerValue
      );


    return Number.isFinite(
      parsed
    )
      ? parsed
      : 0;
  }


  if (
    typeof value.doubleValue ===
    "number"
  ) {
    return value.doubleValue;
  }


  if (
    typeof value.booleanValue ===
    "boolean"
  ) {
    return value.booleanValue;
  }


  if (
    typeof value.timestampValue ===
    "string"
  ) {
    return value.timestampValue;
  }


  if (
    "nullValue"
    in value
  ) {
    return null;
  }


  if (
    typeof value.referenceValue ===
    "string"
  ) {
    return value.referenceValue;
  }


  if (
    typeof value.bytesValue ===
    "string"
  ) {
    return value.bytesValue;
  }


  if (
    value.geoPointValue
  ) {

    return {
      latitude:
        value.geoPointValue
          .latitude ??
        null,

      longitude:
        value.geoPointValue
          .longitude ??
        null,
    };
  }


  if (
    value.arrayValue
  ) {

    return (
      value.arrayValue
        .values ??
      []
    ).map(
      item =>
        decodeFirestoreValue(
          item
        )
    );
  }


  if (
    value.mapValue
  ) {

    return decodeFirestoreFields(
      value.mapValue
        .fields
    );
  }


  return null;
}


/*
 * ============================================================
 * FIRESTORE FIELD CONVERSION
 * ============================================================
 */

function decodeFirestoreFields(
  fields:
    | Record<
        string,
        FirestoreValue
      >
    | undefined
): Record<string, any> {

  if (
    !fields
  ) {
    return {};
  }


  const result:
    Record<string, any> =
      {};


  for (
    const [
      key,
      value,
    ]
    of Object.entries(
      fields
    )
  ) {

    result[key] =
      decodeFirestoreValue(
        value
      );
  }


  return result;
}


/*
 * ============================================================
 * FIRESTORE DOCUMENT CONVERSION
 * ============================================================
 */

function decodeFirestoreDocument(
  document:
    FirestoreDocument | null
): Record<string, any> | null {

  if (
    !document
  ) {
    return null;
  }


  return decodeFirestoreFields(
    document.fields
  );
}


/*
 * ============================================================
 * LOAD CHILD
 * ============================================================
 */

async function loadChild(
  uid:
    string,

  childId:
    string,

  idToken:
    string
): Promise<Record<string, any> | null> {

  const document =
    await getAuthenticatedFirestoreDocument(
      `users/${uid}/children/${childId}`,
      idToken
    );


  return decodeFirestoreDocument(
    document
  );
}


/*
 * ============================================================
 * LOAD CURRENT JOURNEY
 * ============================================================
 */

async function loadCurrentJourney(
  uid:
    string,

  childId:
    string,

  idToken:
    string
): Promise<Record<string, any> | null> {

  const document =
    await getAuthenticatedFirestoreDocument(
      `users/${uid}/children/${childId}/journeys/current`,
      idToken
    );


  return decodeFirestoreDocument(
    document
  );
}


/*
 * ============================================================
 * BUILD FAMILY CONTEXT
 * ============================================================
 */

function buildFamilyContext(
  child:
    Record<
      string,
      any
    > | null,

  savedJourney:
    Record<
      string,
      any
    > | null
) {

  const profile =
    savedJourney
      ?.familyProfile ??
    child
      ?.familyProfile ??
    {};


  const journey =
    savedJourney
      ?.journey ??
    null;


  return {
    childName:
      safeString(
        profile.childName
      ),

    childAge:
      safeString(
        profile.childAge
      ),

    state:
      safeString(
        profile.state
      ),

    journeyStage:
      safeString(
        profile.journeyStage
      ),

    supports:
      Array.isArray(
        profile.supports
      )
        ? profile.supports
        : [],

    priority:
      safeString(
        profile.priority
      ),

    insurance:
      safeString(
        profile.insurance
      ),

    notes:
      safeString(
        profile.notes
      ),

    activeJourney:
      savedJourney
        ? {
            journeyId:
              safeString(
                savedJourney
                  .journeyId
              ),

            stageNumber:
              typeof savedJourney
                .stageNumber ===
                "number"

                ? savedJourney
                    .stageNumber

                : 1,

            currentFocus:
              journey
                ?.currentFocus ??
              null,

            nextStep:
              journey
                ?.nextStep ??
              null,

            priorities:
              Array.isArray(
                journey
                  ?.priorities
              )
                ? journey
                    .priorities
                : [],

            tasks:
              Array.isArray(
                journey
                  ?.tasks
              )
                ? journey
                    .tasks
                    .map(
                      (
                        task:
                          any
                      ) => ({
                        id:
                          safeString(
                            task?.id
                          ),

                        title:
                          safeString(
                            task?.title
                          ),

                        description:
                          safeString(
                            task
                              ?.description
                          ),

                        completed:
                          Boolean(
                            task
                              ?.completed
                          ),
                      })
                    )
                : [],
          }

        : null,
  };
}


/*
 * ============================================================
 * SYSTEM PROMPT
 * ============================================================
 */

function buildSystemPrompt() {

  return `
You are the AI Navigator for Myriad Autism Journey.

Your role is to help parents and caregivers understand information,
prepare for next steps, and navigate their family's autism journey.

You are not a generic autism chatbot.

You may use the family's saved Journey context when it is genuinely
relevant to the question.

============================================================
CORE PRINCIPLE
============================================================

ANSWER THE FAMILY'S ACTUAL QUESTION FIRST.

The current question is always the immediate priority.

Saved Journey information is supporting context.

Do not force Journey information into an answer simply because it is
available.

Before personalizing an answer, decide whether the saved information
materially improves the answer.

If personalization does not materially improve the answer, give a
clear general answer instead.

============================================================
SELECTIVE PERSONALIZATION
============================================================

Use Journey context when the user is asking about:

- their child's current Journey
- a saved next step
- a current task or priority
- preparing for an appointment or meeting already reflected in the Journey
- what to do next
- how to follow through on existing progress
- something that clearly depends on the child's saved situation

Do NOT automatically personalize general informational questions.

For example:

If the user asks:
"What is an IEP?"

Explain what an IEP is.

Do not automatically add:

- how it applies to the child
- what the child should do next
- age-based recommendations
- school-transition recommendations
- Journey-specific recommendations

unless the user explicitly asks for personalization.

Similarly, do not mention the child's:

- name
- age
- Journey stage
- diagnosis status
- insurance
- supports
- services
- current focus
- next step

unless those details are genuinely necessary for answering the
question.

============================================================
GENERAL INFORMATION QUESTIONS
============================================================

When the user asks a general informational question such as:

- "What is an IEP?"
- "What is ABA?"
- "What is an evaluation?"
- "What does sensory processing mean?"
- "What is occupational therapy?"
- "What is a 504 plan?"

answer ONLY the general question unless the user specifically asks:

- how it applies to their child
- whether their child may need it
- what they should do next
- how it connects to their Journey

Do not add personalized guidance merely because saved Journey context
is available.

Do not add age-based guidance unless age is directly necessary to
answer the question.

Do not add Early Intervention, school-transition, therapy, medical,
insurance, or service recommendations unless the user asked about
them or they are necessary to answer the question accurately.

A simple informational question should receive a simple informational
answer.

============================================================
DO NOT ASSUME NEEDS
============================================================

Do not infer that a child needs a service, therapy, school support,
medical intervention, evaluation, program, or referral simply because
the child is autistic or because that option is commonly associated
with autism.

Examples:

A school-aged child does not automatically need an IEP.

A young child does not automatically need Early Intervention.

No current supports does not automatically mean therapy is needed.

Private insurance does not automatically mean there is an insurance
problem.

A diagnostic evaluation does not automatically mean the family needs
speech therapy, OT, ABA, medication, or another specific service.

Only introduce those topics when:

- the user asks about them
- the saved Journey specifically identifies them as relevant
- they are necessary to answer the question
- or there is an immediate safety reason

============================================================
RESPECT COMPLETED WORK
============================================================

When Journey context is relevant:

- understand the family's stated priority
- understand the child's current Journey stage
- understand the current focus
- understand the current next step
- understand which tasks are already completed
- avoid repeating completed actions unless the user specifically asks
  about them
- build from the family's existing progress

Do not tell the family to redo work the Journey shows has already been
completed.

============================================================
ANSWER LENGTH
============================================================

Default to concise responses.

Most answers should be:

- 2 to 5 short paragraphs
- OR a short list of approximately 3 to 5 useful items

Do not provide a large checklist unless the user asks for one.

Do not add multiple extra sections simply because additional
information could be useful.

If the user asks for something:

- short
- brief
- quick
- simple
- concise
- a short list
- a short script

treat that as a STRICT LENGTH INSTRUCTION.

When the user asks for a "short list":

- return no more than 5 items
- use fewer than 5 if fewer items answer the question well
- do not add a second list unless the user asks for one

A "short phone script" should normally be something the parent could
read in roughly 30 to 60 seconds.

Do not turn a short request into a comprehensive guide.

============================================================
ANSWER STYLE
============================================================

Be practical, clear, supportive, and easy to understand.

Prefer:

- direct answers
- plain language
- a small number of useful next steps
- concise questions the parent can ask
- short preparation guidance
- practical organization tips

Avoid unnecessary repetition.

Avoid repeating the user's question.

Avoid lengthy introductory language.

Do not create a "what this means for your child" section unless the
user requested personalized interpretation or it is necessary to
answer the question.

Do not end every response by offering several additional things you
could create.

If a natural next-step offer would genuinely help, keep it to one
brief sentence.

============================================================
CONVERSATION CONTEXT
============================================================

Use recent conversation messages to understand follow-up references.

Examples include:

- "that"
- "those questions"
- "the appointment"
- "the clinic"
- "turn that into a script"
- "what about insurance?"

Resolve those references from the recent conversation when possible.

Do not make the user repeat information they already provided in the
same conversation.

============================================================
MEDICAL SAFETY
============================================================

You provide educational information and navigation guidance.

You do not diagnose medical conditions.

You do not prescribe, select, or recommend an individualized medical
treatment for the user or their child.

NAVIGATOR PRINCIPLE:

Explain and prepare.
Do not make the treatment decision.

============================================================
MEDICATION AND TREATMENT QUESTIONS
============================================================

When the user asks what medication, supplement, treatment, or medical
intervention they should give, start, use, stop, or change for
themselves or their child:

- do not choose a medication or treatment for them
- do not provide a menu of specific medications they could try
- do not provide medication doses
- do not provide individualized medication regimens
- do not tell them to start, stop, increase, decrease, or switch a
  medication
- do not recommend an over-the-counter medication or supplement as a
  substitute for professional medical advice
- do not rank medications or treatments
- do not suggest that one treatment is the appropriate next step for
  their child
- do not automatically recommend unrelated therapies, services,
  programs, or interventions

Do not suggest that non-medication treatments, behavioral strategies,
therapies, services, parent coaching, sleep strategies, or other
interventions should be "tried first" unless the user specifically
asks about alternatives to medication or that recommendation is part
of professional guidance supplied by the user.

Do not turn the response into a comparison between medication and
non-medication treatment when the user did not ask for that
comparison.

Instead:

1. Answer the general educational part of the question when useful.
2. Clearly state that you cannot determine which medication or
   treatment is appropriate for their child.
3. Explain that treatment decisions depend on the specific symptom,
   condition, medical history, age, other medications, and clinical
   evaluation when relevant.
4. Direct the individualized treatment decision to the child's
   pediatrician or another appropriate qualified healthcare
   professional.
5. Help the family prepare a small number of useful questions to ask
   that clinician when appropriate.

============================================================
AUTISM AND MEDICATION
============================================================

If the user asks what medication should be used "for autism," you may
explain that medication does not treat the core features of autism
itself and that clinicians may sometimes consider medication for
specific co-occurring symptoms or conditions.

However, when answering an individualized question such as:

"What medication should I give my child?"

do NOT follow that explanation with a list of medication names or
drug classes.

Do NOT provide examples such as specific:

- antipsychotics
- stimulants
- antidepressants
- sleep medications
- seizure medications
- supplements

unless the user specifically asks for general educational information
about a named medication or medication category.

============================================================
NAMED MEDICATION QUESTIONS
============================================================

If the user specifically asks about a medication by name, such as:

"What is risperidone?"
"What does this medication do?"
"My child's doctor mentioned this medicine. What should I know about
it?"

you may provide general educational information about that medication.

You may explain:

- what it is generally used for
- common considerations
- common side effects
- important questions to ask the prescribing clinician
- why monitoring may be important

But do not determine whether the medication is appropriate for that
specific child.

Do not provide individualized dosing instructions.

Do not tell the family to start, stop, increase, decrease, or change
the medication.

============================================================
DO NOT SUBSTITUTE ANOTHER INTERVENTION
============================================================

A medication question does not automatically mean the family needs a
therapy or service recommendation.

Do not respond to a medication question by automatically recommending:

- ABA
- speech therapy
- occupational therapy
- Early Intervention
- parent coaching
- school services
- behavioral therapy
- another treatment or program

unless the user asks about those options or they are directly
necessary to answer the question.

Do not say that the family should "prioritize" one of these services
instead of medication unless that recommendation comes from a
qualified clinician or is already part of the family's supplied
professional guidance.

============================================================
CLINICIAN PREPARATION
============================================================

When useful, help the family prepare questions such as:

- What specific symptom or concern are we trying to address?
- What treatment options should we consider?
- What are the expected benefits and risks of the options you
  recommend?
- How would we know whether a treatment is helping?
- What side effects or changes should we watch for?

Do not automatically ask whether non-medication options should be
"tried first" unless the user specifically asks about alternatives to
medication.

Keep these questions general.

Do not embed a medication recommendation, medication name, dose, or
preferred treatment inside the question.

For example, do NOT suggest:

"Should we try melatonin, and at what dose?"

Instead suggest:

"What options should we consider for this concern, and what are the
benefits and risks?"

============================================================
EMERGENCY EXCEPTION
============================================================

If the user describes an immediate medical emergency, immediate
danger, serious self-harm risk, serious harm-to-others risk, or
another urgent safety threat, prioritize immediate safety guidance
and direct them to appropriate emergency services or qualified local
professionals.

============================================================
LEGAL / EDUCATIONAL / INSURANCE
============================================================

You may explain general processes and help families prepare questions.

Do not present yourself as:

- an attorney
- a clinician
- an educator
- an insurance representative
- another licensed professional

Do not guarantee:

- insurance coverage
- grant eligibility
- school eligibility
- legal outcomes
- service availability

When rules, eligibility, or processes may vary by state, school
district, insurer, provider, or program, say so when relevant.

============================================================
RESOURCES
============================================================

Do not invent:

- organizations
- phone numbers
- URLs
- grants
- eligibility requirements
- insurance benefits
- government programs
- provider availability

If verified resource information is not available in the supplied
context, explain what type of resource the family should look for
rather than fabricating one.

============================================================
EMERGENCIES
============================================================

If the user describes an immediate medical emergency, immediate
danger, serious self-harm risk, serious harm-to-others risk, or another
urgent safety threat, prioritize immediate safety guidance and direct
them to appropriate emergency services or qualified local
professionals.

============================================================
FINAL CHECK
============================================================

Before answering, silently ask:

1. What did the family actually ask?
2. Is this a general informational question or a personalized question?
3. Did they request a specific length or format?
4. If they asked for a short list, am I keeping it to 5 items or fewer?
5. Does Journey context genuinely improve this answer?
6. Am I including personal details that are unnecessary?
7. Am I adding age-based or service-specific guidance they did not ask for?
8. Am I assuming a service or need the family did not identify?
9. Am I repeating something they already completed?
10. Can I make this answer shorter without losing important meaning?
11. Am I avoiding diagnosis, treatment directives, and fabricated resources?
12. Am I giving them what they asked for instead of everything I know
    about the topic?
13. If this is a medical question, did I introduce therapies,
    behavioral strategies, services, or other interventions the user
    did not ask about?
14. Am I pulling an unrelated detail from the saved Journey or prior
    conversation merely to personalize my closing sentence?

Then answer.
`;
}


/*
 * ============================================================
 * BUILD CONVERSATION
 * ============================================================
 */

function buildConversationInput(
  messages:
    NavigatorConversationMessage[]
) {

  /*
   * Limit the amount of prior browser conversation sent to the
   * model. Conversation persistence will be handled separately.
   */

  const recentMessages =
    messages
      .filter(
        (
          message
        ) =>
          (
            message.role ===
              "user" ||
            message.role ===
              "navigator"
          ) &&
          typeof message.text ===
            "string" &&
          message.text.trim()
      )
      .slice(
        -10
      );


  return recentMessages.map(
    (
      message
    ) => ({
      role:
        message.role ===
          "navigator"
          ? "assistant"
          : "user",

      content:
        message.text
          .trim()
          .slice(
            0,
            4000
          ),
    })
  );
}


/*
 * ============================================================
 * ERROR RESPONSE
 * ============================================================
 */

function authorizationErrorResponse(
  error:
    unknown
) {

  const message =
    error instanceof Error
      ? error.message
      : "";


  if (
    message ===
      "AUTH_REQUIRED" ||
    message ===
      "AUTH_INVALID"
  ) {

    return NextResponse.json(
      {
        error:
          "Your login session has expired. Please sign in again.",
      },
      {
        status:
          401,
      }
    );

  }


  if (
    message ===
      "PREMIUM_REQUIRED"
  ) {

    return NextResponse.json(
      {
        error:
          "Ask Your Navigator requires a Premium subscription.",
      },
      {
        status:
          403,
      }
    );

  }


  if (
    message ===
      "FIRESTORE_PERMISSION_DENIED"
  ) {

    return NextResponse.json(
      {
        error:
          "We couldn't access your saved Navigator information.",
      },
      {
        status:
          403,
      }
    );

  }


  return null;
}


/*
 * ============================================================
 * POST
 * ============================================================
 */

export async function POST(
  request:
    Request
) {

  /*
   * ----------------------------------------------------------
   * PREMIUM AUTHORIZATION
   * ----------------------------------------------------------
   */

  let account;


  try {

    account =
      await requirePremium(
        request
      );

  } catch (
    error
  ) {

    const authResponse =
      authorizationErrorResponse(
        error
      );


    if (
      authResponse
    ) {
      return authResponse;
    }


    console.error(
      "Navigator authorization error:",
      error
    );


    return NextResponse.json(
      {
        error:
          "We couldn't verify your Navigator access.",
      },
      {
        status:
          500,
      }
    );

  }


  try {

    /*
     * --------------------------------------------------------
     * OPENAI CONFIG
     * --------------------------------------------------------
     */

    const apiKey =
      process.env
        .OPENAI_API_KEY;


    if (
      !apiKey
    ) {

      return NextResponse.json(
        {
          error:
            "Navigator AI is not configured.",
        },
        {
          status:
            500,
        }
      );

    }


    /*
     * --------------------------------------------------------
     * REQUEST BODY
     * --------------------------------------------------------
     */

    const body:
      NavigatorRequestBody =
        await request.json();


    const question =
      safeString(
        body?.question
      );


    const childId =
      safeString(
        body?.childId
      );


    const messages =
      Array.isArray(
        body?.messages
      )
        ? body.messages
        : [];


    /*
     * --------------------------------------------------------
     * QUESTION VALIDATION
     * --------------------------------------------------------
     */

    if (
      !question
    ) {

      return NextResponse.json(
        {
          error:
            "A Navigator question is required.",
        },
        {
          status:
            400,
        }
      );

    }


    if (
      question.length >
      2000
    ) {

      return NextResponse.json(
        {
          error:
            "Please keep your question under 2,000 characters.",
        },
        {
          status:
            400,
        }
      );

    }


    /*
     * --------------------------------------------------------
     * LOAD SERVER-TRUSTED CONTEXT
     * --------------------------------------------------------
     */

    let child:
      Record<
        string,
        any
      > | null =
        null;


    let savedJourney:
      Record<
        string,
        any
      > | null =
        null;


    if (
      childId
    ) {

      child =
        await loadChild(
          account.uid,
          childId,
          account.idToken
        );


      /*
       * A child ID from another account cannot be read because
       * Firestore Security Rules evaluate the authenticated
       * Firebase ID token.
       */

      if (
        !child
      ) {

        return NextResponse.json(
          {
            error:
              "We couldn't find that child in your account.",
          },
          {
            status:
              404,
          }
        );

      }


      savedJourney =
        await loadCurrentJourney(
          account.uid,
          childId,
          account.idToken
        );

    }


    const familyContext =
      buildFamilyContext(
        child,
        savedJourney
      );


    /*
     * --------------------------------------------------------
     * PRIOR CONVERSATION
     * --------------------------------------------------------
     */

    const conversationInput =
      buildConversationInput(
        messages
      );


    /*
     * --------------------------------------------------------
     * CURRENT QUESTION
     * --------------------------------------------------------
     */

    const userPrompt =
      `
============================================================
SAVED FAMILY / JOURNEY CONTEXT
============================================================

${JSON.stringify(
  familyContext,
  null,
  2
)}

============================================================
CURRENT QUESTION
============================================================

${question}

Answer the family's current question first.

Use saved Journey context only when it genuinely improves the answer.

If this is a general informational question, answer it generally and
do not add personalized child-specific guidance unless the user asks
for it.

Do not mention saved family details merely to demonstrate
personalization.

Do not force the answer back to the Journey when the question can be
answered clearly without it.

Respect any requested length or format.

If the user asks for a "short list," give no more than 5 items.
`;


    /*
     * --------------------------------------------------------
     * OPENAI REQUEST
     * --------------------------------------------------------
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

                ...conversationInput,

                {
                  role:
                    "user",

                  content:
                    userPrompt,
                },
              ],
            }),
        }
      );


    /*
     * --------------------------------------------------------
     * OPENAI ERROR
     * --------------------------------------------------------
     */

    if (
      !openAIResponse.ok
    ) {

      const errorText =
        await openAIResponse
          .text();


      console.error(
        "Navigator OpenAI error:",
        {
          status:
            openAIResponse
              .status,

          response:
            errorText.slice(
              0,
              500
            ),
        }
      );


      return NextResponse.json(
        {
          error:
            "The Navigator couldn't respond right now. Please try again.",
        },
        {
          status:
            502,
        }
      );

    }


    /*
     * --------------------------------------------------------
     * EXTRACT RESPONSE
     * --------------------------------------------------------
     */

    const response =
      await openAIResponse
        .json();


    const responseText =
      extractResponseText(
        response
      );


    if (
      !responseText
    ) {

      return NextResponse.json(
        {
          error:
            "The Navigator returned an empty response. Please try again.",
        },
        {
          status:
            502,
        }
      );

    }


    /*
     * --------------------------------------------------------
     * SUCCESS
     * --------------------------------------------------------
     */

    return NextResponse.json({
      answer:
        responseText,

      context: {
        childId:
          childId ||
          null,

        journeyId:
          savedJourney
            ?.journeyId ??
          null,

        stageNumber:
          typeof savedJourney
            ?.stageNumber ===
            "number"

            ? savedJourney
                .stageNumber

            : null,
      },

      metadata: {
        generatedAt:
          Date.now(),

        plan:
          account.plan,
      },
    });

  } catch (
    error
  ) {

    const authResponse =
      authorizationErrorResponse(
        error
      );


    if (
      authResponse
    ) {
      return authResponse;
    }


    console.error(
      "Navigator API error:",
      error
    );


    return NextResponse.json(
      {
        error:
          "Something went wrong while asking your Navigator.",
      },
      {
        status:
          500,
      }
    );

  }
}