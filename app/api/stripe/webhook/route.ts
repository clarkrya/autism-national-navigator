
import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";

import { getStripe, STRIPE_PRICE_IDS } from "../../../../lib/stripe";
import { getAdminDb } from "../../../../lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PaidPlan = "premium" | "premium_plus";

function planFromPriceId(priceId: string): PaidPlan | null {
  if (
    priceId === STRIPE_PRICE_IDS.premium.monthly ||
    priceId === STRIPE_PRICE_IDS.premium.annual
  ) {
    return "premium";
  }

  if (
    priceId === STRIPE_PRICE_IDS.premium_plus.monthly ||
    priceId === STRIPE_PRICE_IDS.premium_plus.annual
  ) {
    return "premium_plus";
  }

  return null;
}

async function syncSubscription(subscriptionId: string) {
  const stripe = getStripe();

  const subscription = await stripe.subscriptions.retrieve(
    subscriptionId,
    { expand: ["items.data.price"] }
  );

  const uid = subscription.metadata.firebaseUid;

  if (!uid) {
    throw new Error(
      `Subscription ${subscriptionId} has no Firebase UID.`
    );
  }

  const priceId = subscription.items.data[0]?.price.id;
  const plan = priceId ? planFromPriceId(priceId) : null;

  if (!plan) {
    throw new Error(
      `Unrecognized Stripe price on subscription ${subscriptionId}.`
    );
  }

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  const status = subscription.status;

  const mappedStatus =
    status === "active" ||
    status === "trialing" ||
    status === "past_due" ||
    status === "incomplete"
      ? status
      : status === "canceled" ||
          status === "unpaid" ||
          status === "incomplete_expired" ||
          status === "paused"
        ? "canceled"
        : "none";

  // Stripe's subscription item carries the billing period
  // in current Stripe API versions.
  const firstItem = subscription.items.data[0];

  const periodStart = firstItem?.current_period_start;
  const periodEnd = firstItem?.current_period_end;

  const ref = getAdminDb()
    .collection("users")
    .doc(uid)
    .collection("subscription")
    .doc("current");

  const existing = await ref.get();
  const now = Date.now();

  await ref.set(
    {
      userId: uid,
      plan,
      status: mappedStatus,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      currentPeriodStart:
        typeof periodStart === "number"
          ? periodStart * 1000
          : null,
      currentPeriodEnd:
        typeof periodEnd === "number"
          ? periodEnd * 1000
          : null,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      createdAt: existing.exists
        ? existing.data()?.createdAt ?? now
        : now,
      updatedAt: now,
    },
    { merge: true }
  );
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is missing.");
    return NextResponse.json(
      { error: "Webhook not configured." },
      { status: 500 }
    );
  }

  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing Stripe signature." },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    const rawBody = await request.text();

    event = getStripe().webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret
    );
  } catch (error) {
    console.error("Invalid Stripe webhook signature:", error);

    return NextResponse.json(
      { error: "Invalid webhook signature." },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        if (typeof session.subscription === "string") {
          await syncSubscription(session.subscription);
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        await syncSubscription(subscription.id);
        break;
      }

      case "invoice.paid":
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;

        // The subscription ID is obtained through Stripe's
        // invoice parent details in current API versions.
        const subscriptionDetails =
          invoice.parent?.subscription_details;

        const subscriptionId =
          subscriptionDetails?.subscription;

        if (typeof subscriptionId === "string") {
          await syncSubscription(subscriptionId);
        }
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook processing failed:", error);

    return NextResponse.json(
      { error: "Webhook processing failed." },
      { status: 500 }
    );
  }
}
