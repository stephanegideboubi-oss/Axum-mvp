import { env } from "../config/env";
import { PaymentProvider, ProviderError } from "./types";

// No money moves. Kept so demos and the live preview keep working without any keys.
export const simulatedProvider: PaymentProvider = {
  id: "simulated",
  label: "Simulated payment (demo)",
  description: "No real money is taken. For demos and testing only.",
  mode: "instant",
  isEnabled: () => env.payments.allowSimulated,
  async createCheckout() {
    throw new ProviderError("The simulated provider settles instantly and has no checkout page");
  },
  async fetchOutcome() {
    return { status: "succeeded", method: "simulated" };
  },
  async refund(providerRef) {
    return { refundRef: `sim-refund-${providerRef}` };
  },
};
