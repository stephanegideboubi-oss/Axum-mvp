import { Request, Response } from "express";
import { z } from "zod";
import { pool } from "../config/db";
import { HttpError } from "../middleware/errorHandler";
import { appendAuditLog } from "../services/auditLog";

const bidSchema = z.object({
  amount: z.number().positive(),
  notes: z.string().min(1),
});

async function loadLineItemWithProject(lineItemId: string) {
  const result = await pool.query(
    `SELECT bli.*, p.status AS project_status, p.entrepreneur_id
     FROM budget_line_items bli JOIN projects p ON p.id = bli.project_id
     WHERE bli.id = $1`,
    [lineItemId]
  );
  if (!result.rows[0]) throw new HttpError(404, "Budget line item not found");
  return result.rows[0];
}

export async function submitBid(req: Request, res: Response) {
  const parsed = bidSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, parsed.error.issues.map((i) => i.message).join(", "));
  }

  const vendorResult = await pool.query(
    "SELECT verification_status FROM users WHERE id = $1",
    [req.user!.sub]
  );
  if (vendorResult.rows[0]?.verification_status !== "verified") {
    throw new HttpError(403, "Your vendor account must be verified by an admin before you can bid");
  }

  const lineItem = await loadLineItemWithProject(req.params.id);
  if (lineItem.project_status !== "funded") {
    throw new HttpError(409, "Bidding only opens once a project has reached its funding goal");
  }
  if (!["open", "bidding"].includes(lineItem.status)) {
    throw new HttpError(409, "This line item is no longer open for bidding");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { amount, notes } = parsed.data;
    const bidResult = await client.query(
      `INSERT INTO bids (budget_line_item_id, vendor_id, amount, notes)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [lineItem.id, req.user!.sub, amount, notes]
    );
    if (lineItem.status === "open") {
      await client.query(
        "UPDATE budget_line_items SET status = 'bidding', updated_at = now() WHERE id = $1",
        [lineItem.id]
      );
    }
    await appendAuditLog(client, {
      entityType: "bid",
      entityId: bidResult.rows[0].id,
      action: "bid.submitted",
      actorId: req.user!.sub,
      payload: { lineItemId: lineItem.id, amount },
    });
    await client.query("COMMIT");
    res.status(201).json({ bid: bidResult.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function listBidsForLineItem(req: Request, res: Response) {
  const result = await pool.query(
    `SELECT b.*, u.name AS vendor_name FROM bids b JOIN users u ON u.id = b.vendor_id
     WHERE b.budget_line_item_id = $1 ORDER BY b.created_at ASC`,
    [req.params.id]
  );
  res.json({ bids: result.rows });
}

async function loadBidWithContext(bidId: string) {
  const result = await pool.query(
    `SELECT bd.*, bli.status AS line_item_status, bli.id AS line_item_id, p.entrepreneur_id
     FROM bids bd
     JOIN budget_line_items bli ON bli.id = bd.budget_line_item_id
     JOIN projects p ON p.id = bli.project_id
     WHERE bd.id = $1`,
    [bidId]
  );
  if (!result.rows[0]) throw new HttpError(404, "Bid not found");
  return result.rows[0];
}

export async function selectBid(req: Request, res: Response) {
  const bid = await loadBidWithContext(req.params.id);
  if (bid.entrepreneur_id !== req.user!.sub) {
    throw new HttpError(403, "Only the project owner can select a bid");
  }
  if (bid.status !== "submitted") {
    throw new HttpError(409, "This bid has already been decided");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("UPDATE bids SET status = 'selected' WHERE id = $1", [bid.id]);
    await client.query(
      "UPDATE bids SET status = 'rejected' WHERE budget_line_item_id = $1 AND id != $2 AND status = 'submitted'",
      [bid.line_item_id, bid.id]
    );
    await client.query(
      "UPDATE budget_line_items SET status = 'awarded', updated_at = now() WHERE id = $1",
      [bid.line_item_id]
    );
    await appendAuditLog(client, {
      entityType: "bid",
      entityId: bid.id,
      action: "bid.selected",
      actorId: req.user!.sub,
      payload: { lineItemId: bid.line_item_id },
    });
    await client.query("COMMIT");
    res.json({ message: "Bid selected" });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function rejectBid(req: Request, res: Response) {
  const bid = await loadBidWithContext(req.params.id);
  if (bid.entrepreneur_id !== req.user!.sub) {
    throw new HttpError(403, "Only the project owner can reject a bid");
  }
  if (bid.status !== "submitted") {
    throw new HttpError(409, "This bid has already been decided");
  }

  await pool.query("UPDATE bids SET status = 'rejected' WHERE id = $1", [bid.id]);
  await appendAuditLog(pool, {
    entityType: "bid",
    entityId: bid.id,
    action: "bid.rejected",
    actorId: req.user!.sub,
    payload: { lineItemId: bid.line_item_id },
  });
  res.json({ message: "Bid rejected" });
}
