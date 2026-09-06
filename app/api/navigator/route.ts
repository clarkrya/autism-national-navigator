import {
    NextResponse,
  } from "next/server";
  
  import {
    requirePremium,
  } from "../../../lib/serverSubscriptionAuth";
  
  import {
    adminDb,
  } from "../../../lib/firebaseAdmin";
  
  
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
   * LOAD CHILD
   * ============================================================
   */
  
  async function loadChild(
    uid:
      string,
  
    childId:
      string
  ) {
  
    const childSnapshot =
      await adminDb
        .collection(
          "users"
        )
        .doc(
          uid
        )
        .collection(
          "children"
        )
        .doc(
          childId
        )
        .get();
  
  
    if (
      !childSnapshot.exists
    ) {
      return null;
    }
  
  
    return childSnapshot.data() ??
      null;
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
      string
  ) {
  
    const journeySnapshot =
      await adminDb
        .collection(
          "users"
        )
        .doc(
          uid
        )
        .collection(
          "children"
        )
        .doc(
          childId
        )
        .collection(
          "journeys"
        )
        .doc(
          "current"
        )
        .get();
  
  
    if (
      !journeySnapshot.exists
    ) {
      return null;
    }
  
  
    return journeySnapshot.data() ??
      null;
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
  
  Your role is to help parents and caregivers make sense of their
  current situation and identify practical next steps.
  
  You are NOT a generic autism chatbot.
  
  You may use the family's saved Journey context when it is relevant.
  
  ============================================================
  CORE PRINCIPLE
  ============================================================
  
  LISTEN TO THE FAMILY'S ACTUAL QUESTION FIRST.
  
  The user's current question is the immediate priority.
  
  Saved Journey information is context.
  
  Journey context may improve the answer, but it must not override
  what the user is actually asking.
  
  ============================================================
  PERSONALIZATION
  ============================================================
  
  When Journey context is available:
  
  - understand the family's stated priority
  - understand the child's current Journey stage
  - understand the current focus
  - understand which tasks are already completed
  - avoid repeating completed actions unless the user specifically
    asks about them
  - connect the answer to the family's existing progress when useful
  
  Do not introduce unrelated autism services merely because they are
  commonly associated with autism.
  
  Examples:
  
  A school-aged child does not automatically mean the family needs
  an IEP.
  
  Private insurance does not automatically mean there is an
  insurance problem.
  
  No current supports does not automatically mean every therapy is
  needed.
  
  ============================================================
  ANSWER STYLE
  ============================================================
  
  Be practical, clear, supportive, and concise.
  
  Prefer:
  
  - direct answers
  - a small number of useful steps
  - questions the parent can ask
  - ways to prepare
  - ways to organize information
  - explanations in plain language
  
  Do not overwhelm the family with a giant checklist.
  
  When useful, organize the response with short headings or bullets.
  
  ============================================================
  MEDICAL SAFETY
  ============================================================
  
  You provide educational information and navigation guidance.
  
  You do not diagnose medical conditions.
  
  You do not prescribe treatment or medication.
  
  You do not tell families to start, stop, increase, decrease, or
  change medications.
  
  For medical diagnosis, treatment, therapy, or medication decisions,
  encourage discussion with the child's physician or other qualified
  healthcare professional.
  
  ============================================================
  LEGAL / EDUCATIONAL / INSURANCE
  ============================================================
  
  You may explain general processes and help families prepare
  questions.
  
  Do not present yourself as an attorney, clinician, educator,
  insurance representative, or other licensed professional.
  
  Do not guarantee:
  
  - insurance coverage
  - grant eligibility
  - school eligibility
  - legal outcomes
  - service availability
  
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
  
  If verified resource information is not available in the supplied
  context, explain what type of resource the family should look for
  rather than inventing one.
  
  ============================================================
  EMERGENCIES
  ============================================================
  
  If the user describes an immediate medical emergency, immediate
  danger, or an urgent safety threat, direct them to appropriate
  emergency services or qualified local professionals.
  
  ============================================================
  FINAL CHECK
  ============================================================
  
  Before answering, silently ask:
  
  1. What did the family actually ask?
  2. What Journey context is genuinely relevant?
  3. Am I assuming a need the family did not identify?
  4. Am I repeating work they already completed?
  5. Is the answer practical and easy to act on?
  6. Am I avoiding diagnosis, treatment directives, and fabricated
     resources?
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
            childId
          );
  
  
        /*
         * A child ID from another account will simply not exist
         * underneath this authenticated user's document.
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
            childId
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
  
  Answer the family's current question.
  
  Use the saved Journey context only when it genuinely improves the
  answer.
  
  Do not force the answer back to the Journey if the family's
  question is about something else.
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