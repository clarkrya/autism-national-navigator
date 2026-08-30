"use client";

import {
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import {
  useAccountEntitlements,
} from "../../lib/useAccountEntitlements";


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
 * - Journey-aware positioning
 * - Safety guidance
 * - Premium+ Human Navigator escalation position
 *
 * NEXT PHASE:
 *
 * - Connect protected Navigator API
 * - Load saved Journey context
 * - Persist conversation history
 * - Generate AI responses
 *
 * ============================================================
 */


type NavigatorMessage = {
  id: string;

  role:
    | "user"
    | "navigator";

  text: string;
};


const SUGGESTED_QUESTIONS = [
  "What should I focus on next in our autism journey?",
  "How should I prepare for our next school meeting?",
  "What questions should I ask our child's provider?",
  "Can you help me understand the resources that may fit our needs?",
];


export default function NavigatorPage() {

  /*
   * ==========================================================
   * ENTITLEMENTS
   * ==========================================================
   */

  const {
    loading,
    error,
    isAuthenticated,
    isPremium,
    isPremiumPlus,
    canUse,
  } =
    useAccountEntitlements();


  /*
   * ==========================================================
   * NAVIGATOR STATE
   * ==========================================================
   */

  const [
    messages,
    setMessages,
  ] = useState<
    NavigatorMessage[]
  >([]);


  const [
    question,
    setQuestion,
  ] = useState("");


  const [
    submitting,
    setSubmitting,
  ] = useState(false);


  const [
    notice,
    setNotice,
  ] = useState("");


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
   * SUBMIT QUESTION
   * ==========================================================
   *
   * The protected AI API is intentionally not connected yet.
   *
   * We save the user's message into the interface so the
   * conversation experience can be tested before connecting
   * the server-side Navigator API.
   * ==========================================================
   */

  async function submitQuestion(
    value?: string
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


    setSubmitting(
      true
    );

    setNotice("");


    const userMessage:
      NavigatorMessage = {
        id:
          `user-${Date.now()}`,

        role:
          "user",

        text:
          nextQuestion,
      };


    setMessages(
      (
        current
      ) => [
        ...current,
        userMessage,
      ]
    );


    setQuestion("");


    /*
     * --------------------------------------------------------
     * TEMPORARY DEVELOPMENT RESPONSE
     * --------------------------------------------------------
     *
     * This is NOT pretending to be an AI answer.
     *
     * It clearly tells us the UI is working while we build the
     * protected Navigator API next.
     * --------------------------------------------------------
     */

    const developmentMessage:
      NavigatorMessage = {
        id:
          `navigator-${Date.now()}`,

        role:
          "navigator",

        text:
          "Your question is ready for the Navigator. The secure AI connection will be added in the next build step so responses can use your saved journey and account context.",
      };


    setMessages(
      (
        current
      ) => [
        ...current,
        developmentMessage,
      ]
    );


    setSubmitting(
      false
    );

  }


  /*
   * ==========================================================
   * LOADING
   * ==========================================================
   */

  if (
    loading
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
                "Connect guidance to your saved journey",
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
            error
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
                  {error}
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
                make sense of along your journey.
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

            {/* ================================================
                EMPTY STATE / SUGGESTED QUESTIONS
            ================================================= */}

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
                      Choose a starting question or ask something
                      in your own words.
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

                              onClick={() =>
                                submitQuestion(
                                  suggestion
                                )
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
                                  "pointer",
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


            {/* ================================================
                MESSAGES
            ================================================= */}

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
                              }}
                            >
                              {message.text}
                            </div>

                          </div>

                        )
                      )
                    }

                  </div>

                )
                : null
            }


            {/* ================================================
                COMPOSER
            ================================================= */}

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
                      setNotice("");
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

                      submitQuestion();

                    }

                  }
                }

                maxLength={
                  2000
                }

                rows={
                  3
                }

                placeholder="Ask about next steps, meetings, services, resources, or something on your mind..."

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
                    "#FFFFFF",

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

                  onClick={() =>
                    submitQuestion()
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

                        color:
                          "#B45309",

                        fontSize:
                          "13px",

                        lineHeight:
                          1.45,
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
              JOURNEY CONTEXT
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
                Navigator responses will be connected to your
                saved Myriad journey so guidance can reflect your
                current stage and priorities.
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


          {/* ==================================================
              SAFETY FOOTNOTE
          =================================================== */}

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