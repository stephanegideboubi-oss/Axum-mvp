import { Request, Response } from "express";
import { pool } from "../config/db";
import { HttpError } from "../middleware/errorHandler";
import { appendAuditLog } from "../services/auditLog";
import { getProjectEscrowStatus } from "../services/escrow";

// Every project that currently has (or ever had) money in escrow, for the
// escrow partner's own dashboard — not filtered to any one project.
export async function getEscrowOverview(req: Request, res: Response) {
  const projectsResult = await pool.query(
    `SELECT DISTINCT p.id, p.title, p.status, p.currency, p.created_at
     FROM projects p
     JOIN budget_line_items bli ON bli.project_id = p.id
     JOIN disbursements d ON d.budget_line_item_id = bli.id
     ORDER BY p.created_at DESC`
  );

  const projects = await Promise.all(
    projectsResult.rows.map(async (project) => {
      const status = await getProjectEscrowStatus(project.id);
      const lineItemsResult = await pool.query(
        `SELECT bli.id, bli.description, bli.status, bli.disputed, d.amount, d.status AS disbursement_status,
                d.release_authorized_by, d.release_authorized_at, u.name AS vendor_name
         FROM budget_line_items bli
         JOIN disbursements d ON d.budget_line_item_id = bli.id
         JOIN users u ON u.id = d.vendor_id
         WHERE bli.project_id = $1
         ORDER BY bli.created_at ASC`,
        [project.id]
      );
      return {
        project: {
          id: project.id,
          title: project.title,
          status: project.status,
          currency: project.currency,
        },
        totalHeld: status.totalHeld,
        totalReleased: status.totalReleased,
        confirmation: status.confirmation,
        pendingAuthorization: status.pendingAuthorization,
        lineItems: lineItemsResult.rows.map((r) => ({
          id: r.id,
          description: r.description,
          status: r.status,
          disputed: r.disputed,
          amount: Number(r.amount),
          disbursementStatus: r.disbursement_status,
          releaseAuthorized: r.release_authorized_by !== null,
          releaseAuthorizedAt: r.release_authorized_at,
          vendorName: r.vendor_name,
        })),
      };
    })
  );

  res.json({ projects });
}

// The escrow partner attests, against their own real records, that the
// live-computed held total is correct. Logged to the hash-chained audit
// trail so the attestation itself is tamper-evident.
export async function confirmProjectBalance(req: Request, res: Response) {
  const projectResult = await pool.query("SELECT id FROM projects WHERE id = $1", [req.params.id]);
  if (!projectResult.rows[0]) throw new HttpError(404, "Project not found");

  const status = await getProjectEscrowStatus(req.params.id);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `INSERT INTO escrow_confirmations (project_id, confirmed_total, confirmed_by)
       VALUES ($1, $2, $3) RETURNING *`,
      [req.params.id, status.totalHeld, req.user!.sub]
    );
    await appendAuditLog(client, {
      entityType: "project",
      entityId: req.params.id,
      action: "escrow.confirmed",
      actorId: req.user!.sub,
      payload: { confirmedTotal: status.totalHeld },
    });
    await client.query("COMMIT");
    res.status(201).json({ confirmation: result.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
