/**
 * Local self-test for the webhook endpoints, over real HTTP against the real app
 * and local database. Provider network calls are replaced by canned answers.
 *   docker compose exec backend npx tsx scripts/webhook-selftest.ts
 * Never run against a shared database.
 */
process.env.STRIPE_WEBHOOK_SECRET = "whsec_selftest";
process.env.FLUTTERWAVE_WEBHOOK_HASH = "flw_selftest_hash";

import crypto from "crypto";
import type { AddressInfo } from "net";

if (process.env.NODE_ENV === "production") {
  console.error("Refusing to run the self-test in production.");
  process.exit(1);
}

let failures = 0;
function check(name: string, ok: boolean, detail?: unknown) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok || detail === undefined ? "" : `  -> ${JSON.stringify(detail)}`}`);
  if (!ok) failures++;
}

async function main() {
  // Imported after the env vars above are set, because config is read at import time.
  const { app } = await import("../src/index");
  const { pool } = await import("../src/config/db");
  const { stripeProvider } = await import("../src/payments/stripe");
  const { flutterwaveProvider } = await import("../src/payments/flutterwave");

  let outcome: any = { status: "pending" };
  stripeProvider.fetchOutcome = async () => outcome;
  flutterwaveProvider.fetchOutcome = async () => outcome;

  const server = app.listen(0);
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  const one = async (sql: string, params: unknown[] = []) => (await pool.query(sql, params)).rows[0];
  const owner = await one("SELECT id FROM users WHERE email = 'entrepreneur2@axum.demo'");
  const contributor = await one("SELECT id FROM users WHERE email = 'contributor1@axum.demo'");
  const project = await one(
    `INSERT INTO projects (entrepreneur_id, title, description, location, goal_amount, currency, status)
     VALUES ($1, 'SELFTEST webhook project', 'x', 'x', 1000, 'USD', 'open') RETURNING id`,
    [owner.id]
  );
  async function mk(provider: string, ref: string, amount = 20) {
    return one(
      `INSERT INTO contributions (project_id, contributor_id, amount, currency, uin, status, provider, provider_ref)
       VALUES ($1, $2, $3, 'USD', $4, 'pending', $5, $6) RETURNING id`,
      [project.id, contributor.id, amount, `WH-${crypto.randomBytes(4).toString("hex")}`, provider, ref]
    );
  }
  const status = async (id: string) => (await one("SELECT status FROM contributions WHERE id = $1", [id])).status;

  const secret = "whsec_selftest";
  const signed = (payload: object, key = secret, t = Math.floor(Date.now() / 1000)) => {
    const body = JSON.stringify(payload);
    const sig = crypto.createHmac("sha256", key).update(`${t}.${body}`).digest("hex");
    return { body, headers: { "Content-Type": "application/json", "Stripe-Signature": `t=${t},v1=${sig}` } };
  };
  const stripeEvent = (id: string, type = "checkout.session.completed") => ({
    id: "evt_selftest",
    type,
    data: { object: { metadata: { contribution_id: id } } },
  });
  const post = (path: string, body: string, headers: Record<string, string>) =>
    fetch(base + path, { method: "POST", headers, body });

  outcome = { status: "succeeded", amount: 20, currency: "USD", method: "card" };

  // Stripe
  const a = await mk("stripe", "cs_selftest_a");
  const good = signed(stripeEvent(a.id));
  const r1 = await post("/webhooks/stripe", good.body, good.headers);
  check("stripe: validly signed webhook returns 200", r1.status === 200, r1.status);
  check("stripe: ...and records the payment", (await status(a.id)) === "recorded");

  const b = await mk("stripe", "cs_selftest_b");
  const forged = signed(stripeEvent(b.id), "whsec_attacker");
  const r2 = await post("/webhooks/stripe", forged.body, forged.headers);
  check("stripe: wrongly signed webhook is rejected (400)", r2.status === 400, r2.status);
  check("stripe: ...and nothing is recorded", (await status(b.id)) === "pending");

  const unsigned = await post("/webhooks/stripe", JSON.stringify(stripeEvent(b.id)), { "Content-Type": "application/json" });
  check("stripe: unsigned webhook is rejected (400)", unsigned.status === 400, unsigned.status);

  const tampered = signed(stripeEvent(b.id));
  const r3 = await post("/webhooks/stripe", tampered.body.replace("evt_selftest", "evt_changed__"), tampered.headers);
  check("stripe: body altered after signing is rejected (400)", r3.status === 400, r3.status);

  const other = signed(stripeEvent(b.id, "customer.created"));
  const r4 = await post("/webhooks/stripe", other.body, other.headers);
  check("stripe: irrelevant event type is acknowledged but ignored", r4.status === 200 && (await status(b.id)) === "pending");

  const ghost = signed(stripeEvent(crypto.randomUUID()));
  const r5 = await post("/webhooks/stripe", ghost.body, ghost.headers);
  check("stripe: event for an unknown contribution is acknowledged (no retry storm)", r5.status === 200, r5.status);

  // The webhook says "paid" but the provider says otherwise: the provider wins.
  outcome = { status: "pending" };
  const c = await mk("stripe", "cs_selftest_c");
  const liar = signed(stripeEvent(c.id));
  await post("/webhooks/stripe", liar.body, liar.headers);
  check("stripe: a 'paid' webhook is not believed when the provider says pending", (await status(c.id)) === "pending");

  // Flutterwave
  outcome = { status: "succeeded", amount: 20, currency: "USD", method: "mobilemoneyfranco" };
  const f = await mk("flutterwave", "axm-selftest-f");
  const fwBody = JSON.stringify({ event: "charge.completed", data: { tx_ref: "axm-selftest-f", status: "successful" } });
  const f1 = await post("/webhooks/flutterwave", fwBody, { "Content-Type": "application/json", "verif-hash": "flw_selftest_hash" });
  check("flutterwave: correct verif-hash returns 200", f1.status === 200, f1.status);
  check("flutterwave: ...and records the mobile-money payment", (await status(f.id)) === "recorded");
  check("flutterwave: ...with the method stored", (await one("SELECT payment_method FROM contributions WHERE id=$1", [f.id])).payment_method === "mobilemoneyfranco");

  const g = await mk("flutterwave", "axm-selftest-g");
  const bad = await post(
    "/webhooks/flutterwave",
    JSON.stringify({ data: { tx_ref: "axm-selftest-g" } }),
    { "Content-Type": "application/json", "verif-hash": "wrong" }
  );
  check("flutterwave: wrong verif-hash is rejected (401)", bad.status === 401, bad.status);
  check("flutterwave: ...and nothing is recorded", (await status(g.id)) === "pending");

  // Normal JSON routes must be unaffected by the raw-body webhook mount.
  const health = await fetch(base + "/health");
  check("normal routes still parse JSON as before", health.status === 200);
  const login = await fetch(base + "/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "contributor1@axum.demo", password: "Demo1234!" }),
  });
  check("login (JSON body) still works", login.status === 200, login.status);

  await pool.query("DELETE FROM contributions WHERE project_id = $1", [project.id]);
  await pool.query("DELETE FROM projects WHERE id = $1", [project.id]);
  server.close();
  await pool.end();
  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) FAILED.`);
}

main()
  .catch((err) => {
    console.error(err);
    failures++;
  })
  .finally(() => process.exit(failures === 0 ? 0 : 1));
