
import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";

import { requireAuthenticatedUser } from "../../../../lib/serverSubscriptionAuth";
import { getAdminDb } from "../../../../lib/firebaseAdmin";
import {
  getStripe,
  getStripePriceId,
  STRIPE_PRICE_IDS,
  type PaidPlan,
  type BillingInterval,
} from "../../../../lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ChangeBody = {
  action?: unknown;
  plan?: unknown;
  interval?: unknown;
};

type Selection = {
  plan: PaidPlan;
  interval: BillingInterval;
};

function validPlan(value: unknown): value is PaidPlan {
  return value === "premium" || value === "premium_plus";
}

function validInterval(
  value: unknown
): value is BillingInterval {
  return value === "monthly" || value === "annual";
}

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

function fail(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

function customerId(
  customer:
    | string
    | Stripe.Customer
    | Stripe.DeletedCustomer
): string {
  return typeof customer === "string"
    ? customer
    : customer.id;
}

function getInvoiceId(
  invoice: string | Stripe.Invoice | null
): string | null {
  if (!invoice) return null;

  return typeof invoice === "string"
    ? invoice
    : invoice.id;
}

function formatAmount(
  amount: number,
  currency: string
): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

/**
 * Calculate the end of one billing cycle
 * using calendar months or years.
 *
 * The schedule uses end_behavior: "release"
 * so the subscription can continue renewing.
 */
function getNextBillingDate(
  startTimestamp: number,
  interval: BillingInterval
): number {
  const date = new Date(startTimestamp * 1000);

  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();

  const targetMonth =
    month + (interval === "annual" ? 12 : 1);

  const lastDay = new Date(
    Date.UTC(year, targetMonth + 1, 0)
  ).getUTCDate();

  const nextDate = new Date(
    Date.UTC(
      year,
      targetMonth,
      Math.min(day, lastDay),
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds()
    )
  );

  return Math.floor(nextDate.getTime() / 1000);
}

export async function POST(request: NextRequest) {
  let uid: string;

  // =========================================
  // AUTHENTICATION
  // =========================================

  try {
    uid = (await requireAuthenticatedUser(request)).uid;
  } catch {
    return fail("Please sign in.", 401);
  }

  let body: ChangeBody;

  try {
    body = (await request.json()) as ChangeBody;
  } catch {
    return fail("Invalid JSON.");
  }

  if (
    (body.action !== "preview" &&
      body.action !== "confirm") ||
    !validPlan(body.plan) ||
    !validInterval(body.interval)
  ) {
    return fail(
      "Invalid action, plan, or interval."
    );
  }

  const { action, plan, interval } = body;

  try {
    const stripe = getStripe();

    const ref = getAdminDb()
      .collection("users")
      .doc(uid)
      .collection("subscription")
      .doc("current");

    const snapshot = await ref.get();
    const record = snapshot.data();

    if (
      !record ||
      typeof record.stripeSubscriptionId !== "string"
    ) {
      return fail(
        "No paid subscription found.",
        404
      );
    }

    const subscription =
      await stripe.subscriptions.retrieve(
        record.stripeSubscriptionId
      );

    // =========================================
    // SUBSCRIPTION VALIDATION
    // =========================================

    if (
      subscription.metadata.firebaseUid !== uid
    ) {
      return fail(
        "Subscription ownership mismatch.",
        403
      );
    }

    if (
      subscription.status !== "active" ||
      record.status !== "active"
    ) {
      return fail(
        "Subscription must be active.",
        409
      );
    }

    // =========================================
    // PENDING CHANGE DIAGNOSTICS
    // =========================================

    const blockers = {
      cancellationPending:
        subscription.cancel_at_period_end === true,

      stripeScheduleAttached:
        Boolean(subscription.schedule),

      stripePendingUpdate:
        Boolean(subscription.pending_update),

      firestorePendingInvoice:
        Boolean(record.pendingInvoiceId),

      firestorePendingPlan:
        Boolean(record.pendingPlan),
    };

    if (Object.values(blockers).some(Boolean)) {
      console.warn(
        "Subscription change blocked:",
        blockers
      );

      return fail(
        "A cancellation or subscription change is already pending.",
        409
      );
    }

    if (subscription.items.data.length !== 1) {
      return fail(
        "Unsupported subscription configuration.",
        409
      );
    }

    const item = subscription.items.data[0];

    const current = selectionFromPrice(
      item.price.id
    );

    if (!current) {
      return fail(
        "Unknown subscription price.",
        409
      );
    }

    if (
      record.plan !== current.plan ||
      record.billingInterval !== current.interval
    ) {
      return fail(
        "Subscription records are not synchronized.",
        409
      );
    }

    const targetPriceId = getStripePriceId(
      plan,
      interval
    );

    if (item.price.id === targetPriceId) {
      return fail(
        "You already have this plan.",
        409
      );
    }

    const downgrade =
      current.plan === "premium_plus" &&
      plan === "premium";

    const periodEnd = item.current_period_end;
    const quantity = item.quantity ?? 1;

    // =========================================
    // PREVIEW SUBSCRIPTION CHANGE
    // =========================================

    if (action === "preview") {
      if (downgrade) {
        return NextResponse.json({
          preview: true,
          changeType: "scheduled_downgrade",
          currentPlan: current.plan,
          requestedPlan: plan,
          requestedInterval: interval,
          amountDue: 0,
          effectiveAt: periodEnd * 1000,
        });
      }

      const invoice =
        await stripe.invoices.createPreview({
          customer: customerId(
            subscription.customer
          ),
          subscription: subscription.id,
          subscription_details: {
            items: [
              {
                id: item.id,
                price: targetPriceId,
              },
            ],
            proration_behavior: "always_invoice",
          },
        });

      return NextResponse.json({
        preview: true,
        changeType: "immediate",
        currentPlan: current.plan,
        requestedPlan: plan,
        requestedInterval: interval,
        currency: invoice.currency,
        amountDue: invoice.amount_due,
        amountDueFormatted: formatAmount(
          invoice.amount_due,
          invoice.currency
        ),
      });
    }

    // =========================================
    // SCHEDULE PREMIUM+ TO PREMIUM DOWNGRADE
    // =========================================

    if (downgrade) {
      const schedule =
        await stripe.subscriptionSchedules.create({
          from_subscription: subscription.id,
        });

      try {
        const firstPhase = schedule.phases[0];

        if (!firstPhase) {
          throw new Error(
            "Missing subscription schedule phase."
          );
        }

        const secondPhaseEnd =
          getNextBillingDate(
            periodEnd,
            interval
          );

        await stripe.subscriptionSchedules.update(
          schedule.id,
          {
            end_behavior: "release",

            phases: [
              {
                start_date: firstPhase.start_date,
                end_date: periodEnd,

                items: [
                  {
                    price: item.price.id,
                    quantity,
                  },
                ],

                proration_behavior: "none",
              },
              {
                start_date: periodEnd,
                end_date: secondPhaseEnd,

                items: [
                  {
                    price: targetPriceId,
                    quantity,
                  },
                ],

                proration_behavior: "none",
              },
            ],
          }
        );
      } catch (error) {
        try {
          await stripe.subscriptionSchedules.release(
            schedule.id
          );
        } catch (cleanupError) {
          console.error(
            "Schedule cleanup failed:",
            cleanupError
          );
        }

        throw error;
      }

      await ref.set(
        {
          pendingPlan: plan,
          pendingBillingInterval: interval,
          pendingInvoiceId: null,
          stripeScheduleId: schedule.id,
          updatedAt: Date.now(),
        },
        { merge: true }
      );

      return NextResponse.json({
        success: true,
        changeType: "scheduled_downgrade",
        effectiveAt: periodEnd * 1000,
        message:
          "Your downgrade is scheduled for the next renewal. Your current benefits remain active until then.",
      });
    }

    // =========================================
    // IMMEDIATE MEMBERSHIP / BILLING CHANGE
    // =========================================

    const updated =
      await stripe.subscriptions.update(
        subscription.id,
        {
          items: [
            {
              id: item.id,
              price: targetPriceId,
            },
          ],
          payment_behavior:
            "pending_if_incomplete",
          proration_behavior: "always_invoice",
        },
        {
          idempotencyKey:
            `subscription-change-${uid}-${crypto.randomUUID()}`,
        }
      );

    const updatedItem =
      updated.items.data[0];

    const applied =
      updatedItem?.price.id === targetPriceId;

    const latestInvoiceId = getInvoiceId(
      updated.latest_invoice
    );

    await ref.set(
      {
        pendingPlan: plan,
        pendingBillingInterval: interval,
        pendingInvoiceId: latestInvoiceId,
        updatedAt: Date.now(),
      },
      { merge: true }
    );

    return NextResponse.json({
      success: true,
      changeType: "immediate",
      paymentStatus: updated.pending_update
        ? "pending"
        : applied
          ? "processing"
          : "not_applied",
      invoiceId: latestInvoiceId,
      message:
        "Subscription change submitted. Access updates after payment verification.",
    });
  } catch (error) {
    console.error(
      "Subscription change failed:",
      error
    );

    return fail(
      "Unable to change subscription.",
      500
    );
  }
}
