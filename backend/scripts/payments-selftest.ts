/**
 * Local self-test for the payment settlement rules. Run inside the dev container:
 *   docker compose exec backend npx tsx scripts/payments-selftest.ts
 *
 * It exercises the REAL reconcile/refund code against the REAL local database,
 * with the Stripe adapter's network calls replaced by canned answers (no keys,
 * no network). It creates a throwaway project and deletes it afterwards, but
 * audit-log rows are append-only and stay. Never run against a shared database.
 */
import crypto from "crypto";
import { pool } from "../src/config/db";
import { reconcileContribution, refundContribution } from "../src/payments/contributionService";
import { verifyFlutterwaveHash } from "../src/payments/flutterwave";
import { stripeProvider, verifyStripeSignature } from "../src/payments/stripe";
import { fromMinorUnits, PaymentOutcome, toMinorUnits } from "../src/payments/types";
import { verifyAuditChain } from "../src/services/auditLog";

if (process.env.NODE_ENV === "production") {
  console.error("Refusing to run the self-test in production.");
  process.exit(1);
}

let failures = 0;
function check(name: string, ok: boolean, detail?: unknown) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok || detail === undefined ? "" : `  -> ${JSON.stringify(detail)}`}`);
  if (!ok) failures++;
}

// --- Canned provider behaviour -------------------------------------------------
let outcome: PaymentOutcome = { status: "pending" };
const refundKeys: string[] = [];
stripeProvider.fetchOutcome = async () => outcome;
stripeProvider.refund = async (_ref, _amount, _currency, key) => {
  refundKeys.push(key);
  return { refundRef: "re_selftest" };
};

async function one(sql: string, params: unknown[] = []) {
  return (await pool.query(sql, params)).rows[0];
}
async function auditCount(entityId: string, action: string) {
  return Number((await one("SELECT count(*) AS n FROM audit_log WHERE entity_id = $1 AND action = $2", [entityId, action])).n);
}

async function main() {
  const owner = await one("SELECT id FROM users WHERE email = 'entrepreneur2@axum.demo'");
  const contributor = await one("SELECT id FROM users WHERE email = 'contributor1@axum.demo'");
  if (!owner || !contributor) throw new Error("Seed the demo data first (npm run seed).");

  const projectIds: string[] = [];
  async function mkProject(status: string, goal = 100) {
    const p = await one(
      `INSERT INTO projects (entrepreneur_id, title, description, location, goal_amount, currency, status)
       VALUES ($1, 'SELFTEST project', 'x', 'x', $2, 'USD', $3) RETURNING *`,
      [owner.id, goal, status]
    );
    projectIds.push(p.id);
    return p;
  }
  async function mkContribution(projectId: string, amount: number, provider = "stripe") {
    const id = crypto.randomUUID();
    return one(
      `INSERT INTO contributions (id, project_id, contributor_id, amount, currency, uin, status, provider, provider_ref)
       VALUES ($1, $2, $3, $4, 'USD', $5, 'pending', $6, $7) RETURNING *`,
      [id, projectId, contributor.id, amount, `ST-${crypto.randomBytes(4).toString("hex")}`, provider, `ref-${id}`]
    );
  }
  const status = async (id: string) => (await one("SELECT status FROM contributions WHERE id = $1", [id])).status;
  const raised = async (pid: string) =>
    Number((await one("SELECT COALESCE(SUM(amount),0) AS r FROM contributions WHERE project_id=$1 AND status='recorded'", [pid])).r);

  // --- Signature & unit helpers -------------------------------------------------
  const secret = "whsec_selftest";
  const body = Buffer.from(JSON.stringify({ id: "evt_1", type: "checkout.session.completed" }));
  const now = Math.floor(Date.now() / 1000);
  const sign = (t: number, b: Buffer, s = secret) =>
    `t=${t},v1=${crypto.createHmac("sha256", s).update(`${t}.${b.toString("utf8")}`).digest("hex")}`;

  check("stripe signature: valid is accepted", verifyStripeSignature(body, sign(now, body), secret));
  check("stripe signature: tampered body is rejected", !verifyStripeSignature(Buffer.from("{}"), sign(now, body), secret));
  check("stripe signature: wrong secret is rejected", !verifyStripeSignature(body, sign(now, body, "whsec_other"), secret));
  check("stripe signature: stale timestamp is rejected", !verifyStripeSignature(body, sign(now - 3600, body), secret));
  check("stripe signature: missing header is rejected", !verifyStripeSignature(body, undefined, secret));
  check("stripe signature: garbage header is rejected", !verifyStripeSignature(body, "t=abc,v1=zz", secret));
  check("flutterwave hash: match accepted", verifyFlutterwaveHash("abc123", "abc123"));
  check("flutterwave hash: mismatch rejected", !verifyFlutterwaveHash("abc124", "abc123"));
  check("flutterwave hash: missing rejected", !verifyFlutterwaveHash(undefined, "abc123"));
  check("minor units: USD 12.34 -> 1234", toMinorUnits(12.34, "USD") === 1234);
  check("minor units: XOF 5000 stays 5000", toMinorUnits(5000, "XOF") === 5000);
  check("minor units: round trip", fromMinorUnits(toMinorUnits(19.99, "usd"), "usd") === 19.99);

  // --- Settlement rules -----------------------------------------------------------
  const project = await mkProject("open", 100);

  outcome = { status: "pending" };
  const stillPending = await mkContribution(project.id, 40);
  await reconcileContribution(stillPending.id);
  check("pending outcome leaves the contribution pending", (await status(stillPending.id)) === "pending");
  check("pending contribution does not count toward raised", (await raised(project.id)) === 0);

  outcome = { status: "succeeded", amount: 40, currency: "USD", method: "card" };
  const first = await reconcileContribution(stillPending.id);
  check("confirmed payment becomes recorded", first.contribution.status === "recorded", first.contribution.status);
  check("payment method is stored", first.contribution.payment_method === "card");
  check("raised now counts it", (await raised(project.id)) === 40);
  check("project stays open below goal", (await one("SELECT status FROM projects WHERE id=$1", [project.id])).status === "open");

  await reconcileContribution(stillPending.id);
  await reconcileContribution(stillPending.id);
  check("repeat reconcile writes no second audit entry", (await auditCount(stillPending.id, "contribution.recorded")) === 1);

  const racy = await mkContribution(project.id, 10);
  outcome = { status: "succeeded", amount: 10, currency: "USD", method: "card" };
  await Promise.all(Array.from({ length: 6 }, () => reconcileContribution(racy.id)));
  check("6 simultaneous reconciles record it exactly once", (await auditCount(racy.id, "contribution.recorded")) === 1);
  check("...and the total is right (40 + 10)", (await raised(project.id)) === 50);

  const wrongAmount = await mkContribution(project.id, 5);
  outcome = { status: "succeeded", amount: 999, currency: "USD", method: "card" };
  await reconcileContribution(wrongAmount.id);
  await reconcileContribution(wrongAmount.id);
  await reconcileContribution(wrongAmount.id);
  check("wrong amount paid is NOT recorded", (await status(wrongAmount.id)) === "pending");
  check("wrong amount is flagged once, not per check", (await auditCount(wrongAmount.id, "contribution.payment_mismatch")) === 1);

  const wrongCurrency = await mkContribution(project.id, 5);
  outcome = { status: "succeeded", amount: 5, currency: "EUR", method: "card" };
  await reconcileContribution(wrongCurrency.id);
  check("wrong currency paid is NOT recorded", (await status(wrongCurrency.id)) === "pending");

  const declined = await mkContribution(project.id, 7);
  outcome = { status: "failed" };
  await reconcileContribution(declined.id);
  check("failed payment becomes failed", (await status(declined.id)) === "failed");
  check("failed payment does not count", (await raised(project.id)) === 50);

  const pushOver = await mkContribution(project.id, 60);
  outcome = { status: "succeeded", amount: 60, currency: "USD", method: "card" };
  const crossed = await reconcileContribution(pushOver.id);
  check("reaching the goal funds the project", crossed.projectStatus === "funded", crossed.projectStatus);
  check("project.funded is logged exactly once", (await auditCount(project.id, "project.funded")) === 1);

  // Payment lands after the project was cancelled: it must go straight back.
  const cancelled = await mkProject("failed", 100);
  const lateMoney = await mkContribution(cancelled.id, 25);
  outcome = { status: "succeeded", amount: 25, currency: "USD", method: "card" };
  refundKeys.length = 0;
  await reconcileContribution(lateMoney.id);
  check("payment for a cancelled project is auto-refunded", (await status(lateMoney.id)) === "refunded");
  check("...using an idempotency key per contribution", refundKeys[0] === `refund-${lateMoney.id}`, refundKeys);
  check("...and is logged", (await auditCount(lateMoney.id, "contribution.auto_refunded")) === 1);

  // Cancelling refunds confirmed money back through the provider.
  refundKeys.length = 0;
  const confirmedRow = await one("SELECT * FROM contributions WHERE id = $1", [stillPending.id]);
  await refundContribution(confirmedRow);
  check("cancel refund marks the contribution refunded", (await status(stillPending.id)) === "refunded");
  check("cancel refund calls the provider once", refundKeys.length === 1, refundKeys);

  // The instant, no-money path still works exactly as before.
  const simProject = await mkProject("open", 1000);
  const sim = await mkContribution(simProject.id, 15, "simulated");
  const simResult = await reconcileContribution(sim.id);
  check("simulated provider records instantly", simResult.contribution.status === "recorded");

  const chain = await verifyAuditChain();
  check("audit chain is still valid after all of that", chain.valid, chain);

  // --- Cleanup (audit rows are append-only and intentionally remain) ---------------
  await pool.query("DELETE FROM contributions WHERE project_id = ANY($1)", [projectIds]);
  await pool.query("DELETE FROM projects WHERE id = ANY($1)", [projectIds]);

  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) FAILED.`);
}

main()
  .catch((err) => {
    console.error(err);
    failures++;
  })
  .finally(async () => {
    await pool.end();
    process.exit(failures === 0 ? 0 : 1);
  });
