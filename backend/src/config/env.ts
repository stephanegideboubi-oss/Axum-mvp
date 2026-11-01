import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

// A key still holding the .env.example placeholder counts as "not configured".
function realValue(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value && !/placeholder/i.test(value) ? value : undefined;
}

export const env = {
  payments: {
    // Where payment providers send the customer back to after checkout.
    frontendUrl: (process.env.FRONTEND_URL ?? "http://localhost:5173").replace(/\/$/, ""),
    // The instant, no-money "simulated" method stays available until this is "false".
    allowSimulated: (process.env.ALLOW_SIMULATED_PAYMENTS ?? "true") !== "false",
    // Live (real-money) keys are ignored unless this is explicitly "true".
    allowLive: process.env.ALLOW_LIVE_PAYMENTS === "true",
    stripeSecretKey: realValue("STRIPE_SECRET_KEY"),
    stripeWebhookSecret: realValue("STRIPE_WEBHOOK_SECRET"),
    flutterwaveSecretKey: realValue("FLUTTERWAVE_SECRET_KEY"),
    flutterwaveWebhookHash: realValue("FLUTTERWAVE_WEBHOOK_HASH"),
  },
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "24h",
  // Used to build absolute URLs for uploaded files (e.g. https://api.example.com/uploads/:id)
  // so they render correctly from the frontend's separate origin.
  publicBaseUrl: process.env.PUBLIC_BASE_URL ?? `http://localhost:${process.env.PORT ?? 4000}`,
  // Comma-separated allowlist of origins allowed to call this API. Empty means
  // "allow all" (dev convenience) — production sets this explicitly.
  corsOrigins: (process.env.CORS_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
};
