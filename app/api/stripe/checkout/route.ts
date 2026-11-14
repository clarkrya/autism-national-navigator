
import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "../../../../lib/firebaseAdmin";
import { requireAuthenticatedUser } from "../../../../lib/serverSubscriptionAuth";
import {
  getStripe,
  getStripePriceId,
  type PaidPlan,
  type BillingInterval,
} from "../../../../lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Phase 1 launch: Premium+ purchases are disabled.
// Change this only when Premium+ is ready for release.
const PREMIUM_PLUS_AVAILABLE = false;

type CheckoutRequest = {
  plan?: unknown;
  interval?: unknown;
};

export async function POST(request: NextRequest) {
  let uid: string;
  let email: string | undefined;

  try {
    const account = await requireAuthenticatedUser(request);
    uid = account.uid;
    email = account.email;
  } catch {
    return NextResponse.json(
      { error: "Please sign in to continue." },
      { status: 401 }
    );
  }

  try {
    const body = (await request.json()) as CheckoutRequest;

    if (
      body.plan !== "premium" &&
      body.plan !== "premium_plus"
    ) {
      return NextResponse.json(
        { error: "Invalid subscription plan." },
        { status: 400 }
      );
    }

    // Server-side protection:
    // Prevent Premium+ purchases during Phase 1,
    // including direct requests to this endpoint.
    if (
      body.plan === "premium_plus" &&
      !PREMIUM_PLUS_AVAILABLE
    ) {
      return NextResponse.json(
        {
          error:
            "Premium+ is coming in Phase 2 and is not yet available for purchase.",
        },
        { status: 403 }
      );
    }

    if (
      body.interval !== "monthly" &&
      body.interval !== "annual"
    ) {
      return NextResponse.json(
        { error: "Invalid billing interval." },
        { status: 400 }
      );
    }

    const plan: PaidPlan = body.plan;
    const interval: BillingInterval = body.interval;

    const stripe = getStripe();
    const priceId = getStripePriceId(plan, interval);

    // Retrieve the existing subscription record.
    const subscriptionRef = getAdminDb()
      .collection("users")
      .doc(uid)
      .collection("subscription")
      .doc("current");

    const subscriptionSnapshot = await subscriptionRef.get();
    const subscriptionData = subscriptionSnapshot.data();

    // Prevent creating a second subscription for an
    // account that already has a Stripe subscription.
    if (subscriptionData?.stripeSubscriptionId) {
      return NextResponse.json(
        {
          error:
            "You already have a subscription. Please manage your existing subscription to change plans.",
        },
        { status: 409 }
      );
    }

    const customerId =
      typeof subscriptionData?.stripeCustomerId === "string"
        ? subscriptionData.stripeCustomerId
        : null;

    const origin = new URL(request.url).origin;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",

      ...(customerId
        ? { customer: customerId }
        : email
          ? { customer_email: email }
          : {}),

      client_reference_id: uid,

      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],

      allow_promotion_codes: true,

      subscription_data: {
        metadata: {
          firebaseUid: uid,
          autivoyaPlan: plan,
          billingInterval: interval,
        },
      },

      metadata: {
        firebaseUid: uid,
        autivoyaPlan: plan,
        billingInterval: interval,
      },

      success_url:
        `${origin}/pricing?checkout=success`,

      cancel_url:
        `${origin}/pricing?checkout=canceled`,
    });

    if (!session.url) {
      throw new Error("Stripe did not return a checkout URL.");
    }

    return NextResponse.json({
      url: session.url,
    });
  } catch (error) {
    console.error("Stripe Checkout creation failed:", error);

    return NextResponse.json(
      {
        error:
          "Unable to start checkout. Please try again.",
      },
      { status: 500 }
    );
  }
}
