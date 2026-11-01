import crypto from "crypto";
import { env } from "../config/env";
import {
  CheckoutParams,
  CheckoutResult,
  fromMinorUnits,
  PaymentOutcome,
  PaymentProvider,
  ProviderError,
  toMinorUnits,
} from "./types";

const API = "https://api.stripe.com/v1";

let warnedLiveKey = false;

function secretKey(): string | undefined {
  const key = env.payments.stripeSecretKey;
  if (!key) return undefined;
  if (key.startsWith("sk_live_") && !env.payments.allowLive) {
    if (!warnedLiveKey) {
      console.warn("Stripe: a LIVE key is configured but ALLOW_LIVE_PAYMENTS is not 'true'; Stripe is disabled.");
      warnedLiveKey = true;
    }
    return undefined;
  }
  return key;
}

async function stripeRequest<T>(
  method: "GET" | "POST",
  path: string,
  form?: Record<string, string>,
  idempotencyKey?: string
): Promise<T> {
  const key = secretKey();
  if (!key) throw new ProviderError("Stripe is not configured");

  const headers: Record<string, string> = { Authorization: `Bearer ${key}` };
  if (form) headers["Content-Type"] = "application/x-www-form-urlencoded";
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;

  const response = await fetch(`${API}${path}`, {
    method,
    headers,
    body: form ? new URLSearchParams(form).toString() : undefined,
  });
  const body = (await response.json()) as any;
  if (!response.ok) {
    throw new ProviderError(`Stripe error: ${body?.error?.message ?? response.statusText}`);
  }
  return body as T;
}

export const stripeProvider: PaymentProvider = {
  id: "stripe",
  label: "Card (Stripe)",
  description: "Visa, Mastercard and other cards, worldwide.",
  mode: "redirect",
  isEnabled: () => secretKey() !== undefined,

  async createCheckout(p: CheckoutParams): Promise<CheckoutResult> {
    const session = await stripeRequest<{ id: string; url: string }>(
      "POST",
      "/checkout/sessions",
      {
        mode: "payment",
        client_reference_id: p.contributionId,
        customer_email: p.customerEmail,
        success_url: p.successUrl,
        cancel_url: p.cancelUrl,
        "line_items[0][quantity]": "1",
        "line_items[0][price_data][currency]": p.currency.toLowerCase(),
        "line_items[0][price_data][unit_amount]": String(toMinorUnits(p.amount, p.currency)),
        "line_items[0][price_data][product_data][name]": p.description,
        "metadata[contribution_id]": p.contributionId,
        "payment_intent_data[metadata][contribution_id]": p.contributionId,
      },
      `checkout-${p.contributionId}`
    );
    return { providerRef: session.id, redirectUrl: session.url };
  },

  async fetchOutcome(providerRef: string): Promise<PaymentOutcome> {
    const session = await stripeRequest<any>("GET", `/checkout/sessions/${encodeURIComponent(providerRef)}`);
    const currency = String(session.currency ?? "").toUpperCase();
    if (session.payment_status === "paid") {
      return {
        status: "succeeded",
        amount: fromMinorUnits(Number(session.amount_total), currency),
        currency,
        method: "card",
      };
    }
    if (session.status === "expired") return { status: "failed" };
    return { status: "pending" };
  },

  async refund(providerRef, amount, currency, idempotencyKey) {
    const session = await stripeRequest<any>("GET", `/checkout/sessions/${encodeURIComponent(providerRef)}`);
    if (!session.payment_intent) throw new ProviderError("Stripe: this payment has no payment intent to refund");
    const refund = await stripeRequest<{ id: string }>(
      "POST",
      "/refunds",
      {
        payment_intent: String(session.payment_intent),
        amount: String(toMinorUnits(amount, currency)),
      },
      idempotencyKey
    );
    return { refundRef: refund.id };
  },
};

/**
 * Verifies Stripe's `Stripe-Signature` header over the raw request body.
 * Rejects anything unsigned, tampered with, or older than the tolerance window.
 */
export function verifyStripeSignature(
  rawBody: Buffer,
  header: string | undefined,
  secret: string,
  toleranceSeconds = 300,
  nowSeconds = Math.floor(Date.now() / 1000)
): boolean {
  if (!header) return false;
  const pairs = header.split(",").map((part) => part.split("=") as [string, string]);
  const timestamp = pairs.find(([k]) => k === "t")?.[1];
  const signatures = pairs.filter(([k]) => k === "v1").map(([, v]) => v);
  if (!timestamp || signatures.length === 0) return false;
  if (Math.abs(nowSeconds - Number(timestamp)) > toleranceSeconds) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody.toString("utf8")}`)
    .digest();

  return signatures.some((sig) => {
    const candidate = Buffer.from(sig, "hex");
    return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
  });
}
