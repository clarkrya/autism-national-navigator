import {
    NextRequest,
    NextResponse,
  } from "next/server";
  
  import {
    runJourneyInsightAggregation,
  } from "../../../../../lib/journeyInsights/journeyInsightAdminAggregation";
  
  /*
   * ============================================================
   * JOURNEY INSIGHT AGGREGATION ENDPOINT
   * ============================================================
   *
   * Trusted server-only endpoint.
   *
   * Never expose the secret to browser code.
   * ============================================================
   */
  
  export const runtime =
    "nodejs";
  
  export const dynamic =
    "force-dynamic";
  
  function getBearerToken(
    request: NextRequest
  ): string | null {
    const authorization =
      request.headers.get(
        "authorization"
      );
  
    if (!authorization) {
      return null;
    }
  
    const prefix =
      "Bearer ";
  
    if (
      !authorization.startsWith(
        prefix
      )
    ) {
      return null;
    }
  
    const token =
      authorization
        .slice(
          prefix.length
        )
        .trim();
  
    return token || null;
  }
  
  export async function POST(
    request: NextRequest
  ) {
    try {
      const expectedSecret =
        process.env
          .JOURNEY_INSIGHTS_AGGREGATION_SECRET
          ?.trim();
  
      if (!expectedSecret) {
        console.error(
          "Journey Insights aggregation secret is not configured."
        );
  
        return NextResponse.json(
          {
            error:
              "Aggregation is not configured.",
          },
          {
            status: 503,
          }
        );
      }
  
      const suppliedSecret =
        getBearerToken(
          request
        );
  
      if (
        !suppliedSecret ||
        suppliedSecret !==
          expectedSecret
      ) {
        return NextResponse.json(
          {
            error:
              "Unauthorized.",
          },
          {
            status: 401,
          }
        );
      }
  
      const result =
        await runJourneyInsightAggregation();
  
      return NextResponse.json({
        success: true,
        ...result,
      });
    } catch (error) {
      console.error(
        "Journey Insights aggregation failed:",
        error
      );
  
      return NextResponse.json(
        {
          success: false,
          error:
            "Journey Insights aggregation failed.",
        },
        {
          status: 500,
        }
      );
    }
  }