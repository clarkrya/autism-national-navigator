
import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";

import {
  getStripe,
  STRIPE_PRICE_IDS,
  type BillingInterval,
} from "../../../../lib/stripe";
import { getAdminDb } from "../../../../lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PaidPlan = "premium" | "premium_plus";

type Selection = {
  plan: PaidPlan;
  interval: BillingInterval;
};

function selectionFromPrice(priceId: string): Selection | null {
  for (const plan of ["premium", "premium_plus"] as const) {
    for (const interval of ["monthly", "annual"] as const) {
      if (STRIPE_PRICE_IDS[plan][interval] === priceId) {
        return { plan, interval };
      }
    }
  }
  return null;
}

function isPaidPlan(value: unknown): value is PaidPlan {
  return value === "premium" || value === "premium_plus";
}

function isInterval(value: unknown): value is BillingInterval {
  return value === "monthly" || value === "annual";
}

function subscriptionFromInvoice(
  invoice: Stripe.Invoice
): string | null {
  const value =
    invoice.parent?.subscription_details?.subscription;

  if (typeof value === "string") return value;

  if (value && typeof value === "object") {
    return value.id;
  }

  return null;
}

async function invoicePaidForPrice(
  invoiceId: string,
  subscriptionId: string,
  priceId: string
): Promise<boolean> {
  const stripe = getStripe();
  const invoice = await stripe.invoices.retrieve(invoiceId);

  if (
    invoice.status !== "paid" ||
    subscriptionFromInvoice(invoice) !== subscriptionId
  ) {
    return false;
  }

  const lines = await stripe.invoices.listLineItems(invoiceId, {
    limit: 100,
  });

  return lines.data.some(
    (line) => line.pricing?.price_details?.price === priceId
  );
}

async function syncSubscription(
  subscriptionId: string
): Promise<void> {
  const stripe = getStripe();

  const subscription = await stripe.subscriptions.retrieve(
    subscriptionId,
    { expand: ["latest_invoice"] }
  );

  const uid = subscription.metadata.firebaseUid;

  if (!uid) {
    throw new Error("Subscription missing Firebase UID.");
  }

  const item = subscription.items.data[0];

  if (!item) {
    throw new Error("Subscription missing item.");
  }

  const selection = selectionFromPrice(item.price.id);

  if (!selection) {
    throw new Error("Unknown subscription price.");
  }

  const ref = getAdminDb()
    .collection("users")
    .doc(uid)
    .collection("subscription")
    .doc("current");

  const snapshot = await ref.get();
  const existing = snapshot.data();

  if (
    existing?.stripeSubscriptionId &&
    existing.stripeSubscriptionId !== subscriptionId &&
    existing.status !== "canceled"
  ) {
    throw new Error("Conflicting subscription.");
  }

  const previousPlan = isPaidPlan(existing?.plan)
  ? existing?.plan
      : null;

  const previousInterval = isInterval(
    existing?.billingInterval
  )
    ? existing?.billingInterval
    : null;

  const pendingPlan = isPaidPlan(existing?.pendingPlan)
    ? existing?.pendingPlan
    : null;

  const pendingInterval = isInterval(
    existing?.pendingBillingInterval
  )
    ? existing?.pendingBillingInterval
    : null;

  const pendingInvoiceId =
    typeof existing?.pendingInvoiceId === "string"
      ? existing.pendingInvoiceId
      : null;

  const latestInvoice =
    subscription.latest_invoice &&
    typeof subscription.latest_invoice === "object"
      ? subscription.latest_invoice
      : null;

  const latestInvoiceId = latestInvoice?.id ?? null;

  const initial =
    !previousPlan ||
    existing?.stripeSubscriptionId !== subscriptionId;

  const stripeStatus = subscription.status;

  const status =
    stripeStatus === "active" ||
    stripeStatus === "trialing" ||
    stripeStatus === "past_due" ||
    stripeStatus === "incomplete"
      ? stripeStatus
      : "canceled";

  const latestInvoiceVerified =
    stripeStatus === "active" && latestInvoiceId
      ? await invoicePaidForPrice(
          latestInvoiceId,
          subscriptionId,
          item.price.id
        )
      : false;

  let plan: PaidPlan = previousPlan ?? selection.plan;
  let interval: BillingInterval =
    previousInterval ?? selection.interval;

  let effectiveStatus = status;

  let nextPendingPlan: PaidPlan | null = pendingPlan ?? null;
  let nextPendingInterval: BillingInterval | null =
  pendingInterval ?? null;
  let nextPendingInvoiceId: string | null =
    pendingInvoiceId;

  if (initial) {
    if (stripeStatus === "trialing" || latestInvoiceVerified) {
      plan = selection.plan;
      interval = selection.interval;
      nextPendingPlan = null;
      nextPendingInterval = null;
      nextPendingInvoiceId = null;
    } else {
      effectiveStatus = "incomplete";
    }
  } else {
    const sameSelection =
      previousPlan === selection.plan &&
      previousInterval === selection.interval;

    const pendingMatches =
      pendingPlan === selection.plan &&
      pendingInterval === selection.interval;

    const verifiedChange =
      pendingMatches &&
      pendingInvoiceId &&
      stripeStatus === "active"
        ? await invoicePaidForPrice(
            pendingInvoiceId,
            subscriptionId,
            item.price.id
          )
        : false;

    if (verifiedChange) {
      plan = selection.plan;
      interval = selection.interval;
      nextPendingPlan = null;
      nextPendingInterval = null;
      nextPendingInvoiceId = null;
    } else if (sameSelection) {
      nextPendingPlan = null;
      nextPendingInterval = null;
      nextPendingInvoiceId = null;
    } else if (
      previousPlan === "premium_plus" &&
      selection.plan === "premium" &&
      stripeStatus === "active" &&
      !pendingInvoiceId
    ) {
      // Scheduled downgrade has reached its effective date.
      plan = "premium";
      interval = selection.interval;
      nextPendingPlan = null;
      nextPendingInterval = null;
      nextPendingInvoiceId = null;
    } else {
      // Keep previous access while an upgrade is unpaid.
      plan = previousPlan ?? selection.plan;
      interval = previousInterval ?? selection.interval;
      nextPendingPlan = selection.plan;
      nextPendingInterval = selection.interval;
    }
  }

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  const now = Date.now();

  await ref.set(
    {
      userId: uid,
      plan,
      status: effectiveStatus,
      billingInterval: interval,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      currentPeriodStart:
        typeof item.current_period_start === "number"
          ? item.current_period_start * 1000
          : null,
      currentPeriodEnd:
        typeof item.current_period_end === "number"
          ? item.current_period_end * 1000
          : null,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      pendingPlan: nextPendingPlan,
      pendingBillingInterval: nextPendingInterval,
      pendingInvoiceId: nextPendingInvoiceId,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    },
    { merge: true }
  );
}

export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret) {
    return NextResponse.json(
      { error: "Missing webhook secret." },
      { status: 500 }
    );
  }

  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing signature." },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(
      await request.text(),
      signature,
      secret
    );
  } catch {
    return NextResponse.json(
      { error: "Invalid signature." },
      { status: 400 }
    );
  }

  try {
    let subscriptionId: string | null = null;

    switch (event.type) {
      case "checkout.session.completed": {
        const session =
          event.data.object as Stripe.Checkout.Session;

        subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id ?? null;
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        subscriptionId = (
          event.data.object as Stripe.Subscription
        ).id;
        break;
      }

      case "invoice.paid":
      case "invoice.payment_failed": {
        subscriptionId = subscriptionFromInvoice(
          event.data.object as Stripe.Invoice
        );
        break;
      }

      default:
        break;
    }

    if (subscriptionId) {
      await syncSubscription(subscriptionId);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook processing error:", error);

    return NextResponse.json(
      { error: "Webhook processing failed." },
      { status: 500 }
    );
  }
}
