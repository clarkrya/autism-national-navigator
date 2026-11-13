
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

function fail(error: string, status = 400) {
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

/**
 * Check whether an attached subscription
 * schedule is safe to release.
 *
 * A schedule can be released only when:
 *
 * - It is active.
 * - The current Stripe subscription has
 *   reached the scheduled phase.
 * - The active phase matches the current
 *   subscription price.
 * - No future phase changes the price.
 * - The schedule is configured to release,
 *   not cancel, the subscription.
 *
 * Stripe's subscription period is used
 * instead of the server clock so this
 * also works with Stripe test clocks.
 */
function canReleaseSchedule(
  schedule: Stripe.SubscriptionSchedule,
  subscription: Stripe.Subscription,
  currentPriceId: string,
  currentPeriodStart: number
): boolean {
  if (schedule.status !== "active") {
    return false;
  }

  if (schedule.end_behavior !== "release") {
    return false;
  }

  const phases = schedule.phases;

  if (phases.length === 0) {
    return false;
  }

  const activePhase = phases.find(
    (phase) =>
      phase.start_date <= currentPeriodStart &&
      phase.end_date > currentPeriodStart
  );

  if (!activePhase) {
    return false;
  }

  if (
    getPhasePriceId(activePhase) !==
    currentPriceId
  ) {
    return false;
  }

  // A schedule may contain a future change
  // even though its current phase matches.
  // Never release that schedule automatically.
  const futureChange = phases.some(
    (phase) =>
      phase.start_date > currentPeriodStart &&
      getPhasePriceId(phase) !==
        currentPriceId
  );

  if (futureChange) {
    return false;
  }

  // Keep automatic release limited to the
  // subscription's own attached schedule.
  const attachedId = getScheduleId(
    subscription.schedule
  );

  return attachedId === schedule.id;
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

    // ======================================
    // CHECK EXISTING SUBSCRIPTION SCHEDULE
    // ======================================

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

      const safeToRelease =
        canReleaseSchedule(
          schedule,
          subscription,
          item.price.id,
          item.current_period_start
        );

      if (safeToRelease) {
        releasableScheduleId =
          schedule.id;

        console.info(
          "Previous subscription schedule is eligible for release."
        );
      } else {
        console.warn(
          "Subscription change blocked: attached schedule has unresolved phases or restrictions."
        );

        return fail(
          "A subscription change is still scheduled. Please wait until it takes effect.",
          409
        );
      }
    }

    // ======================================
    // CHECK OTHER PENDING CHANGES
    // ======================================

    const blockers = {
      cancellationPending:
        subscription.cancel_at_period_end ===
        true,

      stripePendingUpdate:
        Boolean(
          subscription.pending_update
        ),

      firestorePendingInvoice:
        Boolean(
          record.pendingInvoiceId
        ),

      firestorePendingPlan:
        Boolean(
          record.pendingPlan
        ),
    };

    if (
      Object.values(blockers).some(
        Boolean
      )
    ) {
      console.warn(
        "Subscription change blocked:",
        blockers
      );

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
        currency:
          invoice.currency,
        amountDue:
          invoice.amount_due,
        amountDueFormatted:
          formatAmount(
            invoice.amount_due,
            invoice.currency
          ),
      });
    }

    // ======================================
    // CONFIRM: RELEASE OLD SCHEDULE
    // ======================================

    if (releasableScheduleId) {
      // Recheck the Stripe state before
      // releasing the schedule. This avoids
      // acting on an outdated preview.
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
        freshSubscription.items.data.length !== 1 ||
        freshSubscription.status !== "active" ||
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

      console.info(
        "Previous completed-change schedule released."
      );

      subscription =
        await stripe.subscriptions.retrieve(
          subscription.id
        );

      if (
        subscription.schedule ||
        subscription.status !== "active" ||
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
    // SCHEDULE PREMIUM+ TO PREMIUM
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
                    quantity:
                      item.quantity ?? 1,
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
                    quantity:
                      item.quantity ?? 1,
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
    // IMMEDIATE PLAN / BILLING CHANGE
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

    return NextResponse.json({
      success: true,
      changeType: "immediate",
      paymentStatus:
        updated.pending_update
          ? "pending"
          : applied
            ? "processing"
            : "not_applied",
      invoiceId:
        latestInvoiceId,
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
