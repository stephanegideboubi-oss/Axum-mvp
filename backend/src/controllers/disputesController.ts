import { Request, Response } from "express";
import { z } from "zod";
import { pool } from "../config/db";
import { HttpError } from "../middleware/errorHandler";
import { appendAuditLog } from "../services/auditLog";

// Auto-freeze threshold from the spec: once contributors representing this
// share of the project's total funding have flagged a line, disbursement on
// that line freezes automatically. Below it, the flag just notifies admins.
const AUTO_FREEZE_SHARE = 0.1;

const flagSchema = z.object({
  reason: z.string().min(1),
});

async function recomputeFreeze(client: { query: typeof pool.query }, lineItemId: string, projectId: string) {
  const totalResult = await client.query(
    `SELECT COALESCE(SUM(amount), 0) AS total FROM contributions WHERE project_id = $1 AND status = 'recorded'`,
    [projectId]
  );
  const total = Number(totalResult.rows[0].total);
  if (total <= 0) return false;

  const flaggedResult = await client.query(
    `SELECT COALESCE(SUM(c.amount), 0) AS flagged_amount
     FROM disputes d
     JOIN contributions c ON c.contributor_id = d.raised_by AND c.project_id = $2 AND c.status = 'recorded'
     WHERE d.budget_line_item_id = $1 AND d.status = 'open'`,
    [lineItemId, projectId]
  );
  const flaggedAmount = Number(flaggedResult.rows[0].flagged_amount);
  const shouldFreeze = flaggedAmount / total >= AUTO_FREEZE_SHARE;

  await client.query("UPDATE budget_line_items SET disputed = $1, updated_at = now() WHERE id = $2", [
    shouldFreeze,
    lineItemId,
  ]);
  return shouldFreeze;
}

export async function flagLineItem(req: Request, res: Response) {
  const parsed = flagSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, parsed.error.issues.map((i) => i.message).join(", "));
  }

  const lineItemResult = await pool.query(
    "SELECT * FROM budget_line_items WHERE id = $1",
    [req.params.id]
  );
  const lineItem = lineItemResult.rows[0];
  if (!lineItem) throw new HttpError(404, "Budget line item not found");

  const contributedCheck = await pool.query(
    "SELECT 1 FROM contributions WHERE project_id = $1 AND contributor_id = $2 AND status = 'recorded'",
    [lineItem.project_id, req.user!.sub]
  );
  if (contributedCheck.rows.length === 0) {
    throw new HttpError(403, "Only contributors to this project can flag a line item");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const existing = await client.query(
      "SELECT id FROM disputes WHERE budget_line_item_id = $1 AND raised_by = $2",
      [lineItem.id, req.user!.sub]
    );
    if (existing.rows.length > 0) {
      throw new HttpError(409, "You've already flagged this line item");
    }

    const disputeResult = await client.query(
      `INSERT INTO disputes (budget_line_item_id, raised_by, reason) VALUES ($1, $2, $3) RETURNING *`,
      [lineItem.id, req.user!.sub, parsed.data.reason]
    );
    const frozen = await recomputeFreeze(client, lineItem.id, lineItem.project_id);

    await appendAuditLog(client, {
      entityType: "dispute",
      entityId: disputeResult.rows[0].id,
      action: frozen ? "dispute.flagged_and_frozen" : "dispute.flagged",
      actorId: req.user!.sub,
      payload: { lineItemId: lineItem.id },
    });

    await client.query("COMMIT");
    res.status(201).json({ dispute: disputeResult.rows[0], lineItemFrozen: frozen });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function listDisputes(req: Request, res: Response) {
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const result = await pool.query(
    `SELECT d.*, bli.description AS line_item_description, bli.project_id
     FROM disputes d JOIN budget_line_items bli ON bli.id = d.budget_line_item_id
     WHERE ($1::text IS NULL OR d.status = $1::dispute_status) ORDER BY d.created_at DESC`,
    [status ?? null]
  );
  res.json({ disputes: result.rows });
}

const resolveSchema = z.object({
  notes: z.string().min(1),
  unfreeze: z.boolean().optional(),
});

export async function resolveDispute(req: Request, res: Response) {
  const parsed = resolveSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, parsed.error.issues.map((i) => i.message).join(", "));
  }

  const disputeResult = await pool.query("SELECT * FROM disputes WHERE id = $1", [req.params.id]);
  const dispute = disputeResult.rows[0];
  if (!dispute) throw new HttpError(404, "Dispute not found");
  if (dispute.status === "resolved") throw new HttpError(409, "This dispute is already resolved");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `UPDATE disputes SET status = 'resolved', resolution_notes = $1, resolved_by = $2, resolved_at = now()
       WHERE id = $3 RETURNING *`,
      [parsed.data.notes, req.user!.sub, dispute.id]
    );
    if (parsed.data.unfreeze) {
      await client.query(
        "UPDATE budget_line_items SET disputed = false, updated_at = now() WHERE id = $1",
        [dispute.budget_line_item_id]
      );
    }
    await appendAuditLog(client, {
      entityType: "dispute",
      entityId: dispute.id,
      action: "dispute.resolved",
      actorId: req.user!.sub,
      payload: { unfroze: !!parsed.data.unfreeze },
    });
    await client.query("COMMIT");
    res.json({ dispute: result.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
