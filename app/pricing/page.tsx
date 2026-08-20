"use client";

import Link from "next/link";

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
 * The upgrade buttons currently lead to the signup/login flow.
 *
 * Once Stripe is implemented, these buttons can launch the
 * appropriate checkout session.
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
      return "Read the community";

    case "community_participate":
      return "Participate in the community";

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


function getPlanDescription(
  plan: SubscriptionPlan
): string {

  return PLAN_DEFINITIONS[
    plan
  ].shortDescription;

}


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
 * PRICING PAGE
 * ============================================================
 */

export default function PricingPage() {

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
          (plan) => {

            const definition =
              PLAN_DEFINITIONS[
                plan
              ];


            const isPremium =
              plan ===
              "premium";


            const isPremiumPlus =
              plan ===
              "premium_plus";


            return (

              <section
                key={
                  plan
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
                    plan
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
                        plan
                      )
                    }
                  </span>


                  {plan !==
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

                  {plan ===
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
                      href="/signup"

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
                          isPremium ||
                          isPremiumPlus
                            ? "none"
                            : "1px solid #CBD5E1",

                        background:
                          isPremium
                            ? "#2563EB"
                            : isPremiumPlus
                            ? "#0F766E"
                            : "#FFFFFF",

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
                      {isPremium
                        ? "Upgrade to Premium"
                        : "Upgrade to Premium+"}
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
                      (feature) => (

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
          href="/login"

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