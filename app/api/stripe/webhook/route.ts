
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

function selectionFromPrice(
  priceId: string
): Selection | null {
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

function invoiceSubscriptionId(
  invoice: Stripe.Invoice
): string | null {
  const subscription =
    invoice.parent?.subscription_details?.subscription;

  if (typeof subscription === "string") {
    return subscription;
  }

  if (subscription && typeof subscription === "object") {
    return subscription.id;
  }

  return null;
}

async function isPaidInvoiceForPrice(
  invoiceId: string,
  subscriptionId: string,
  priceId: string
): Promise<boolean> {
  const stripe = getStripe();

  const invoice = await stripe.invoices.retrieve(invoiceId);

  if (
    invoice.status !== "paid" ||
    invoiceSubscriptionId(invoice) !== subscriptionId
  ) {
    return false;
  }

  const lines = await stripe.invoices.listLineItems(
    invoiceId,
    { limit: 100 }
  );

  return lines.data.some(
    (line) =>
      line.pricing?.price_details?.price === priceId &&
      line.amount >= 0
  );
}

function normalizedStatus(
  status: Stripe.Subscription.Status
): "active" | "trialing" | "past_due" | "incomplete" | "canceled" {
  switch (status) {
    case "active":
      return "active";
    case "trialing":
      return "trialing";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "incomplete":
      return "incomplete";
    default:
      return "canceled";
  }
}

async function syncSubscription(
  subscriptionId: string
): Promise<void> {
  const stripe = getStripe();

  // Retrieve current Stripe state, not an old event snapshot.
  const subscription = await stripe.subscriptions.retrieve(
    subscriptionId,
    { expand: ["latest_invoice"] }
  );

  const uid = subscription.metadata.firebaseUid;

  if (!uid) {
    throw new Error("Subscription missing Firebase UID.");
  }

  if (subscription.items.data.length !== 1) {
    throw new Error("Unsupported subscription configuration.");
  }

  const item = subscription.items.data[0];

  const selection = selectionFromPrice(item.price.id);

  if (!selection) {
    throw new Error("Unrecognized Stripe price.");
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
    throw new Error(
      "Another subscription is already associated with user."
    );
  }

  const sameSubscription =
    existing?.stripeSubscriptionId === subscriptionId;

  const previousPlan =
    sameSubscription && isPaidPlan(existing?.plan)
      ? existing.plan
      : null;

  const previousInterval =
    sameSubscription && isInterval(existing?.billingInterval)
      ? existing.billingInterval
      : null;

  const pendingPlan =
    sameSubscription && isPaidPlan(existing?.pendingPlan)
      ? existing.pendingPlan
      : null;

  const pendingInterval =
    sameSubscription && isInterval(existing?.pendingBillingInterval)
      ? existing.pendingBillingInterval
      : null;

  const pendingInvoiceId =
    sameSubscription &&
    typeof existing?.pendingInvoiceId === "string"
      ? existing.pendingInvoiceId
      : null;

  const latestInvoiceId =
    typeof subscription.latest_invoice === "string"
      ? subscription.latest_invoice
      : subscription.latest_invoice?.id ?? null;

  const stripeStatus = subscription.status;
  const status = normalizedStatus(stripeStatus);

  const latestInvoicePaid =
    stripeStatus === "active" && latestInvoiceId
      ? await isPaidInvoiceForPrice(
          latestInvoiceId,
          subscriptionId,
          item.price.id
        )
      : false;

  const pendingInvoicePaid =
    stripeStatus === "active" &&
    pendingInvoiceId &&
    pendingPlan === selection.plan &&
    pendingInterval === selection.interval
      ? await isPaidInvoiceForPrice(
          pendingInvoiceId,
          subscriptionId,
          item.price.id
        )
      : false;

  let plan: PaidPlan =
    previousPlan ?? selection.plan;

  let interval: BillingInterval =
    previousInterval ?? selection.interval;

  let effectiveStatus = status;

  let nextPendingPlan: PaidPlan | null = pendingPlan;
  let nextPendingInterval: BillingInterval | null =
    pendingInterval;
  let nextPendingInvoiceId: string | null =
    pendingInvoiceId;

  if (!previousPlan) {
    // Initial checkout must be paid before access is granted.
    if (latestInvoicePaid) {
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

    if (sameSelection) {
      nextPendingPlan = null;
      nextPendingInterval = null;
      nextPendingInvoiceId = null;
    } else if (
      pendingInvoicePaid ||
      (
        // Stripe may complete payment before Firestore
        // records the invoice ID. The latest paid invoice
        // can verify the currently selected Stripe price.
        latestInvoicePaid &&
        pendingPlan === selection.plan &&
        pendingInterval === selection.interval
      )
    ) {
      plan = selection.plan;
      interval = selection.interval;
      nextPendingPlan = null;
      nextPendingInterval = null;
      nextPendingInvoiceId = null;
    } else if (
      previousPlan === "premium_plus" &&
      selection.plan === "premium" &&
      stripeStatus === "active" &&
      !pendingInvoiceId
    ) {
      // Scheduled downgrade has taken effect.
      plan = selection.plan;
      interval = selection.interval;
      nextPendingPlan = null;
      nextPendingInterval = null;
      nextPendingInvoiceId = null;
    } else {
      // Preserve existing access until payment is verified.
      plan = previousPlan;
      interval = previousInterval ?? selection.interval;
      nextPendingPlan = selection.plan;
      nextPendingInterval = selection.interval;
      nextPendingInvoiceId = pendingInvoiceId;
    }
  }

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  const scheduleId =
    typeof subscription.schedule === "string"
      ? subscription.schedule
      : subscription.schedule?.id ?? null;

  const now = Date.now();

  await ref.set(
    {
      userId: uid,
      plan,
      status: effectiveStatus,
      billingInterval: interval,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      stripeScheduleId: scheduleId,
      currentPeriodStart:
        typeof item.current_period_start === "number"
          ? item.current_period_start * 1000
          : null,
      currentPeriodEnd:
        typeof item.current_period_end === "number"
          ? item.current_period_end * 1000
          : null,
      cancelAtPeriodEnd:
        subscription.cancel_at_period_end,
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
    console.error("Missing STRIPE_WEBHOOK_SECRET.");

    return NextResponse.json(
      { error: "Webhook configuration missing." },
      { status: 500 }
    );
  }

  const signature = request.headers.get(
    "stripe-signature"
  );

  if (!signature) {
    return NextResponse.json(
      { error: "Missing Stripe signature." },
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
      { error: "Invalid Stripe signature." },
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
        subscriptionId = invoiceSubscriptionId(
          event.data.object as Stripe.Invoice
        );
        break;
      }

      default:
        return NextResponse.json({
          received: true,
          ignored: true,
        });
    }

    if (subscriptionId) {
      await syncSubscription(subscriptionId);
    }

    return NextResponse.json({
      received: true,
    });
  } catch (error) {
    console.error("Stripe webhook error:", error);

    return NextResponse.json(
      { error: "Webhook processing failed." },
      { status: 500 }
    );
  }
}
