"use client";

import {
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import {
  auth,
} from "../../lib/firebase";

import {
  useAccountEntitlements,
} from "../../lib/useAccountEntitlements";

import {
  useNavigatorJourneyContext,
} from "../../lib/useNavigatorJourneyContext";


/*
 * ============================================================
 * ASK YOUR NAVIGATOR
 * ============================================================
 *
 * Premium / Premium+ AI Navigator experience.
 *
 * CURRENT PHASE:
 *
 * - Authentication gate
 * - Premium entitlement gate
 * - Navigator interface
 * - Suggested questions
 * - Conversation shell
 * - Saved child context
 * - Current Journey context
 * - Current Journey stage
 * - Protected Navigator API
 * - Real AI responses
 * - Safety guidance
 * - Premium+ Human Navigator position
 *
 * NEXT PHASE:
 *
 * - Persist conversation history
 * - Add conversation reset / new conversation controls
 * - Expand safety testing
 * - Mobile / responsive QA
 *
 * ============================================================
 */


/*
 * ============================================================
 * TYPES
 * ============================================================
 */

type NavigatorMessage = {
  id:
    string;

  role:
    | "user"
    | "navigator";

  text:
    string;
};


/*
 * ============================================================
 * SUGGESTED QUESTIONS
 * ============================================================
 */

const SUGGESTED_QUESTIONS = [
  "What should I focus on next in our autism journey?",
  "How should I prepare for our next school meeting?",
  "What questions should I ask our child's provider?",
  "Can you help me understand the resources that may fit our needs?",
];


/*
 * ============================================================
 * HELPERS
 * ============================================================
 */

function formatDisplayValue(
  value:
    string
) {

  if (
    !value
  ) {
    return "";
  }


  return value
    .replace(
      /[-_]/g,
      " "
    )
    .replace(
      /\b\w/g,
      (
        letter
      ) =>
        letter.toUpperCase()
    );
}


/*
 * ============================================================
 * COMPONENT
 * ============================================================
 */

export default function NavigatorPage() {

  /*
   * ==========================================================
   * ENTITLEMENTS
   * ==========================================================
   */

  const {
    loading:
      entitlementLoading,

    error:
      entitlementError,

    isAuthenticated,

    isPremium,

    isPremiumPlus,

    canUse,
  } =
    useAccountEntitlements();


  /*
   * ==========================================================
   * JOURNEY CONTEXT
   * ==========================================================
   */

  const {
    children,

    selectedChildId,

    selectedChild,

    currentJourney,

    loading:
      journeyContextLoading,

    error:
      journeyContextError,

    setSelectedChildId,
  } =
    useNavigatorJourneyContext();


  /*
   * ==========================================================
   * NAVIGATOR STATE
   * ==========================================================
   */

  const [
    messages,
    setMessages,
  ] =
    useState<
      NavigatorMessage[]
    >(
      []
    );


  const [
    question,
    setQuestion,
  ] =
    useState(
      ""
    );


  const [
    submitting,
    setSubmitting,
  ] =
    useState(
      false
    );


  const [
    notice,
    setNotice,
  ] =
    useState(
      ""
    );


  /*
   * ==========================================================
   * ACCESS
   * ==========================================================
   */

  const hasNavigatorAccess =
    useMemo(
      () =>
        canUse(
          "ask_navigator"
        ),
      [
        canUse,
      ]
    );


  /*
   * ==========================================================
   * DERIVED JOURNEY CONTEXT
   * ==========================================================
   */

  const childName =
    selectedChild
      ?.familyProfile
      ?.childName
      ?.trim() ||
    currentJourney
      ?.familyProfile
      ?.childName
      ?.trim() ||
    "Your child";


  const currentPriority =
    currentJourney
      ?.familyProfile
      ?.priority
      ? formatDisplayValue(
          currentJourney
            .familyProfile
            .priority
        )
      : "";


  const journeyStage =
    currentJourney
      ?.stageNumber &&
    currentJourney
      .stageNumber >
      0

      ? currentJourney
          .stageNumber

      : 1;


  const currentFocusTitle =
    currentJourney
      ?.journey
      ?.currentFocus
      ?.title
      ?.trim() ||
    "";


  const currentFocusExplanation =
    currentJourney
      ?.journey
      ?.currentFocus
      ?.explanation
      ?.trim() ||
    "";


  const currentNextStep =
    currentJourney
      ?.journey
      ?.nextStep
      ?.title
      ?.trim() ||
    "";


  /*
   * ==========================================================
   * SUBMIT QUESTION
   * ==========================================================
   */

  async function submitQuestion(
    value?:
      string
  ) {

    if (
      submitting
    ) {
      return;
    }


    const nextQuestion =
      (
        value ??
        question
      ).trim();


    if (
      !nextQuestion
    ) {

      setNotice(
        "Enter a question for your Navigator."
      );

      return;
    }


    if (
      nextQuestion.length >
      2000
    ) {

      setNotice(
        "Please keep your question under 2,000 characters."
      );

      return;
    }


    const currentUser =
      auth.currentUser;


    if (
      !currentUser
    ) {

      setNotice(
        "Your login session has expired. Please log in again."
      );

      return;
    }


    setSubmitting(
      true
    );


    setNotice(
      ""
    );


    const timestamp =
      Date.now();


    const userMessage:
      NavigatorMessage = {

      id:
        `user-${timestamp}`,

      role:
        "user",

      text:
        nextQuestion,
    };


    const messagesBeforeRequest =
      messages;


    setMessages(
      (
        current
      ) => [
        ...current,
        userMessage,
      ]
    );


    setQuestion(
      ""
    );


    try {

      /*
       * --------------------------------------------------------
       * FIREBASE TOKEN
       * --------------------------------------------------------
       */

      const idToken =
        await currentUser
          .getIdToken();


      /*
       * --------------------------------------------------------
       * PROTECTED NAVIGATOR REQUEST
       * --------------------------------------------------------
       */

      const response =
        await fetch(
          "/api/navigator",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${idToken}`,
            },

            body:
              JSON.stringify({
                question:
                  nextQuestion,

                childId:
                  selectedChildId ||
                  undefined,

                messages:
                  messagesBeforeRequest.map(
                    (
                      message
                    ) => ({
                      role:
                        message.role,

                      text:
                        message.text,
                    })
                  ),
              }),
          }
        );


      /*
       * --------------------------------------------------------
       * SAFE RESPONSE PARSING
       * --------------------------------------------------------
       */

      const responseText =
        await response.text();


      let data:
        any =
        null;


      if (
        responseText
      ) {

        try {

          data =
            JSON.parse(
              responseText
            );

        } catch (
          parseError
        ) {

          console.error(
            "Navigator API returned invalid JSON:",
            {
              status:
                response.status,

              responsePreview:
                responseText.slice(
                  0,
                  300
                ),

              parseError,
            }
          );


          throw new Error(
            "The Navigator returned an invalid response."
          );

        }

      }


      /*
       * --------------------------------------------------------
       * AUTH EXPIRED
       * --------------------------------------------------------
       */

      if (
        response.status ===
        401
      ) {

        setNotice(
          data?.error ||
          "Your login session has expired. Please log in again."
        );

        return;
      }


      /*
       * --------------------------------------------------------
       * PREMIUM REQUIRED
       * --------------------------------------------------------
       */

      if (
        response.status ===
        403
      ) {

        setNotice(
          data?.error ||
          "Ask Your Navigator requires a Premium subscription."
        );

        return;
      }


      /*
       * --------------------------------------------------------
       * OTHER API ERROR
       * --------------------------------------------------------
       */

      if (
        !response.ok
      ) {

        throw new Error(
          data?.error ||
          "The Navigator couldn't respond right now."
        );

      }


      /*
       * --------------------------------------------------------
       * ANSWER VALIDATION
       * --------------------------------------------------------
       */

      const answer =
        typeof data?.answer ===
          "string"

          ? data.answer.trim()

          : "";


      if (
        !answer
      ) {

        throw new Error(
          "The Navigator returned an empty response."
        );

      }


      /*
       * --------------------------------------------------------
       * ADD NAVIGATOR RESPONSE
       * --------------------------------------------------------
       */

      const navigatorMessage:
        NavigatorMessage = {

        id:
          `navigator-${Date.now()}`,

        role:
          "navigator",

        text:
          answer,
      };


      setMessages(
        (
          current
        ) => [
          ...current,
          navigatorMessage,
        ]
      );

    } catch (
      error
    ) {

      console.error(
        "Unable to ask Navigator:",
        error
      );


      setNotice(
        error instanceof Error
          ? error.message
          : "The Navigator couldn't respond right now. Please try again."
      );

    } finally {

      setSubmitting(
        false
      );

    }
  }


  /*
   * ==========================================================
   * ENTITLEMENT LOADING
   * ==========================================================
   */

  if (
    entitlementLoading
  ) {

    return (

      <main
        style={{
          minHeight:
            "100vh",

          background:
            "#F8FAFC",

          padding:
            "40px 20px",
        }}
      >

        <div
          style={{
            maxWidth:
              "760px",

            margin:
              "0 auto",

            background:
              "#FFFFFF",

            border:
              "1px solid #E2E8F0",

            borderRadius:
              "18px",

            padding:
              "32px",

            textAlign:
              "center",

            color:
              "#475569",
          }}
        >
          Loading your Navigator...
        </div>

      </main>
    );
  }


  /*
   * ==========================================================
   * GUEST GATE
   * ==========================================================
   */

  if (
    !isAuthenticated
  ) {

    return (

      <main
        style={{
          minHeight:
            "100vh",

          background:
            "#F8FAFC",

          padding:
            "48px 20px 80px",
        }}
      >

        <div
          style={{
            maxWidth:
              "720px",

            margin:
              "0 auto",

            background:
              "#FFFFFF",

            border:
              "1px solid #E2E8F0",

            borderRadius:
              "20px",

            padding:
              "36px",

            boxShadow:
              "0 12px 32px rgba(15, 23, 42, 0.06)",
          }}
        >

          <div
            style={{
              fontSize:
                "34px",

              marginBottom:
                "16px",
            }}
          >
            🧭
          </div>


          <h1
            style={{
              margin:
                "0 0 12px",

              color:
                "#0F172A",

              fontSize:
                "32px",

              lineHeight:
                1.15,
            }}
          >
            Ask Your Navigator
          </h1>


          <p
            style={{
              margin:
                "0 0 28px",

              color:
                "#475569",

              fontSize:
                "16px",

              lineHeight:
                1.7,
            }}
          >
            Your Navigator helps you think through next steps,
            prepare questions, understand resources, and make
            sense of your autism journey. Sign in to continue.
          </p>


          <div
            style={{
              display:
                "flex",

              flexWrap:
                "wrap",

              gap:
                "12px",
            }}
          >

            <Link
              href="/login"

              style={{
                minHeight:
                  "46px",

                display:
                  "inline-flex",

                alignItems:
                  "center",

                justifyContent:
                  "center",

                padding:
                  "0 20px",

                borderRadius:
                  "10px",

                background:
                  "#2563EB",

                color:
                  "#FFFFFF",

                fontWeight:
                  800,

                textDecoration:
                  "none",
              }}
            >
              Log In
            </Link>


            <Link
              href="/signup"

              style={{
                minHeight:
                  "46px",

                display:
                  "inline-flex",

                alignItems:
                  "center",

                justifyContent:
                  "center",

                padding:
                  "0 20px",

                borderRadius:
                  "10px",

                border:
                  "1px solid #CBD5E1",

                color:
                  "#334155",

                fontWeight:
                  800,

                textDecoration:
                  "none",
              }}
            >
              Create Free Account
            </Link>

          </div>

        </div>

      </main>
    );
  }


  /*
   * ==========================================================
   * PREMIUM GATE
   * ==========================================================
   */

  if (
    !hasNavigatorAccess ||
    !isPremium
  ) {

    return (

      <main
        style={{
          minHeight:
            "100vh",

          background:
            "#F8FAFC",

          padding:
            "48px 20px 80px",
        }}
      >

        <div
          style={{
            maxWidth:
              "760px",

            margin:
              "0 auto",

            background:
              "#FFFFFF",

            border:
              "1px solid #E2E8F0",

            borderRadius:
              "20px",

            padding:
              "36px",

            boxShadow:
              "0 12px 32px rgba(15, 23, 42, 0.06)",
          }}
        >

          <div
            style={{
              display:
                "inline-flex",

              padding:
                "6px 10px",

              borderRadius:
                "999px",

              background:
                "#EFF6FF",

              color:
                "#1D4ED8",

              fontSize:
                "12px",

              fontWeight:
                850,

              marginBottom:
                "18px",
            }}
          >
            PREMIUM
          </div>


          <h1
            style={{
              margin:
                "0 0 12px",

              fontSize:
                "32px",

              color:
                "#0F172A",
            }}
          >
            Meet Your Navigator
          </h1>


          <p
            style={{
              margin:
                "0 0 22px",

              color:
                "#475569",

              fontSize:
                "16px",

              lineHeight:
                1.7,
            }}
          >
            Ask questions about your journey, get help preparing
            for conversations and meetings, and receive guidance
            informed by the information you have saved in Myriad.
          </p>


          <div
            style={{
              display:
                "grid",

              gap:
                "12px",

              marginBottom:
                "28px",
            }}
          >

            {
              [
                "Ask questions about what to do next",
                "Prepare for school and provider conversations",
                "Find resources that fit your situation",
                "Connect guidance to your saved Journey",
              ].map(
                (
                  item
                ) => (

                  <div
                    key={
                      item
                    }

                    style={{
                      display:
                        "flex",

                      gap:
                        "10px",

                      color:
                        "#334155",

                      lineHeight:
                        1.5,
                    }}
                  >

                    <span>
                      ✓
                    </span>


                    <span>
                      {item}
                    </span>

                  </div>

                )
              )
            }

          </div>


          {
            entitlementError
              ? (

                <div
                  style={{
                    marginBottom:
                      "20px",

                    padding:
                      "12px 14px",

                    borderRadius:
                      "10px",

                    background:
                      "#FFF7ED",

                    color:
                      "#9A3412",

                    lineHeight:
                      1.5,
                  }}
                >
                  {entitlementError}
                </div>

              )
              : null
          }


          <Link
            href="/pricing"

            style={{
              minHeight:
                "48px",

              display:
                "inline-flex",

              alignItems:
                "center",

              justifyContent:
                "center",

              padding:
                "0 22px",

              borderRadius:
                "10px",

              background:
                "#2563EB",

              color:
                "#FFFFFF",

              fontWeight:
                850,

              textDecoration:
                "none",
            }}
          >
            View Premium
          </Link>

        </div>

      </main>
    );
  }


  /*
   * ==========================================================
   * NAVIGATOR EXPERIENCE
   * ==========================================================
   */

  return (

    <main
      style={{
        minHeight:
          "100vh",

        background:
          "#F8FAFC",

        padding:
          "28px 16px 80px",
      }}
    >

      <div
        style={{
          width:
            "100%",

          maxWidth:
            "1080px",

          margin:
            "0 auto",
        }}
      >

        {/* ====================================================
            HEADER
        ===================================================== */}

        <section
          style={{
            marginBottom:
              "20px",

            background:
              "#FFFFFF",

            border:
              "1px solid #E2E8F0",

            borderRadius:
              "18px",

            padding:
              "24px",
          }}
        >

          <div
            style={{
              display:
                "flex",

              justifyContent:
                "space-between",

              alignItems:
                "flex-start",

              gap:
                "18px",

              flexWrap:
                "wrap",
            }}
          >

            <div
              style={{
                minWidth:
                  0,

                flex:
                  "1 1 500px",
              }}
            >

              <div
                style={{
                  display:
                    "flex",

                  alignItems:
                    "center",

                  gap:
                    "10px",

                  marginBottom:
                    "10px",
                }}
              >

                <div
                  style={{
                    width:
                      "42px",

                    height:
                      "42px",

                    borderRadius:
                      "12px",

                    background:
                      "#EFF6FF",

                    display:
                      "flex",

                    alignItems:
                      "center",

                    justifyContent:
                      "center",

                    fontSize:
                      "22px",
                  }}
                >
                  🧭
                </div>


                <div>

                  <div
                    style={{
                      color:
                        "#2563EB",

                      fontSize:
                        "11px",

                      fontWeight:
                        900,

                      letterSpacing:
                        "0.08em",

                      textTransform:
                        "uppercase",
                    }}
                  >
                    Myriad Premium
                  </div>


                  <h1
                    style={{
                      margin:
                        "2px 0 0",

                      color:
                        "#0F172A",

                      fontSize:
                        "28px",

                      lineHeight:
                        1.2,
                    }}
                  >
                    Ask Your Navigator
                  </h1>

                </div>

              </div>


              <p
                style={{
                  margin:
                    0,

                  maxWidth:
                    "720px",

                  color:
                    "#475569",

                  fontSize:
                    "15px",

                  lineHeight:
                    1.65,
                }}
              >
                Ask questions about your next steps, meetings,
                services, resources, or anything you're trying to
                make sense of along your Journey.
              </p>

            </div>


            <div
              style={{
                padding:
                  "8px 12px",

                borderRadius:
                  "999px",

                background:
                  "#F8FAFC",

                border:
                  "1px solid #E2E8F0",

                color:
                  "#475569",

                fontSize:
                  "12px",

                fontWeight:
                  800,
              }}
            >
              {
                isPremiumPlus
                  ? "Premium+"
                  : "Premium"
              }
            </div>

          </div>

        </section>


        {/* ====================================================
            FAMILY / JOURNEY CONTEXT
        ===================================================== */}

        <section
          style={{
            marginBottom:
              "20px",

            background:
              "#FFFFFF",

            border:
              "1px solid #E2E8F0",

            borderRadius:
              "18px",

            padding:
              "20px",
          }}
        >

          <div
            style={{
              display:
                "flex",

              justifyContent:
                "space-between",

              alignItems:
                "flex-start",

              flexWrap:
                "wrap",

              gap:
                "16px",
            }}
          >

            <div>

              <div
                style={{
                  color:
                    "#2563EB",

                  fontSize:
                    "11px",

                  fontWeight:
                    900,

                  letterSpacing:
                    "0.08em",

                  textTransform:
                    "uppercase",

                  marginBottom:
                    "5px",
                }}
              >
                Navigator Context
              </div>


              <h2
                style={{
                  margin:
                    0,

                  color:
                    "#0F172A",

                  fontSize:
                    "20px",
                }}
              >
                Who are we talking about?
              </h2>

            </div>


            {
              children.length >
              0
                ? (

                  <div
                    style={{
                      minWidth:
                        "220px",
                    }}
                  >

                    <label
                      htmlFor="navigator-child"

                      style={{
                        display:
                          "block",

                        marginBottom:
                          "6px",

                        color:
                          "#475569",

                        fontSize:
                          "12px",

                        fontWeight:
                          800,
                      }}
                    >
                      Child
                    </label>


                    <select
                      id="navigator-child"

                      value={
                        selectedChildId
                      }

                      onChange={
                        (
                          event
                        ) => {

                          setSelectedChildId(
                            event.target.value
                          );


                          setMessages(
                            []
                          );


                          setNotice(
                            ""
                          );

                        }
                      }

                      disabled={
                        journeyContextLoading ||
                        submitting
                      }

                      style={{
                        width:
                          "100%",

                        minHeight:
                          "44px",

                        padding:
                          "0 12px",

                        border:
                          "1px solid #CBD5E1",

                        borderRadius:
                          "10px",

                        background:
                          "#FFFFFF",

                        color:
                          "#0F172A",

                        fontSize:
                          "14px",
                      }}
                    >

                      {
                        children.map(
                          (
                            child
                          ) => {

                            const name =
                              child
                                .familyProfile
                                ?.childName
                                ?.trim() ||
                              "Child";


                            return (

                              <option
                                key={
                                  child.childId
                                }

                                value={
                                  child.childId
                                }
                              >
                                {name}
                              </option>

                            );

                          }
                        )
                      }

                    </select>

                  </div>

                )
                : null
            }

          </div>


          {
            journeyContextLoading
              ? (

                <div
                  style={{
                    marginTop:
                      "18px",

                    padding:
                      "16px",

                    borderRadius:
                      "12px",

                    background:
                      "#F8FAFC",

                    color:
                      "#64748B",

                    fontSize:
                      "14px",
                  }}
                >
                  Loading saved Journey information...
                </div>

              )
              : null
          }


          {
            !journeyContextLoading &&
            journeyContextError
              ? (

                <div
                  style={{
                    marginTop:
                      "18px",

                    padding:
                      "14px",

                    borderRadius:
                      "12px",

                    background:
                      "#FFF7ED",

                    color:
                      "#9A3412",

                    fontSize:
                      "14px",

                    lineHeight:
                      1.5,
                  }}
                >
                  {journeyContextError}
                </div>

              )
              : null
          }


          {
            !journeyContextLoading &&
            !journeyContextError &&
            children.length ===
              0
              ? (

                <div
                  style={{
                    marginTop:
                      "18px",

                    padding:
                      "16px",

                    borderRadius:
                      "12px",

                    background:
                      "#F8FAFC",

                    color:
                      "#475569",

                    lineHeight:
                      1.6,

                    fontSize:
                      "14px",
                  }}
                >
                  You do not have a saved child Journey yet.
                  You can still use the Navigator, but creating
                  and saving a Journey will allow it to provide
                  more personalized guidance.
                </div>

              )
              : null
          }


          {
            !journeyContextLoading &&
            selectedChild &&
            !currentJourney
              ? (

                <div
                  style={{
                    marginTop:
                      "18px",

                    padding:
                      "16px",

                    borderRadius:
                      "12px",

                    background:
                      "#F8FAFC",

                    color:
                      "#475569",

                    fontSize:
                      "14px",

                    lineHeight:
                      1.6,
                  }}
                >
                  <strong>
                    {childName}
                  </strong>{" "}
                  does not currently have an active saved Journey.
                  The Navigator can still answer general questions,
                  but it will not have an active Journey to use as
                  personalized context.
                </div>

              )
              : null
          }


          {
            !journeyContextLoading &&
            currentJourney
              ? (

                <div
                  style={{
                    marginTop:
                      "18px",

                    display:
                      "grid",

                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(180px, 1fr))",

                    gap:
                      "12px",
                  }}
                >

                  <div
                    style={{
                      padding:
                        "14px",

                      border:
                        "1px solid #E2E8F0",

                      borderRadius:
                        "12px",

                      background:
                        "#F8FAFC",
                    }}
                  >

                    <div
                      style={{
                        color:
                          "#94A3B8",

                        fontSize:
                          "11px",

                        fontWeight:
                          800,

                        textTransform:
                          "uppercase",

                        marginBottom:
                          "5px",
                      }}
                    >
                      Child
                    </div>


                    <div
                      style={{
                        color:
                          "#0F172A",

                        fontSize:
                          "15px",

                        fontWeight:
                          800,
                      }}
                    >
                      {childName}
                    </div>

                  </div>


                  <div
                    style={{
                      padding:
                        "14px",

                      border:
                        "1px solid #E2E8F0",

                      borderRadius:
                        "12px",

                      background:
                        "#F8FAFC",
                    }}
                  >

                    <div
                      style={{
                        color:
                          "#94A3B8",

                        fontSize:
                          "11px",

                        fontWeight:
                          800,

                        textTransform:
                          "uppercase",

                        marginBottom:
                          "5px",
                      }}
                    >
                      Current Journey
                    </div>


                    <div
                      style={{
                        color:
                          "#0F172A",

                        fontSize:
                          "15px",

                        fontWeight:
                          800,
                      }}
                    >
                      Stage {journeyStage}
                    </div>

                  </div>


                  <div
                    style={{
                      padding:
                        "14px",

                      border:
                        "1px solid #E2E8F0",

                      borderRadius:
                        "12px",

                      background:
                        "#F8FAFC",
                    }}
                  >

                    <div
                      style={{
                        color:
                          "#94A3B8",

                        fontSize:
                          "11px",

                        fontWeight:
                          800,

                        textTransform:
                          "uppercase",

                        marginBottom:
                          "5px",
                      }}
                    >
                      Family Priority
                    </div>


                    <div
                      style={{
                        color:
                          "#0F172A",

                        fontSize:
                          "15px",

                        fontWeight:
                          800,
                      }}
                    >
                      {
                        currentPriority ||
                        "Not specified"
                      }
                    </div>

                  </div>

                </div>

              )
              : null
          }


          {
            !journeyContextLoading &&
            currentJourney &&
            currentFocusTitle
              ? (

                <div
                  style={{
                    marginTop:
                      "12px",

                    padding:
                      "16px",

                    border:
                      "1px solid #DBEAFE",

                    borderRadius:
                      "12px",

                    background:
                      "#F8FBFF",
                  }}
                >

                  <div
                    style={{
                      color:
                        "#2563EB",

                      fontSize:
                        "11px",

                      fontWeight:
                        900,

                      textTransform:
                        "uppercase",

                      letterSpacing:
                        "0.06em",

                      marginBottom:
                        "6px",
                    }}
                  >
                    Current Focus
                  </div>


                  <div
                    style={{
                      color:
                        "#0F172A",

                      fontSize:
                        "16px",

                      fontWeight:
                        850,

                      marginBottom:
                        currentFocusExplanation
                          ? "6px"
                          : 0,
                    }}
                  >
                    {currentFocusTitle}
                  </div>


                  {
                    currentFocusExplanation
                      ? (

                        <div
                          style={{
                            color:
                              "#475569",

                            fontSize:
                              "13px",

                            lineHeight:
                              1.6,
                          }}
                        >
                          {currentFocusExplanation}
                        </div>

                      )
                      : null
                  }


                  {
                    currentNextStep
                      ? (

                        <div
                          style={{
                            marginTop:
                              "12px",

                            paddingTop:
                              "12px",

                            borderTop:
                              "1px solid #DBEAFE",

                            color:
                              "#334155",

                            fontSize:
                              "13px",

                            lineHeight:
                              1.5,
                          }}
                        >
                          <strong>
                            Current next step:
                          </strong>{" "}
                          {currentNextStep}
                        </div>

                      )
                      : null
                  }

                </div>

              )
              : null
          }

        </section>


        <div
          style={{
            display:
              "grid",

            gridTemplateColumns:
              "minmax(0, 1fr)",

            gap:
              "20px",
          }}
        >

          {/* ==================================================
              CONVERSATION
          =================================================== */}

          <section
            style={{
              background:
                "#FFFFFF",

              border:
                "1px solid #E2E8F0",

              borderRadius:
                "18px",

              overflow:
                "hidden",
            }}
          >

            {
              messages.length ===
              0
                ? (

                  <div
                    style={{
                      padding:
                        "28px 24px 20px",
                    }}
                  >

                    <h2
                      style={{
                        margin:
                          "0 0 8px",

                        color:
                          "#0F172A",

                        fontSize:
                          "20px",
                      }}
                    >
                      What can I help you with today?
                    </h2>


                    <p
                      style={{
                        margin:
                          "0 0 20px",

                        color:
                          "#64748B",

                        fontSize:
                          "14px",

                        lineHeight:
                          1.6,
                      }}
                    >
                      {
                        currentJourney
                          ? `Ask something about ${childName}'s current Journey or choose a starting question.`
                          : "Choose a starting question or ask something in your own words."
                      }
                    </p>


                    <div
                      style={{
                        display:
                          "grid",

                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(220px, 1fr))",

                        gap:
                          "10px",
                      }}
                    >

                      {
                        SUGGESTED_QUESTIONS.map(
                          (
                            suggestion
                          ) => (

                            <button
                              key={
                                suggestion
                              }

                              type="button"

                              onClick={
                                () =>
                                  void submitQuestion(
                                    suggestion
                                  )
                              }

                              disabled={
                                submitting
                              }

                              style={{
                                minHeight:
                                  "72px",

                                textAlign:
                                  "left",

                                padding:
                                  "14px",

                                border:
                                  "1px solid #DBEAFE",

                                borderRadius:
                                  "12px",

                                background:
                                  "#F8FBFF",

                                color:
                                  "#1E3A8A",

                                fontSize:
                                  "14px",

                                fontWeight:
                                  700,

                                lineHeight:
                                  1.45,

                                cursor:
                                  submitting
                                    ? "not-allowed"
                                    : "pointer",

                                opacity:
                                  submitting
                                    ? 0.65
                                    : 1,
                              }}
                            >
                              {suggestion}
                            </button>

                          )
                        )
                      }

                    </div>

                  </div>

                )
                : null
            }


            {
              messages.length >
              0
                ? (

                  <div
                    style={{
                      padding:
                        "24px",

                      display:
                        "grid",

                      gap:
                        "16px",

                      minHeight:
                        "320px",
                    }}
                  >

                    {
                      messages.map(
                        (
                          message
                        ) => (

                          <div
                            key={
                              message.id
                            }

                            style={{
                              display:
                                "flex",

                              justifyContent:
                                message.role ===
                                "user"
                                  ? "flex-end"
                                  : "flex-start",
                            }}
                          >

                            <div
                              style={{
                                maxWidth:
                                  "82%",

                                padding:
                                  "13px 15px",

                                borderRadius:
                                  message.role ===
                                  "user"
                                    ? "16px 16px 4px 16px"
                                    : "16px 16px 16px 4px",

                                background:
                                  message.role ===
                                  "user"
                                    ? "#2563EB"
                                    : "#F1F5F9",

                                color:
                                  message.role ===
                                  "user"
                                    ? "#FFFFFF"
                                    : "#334155",

                                lineHeight:
                                  1.6,

                                fontSize:
                                  "14px",

                                overflowWrap:
                                  "anywhere",

                                whiteSpace:
                                  "pre-wrap",
                              }}
                            >
                              {message.text}
                            </div>

                          </div>

                        )
                      )
                    }


                    {
                      submitting
                        ? (

                          <div
                            style={{
                              display:
                                "flex",

                              justifyContent:
                                "flex-start",
                            }}
                          >

                            <div
                              style={{
                                padding:
                                  "13px 15px",

                                borderRadius:
                                  "16px 16px 16px 4px",

                                background:
                                  "#F1F5F9",

                                color:
                                  "#64748B",

                                fontSize:
                                  "14px",

                                lineHeight:
                                  1.6,

                                fontStyle:
                                  "italic",
                              }}
                            >
                              Navigator is thinking...
                            </div>

                          </div>

                        )
                        : null
                    }

                  </div>

                )
                : null
            }


            <div
              style={{
                borderTop:
                  "1px solid #E2E8F0",

                padding:
                  "16px",
              }}
            >

              <label
                htmlFor="navigator-question"

                style={{
                  position:
                    "absolute",

                  width:
                    "1px",

                  height:
                    "1px",

                  padding:
                    0,

                  margin:
                    "-1px",

                  overflow:
                    "hidden",

                  clip:
                    "rect(0, 0, 0, 0)",

                  whiteSpace:
                    "nowrap",

                  border:
                    0,
                }}
              >
                Ask your Navigator
              </label>


              <textarea
                id="navigator-question"

                value={
                  question
                }

                onChange={
                  (
                    event
                  ) => {

                    setQuestion(
                      event.target.value
                    );


                    if (
                      notice
                    ) {

                      setNotice(
                        ""
                      );

                    }

                  }
                }

                onKeyDown={
                  (
                    event
                  ) => {

                    if (
                      event.key ===
                        "Enter" &&
                      !event.shiftKey
                    ) {

                      event.preventDefault();

                      void submitQuestion();

                    }

                  }
                }

                maxLength={
                  2000
                }

                rows={
                  3
                }

                disabled={
                  submitting
                }

                placeholder={
                  currentJourney
                    ? `Ask about ${childName}'s Journey, next steps, meetings, services, or resources...`
                    : "Ask about next steps, meetings, services, resources, or something on your mind..."
                }

                style={{
                  width:
                    "100%",

                  boxSizing:
                    "border-box",

                  resize:
                    "vertical",

                  minHeight:
                    "88px",

                  border:
                    "1px solid #CBD5E1",

                  borderRadius:
                    "12px",

                  padding:
                    "12px 14px",

                  color:
                    "#0F172A",

                  background:
                    submitting
                      ? "#F8FAFC"
                      : "#FFFFFF",

                  fontSize:
                    "16px",

                  lineHeight:
                    1.5,

                  outline:
                    "none",
                }}
              />


              <div
                style={{
                  marginTop:
                    "10px",

                  display:
                    "flex",

                  justifyContent:
                    "space-between",

                  alignItems:
                    "center",

                  gap:
                    "12px",

                  flexWrap:
                    "wrap",
                }}
              >

                <div
                  style={{
                    fontSize:
                      "12px",

                    color:
                      "#94A3B8",
                  }}
                >
                  {question.length}/2000
                </div>


                <button
                  type="button"

                  onClick={
                    () =>
                      void submitQuestion()
                  }

                  disabled={
                    submitting
                  }

                  style={{
                    minHeight:
                      "44px",

                    padding:
                      "0 20px",

                    border:
                      "none",

                    borderRadius:
                      "10px",

                    background:
                      "#2563EB",

                    color:
                      "#FFFFFF",

                    fontSize:
                      "14px",

                    fontWeight:
                      850,

                    cursor:
                      submitting
                        ? "not-allowed"
                        : "pointer",

                    opacity:
                      submitting
                        ? 0.7
                        : 1,
                  }}
                >
                  {
                    submitting
                      ? "Sending..."
                      : "Ask Navigator"
                  }
                </button>

              </div>


              {
                notice
                  ? (

                    <div
                      style={{
                        marginTop:
                          "10px",

                        padding:
                          "11px 12px",

                        borderRadius:
                          "10px",

                        background:
                          "#FFF7ED",

                        color:
                          "#9A3412",

                        fontSize:
                          "13px",

                        lineHeight:
                          1.5,
                      }}
                    >
                      {notice}
                    </div>

                  )
                  : null
              }

            </div>

          </section>


          {/* ==================================================
              INFORMATION CARDS
          =================================================== */}

          <section
            style={{
              display:
                "grid",

              gridTemplateColumns:
                "repeat(auto-fit, minmax(240px, 1fr))",

              gap:
                "14px",
            }}
          >

            <div
              style={{
                background:
                  "#FFFFFF",

                border:
                  "1px solid #E2E8F0",

                borderRadius:
                  "16px",

                padding:
                  "18px",
              }}
            >

              <div
                style={{
                  fontSize:
                    "20px",

                  marginBottom:
                    "8px",
                }}
              >
                🗺️
              </div>


              <h3
                style={{
                  margin:
                    "0 0 7px",

                  color:
                    "#0F172A",

                  fontSize:
                    "16px",
                }}
              >
                Your Journey Matters
              </h3>


              <p
                style={{
                  margin:
                    0,

                  color:
                    "#64748B",

                  fontSize:
                    "13px",

                  lineHeight:
                    1.6,
                }}
              >
                {
                  currentJourney
                    ? `The Navigator uses ${childName}'s current Journey, priorities, and progress to make guidance more relevant.`
                    : "A saved Journey gives the Navigator more context about your family's current priorities and progress."
                }
              </p>

            </div>


            <div
              style={{
                background:
                  "#FFFFFF",

                border:
                  "1px solid #E2E8F0",

                borderRadius:
                  "16px",

                padding:
                  "18px",
              }}
            >

              <div
                style={{
                  fontSize:
                    "20px",

                  marginBottom:
                    "8px",
                }}
              >
                🛡️
              </div>


              <h3
                style={{
                  margin:
                    "0 0 7px",

                  color:
                    "#0F172A",

                  fontSize:
                    "16px",
                }}
              >
                Guidance, Not a Diagnosis
              </h3>


              <p
                style={{
                  margin:
                    0,

                  color:
                    "#64748B",

                  fontSize:
                    "13px",

                  lineHeight:
                    1.6,
                }}
              >
                Your Navigator can help you organize questions,
                understand options, and prepare for conversations.
                It does not replace medical, legal, educational,
                or emergency professionals.
              </p>

            </div>


            {
              isPremiumPlus
                ? (

                  <div
                    style={{
                      background:
                        "#FFFFFF",

                      border:
                        "1px solid #E2E8F0",

                      borderRadius:
                        "16px",

                      padding:
                        "18px",
                    }}
                  >

                    <div
                      style={{
                        fontSize:
                          "20px",

                        marginBottom:
                          "8px",
                      }}
                    >
                      🤝
                    </div>


                    <h3
                      style={{
                        margin:
                          "0 0 7px",

                        color:
                          "#0F172A",

                        fontSize:
                          "16px",
                      }}
                    >
                      Human Navigator Support
                    </h3>


                    <p
                      style={{
                        margin:
                          0,

                        color:
                          "#64748B",

                        fontSize:
                          "13px",

                        lineHeight:
                          1.6,
                      }}
                    >
                      Premium+ includes access to human Navigator
                      support when your situation needs help beyond
                      the AI Navigator.
                    </p>

                  </div>

                )
                : null
            }

          </section>


          <div
            style={{
              color:
                "#64748B",

              fontSize:
                "12px",

              lineHeight:
                1.6,

              padding:
                "0 4px",
            }}
          >
            If you believe someone is in immediate danger or
            experiencing a medical emergency, contact emergency
            services or an appropriate qualified professional.
          </div>

        </div>

      </div>

    </main>
  );
}