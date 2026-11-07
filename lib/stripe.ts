
import "server-only";
import Stripe from "stripe";

/*
 * ============================================================
 * AUTIVOYA STRIPE SERVER CONFIGURATION
 * ============================================================
 *
 * Server-side Stripe client.
 *
 * Never expose Stripe secret keys in browser code.
 * ============================================================
 */

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error(
      "Missing STRIPE_SECRET_KEY environment variable."
    );
  }

  if (!stripeClient) {
    stripeClient = new Stripe(secretKey);
  }

  return stripeClient;
}

/*
 * ============================================================
 * STRIPE PRICE CONFIGURATION
 * ============================================================
 *
 * Price IDs come from the Stripe Product Catalog.
 * All values are configured server-side.
 */

export const STRIPE_PRICE_IDS = {
  premium: {
    monthly: process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID,
    annual: process.env.STRIPE_PREMIUM_ANNUAL_PRICE_ID,
  },

  premium_plus: {
    monthly: process.env.STRIPE_PREMIUM_PLUS_MONTHLY_PRICE_ID,
    annual: process.env.STRIPE_PREMIUM_PLUS_ANNUAL_PRICE_ID,
  },
} as const;

export type PaidPlan = keyof typeof STRIPE_PRICE_IDS;

export type BillingInterval = "monthly" | "annual";

export function getStripePriceId(
  plan: PaidPlan,
  interval: BillingInterval
): string {
  const priceId = STRIPE_PRICE_IDS[plan][interval];

  if (!priceId) {
    throw new Error(
      `Missing Stripe price ID for ${plan} (${interval}).`
    );
  }

  return priceId;
}
