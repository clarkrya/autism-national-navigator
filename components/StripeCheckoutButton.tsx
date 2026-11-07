
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "../lib/firebase";

type PaidPlan = "premium" | "premium_plus";
type BillingInterval = "monthly" | "annual";

type Props = {
  plan: PaidPlan;
  interval: BillingInterval;
  label: string;
  backgroundColor?: string;
};

export default function StripeCheckoutButton({
  plan,
  interval,
  label,
  backgroundColor = "#2563EB",
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCheckout() {
    if (loading) return;

    const user = auth.currentUser;

    if (!user) {
      router.push(
        `/signup?returnTo=${encodeURIComponent("/pricing")}`
      );
      return;
    }

    setLoading(true);
    setError("");

    try {
      const idToken = await user.getIdToken();

      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          plan,
          interval,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to start checkout."
        );
      }

      if (
        typeof data.url !== "string" ||
        !data.url.startsWith("https://checkout.stripe.com/")
      ) {
        throw new Error("Invalid Stripe Checkout URL.");
      }

      window.location.assign(data.url);
    } catch (err) {
      console.error("Checkout error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to start checkout."
      );

      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleCheckout}
        disabled={loading}
        style={{
          display: "block",
          width: "100%",
          textAlign: "center",
          padding: "13px 18px",
          borderRadius: "10px",
          border: "none",
          background: backgroundColor,
          color: "#FFFFFF",
          fontSize: "14px",
          fontWeight: 800,
          cursor: loading ? "wait" : "pointer",
          opacity: loading ? 0.7 : 1,
          boxSizing: "border-box",
        }}
      >
        {loading ? "Opening secure checkout..." : label}
      </button>

      {error && (
        <p
          role="alert"
          style={{
            marginTop: "10px",
            color: "#B91C1C",
            fontSize: "13px",
            lineHeight: 1.5,
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
