import { Request, Response } from "express";
import { env } from "../config/env";
import { pool } from "../config/db";
import { HttpError } from "../middleware/errorHandler";
import { reconcileContribution } from "../payments/contributionService";
import { verifyFlutterwaveHash } from "../payments/flutterwave";
import { verifyStripeSignature } from "../payments/stripe";

// Webhooks arrive as raw bytes (express.raw) because the signature covers the exact body.
// Both handlers do the same thing once the sender is authenticated: find the
// contribution and ask the provider what really happened. The payload's own
// claims about amounts or success are never trusted.

function parseJson(raw: Buffer): any {
  try {
    return JSON.parse(raw.toString("utf8"));
  } catch {
    throw new HttpError(400, "Invalid JSON body");
  }
}

// An event for a contribution we don't know isn't an error worth retrying forever.
async function reconcileQuietly(contributionId: string) {
  try {
    await reconcileContribution(contributionId);
  } catch (err) {
    if (err instanceof HttpError && err.status === 404) return;
    throw err;
  }
}

const STRIPE_EVENTS = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "checkout.session.expired",
]);

export async function stripeWebhook(req: Request, res: Response) {
  const secret = env.payments.stripeWebhookSecret;
  if (!secret) throw new HttpError(503, "Stripe webhooks are not configured");

  const raw = req.body as Buffer;
  if (!Buffer.isBuffer(raw) || !verifyStripeSignature(raw, req.header("stripe-signature"), secret)) {
    throw new HttpError(400, "Invalid signature");
  }

  const event = parseJson(raw);
  const session = event?.data?.object;
  const contributionId: string | undefined = session?.metadata?.contribution_id ?? session?.client_reference_id;
  if (STRIPE_EVENTS.has(event?.type) && contributionId) {
    await reconcileQuietly(contributionId);
  }
  res.json({ received: true });
}

export async function flutterwaveWebhook(req: Request, res: Response) {
  const secret = env.payments.flutterwaveWebhookHash;
  if (!secret) throw new HttpError(503, "Flutterwave webhooks are not configured");

  if (!verifyFlutterwaveHash(req.header("verif-hash"), secret)) {
    throw new HttpError(401, "Invalid signature");
  }

  const raw = req.body as Buffer;
  const payload = Buffer.isBuffer(raw) ? parseJson(raw) : {};
  const txRef: string | undefined = payload?.data?.tx_ref ?? payload?.txRef;
  if (txRef) {
    const found = await pool.query(
      "SELECT id FROM contributions WHERE provider = 'flutterwave' AND provider_ref = $1",
      [txRef]
    );
    if (found.rows[0]) await reconcileQuietly(found.rows[0].id);
  }
  res.json({ received: true });
}
