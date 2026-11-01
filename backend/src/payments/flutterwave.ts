import crypto from "crypto";
import { env } from "../config/env";
import {
  CheckoutParams,
  CheckoutResult,
  PaymentOutcome,
  PaymentProvider,
  ProviderError,
} from "./types";

// Flutterwave v3 "Standard" hosted checkout. We deliberately do not list
// payment_options: the hosted page then offers whatever methods are enabled on
// the merchant account for the payment's currency — cards, plus mobile money
// (Orange Money, MTN MoMo, Wave, Moov Money) where available — so the set is
// controlled from the Flutterwave dashboard, not hard-coded here.
const API = "https://api.flutterwave.com/v3";

let warnedLiveKey = false;

function secretKey(): string | undefined {
  const key = env.payments.flutterwaveSecretKey;
  if (!key) return undefined;
  // Test keys look like FLWSECK_TEST-...; anything else is treated as live.
  if (!key.startsWith("FLWSECK_TEST") && !env.payments.allowLive) {
    if (!warnedLiveKey) {
      console.warn("Flutterwave: a LIVE key is configured but ALLOW_LIVE_PAYMENTS is not 'true'; Flutterwave is disabled.");
      warnedLiveKey = true;
    }
    return undefined;
  }
  return key;
}

async function flwRequest<T>(method: "GET" | "POST", path: string, json?: unknown): Promise<T> {
  const key = secretKey();
  if (!key) throw new ProviderError("Flutterwave is not configured");

  const response = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      ...(json ? { "Content-Type": "application/json" } : {}),
    },
    body: json ? JSON.stringify(json) : undefined,
  });
  const body = (await response.json().catch(() => ({}))) as any;
  if (!response.ok) {
    throw new ProviderError(`Flutterwave error: ${body?.message ?? response.statusText}`);
  }
  return body as T;
}

const txRef = (contributionId: string) => `axm-${contributionId}`;

export const flutterwaveProvider: PaymentProvider = {
  id: "flutterwave",
  label: "Mobile money & cards (Flutterwave)",
  description: "Orange Money, MTN MoMo, Wave, Moov Money and cards, across Africa.",
  mode: "redirect",
  isEnabled: () => secretKey() !== undefined,

  async createCheckout(p: CheckoutParams): Promise<CheckoutResult> {
    const reference = txRef(p.contributionId);
    const result = await flwRequest<{ status: string; message?: string; data?: { link?: string } }>(
      "POST",
      "/payments",
      {
        tx_ref: reference,
        amount: p.amount,
        currency: p.currency.toUpperCase(),
        redirect_url: p.successUrl,
        customer: { email: p.customerEmail, name: p.customerName },
        customizations: { title: "AXUM", description: p.description },
        meta: { contribution_id: p.contributionId },
      }
    );
    if (result.status !== "success" || !result.data?.link) {
      throw new ProviderError(`Flutterwave error: ${result.message ?? "no checkout link returned"}`);
    }
    return { providerRef: reference, redirectUrl: result.data.link };
  },

  async fetchOutcome(providerRef: string): Promise<PaymentOutcome> {
    const result = await flwRequest<{ status: string; data?: any }>(
      "GET",
      `/transactions/verify_by_reference?tx_ref=${encodeURIComponent(providerRef)}`
    ).catch((err) => {
      // Before the customer has attempted payment Flutterwave has no transaction
      // for this reference yet; that is "still pending", not an error.
      if (/not found|no transaction/i.test(String(err?.message))) return null;
      throw err;
    });
    const tx = result?.data;
    if (!result || result.status !== "success" || !tx) return { status: "pending" };

    if (tx.status === "successful") {
      return {
        status: "succeeded",
        amount: Number(tx.amount),
        currency: String(tx.currency).toUpperCase(),
        method: tx.payment_type,
      };
    }
    if (tx.status === "failed" || tx.status === "cancelled") return { status: "failed" };
    return { status: "pending" };
  },

  async refund(providerRef, amount) {
    const verified = await flwRequest<{ data?: { id?: number } }>(
      "GET",
      `/transactions/verify_by_reference?tx_ref=${encodeURIComponent(providerRef)}`
    );
    const transactionId = verified.data?.id;
    if (!transactionId) throw new ProviderError("Flutterwave: could not find the transaction to refund");
    const refund = await flwRequest<{ data?: { id?: number } }>("POST", `/transactions/${transactionId}/refund`, {
      amount,
    });
    return { refundRef: String(refund.data?.id ?? `flw-refund-${transactionId}`) };
  },
};

// Flutterwave authenticates webhooks with a shared secret sent in `verif-hash`.
export function verifyFlutterwaveHash(header: string | undefined, secret: string): boolean {
  if (!header) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(secret);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
