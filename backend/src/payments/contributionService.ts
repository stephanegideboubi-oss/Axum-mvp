import { pool } from "../config/db";
import { HttpError } from "../middleware/errorHandler";
import { appendAuditLog } from "../services/auditLog";
import { getProvider } from "./registry";
import { PaymentOutcome, PaymentProvider } from "./types";

export interface ReconcileResult {
  contribution: any;
  projectStatus?: string;
  raised?: number;
}

function providerFor(row: any): PaymentProvider {
  const provider = getProvider(row.provider);
  if (!provider) throw new HttpError(500, `Unknown payment provider: ${row.provider}`);
  return provider;
}

/**
 * Settles a contribution by asking its payment provider what really happened.
 * Safe to call any number of times, from a webhook, the customer's return page,
 * or both at once: only a 'pending' row can change, and it is locked while it does.
 * The provider's answer is the only thing believed; a webhook or redirect is
 * just a prompt to go and ask.
 */
export async function reconcileContribution(contributionId: string): Promise<ReconcileResult> {
  const found = await pool.query("SELECT * FROM contributions WHERE id = $1", [contributionId]);
  const row = found.rows[0];
  if (!row) throw new HttpError(404, "Contribution not found");
  // Settled already, or the checkout page was never created: nothing to ask about.
  if (row.status !== "pending" || !row.provider_ref) return { contribution: row };

  const provider = providerFor(row);
  const outcome = await provider.fetchOutcome(row.provider_ref);
  if (outcome.status === "pending") return { contribution: row };

  if (outcome.status === "succeeded") {
    const amountOk = outcome.amount === undefined || Math.abs(outcome.amount - Number(row.amount)) < 0.005;
    const currencyOk = !outcome.currency || outcome.currency === String(row.currency).trim().toUpperCase();
    if (!amountOk || !currencyOk) {
      await flagMismatch(row, outcome);
      return { contribution: row };
    }
  }

  return settle(row, provider, outcome);
}

// A payment that doesn't match what we asked for is never recorded automatically.
// Logged once so repeated polling doesn't flood the audit trail.
async function flagMismatch(row: any, outcome: PaymentOutcome) {
  const existing = await pool.query(
    "SELECT 1 FROM audit_log WHERE entity_type = 'contribution' AND entity_id = $1 AND action = 'contribution.payment_mismatch'",
    [row.id]
  );
  if (existing.rows.length > 0) return;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await appendAuditLog(client, {
      entityType: "contribution",
      entityId: row.id,
      action: "contribution.payment_mismatch",
      actorId: null,
      payload: {
        expectedAmount: Number(row.amount),
        expectedCurrency: String(row.currency).trim(),
        paidAmount: outcome.amount ?? null,
        paidCurrency: outcome.currency ?? null,
        provider: row.provider,
      },
    });
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function settle(row: any, provider: PaymentProvider, outcome: PaymentOutcome): Promise<ReconcileResult> {
  if (outcome.status === "succeeded") {
    const projectRow = await pool.query("SELECT status FROM projects WHERE id = $1", [row.project_id]);
    // The project was cancelled while this payment was in flight: the money arrived
    // for a project that no longer exists, so it goes straight back.
    if (projectRow.rows[0]?.status === "failed") return autoRefund(row, provider);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const locked = await client.query("SELECT * FROM contributions WHERE id = $1 FOR UPDATE", [row.id]);
    const current = locked.rows[0];
    if (current.status !== "pending") {
      await client.query("COMMIT");
      return { contribution: current };
    }

    if (outcome.status === "failed") {
      const failed = await client.query(
        "UPDATE contributions SET status = 'failed' WHERE id = $1 RETURNING *",
        [row.id]
      );
      await appendAuditLog(client, {
        entityType: "contribution",
        entityId: row.id,
        action: "contribution.failed",
        actorId: null,
        payload: { projectId: row.project_id, provider: row.provider },
      });
      await client.query("COMMIT");
      return { contribution: failed.rows[0] };
    }

    const projectResult = await client.query("SELECT * FROM projects WHERE id = $1 FOR UPDATE", [row.project_id]);
    const project = projectResult.rows[0];

    const recorded = await client.query(
      "UPDATE contributions SET status = 'recorded', payment_method = $2 WHERE id = $1 RETURNING *",
      [row.id, outcome.method ?? null]
    );

    const raisedResult = await client.query(
      "SELECT COALESCE(SUM(amount), 0) AS raised FROM contributions WHERE project_id = $1 AND status = 'recorded'",
      [project.id]
    );
    const raised = Number(raisedResult.rows[0].raised);

    let projectStatus = project.status;
    if (project.status === "open" && raised >= Number(project.goal_amount)) {
      await client.query("UPDATE projects SET status = 'funded', updated_at = now() WHERE id = $1", [project.id]);
      projectStatus = "funded";
    }

    await appendAuditLog(client, {
      entityType: "contribution",
      entityId: row.id,
      action: "contribution.recorded",
      actorId: row.contributor_id,
      payload: {
        projectId: project.id,
        amount: Number(row.amount),
        uin: row.uin,
        provider: row.provider,
        method: outcome.method ?? null,
        simulated: row.provider === "simulated",
      },
    });
    if (projectStatus === "funded" && project.status !== "funded") {
      await appendAuditLog(client, {
        entityType: "project",
        entityId: project.id,
        action: "project.funded",
        actorId: null,
        payload: { raised },
      });
    }

    await client.query("COMMIT");
    return { contribution: recorded.rows[0], projectStatus, raised };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function autoRefund(row: any, provider: PaymentProvider): Promise<ReconcileResult> {
  // A thrown error here leaves the row pending, so the provider's next webhook
  // retry (or the customer's next visit) tries the refund again.
  const { refundRef } = await provider.refund(
    row.provider_ref,
    Number(row.amount),
    String(row.currency).trim(),
    `refund-${row.id}`
  );
  return markRefunded(row, refundRef, "contribution.auto_refunded", {
    reason: "project was cancelled while the payment was in flight",
  });
}

/** Refunds a recorded contribution with its provider, then marks it refunded. */
export async function refundContribution(row: any): Promise<void> {
  const provider = providerFor(row);
  const { refundRef } = await provider.refund(
    row.provider_ref ?? `sim-${row.id}`,
    Number(row.amount),
    String(row.currency).trim(),
    `refund-${row.id}`
  );
  await markRefunded(row, refundRef, "contribution.refunded", { reason: "project cancelled" });
}

async function markRefunded(
  row: any,
  refundRef: string,
  action: string,
  extra: Record<string, unknown>
): Promise<ReconcileResult> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const updated = await client.query(
      "UPDATE contributions SET status = 'refunded', refund_ref = $2 WHERE id = $1 RETURNING *",
      [row.id, refundRef]
    );
    await appendAuditLog(client, {
      entityType: "contribution",
      entityId: row.id,
      action,
      actorId: null,
      payload: { projectId: row.project_id, amount: Number(row.amount), provider: row.provider, ...extra },
    });
    await client.query("COMMIT");
    return { contribution: updated.rows[0] };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
