import crypto from "crypto";
import { Request, Response } from "express";
import { z } from "zod";
import { pool } from "../config/db";
import { HttpError } from "../middleware/errorHandler";
import { appendAuditLog } from "../services/auditLog";

const contributeSchema = z.object({
  amount: z.number().positive(),
});

// Simulated payment only — no real payment gateway in Phase 1 (see README).
function generateUin(): string {
  const random = crypto.randomBytes(5).toString("hex").toUpperCase();
  return `AXM-${random}`;
}

export async function contribute(req: Request, res: Response) {
  const parsed = contributeSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, parsed.error.issues.map((i) => i.message).join(", "));
  }
  const { amount } = parsed.data;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const projectResult = await client.query(
      "SELECT * FROM projects WHERE id = $1 FOR UPDATE",
      [req.params.id]
    );
    const project = projectResult.rows[0];
    if (!project) throw new HttpError(404, "Project not found");
    if (project.status !== "open") {
      throw new HttpError(409, "This project is not currently accepting contributions");
    }

    let uin = generateUin();
    for (let attempts = 0; attempts < 5; attempts++) {
      const clash = await client.query("SELECT 1 FROM contributions WHERE uin = $1", [uin]);
      if (clash.rows.length === 0) break;
      uin = generateUin();
    }

    const contributionResult = await client.query(
      `INSERT INTO contributions (project_id, contributor_id, amount, currency, uin)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [project.id, req.user!.sub, amount, project.currency, uin]
    );
    const contribution = contributionResult.rows[0];

    const raisedResult = await client.query(
      `SELECT COALESCE(SUM(amount), 0) AS raised FROM contributions WHERE project_id = $1 AND status = 'recorded'`,
      [project.id]
    );
    const raised = Number(raisedResult.rows[0].raised);

    let projectStatus = project.status;
    if (raised >= Number(project.goal_amount)) {
      await client.query(
        "UPDATE projects SET status = 'funded', updated_at = now() WHERE id = $1",
        [project.id]
      );
      projectStatus = "funded";
    }

    await appendAuditLog(client, {
      entityType: "contribution",
      entityId: contribution.id,
      action: "contribution.recorded",
      actorId: req.user!.sub,
      payload: { projectId: project.id, amount, uin, simulated: true },
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
    res.status(201).json({ contribution, projectStatus, raised });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function myContributions(req: Request, res: Response) {
  const result = await pool.query(
    `SELECT c.*, p.title AS project_title, p.status AS project_status
     FROM contributions c JOIN projects p ON p.id = c.project_id
     WHERE c.contributor_id = $1 ORDER BY c.created_at DESC`,
    [req.user!.sub]
  );
  res.json({ contributions: result.rows });
}

// Public lookup: anyone holding a UIN (e.g. from a receipt) can check that
// contribution's project status and line-item progress, per the spec's
// "log back in via UIN to track a project" flow.
export async function lookupByUin(req: Request, res: Response) {
  const contributionResult = await pool.query(
    "SELECT * FROM contributions WHERE uin = $1",
    [req.params.uin]
  );
  const contribution = contributionResult.rows[0];
  if (!contribution) throw new HttpError(404, "No contribution found for that UIN");

  const projectResult = await pool.query("SELECT * FROM projects WHERE id = $1", [
    contribution.project_id,
  ]);
  const lineItemsResult = await pool.query(
    "SELECT * FROM budget_line_items WHERE project_id = $1 ORDER BY created_at ASC",
    [contribution.project_id]
  );

  res.json({
    contribution,
    project: projectResult.rows[0],
    lineItems: lineItemsResult.rows,
  });
}
