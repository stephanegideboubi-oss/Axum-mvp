export type ProviderId = "simulated" | "stripe" | "flutterwave";

export interface CheckoutParams {
  contributionId: string;
  amount: number;
  currency: string;
  description: string;
  customerEmail: string;
  customerName: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutResult {
  // The provider's own identifier for this payment; stored on the contribution.
  providerRef: string;
  // Hosted checkout page to send the customer to.
  redirectUrl: string;
}

// What the provider itself says happened. Always fetched server-to-server;
// a webhook or a browser redirect is only ever a hint to go and ask.
export interface PaymentOutcome {
  status: "succeeded" | "failed" | "pending";
  amount?: number;
  currency?: string;
  method?: string;
}

export interface PaymentProvider {
  id: ProviderId;
  label: string;
  description: string;
  // "instant" settles inside the request (simulated); "redirect" sends the customer to a hosted page.
  mode: "instant" | "redirect";
  isEnabled(): boolean;
  createCheckout(params: CheckoutParams): Promise<CheckoutResult>;
  fetchOutcome(providerRef: string): Promise<PaymentOutcome>;
  refund(
    providerRef: string,
    amount: number,
    currency: string,
    idempotencyKey: string
  ): Promise<{ refundRef: string }>;
}

// Currencies the provider APIs count in whole units rather than hundredths.
const ZERO_DECIMAL = new Set([
  "BIF", "CLP", "DJF", "GNF", "JPY", "KMF", "KRW", "MGA", "PYG", "RWF", "UGX", "VND", "VUV", "XAF", "XOF", "XPF",
]);

export function toMinorUnits(amount: number, currency: string): number {
  return ZERO_DECIMAL.has(currency.toUpperCase()) ? Math.round(amount) : Math.round(amount * 100);
}

export function fromMinorUnits(minor: number, currency: string): number {
  return ZERO_DECIMAL.has(currency.toUpperCase()) ? minor : minor / 100;
}

export class ProviderError extends Error {}
