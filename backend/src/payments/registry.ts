import { flutterwaveProvider } from "./flutterwave";
import { simulatedProvider } from "./simulated";
import { stripeProvider } from "./stripe";
import { PaymentProvider, ProviderId } from "./types";

// New regional providers plug in here without touching the contribution flow.
const ALL: PaymentProvider[] = [stripeProvider, flutterwaveProvider, simulatedProvider];

export function getProvider(id: string): PaymentProvider | undefined {
  return ALL.find((p) => p.id === id);
}

export function enabledProviders(): PaymentProvider[] {
  return ALL.filter((p) => p.isEnabled());
}

export function isProviderId(value: string): value is ProviderId {
  return ALL.some((p) => p.id === value);
}
