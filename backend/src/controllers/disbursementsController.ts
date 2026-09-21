import { Request, Response } from "express";
import { z } from "zod";
import { pool } from "../config/db";
import { HttpError } from "../middleware/errorHandler";
import { appendAuditLog } from "../services/auditLog";

async function loadLineItem(id: string) {
  const result = await pool.query(
    `SELECT bli.*, p.status AS project_status, p.entrepreneur_id
     FROM budget_line_items bli JOIN projects p ON p.id = bli.project_id
     WHERE bli.id = $1`,
    [id]
  );
  if (!result.rows[0]) throw new HttpError(404, "Budget line item not found");
  return result.rows[0];
}

// Manual escrow simulation (Phase 1): an admin marks funds "held" once a
// vendor is selected, and "released" once proof is uploaded. No real bank
// or payment integration — this validates the workflow only.
export async function holdFunds(req: Request, res: Response) {
  const lineItem = await loadLineItem(req.params.id);
  if (lineItem.project_status !== "funded") {
    throw new HttpError(409, "Funds can only be held once the project has reached its funding goal");
  }
  if (lineItem.status !== "awarded") {
    throw new HttpError(409, "A vendor must be selected for this line item before holding funds");
  }

  const selectedBid = await pool.query(
    "SELECT vendor_id FROM bids WHERE budget_line_item_id = $1 AND status = 'selected'",
    [lineItem.id]
  );
  if (!selectedBid.rows[0]) throw new HttpError(409, "No selected vendor found for this line item");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `INSERT INTO disbursements (budget_line_item_id, vendor_id, amount, held_by)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [lineItem.id, selectedBid.rows[0].vendor_id, lineItem.amount, req.user!.sub]
    );
    await client.query(
      "UPDATE budget_line_items SET status = 'held', updated_at = now() WHERE id = $1",
      [lineItem.id]
    );
    await appendAuditLog(client, {
      entityType: "disbursement",
      entityId: result.rows[0].id,
      action: "disbursement.held",
      actorId: req.user!.sub,
      payload: { lineItemId: lineItem.id, amount: lineItem.amount },
    });
    await client.query("COMMIT");
    res.status(201).json({ disbursement: result.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

const proofSchema = z.object({
  type: z.enum(["invoice", "payment_proof", "photo"]),
  fileUrl: z.string().min(1),
  description: z.string().optional(),
});

export async function uploadProof(req: Request, res: Response) {
  const parsed = proofSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, parsed.error.issues.map((i) => i.message).join(", "));
  }
  const lineItem = await loadLineItem(req.params.id);

  const selectedBid = await pool.query(
    "SELECT vendor_id FROM bids WHERE budget_line_item_id = $1 AND status = 'selected'",
    [lineItem.id]
  );
  if (selectedBid.rows[0]?.vendor_id !== req.user!.sub) {
    throw new HttpError(403, "Only the vendor selected for this line item can upload proof");
  }
  if (!["held", "proof_submitted"].includes(lineItem.status)) {
    throw new HttpError(409, "Funds must be marked as held before proof can be uploaded");
  }

  const { type, fileUrl, description } = parsed.data;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `INSERT INTO proof_documents (budget_line_item_id, uploaded_by, type, file_url, description)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [lineItem.id, req.user!.sub, type, fileUrl, description ?? null]
    );
    if (lineItem.status === "held") {
      await client.query(
        "UPDATE budget_line_items SET status = 'proof_submitted', updated_at = now() WHERE id = $1",
        [lineItem.id]
      );
    }
    await appendAuditLog(client, {
      entityType: "proof_document",
      entityId: result.rows[0].id,
      action: "proof.uploaded",
      actorId: req.user!.sub,
      payload: { lineItemId: lineItem.id, type },
    });
    await client.query("COMMIT");
    res.status(201).json({ proofDocument: result.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function listProofForLineItem(req: Request, res: Response) {
  const result = await pool.query(
    "SELECT * FROM proof_documents WHERE budget_line_item_id = $1 ORDER BY uploaded_at ASC",
    [req.params.id]
  );
  res.json({ proofDocuments: result.rows });
}

// Dual control: an admin must authorize a release before the escrow partner
// can execute it. Admin never touches the money directly — authorizing only
// unlocks the bank's ability to act; it doesn't move funds by itself.
export async function authorizeRelease(req: Request, res: Response) {
  const lineItem = await loadLineItem(req.params.id);
  if (lineItem.status !== "proof_submitted") {
    throw new HttpError(409, "Proof must be uploaded before a release can be authorized");
  }

  const disbursement = await pool.query(
    "SELECT * FROM disbursements WHERE budget_line_item_id = $1",
    [lineItem.id]
  );
  if (!disbursement.rows[0]) throw new HttpError(404, "No held disbursement found for this line item");
  if (disbursement.rows[0].release_authorized_by) {
    throw new HttpError(409, "Release has already been authorized for this line item");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `UPDATE disbursements SET release_authorized_by = $1, release_authorized_at = now()
       WHERE id = $2 RETURNING *`,
      [req.user!.sub, disbursement.rows[0].id]
    );
    await appendAuditLog(client, {
      entityType: "disbursement",
      entityId: result.rows[0].id,
      action: "disbursement.release_authorized",
      actorId: req.user!.sub,
      payload: { lineItemId: lineItem.id, amount: lineItem.amount },
    });
    await client.query("COMMIT");
    res.json({ disbursement: result.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function releaseFunds(req: Request, res: Response) {
  const lineItem = await loadLineItem(req.params.id);
  if (lineItem.disputed) {
    throw new HttpError(409, "This line item is frozen by a dispute — resolve it before releasing funds");
  }
  if (lineItem.status !== "proof_submitted") {
    throw new HttpError(409, "Proof must be uploaded before funds can be released");
  }

  const disbursement = await pool.query(
    "SELECT * FROM disbursements WHERE budget_line_item_id = $1",
    [lineItem.id]
  );
  if (!disbursement.rows[0]) throw new HttpError(404, "No held disbursement found for this line item");
  if (!disbursement.rows[0].release_authorized_by) {
    throw new HttpError(409, "Release must be authorized by an admin before the escrow partner can release funds");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `UPDATE disbursements SET status = 'released', released_by = $1, released_at = now()
       WHERE id = $2 RETURNING *`,
      [req.user!.sub, disbursement.rows[0].id]
    );
    await client.query(
      "UPDATE budget_line_items SET status = 'released', updated_at = now() WHERE id = $1",
      [lineItem.id]
    );
    await appendAuditLog(client, {
      entityType: "disbursement",
      entityId: result.rows[0].id,
      action: "disbursement.released",
      actorId: req.user!.sub,
      payload: { lineItemId: lineItem.id, amount: lineItem.amount },
    });
    await client.query("COMMIT");
    res.json({ disbursement: result.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
