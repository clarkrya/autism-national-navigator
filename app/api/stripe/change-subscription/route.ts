
import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";

import {
  requireAuthenticatedUser,
} from "../../../../lib/serverSubscriptionAuth";
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
  return value === "premium" ||
    value === "premium_plus";
}

function validInterval(
  value: unknown
): value is BillingInterval {
  return value === "monthly" ||
    value === "annual";
}

function selectionFromPrice(
  priceId: string
): Selection | null {
  for (
    const plan of ["premium", "premium_plus"] as const
  ) {
    for (
      const interval of ["monthly", "annual"] as const
    ) {
      if (
        STRIPE_PRICE_IDS[plan][interval] === priceId
      ) {
        return { plan, interval };
      }
    }
  }

  return null;
}

function fail(
  error: string,
  status = 400
) {
  return NextResponse.json(
    { error },
    { status }
  );
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

function getScheduleId(
  schedule:
    | string
    | Stripe.SubscriptionSchedule
    | null
): string | null {
  if (!schedule) return null;

  return typeof schedule === "string"
    ? schedule
    : schedule.id;
}

function getPhasePriceId(
  phase: Stripe.SubscriptionSchedule.Phase
): string | null {
  if (phase.items.length !== 1) {
    return null;
  }

  const price = phase.items[0].price;

  if (!price) return null;

  return typeof price === "string"
    ? price
    : price.id;
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

  return Math.floor(
    nextDate.getTime() / 1000
  );
}

function canReleaseSchedule(
  schedule: Stripe.SubscriptionSchedule,
  subscription: Stripe.Subscription,
  currentPriceId: string,
  currentPeriodStart: number
): boolean {
  if (
    schedule.status !== "active" ||
    schedule.end_behavior !== "release"
  ) {
    return false;
  }

  const phases = schedule.phases;

  if (phases.length < 2) {
    return false;
  }

  const activeIndex = phases.findIndex(
    (phase) =>
      phase.start_date <= currentPeriodStart &&
      phase.end_date > currentPeriodStart
  );

  // Only release after reaching the final
  // scheduled phase.
  if (
    activeIndex < 1 ||
    activeIndex !== phases.length - 1
  ) {
    return false;
  }

  const activePhase = phases[activeIndex];

  if (
    getPhasePriceId(activePhase) !==
    currentPriceId
  ) {
    return false;
  }

  // The previous phase must have used a
  // different price. This identifies a
  // completed scheduled price change.
  if (
    getPhasePriceId(phases[activeIndex - 1]) ===
    currentPriceId
  ) {
    return false;
  }

  return (
    getScheduleId(subscription.schedule) ===
    schedule.id
  );
}

function invoiceSubscriptionId(
  invoice: Stripe.Invoice
): string | null {
  const subscription =
    invoice.parent?.subscription_details
      ?.subscription;

  if (typeof subscription === "string") {
    return subscription;
  }

  return subscription?.id ?? null;
}

/**
 * Independently verify payment with Stripe.
 *
 * This is used after writing the pending
 * change to Firestore, so a webhook arriving
 * before that write cannot leave the account
 * permanently pending.
 */
async function verifyPaidChange(
  stripe: Stripe,
  subscriptionId: string,
  invoiceId: string,
  targetPriceId: string,
  uid: string
): Promise<boolean> {
  const subscription =
    await stripe.subscriptions.retrieve(
      subscriptionId
    );

  if (
    subscription.metadata.firebaseUid !== uid ||
    subscription.status !== "active" ||
    Boolean(subscription.pending_update) ||
    subscription.items.data.length !== 1 ||
    subscription.items.data[0].price.id !==
      targetPriceId
  ) {
    return false;
  }

  const invoice =
    await stripe.invoices.retrieve(invoiceId);

  if (
    invoice.status !== "paid" ||
    invoiceSubscriptionId(invoice) !==
      subscriptionId
  ) {
    return false;
  }

  const lines =
    await stripe.invoices.listLineItems(
      invoiceId,
      { limit: 100 }
    );

  return lines.data.some(
    (line) =>
      line.pricing?.price_details?.price ===
        targetPriceId &&
      line.amount >= 0
  );
}

/**
 * Clear pending status only if Firestore
 * still references this exact change.
 *
 * The transaction prevents an older request
 * from overwriting a newer membership change.
 */
async function reconcilePaidChange(
  stripe: Stripe,
  ref: ReturnType<
    ReturnType<
      ReturnType<
        ReturnType<
          typeof getAdminDb
        >["collection"]
      >["doc"]
    >["collection"]
  >["doc"] extends (...args: never[]) => infer R
    ? R
    : never,
  uid: string,
  subscriptionId: string,
  invoiceId: string,
  targetPriceId: string,
  plan: PaidPlan,
  interval: BillingInterval
): Promise<boolean> {
  const verified = await verifyPaidChange(
    stripe,
    subscriptionId,
    invoiceId,
    targetPriceId,
    uid
  );

  if (!verified) {
    return false;
  }

  const db = getAdminDb();

  await db.runTransaction(
    async (transaction) => {
      const snapshot =
        await transaction.get(ref);

      const record = snapshot.data();

      if (
        !record ||
        record.stripeSubscriptionId !==
          subscriptionId ||
        record.pendingInvoiceId !==
          invoiceId ||
        record.pendingPlan !== plan ||
        record.pendingBillingInterval !==
          interval
      ) {
        return;
      }

      transaction.set(
        ref,
        {
          plan,
          billingInterval: interval,
          status: "active",
          pendingPlan: null,
          pendingBillingInterval: null,
          pendingInvoiceId: null,
          updatedAt: Date.now(),
        },
        { merge: true }
      );
    }
  );

  const latest = await ref.get();

  return (
    latest.data()?.plan === plan &&
    latest.data()?.billingInterval ===
      interval &&
    !latest.data()?.pendingPlan &&
    !latest.data()?.pendingInvoiceId
  );
}

export async function POST(
  request: NextRequest
) {
  let uid: string;

  try {
    uid = (
      await requireAuthenticatedUser(request)
    ).uid;
  } catch {
    return fail(
      "Please sign in.",
      401
    );
  }

  let body: ChangeBody;

  try {
    body =
      (await request.json()) as ChangeBody;
  } catch {
    return fail("Invalid JSON.");
  }

  if (
    (
      body.action !== "preview" &&
      body.action !== "confirm"
    ) ||
    !validPlan(body.plan) ||
    !validInterval(body.interval)
  ) {
    return fail(
      "Invalid action, plan, or interval."
    );
  }

  const { action, plan, interval } = body;

// Phase 1: Prevent new Premium+ upgrades.
// Existing Premium+ subscribers may still switch to Premium.
if (plan === "premium_plus") {
  return fail(
    "Premium+ is coming in Phase 2 and is not yet available for purchase or upgrade.",
    403
  );
}

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
      typeof record.stripeSubscriptionId !==
        "string"
    ) {
      return fail(
        "No paid subscription found.",
        404
      );
    }

    let subscription =
      await stripe.subscriptions.retrieve(
        record.stripeSubscriptionId
      );

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

    if (
      subscription.items.data.length !== 1
    ) {
      return fail(
        "Unsupported subscription configuration.",
        409
      );
    }

    let item = subscription.items.data[0];

    const current =
      selectionFromPrice(item.price.id);

    if (!current) {
      return fail(
        "Unknown subscription price.",
        409
      );
    }

    if (
      record.plan !== current.plan ||
      record.billingInterval !==
        current.interval
    ) {
      return fail(
        "Subscription records are not synchronized.",
        409
      );
    }

    const targetPriceId =
      getStripePriceId(
        plan,
        interval
      );

    if (
      item.price.id === targetPriceId
    ) {
      return fail(
        "You already have this plan.",
        409
      );
    }

    let releasableScheduleId:
      | string
      | null = null;

    const attachedScheduleId =
      getScheduleId(
        subscription.schedule
      );

    if (attachedScheduleId) {
      const schedule =
        await stripe.subscriptionSchedules.retrieve(
          attachedScheduleId
        );

      if (
        canReleaseSchedule(
          schedule,
          subscription,
          item.price.id,
          item.current_period_start
        )
      ) {
        releasableScheduleId =
          schedule.id;
      } else {
        return fail(
          "A subscription change is still scheduled. Please wait until it takes effect.",
          409
        );
      }
    }

    const blockers = {
      cancellationPending:
        subscription.cancel_at_period_end ===
        true,
      stripePendingUpdate:
        Boolean(subscription.pending_update),
      firestorePendingInvoice:
        Boolean(record.pendingInvoiceId),
      firestorePendingPlan:
        Boolean(record.pendingPlan),
    };

    if (
      Object.values(blockers).some(
        Boolean
      )
    ) {
      return fail(
        "A cancellation or subscription change is already pending.",
        409
      );
    }

    const downgrade =
      current.plan === "premium_plus" &&
      plan === "premium";

    const periodEnd =
      item.current_period_end;

    const quantity =
      item.quantity ?? 1;

    // ======================================
    // PREVIEW
    // ======================================

    if (action === "preview") {
      if (downgrade) {
        return NextResponse.json({
          preview: true,
          changeType:
            "scheduled_downgrade",
          currentPlan: current.plan,
          requestedPlan: plan,
          requestedInterval: interval,
          amountDue: 0,
          effectiveAt:
            periodEnd * 1000,
        });
      }

      const invoice =
        await stripe.invoices.createPreview({
          customer: customerId(
            subscription.customer
          ),
          subscription:
            subscription.id,
          subscription_details: {
            items: [
              {
                id: item.id,
                price: targetPriceId,
              },
            ],
            proration_behavior:
              "always_invoice",
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
        amountDueFormatted:
          formatAmount(
            invoice.amount_due,
            invoice.currency
          ),
      });
    }

    // ======================================
    // RELEASE COMPLETED SCHEDULE
    // ======================================

    if (releasableScheduleId) {
      const freshSubscription =
        await stripe.subscriptions.retrieve(
          subscription.id
        );

      const freshScheduleId =
        getScheduleId(
          freshSubscription.schedule
        );

      if (
        freshScheduleId !==
        releasableScheduleId
      ) {
        return fail(
          "Subscription changed. Please refresh and try again.",
          409
        );
      }

      const freshSchedule =
        await stripe.subscriptionSchedules.retrieve(
          releasableScheduleId
        );

      const freshItem =
        freshSubscription.items.data[0];

      if (
        !freshItem ||
        freshSubscription.items.data.length !==
          1 ||
        freshSubscription.status !==
          "active" ||
        freshSubscription.cancel_at_period_end ||
        freshSubscription.pending_update ||
        freshItem.price.id !==
          item.price.id ||
        !canReleaseSchedule(
          freshSchedule,
          freshSubscription,
          freshItem.price.id,
          freshItem.current_period_start
        )
      ) {
        return fail(
          "Subscription schedule is not ready for another change.",
          409
        );
      }

      await stripe.subscriptionSchedules.release(
        releasableScheduleId
      );

      subscription =
        await stripe.subscriptions.retrieve(
          subscription.id
        );

      if (
        subscription.schedule ||
        subscription.status !==
          "active" ||
        subscription.items.data.length !== 1
      ) {
        return fail(
          "Subscription is still updating. Please try again.",
          409
        );
      }

      item = subscription.items.data[0];

      if (
        item.price.id !==
        STRIPE_PRICE_IDS[
          current.plan
        ][current.interval]
      ) {
        return fail(
          "Subscription changed. Please refresh and try again.",
          409
        );
      }

      await ref.set(
        {
          stripeScheduleId: null,
          updatedAt: Date.now(),
        },
        { merge: true }
      );
    }

    // ======================================
    // SCHEDULE DOWNGRADE
    // ======================================

    if (downgrade) {
      const schedule =
        await stripe.subscriptionSchedules.create({
          from_subscription:
            subscription.id,
        });

      try {
        const firstPhase =
          schedule.phases[0];

        if (!firstPhase) {
          throw new Error(
            "Missing subscription schedule phase."
          );
        }

        const secondPhaseEnd =
          getNextBillingDate(
            item.current_period_end,
            interval
          );

        await stripe.subscriptionSchedules.update(
          schedule.id,
          {
            end_behavior: "release",
            phases: [
              {
                start_date:
                  firstPhase.start_date,
                end_date:
                  item.current_period_end,
                items: [
                  {
                    price:
                      item.price.id,
                    quantity,
                  },
                ],
                proration_behavior:
                  "none",
              },
              {
                start_date:
                  item.current_period_end,
                end_date:
                  secondPhaseEnd,
                items: [
                  {
                    price:
                      targetPriceId,
                    quantity,
                  },
                ],
                proration_behavior:
                  "none",
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
          pendingBillingInterval:
            interval,
          pendingInvoiceId: null,
          stripeScheduleId:
            schedule.id,
          updatedAt: Date.now(),
        },
        { merge: true }
      );

      return NextResponse.json({
        success: true,
        changeType:
          "scheduled_downgrade",
        effectiveAt:
          item.current_period_end * 1000,
        message:
          "Your downgrade is scheduled for the next renewal. Your current benefits remain active until then.",
      });
    }

    // ======================================
    // IMMEDIATE MEMBERSHIP CHANGE
    // ======================================

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
          proration_behavior:
            "always_invoice",
        },
        {
          idempotencyKey:
            `subscription-change-${uid}-${crypto.randomUUID()}`,
        }
      );

    const updatedItem =
      updated.items.data[0];

    const applied =
      updatedItem?.price.id ===
      targetPriceId;

    const latestInvoiceId =
      getInvoiceId(
        updated.latest_invoice
      );

    // Save pending state first.
    await ref.set(
      {
        pendingPlan: plan,
        pendingBillingInterval:
          interval,
        pendingInvoiceId:
          latestInvoiceId,
        stripeScheduleId: null,
        updatedAt: Date.now(),
      },
      { merge: true }
    );

    // ======================================
    // AUTOMATIC PAYMENT RECONCILIATION
    // ======================================

    let paymentVerified = false;

    if (latestInvoiceId) {
      try {
        paymentVerified =
          await reconcilePaidChange(
            stripe,
            ref,
            uid,
            subscription.id,
            latestInvoiceId,
            targetPriceId,
            plan,
            interval
          );
      } catch (reconcileError) {
        // Do not treat a reconciliation
        // failure as a payment failure.
        // The webhook can still complete
        // synchronization independently.
        console.error(
          "Post-change payment reconciliation failed:",
          reconcileError
        );
      }
    }

    return NextResponse.json({
      success: true,
      changeType: "immediate",
      paymentStatus: paymentVerified
        ? "paid"
        : updated.pending_update
          ? "pending"
          : applied
            ? "processing"
            : "not_applied",
      invoiceId: latestInvoiceId,
      message: paymentVerified
        ? "Your membership has been updated successfully."
        : "Subscription change submitted. Access updates after payment verification.",
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
