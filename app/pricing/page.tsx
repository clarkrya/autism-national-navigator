"use client";

import {
  useState,
} from "react";

import Link from "next/link";

import {
  getCurrentUser,
} from "../../lib/auth";

import {
  useAccountEntitlements,
} from "../../lib/useAccountEntitlements";

import {
  PLAN_DEFINITIONS,
  formatPlanPrice,
  type SubscriptionPlan,
} from "../../lib/subscriptionTypes";


/*
 * ============================================================
 * PRICING PAGE
 * ============================================================
 *
 * Myriad Autism Journey
 *
 * This is currently a PRODUCT / MARKETING page.
 *
 * Stripe is NOT connected yet.
 *
 * Upgrade buttons currently lead to the signup/login flow
 * while preserving the Pricing page as the return destination.
 *
 * Beta testers may redeem a private tester access code below.
 *
 * Once Stripe is implemented, the upgrade buttons can launch
 * the appropriate checkout session.
 * ============================================================
 */


/*
 * ============================================================
 * PLAN ORDER
 * ============================================================
 */

const planOrder:
  SubscriptionPlan[] = [
    "free",
    "premium",
    "premium_plus",
  ];


/*
 * ============================================================
 * TESTER REDEMPTION RESPONSE
 * ============================================================
 */

type TesterRedemptionResponse = {
  success?: boolean;

  plan?: string;

  voucherId?: string;

  redeemedAt?: number;

  expiresAt?: number;

  accessDays?: number;

  error?: string;
};


type TesterMessageType =
  | "success"
  | "error"
  | null;


/*
 * ============================================================
 * DISPLAY HELPERS
 * ============================================================
 */

function getFeatureLabel(
  feature: string
): string {

  switch (feature) {

    case "initial_journey":
      return "Personalized autism journey";

    case "save_journey":
      return "Save your journey";

    case "next_journey":
      return "Continue to What's Next";

    case "journey_history":
      return "Journey History";

    case "community_read":
      return "Read community posts";

    case "community_participate":
      return "Post in the Community";

    case "ask_navigator":
      return "Ask Your Navigator";

    case "advanced_resources":
      return "Advanced personalized resources";

    case "meeting_prep":
      return "Meeting preparation tools";

    case "document_vault":
      return "Document organization";

    case "ai_progress_insights":
      return "AI progress insights";

    case "family_organizer":
      return "Family organizer tools";

    case "human_navigator":
      return "Human Navigator support";

    default:
      return feature;

  }

}


/*
 * ============================================================
 * PLAN DESCRIPTION
 * ============================================================
 */

function getPlanDescription(
  plan: SubscriptionPlan
): string {

  return PLAN_DEFINITIONS[
    plan
  ].shortDescription;

}


/*
 * ============================================================
 * MONTHLY PRICE
 * ============================================================
 */

function getMonthlyPrice(
  plan: SubscriptionPlan
): string {

  return formatPlanPrice(
    PLAN_DEFINITIONS[
      plan
    ].monthlyPriceCents
  );

}


/*
 * ============================================================
 * TESTER EXPIRATION DISPLAY
 * ============================================================
 */

function formatTesterExpiration(
  expiresAt:
    number |
    undefined
): string {

  if (
    typeof expiresAt !==
      "number" ||
    !Number.isFinite(
      expiresAt
    )
  ) {

    return "";

  }


  try {

    return new Intl.DateTimeFormat(
      "en-US",
      {
        month:
          "long",

        day:
          "numeric",

        year:
          "numeric",
      }
    ).format(
      new Date(
        expiresAt
      )
    );

  } catch {

    return "";

  }

}


/*
 * ============================================================
 * RETURN TO PRICING
 * ============================================================
 */

const pricingReturnTo =
  "/pricing";


/*
 * ============================================================
 * PRICING PAGE
 * ============================================================
 */

export default function PricingPage() {

  /*
   * ----------------------------------------------------------
   * CURRENT ACCOUNT ENTITLEMENTS
   * ----------------------------------------------------------
   */

  const {
    plan,
    refresh,
  } =
    useAccountEntitlements();


  /*
   * ----------------------------------------------------------
   * TESTER ACCESS STATE
   * ----------------------------------------------------------
   */

  const [
    testerCode,
    setTesterCode,
  ] =
    useState(
      ""
    );


  const [
    isRedeemingTesterCode,
    setIsRedeemingTesterCode,
  ] =
    useState(
      false
    );


  const [
    testerMessage,
    setTesterMessage,
  ] =
    useState(
      ""
    );


  const [
    testerMessageType,
    setTesterMessageType,
  ] =
    useState<TesterMessageType>(
      null
    );


  const [
    testerExpiresAt,
    setTesterExpiresAt,
  ] =
    useState<
      number |
      undefined
    >(
      undefined
    );


  /*
   * ----------------------------------------------------------
   * ACCOUNT STATE
   * ----------------------------------------------------------
   */

  const hasPremiumAccess =
    plan === "premium" ||
    plan === "premium_plus";


  /*
   * ----------------------------------------------------------
   * REDEEM TESTER ACCESS
   * ----------------------------------------------------------
   */

  async function handleRedeemTesterCode() {

    if (
      isRedeemingTesterCode
    ) {

      return;

    }


    setTesterMessage(
      ""
    );

    setTesterMessageType(
      null
    );

    setTesterExpiresAt(
      undefined
    );


    /*
     * --------------------------------------------------------
     * BASIC INPUT VALIDATION
     * --------------------------------------------------------
     */

    const normalizedCode =
      testerCode.trim();


    if (
      !normalizedCode
    ) {

      setTesterMessage(
        "Please enter your tester access code."
      );

      setTesterMessageType(
        "error"
      );

      return;

    }


    /*
     * --------------------------------------------------------
     * REQUIRE SIGNED-IN USER
     * --------------------------------------------------------
     */

    const user =
      getCurrentUser();


    if (
      !user
    ) {

      setTesterMessage(
        "Please log in before redeeming your tester access code."
      );

      setTesterMessageType(
        "error"
      );

      return;

    }


    setIsRedeemingTesterCode(
      true
    );


    try {

      /*
       * ------------------------------------------------------
       * GET FRESH FIREBASE ID TOKEN
       * ------------------------------------------------------
       */

      const idToken =
        await user.getIdToken();


      /*
       * ------------------------------------------------------
       * REDEEM TESTER CODE
       * ------------------------------------------------------
       */

      const response =
        await fetch(
          "/api/tester-access/redeem",
          {
            method:
              "POST",

            headers: {
              Authorization:
                `Bearer ${idToken}`,

              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                code:
                  normalizedCode,
              }),

            cache:
              "no-store",
          }
        );


      let result:
        TesterRedemptionResponse =
        {};


      try {

        result =
          await response.json() as
            TesterRedemptionResponse;

      } catch {

        result =
          {};

      }


      /*
       * ------------------------------------------------------
       * HANDLE API ERROR
       * ------------------------------------------------------
       */

      if (
        !response.ok ||
        result.success !==
          true
      ) {

        setTesterMessage(
          result.error ||
          "We couldn't activate tester access right now. Please try again."
        );

        setTesterMessageType(
          "error"
        );

        return;

      }


      /*
       * ------------------------------------------------------
       * REFRESH EFFECTIVE ENTITLEMENTS
       * ------------------------------------------------------
       *
       * This causes the client entitlement layer to re-read the
       * user's current subscription/tester access state.
       */

      await refresh();


      /*
       * ------------------------------------------------------
       * SUCCESS
       * ------------------------------------------------------
       */

      setTesterCode(
        ""
      );


      setTesterExpiresAt(
        result.expiresAt
      );


      setTesterMessage(
        "Tester access activated. Premium features are now available on your account."
      );

      setTesterMessageType(
        "success"
      );


    } catch (
      error
    ) {

      console.error(
        "Tester access redemption failed:",
        error
      );


      setTesterMessage(
        "We couldn't activate tester access right now. Please try again."
      );

      setTesterMessageType(
        "error"
      );


    } finally {

      setIsRedeemingTesterCode(
        false
      );

    }

  }


  /*
   * ----------------------------------------------------------
   * ENTER KEY SUPPORT
   * ----------------------------------------------------------
   */

  function handleTesterCodeKeyDown(
    event:
      React.KeyboardEvent<HTMLInputElement>
  ) {

    if (
      event.key ===
      "Enter"
    ) {

      event.preventDefault();

      void handleRedeemTesterCode();

    }

  }


  /*
   * ==========================================================
   * PAGE
   * ==========================================================
   */

  return (

    <main
      style={{
        minHeight:
          "100vh",

        background:
          "linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 55%, #F8FAFC 100%)",

        padding:
          "70px 24px 100px",
      }}
    >

      {/* ======================================================
          HERO
      ======================================================= */}

      <section
        style={{
          maxWidth:
            "850px",

          margin:
            "0 auto",

          textAlign:
            "center",

          marginBottom:
            "55px",
        }}
      >

        <div
          style={{
            display:
              "inline-flex",

            alignItems:
              "center",

            padding:
              "8px 13px",

            borderRadius:
              "999px",

            background:
              "#EFF6FF",

            border:
              "1px solid #BFDBFE",

            color:
              "#2563EB",

            fontSize:
              "12px",

            fontWeight:
              800,

            letterSpacing:
              "0.05em",

            textTransform:
              "uppercase",

            marginBottom:
              "18px",
          }}
        >
          Myriad Autism Journey
        </div>


        <h1
          style={{
            margin:
              0,

            color:
              "#0F172A",

            fontSize:
              "48px",

            lineHeight:
              1.1,

            fontWeight:
              850,
          }}
        >
          Choose the support that
          fits your journey.
        </h1>


        <p
          style={{
            maxWidth:
              "720px",

            margin:
              "18px auto 0",

            color:
              "#64748B",

            fontSize:
              "18px",

            lineHeight:
              1.7,
          }}
        >
          Start with the tools you need today
          and choose more personalized support
          as your family's journey evolves.
        </p>


        <div
          style={{
            marginTop:
              "15px",

            color:
              "#475569",

            fontSize:
              "16px",

            fontStyle:
              "italic",
          }}
        >
          Embracing the countless ways we thrive.
        </div>

      </section>


      {/* ======================================================
          PLANS
      ======================================================= */}

      <section
        style={{
          maxWidth:
            "1180px",

          margin:
            "0 auto",

          display:
            "grid",

          gridTemplateColumns:
            "repeat(auto-fit, minmax(290px, 1fr))",

          gap:
            "22px",

          alignItems:
            "stretch",
        }}
      >

        {planOrder.map(
          (
            planOption
          ) => {

            const definition =
              PLAN_DEFINITIONS[
                planOption
              ];


            const isPremium =
              planOption ===
              "premium";


            const isPremiumPlus =
              planOption ===
              "premium_plus";


            return (

              <section
                key={
                  planOption
                }

                style={{
                  position:
                    "relative",

                  display:
                    "flex",

                  flexDirection:
                    "column",

                  padding:
                    "30px",

                  borderRadius:
                    "22px",

                  border:
                    isPremium
                      ? "2px solid #2563EB"
                      : "1px solid #E2E8F0",

                  background:
                    "#FFFFFF",

                  boxShadow:
                    isPremium
                      ? "0 16px 35px rgba(37, 99, 235, 0.12)"
                      : "0 8px 24px rgba(15, 23, 42, 0.05)",
                }}
              >

                {/* ==========================================
                    BADGE
                =========================================== */}

                {definition.badge && (

                  <div
                    style={{
                      position:
                        "absolute",

                      top:
                        "-13px",

                      left:
                        "50%",

                      transform:
                        "translateX(-50%)",

                      padding:
                        "6px 12px",

                      borderRadius:
                        "999px",

                      background:
                        "#2563EB",

                      color:
                        "#FFFFFF",

                      fontSize:
                        "11px",

                      fontWeight:
                        800,

                      whiteSpace:
                        "nowrap",

                      letterSpacing:
                        "0.04em",

                      textTransform:
                        "uppercase",
                    }}
                  >
                    {definition.badge}
                  </div>

                )}


                {/* ==========================================
                    PLAN NAME
                =========================================== */}

                <div
                  style={{
                    color:
                      "#2563EB",

                    fontSize:
                      "12px",

                    fontWeight:
                      800,

                    letterSpacing:
                      "0.07em",

                    textTransform:
                      "uppercase",

                    marginBottom:
                      "8px",
                  }}
                >
                  {definition.name}
                </div>


                <h2
                  style={{
                    margin:
                      0,

                    color:
                      "#0F172A",

                    fontSize:
                      "29px",

                    lineHeight:
                      1.2,

                    fontWeight:
                      800,
                  }}
                >
                  {definition.name}
                </h2>


                <p
                  style={{
                    margin:
                      "10px 0 0",

                    minHeight:
                      "50px",

                    color:
                      "#64748B",

                    fontSize:
                      "14px",

                    lineHeight:
                      1.55,
                  }}
                >
                  {getPlanDescription(
                    planOption
                  )}
                </p>


                {/* ==========================================
                    PRICE
                =========================================== */}

                <div
                  style={{
                    marginTop:
                      "24px",

                    display:
                      "flex",

                    alignItems:
                      "baseline",

                    gap:
                      "6px",
                  }}
                >

                  <span
                    style={{
                      color:
                        "#0F172A",

                      fontSize:
                        "38px",

                      fontWeight:
                        850,

                      lineHeight:
                        1,
                    }}
                  >
                    {
                      getMonthlyPrice(
                        planOption
                      )
                    }
                  </span>


                  {planOption !==
                    "free" && (

                    <span
                      style={{
                        color:
                          "#94A3B8",

                        fontSize:
                          "13px",
                      }}
                    >
                      / month
                    </span>

                  )}

                </div>


                {/* ==========================================
                    ANNUAL PRICE
                =========================================== */}

                {definition.annualPriceCents !==
                  null && (

                  <div
                    style={{
                      marginTop:
                        "7px",

                      color:
                        "#64748B",

                      fontSize:
                        "12px",
                    }}
                  >
                    Annual plan:
                    {" "}
                    {
                      formatPlanPrice(
                        definition
                          .annualPriceCents
                      )
                    }
                  </div>

                )}


                {/* ==========================================
                    ACTION
                =========================================== */}

                <div
                  style={{
                    marginTop:
                      "25px",
                  }}
                >

                  {planOption ===
                    "free" ? (

                    <Link
                      href="/journey"

                      style={{
                        display:
                          "block",

                        textAlign:
                          "center",

                        padding:
                          "13px 18px",

                        borderRadius:
                          "10px",

                        border:
                          "1px solid #CBD5E1",

                        background:
                          "#FFFFFF",

                        color:
                          "#0F172A",

                        fontSize:
                          "14px",

                        fontWeight:
                          800,

                        textDecoration:
                          "none",
                      }}
                    >
                      Start Free
                    </Link>

                  ) : (

                    <Link
                      href={
                        `/signup?returnTo=${encodeURIComponent(
                          pricingReturnTo
                        )}`
                      }

                      style={{
                        display:
                          "block",

                        textAlign:
                          "center",

                        padding:
                          "13px 18px",

                        borderRadius:
                          "10px",

                        border:
                          "none",

                        background:
                          isPremium
                            ? "#2563EB"
                            : "#0F766E",

                        color:
                          "#FFFFFF",

                        fontSize:
                          "14px",

                        fontWeight:
                          800,

                        textDecoration:
                          "none",

                        boxSizing:
                          "border-box",
                      }}
                    >
                      {
                        isPremium
                          ? "Upgrade to Premium"
                          : "Upgrade to Premium+"
                      }
                    </Link>

                  )}

                </div>


                {/* ==========================================
                    FEATURES
                =========================================== */}

                <div
                  style={{
                    marginTop:
                      "28px",

                    paddingTop:
                      "24px",

                    borderTop:
                      "1px solid #E2E8F0",

                    flex:
                      1,
                  }}
                >

                  <div
                    style={{
                      color:
                        "#334155",

                      fontSize:
                        "13px",

                      fontWeight:
                        800,

                      marginBottom:
                        "14px",
                    }}
                  >
                    What's included
                  </div>


                  <div
                    style={{
                      display:
                        "grid",

                      gap:
                        "11px",
                    }}
                  >

                    {definition.features.map(
                      (
                        feature
                      ) => (

                        <div
                          key={
                            feature
                          }

                          style={{
                            display:
                              "flex",

                            alignItems:
                              "flex-start",

                            gap:
                              "9px",

                            color:
                              "#475569",

                            fontSize:
                              "14px",

                            lineHeight:
                              1.45,
                          }}
                        >

                          <span
                            style={{
                              color:
                                isPremiumPlus
                                  ? "#0F766E"
                                  : "#059669",

                              fontWeight:
                                900,

                              marginTop:
                                "1px",
                            }}
                          >
                            ✓
                          </span>


                          <span>
                            {
                              getFeatureLabel(
                                feature
                              )
                            }
                          </span>

                        </div>

                      )
                    )}

                  </div>

                </div>

              </section>

            );

          }
        )}

      </section>


      {/* ======================================================
          TESTER ACCESS
      ======================================================= */}

      <section
        style={{
          maxWidth:
            "720px",

          margin:
            "48px auto 0",

          padding:
            "30px",

          borderRadius:
            "20px",

          border:
            "1px solid #BFDBFE",

          background:
            "#EFF6FF",

          boxSizing:
            "border-box",
        }}
      >

        <div
          style={{
            textAlign:
              "center",
          }}
        >

          <div
            style={{
              display:
                "inline-flex",

              padding:
                "6px 11px",

              borderRadius:
                "999px",

              background:
                "#DBEAFE",

              color:
                "#1D4ED8",

              fontSize:
                "11px",

              fontWeight:
                800,

              letterSpacing:
                "0.05em",

              textTransform:
                "uppercase",

              marginBottom:
                "12px",
            }}
          >
            Beta Testing
          </div>


          <h2
            style={{
              margin:
                0,

              color:
                "#0F172A",

              fontSize:
                "24px",

              lineHeight:
                1.25,

              fontWeight:
                800,
            }}
          >
            Have a tester access code?
          </h2>


          <p
            style={{
              maxWidth:
                "560px",

              margin:
                "10px auto 0",

              color:
                "#475569",

              fontSize:
                "14px",

              lineHeight:
                1.6,
            }}
          >
            Approved testers can activate temporary Premium
            access without entering payment information.
          </p>

        </div>


        {/* ==================================================
            ALREADY PREMIUM
        =================================================== */}

        {hasPremiumAccess ? (

          <div
            style={{
              marginTop:
                "22px",

              padding:
                "16px",

              borderRadius:
                "12px",

              border:
                "1px solid #A7F3D0",

              background:
                "#ECFDF5",

              color:
                "#065F46",

              fontSize:
                "14px",

              lineHeight:
                1.55,

              textAlign:
                "center",

              fontWeight:
                700,
            }}
          >
            Your account currently has
            {" "}
            {
              plan ===
                "premium_plus"
                ? "Premium+"
                : "Premium"
            }
            {" "}
            access.
          </div>

        ) : (

          <>
            {/* ==============================================
                CODE FIELD
            =============================================== */}

            <div
              style={{
                marginTop:
                  "24px",
              }}
            >

              <label
                htmlFor="tester-access-code"

                style={{
                  display:
                    "block",

                  marginBottom:
                    "7px",

                  color:
                    "#334155",

                  fontSize:
                    "13px",

                  fontWeight:
                    800,
                }}
              >
                Tester access code
              </label>


              <input
                id="tester-access-code"

                type="text"

                autoComplete="off"

                spellCheck={
                  false
                }

                value={
                  testerCode
                }

                disabled={
                  isRedeemingTesterCode
                }

                onChange={
                  (
                    event
                  ) => {

                    setTesterCode(
                      event.target.value
                    );


                    if (
                      testerMessageType ===
                      "error"
                    ) {

                      setTesterMessage(
                        ""
                      );

                      setTesterMessageType(
                        null
                      );

                    }

                  }
                }

                onKeyDown={
                  handleTesterCodeKeyDown
                }

                placeholder="Enter your tester code"

                style={{
                  width:
                    "100%",

                  padding:
                    "13px 14px",

                  borderRadius:
                    "10px",

                  border:
                    "1px solid #CBD5E1",

                  background:
                    isRedeemingTesterCode
                      ? "#F8FAFC"
                      : "#FFFFFF",

                  color:
                    "#0F172A",

                  fontSize:
                    "15px",

                  outline:
                    "none",

                  boxSizing:
                    "border-box",
                }}
              />

            </div>


            {/* ==============================================
                REDEEM BUTTON
            =============================================== */}

            <button
              type="button"

              disabled={
                isRedeemingTesterCode
              }

              onClick={
                () => {

                  void handleRedeemTesterCode();

                }
              }

              style={{
                width:
                  "100%",

                marginTop:
                  "12px",

                padding:
                  "13px 18px",

                border:
                  "none",

                borderRadius:
                  "10px",

                background:
                  isRedeemingTesterCode
                    ? "#93C5FD"
                    : "#2563EB",

                color:
                  "#FFFFFF",

                fontSize:
                  "14px",

                fontWeight:
                  800,

                cursor:
                  isRedeemingTesterCode
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              {
                isRedeemingTesterCode
                  ? "Activating..."
                  : "Activate Tester Access"
              }
            </button>


            {/* ==============================================
                SIGN-IN NOTE
            =============================================== */}

            {plan ===
              "guest" && (

              <p
                style={{
                  margin:
                    "12px 0 0",

                  textAlign:
                    "center",

                  color:
                    "#64748B",

                  fontSize:
                    "12px",

                  lineHeight:
                    1.5,
                }}
              >
                Already have a tester code?
                {" "}
                <Link
                  href={
                    `/login?returnTo=${encodeURIComponent(
                      pricingReturnTo
                    )}`
                  }

                  style={{
                    color:
                      "#2563EB",

                    fontWeight:
                      800,

                    textDecoration:
                      "none",
                  }}
                >
                  Log in first
                </Link>
                {" "}
                so the access can be added to your account.
              </p>

            )}

          </>

        )}


        {/* ==================================================
            SUCCESS / ERROR MESSAGE
        =================================================== */}

        {testerMessage && (

          <div
            role={
              testerMessageType ===
                "error"
                ? "alert"
                : "status"
            }

            style={{
              marginTop:
                "16px",

              padding:
                "14px",

              borderRadius:
                "10px",

              border:
                testerMessageType ===
                  "success"
                  ? "1px solid #A7F3D0"
                  : "1px solid #FECACA",

              background:
                testerMessageType ===
                  "success"
                  ? "#ECFDF5"
                  : "#FEF2F2",

              color:
                testerMessageType ===
                  "success"
                  ? "#065F46"
                  : "#991B1B",

              fontSize:
                "13px",

              lineHeight:
                1.55,

              textAlign:
                "center",

              fontWeight:
                700,
            }}
          >
            {testerMessage}


            {testerMessageType ===
              "success" &&
              testerExpiresAt && (

              <div
                style={{
                  marginTop:
                    "5px",

                  fontSize:
                    "12px",

                  fontWeight:
                    600,
                }}
              >
                Access available through
                {" "}
                {
                  formatTesterExpiration(
                    testerExpiresAt
                  )
                }.
              </div>

            )}

          </div>

        )}


        {/* ==================================================
            TESTER LIMITATION
        =================================================== */}

        <p
          style={{
            margin:
              "14px 0 0",

            color:
              "#64748B",

            fontSize:
              "11px",

            lineHeight:
              1.5,

            textAlign:
              "center",
          }}
        >
          Tester access includes Premium features only.
          Premium+ Human Navigator support is not included.
        </p>

      </section>


      {/* ======================================================
          VALUE MESSAGE
      ======================================================= */}

      <section
        style={{
          maxWidth:
            "900px",

          margin:
            "60px auto 0",

          padding:
            "30px",

          borderRadius:
            "20px",

          background:
            "#F8FAFC",

          border:
            "1px solid #E2E8F0",

          textAlign:
            "center",
        }}
      >

        <h2
          style={{
            margin:
              0,

            color:
              "#0F172A",

            fontSize:
              "25px",

            fontWeight:
              800,
          }}
        >
          Your family's journey can evolve.
        </h2>


        <p
          style={{
            margin:
              "10px auto 0",

            maxWidth:
              "680px",

            color:
              "#64748B",

            fontSize:
              "15px",

            lineHeight:
              1.65,
          }}
        >
          Start with the free journey and move
          into additional support when it becomes
          useful for your family. Your plan should
          meet you where you are.
        </p>

      </section>


      {/* ======================================================
          FOOTER NAVIGATION
      ======================================================= */}

      <div
        style={{
          maxWidth:
            "900px",

          margin:
            "30px auto 0",

          display:
            "flex",

          justifyContent:
            "center",

          gap:
            "18px",

          flexWrap:
            "wrap",
        }}
      >

        <Link
          href="/journey"

          style={{
            color:
              "#64748B",

            fontSize:
              "13px",

            fontWeight:
              700,

            textDecoration:
              "none",
          }}
        >
          ← Back to My Journey
        </Link>


        <Link
          href={
            `/login?returnTo=${encodeURIComponent(
              pricingReturnTo
            )}`
          }

          style={{
            color:
              "#2563EB",

            fontSize:
              "13px",

            fontWeight:
              700,

            textDecoration:
              "none",
          }}
        >
          Log In
        </Link>

      </div>


      {/* ======================================================
          DISCLAIMER
      ======================================================= */}

      <p
        style={{
          maxWidth:
            "850px",

          margin:
            "40px auto 0",

          textAlign:
            "center",

          color:
            "#94A3B8",

          fontSize:
            "11px",

          lineHeight:
            1.5,
        }}
      >
        Premium pricing shown here is preliminary and may change
        before launch. Payment processing and subscription
        activation are not yet connected.
      </p>

    </main>

  );

}